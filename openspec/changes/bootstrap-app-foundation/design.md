# Design

## Context

Greenfield: the repository contains only OpenSpec scaffolding. The development machine has Node.js 24, npm, Docker 29 (Compose v5) and the `sqlite3` CLI 3.45; pnpm is not installed. The app must not depend on the `sqlite3` CLI at runtime, but it is handy for inspecting the database and checking backups by hand. See proposal.md for motivation and scope; requirements are in `specs/`.

Constraints already agreed for the whole product:
- Self-hosted, lightweight web app, installable as a PWA, single SQLite database.
- Several household members sign in from their own devices, so data lives on the server.
- Granular, admin-managed permissions with a visibility rule (an item is visible if its account or its attributed member is visible) arrive in later changes. This change must leave one obvious place where those rules plug in.
- Translatable UI: English by default, English and Spanish complete, more languages addable.
- The code is written by AI agents, so the stack should be mainstream, strongly typed, current and well covered by tests.

## Goals / Non-Goals

**Goals:**
- A runnable app skeleton (dev server, production build, single Node.js process) on the latest stable releases, which later slices extend without restructuring.
- One authorization entry point that every protected read and write goes through.
- One translation mechanism that every user-facing string goes through from the first screen.
- Exact money arithmetic available before any ledger code exists.
- Tests that turn spec scenarios into executable checks from the first commit.

**Non-Goals:**
- Choosing the hosting target or writing deployment automation. This change documents how to run the built app and schedule backups, nothing more.
- Offline data entry or sync. The PWA caches the shell only.
- Translating user-entered data (category names and similar). Only the app's own texts are translated.

## Decisions

### D0. Versions (latest stable as of 2026-10-20)

| Package | Version | Notes |
|---|---|---|
| `@sveltejs/kit` | 3.1.x | Requires Node >= 22.17, Vite >= 8.0.12, TypeScript 6, Svelte >= 5.57.1 |
| `svelte` | 5.57.x | Runes only |
| `@sveltejs/adapter-node` | 6.0.x | |
| `vite` | 8.x | |
| `typescript` | 6.0.x | Not 7: Kit 3's peer range is `^6.0.0` |
| `sv` (scaffolding CLI) | 1.1.x | |
| `drizzle-orm` / `drizzle-kit` | 0.45.x / 0.31.x | |
| `better-sqlite3` | 13.x | Node >= 22 |
| `@node-rs/argon2` | 2.2.x | |
| `@oslojs/crypto`, `@oslojs/encoding` | 1.x | Session token hashing and encoding |
| `intl-messageformat` | 12.1.x | ICU message rendering for runtime dictionaries (D14); the browser uses the `no-parser` build |
| `@formatjs/icu-messageformat-parser` | 3.x | Server-side precompilation of messages (D14), and message generation and checks in `scripts/` |
| `stylelint` | 17.x | Forbids physical CSS properties (D10) |
| `vitest` | 5.x | |
| `@playwright/test` | 1.64.x | |
| `@axe-core/playwright` | 4.14.x | |
| `eslint` | 10.x | |
| `tsx` | 4.x | Runs the backup script |
| `valibot` | 1.5.x | Input validation (D16) |
| `eslint-plugin-boundaries` | 7.x | Enforces feature boundaries (D16) |

Versions are pinned with caret ranges, and `package-lock.json` is committed. SvelteKit 3.0 was released on 2026-10-01, which is newer than the agents' training data. See D1 for how the code stays on Kit 3 idioms.

### D1. SvelteKit 3 (Svelte 5) with the Node adapter
One framework covers server rendering, form actions, server endpoints and the client. Its output is small, which helps the mobile PWA feel fast. `adapter-node` produces a single Node.js process, which fits a home server or a small VPS.

Kit 3 idioms the code must follow (from the official SvelteKit 3 migration guide):
- Configuration lives in `vite.config.ts` as `sveltekit({ adapter, ... })` options. There is no `svelte.config.js`.
- Internal imports use `#lib/...` subpath imports declared in `package.json` `imports`, with file extensions. Not `$lib`.
- Page state comes from `$app/state` (`page`, not `$page`). Environment variables come from `$app/env/private` and `$app/env/public`, not `$env/*`. Build info comes from `$app/env`.
- `error(status, message)` takes a string message. Use `Response.json()` instead of `json()`.
- Remote functions stay off (still experimental). Use form actions and `load`.
- Server-only code lives under any `server` directory or filename segment.

How agents stay current: before writing Kit or Svelte code, consult the official docs (`https://svelte.dev/docs/kit`, `https://svelte.dev/llms.txt`). `svelte-check` and lint run on every task (D2), and the scaffold comes from `npx sv create`, which generates Kit 3 conventions.

- *Alternative: Next.js (React).* The largest ecosystem, but heavier at runtime, fiddlier PWA setup, and more framework rules to get wrong.
- *Alternative: React SPA plus a separate API (Hono or Fastify).* Two apps, two builds and duplicated validation for a single-household tool.

### D2. TypeScript strict, npm, ESLint, Prettier
TypeScript 6 in `strict` mode everywhere. The tsconfig extends `$app/tsconfig` with explicit `include`/`exclude`, and the service worker gets its own tsconfig extending `$app/tsconfig/service-worker`. npm is the package manager because it is already installed. `package.json` has a `prepare` script that enables the project's Git hooks (ADR 0019) in every clone and worktree that is a Git checkout: `git rev-parse --git-dir >/dev/null 2>&1 && git config core.hooksPath .githooks || true`. The guard keeps `npm ci` working on a deploy target without `.git`. The script runs in `app/` (D12); a relative `core.hooksPath` is resolved from the repository root, so it still enables `.githooks/`. `npm run check` runs `svelte-check`, ESLint, stylelint, Prettier, message generation and the translation checks (D14), and must pass before a task is considered done. Lint also bans the removed Kit 2 modules (`$app/stores`, `$env/*`, `$lib`, `$service-worker`), so outdated patterns fail fast.

### D3. SQLite through better-sqlite3 and Drizzle ORM
- `better-sqlite3`: synchronous, fast and mature; synchronous transactions keep D16's transaction rules simple. Backups use plain SQL (`VACUUM INTO`, D8), so they don't depend on driver-specific APIs.
- Drizzle ORM: typed schema in TypeScript, SQL-like queries (easy to scope, see D6), and `drizzle-kit` for versioned SQL migration files committed to git.
- Connection pragmas on startup: `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`, `synchronous=NORMAL`.
- Migrations run automatically at server start, before the server accepts requests. When migrations are pending on a database that already has a schema, a pre-migration backup is taken first (D8). A new, empty database is migrated without one. A failed backup or migration stops startup.
- **Startup sequence, in one place:** `src/lib/server/startup.ts` runs once from SvelteKit's `init` hook in `hooks.server.ts`, before the first request is handled:
  1. open the database
  2. pre-migration backup, when needed (D8)
  3. migrations
  4. `languages.seed` with a system actor (D14)

  Any failure stops startup. Features never run startup work on their own, and `startup.ts` is the only place besides `auth` internals and `scripts/` that may build a system actor.
- Database location comes from `DATABASE_PATH` (default `./data/app.db`). `./data/` is git-ignored.
- *Alternative: Prisma.* Heavier engine and less control over generated SQL. *Alternative: Kysely.* A good query builder, but Drizzle's schema-first migrations are less work. *Alternative: `node:sqlite`.* Its backup support and ecosystem integration are less settled than better-sqlite3's.

### D4. Authentication: our own sessions, following the Lucia/Oslo pattern
- Users table: `id`, `username` (stored normalized, unique), `display_name`, `password_hash`, `role` (`admin` or `member`), `locale` (nullable; NULL means "browser default", see D14), `time_zone` (nullable IANA zone; see D14), `created_at`.
- Input normalization lives in `features/users/validation.ts`, so the browser, account creation, sign-in and throttling share one implementation:
  - username: trim, NFKC, lowercase, then `^[a-z0-9._-]{3,32}$`
  - display name: trim, NFKC, 1 to 64 code points, no control characters (`\p{Cc}`)
  - password: NFKC only, never trimmed, 8 to 128 code points
- Passwords are hashed with Argon2id (`@node-rs/argon2`, OWASP parameters).
- Sessions table: the session token is 20 random bytes encoded as base32 and sent in the cookie. Only its SHA-256 hash is stored, so a leaked database does not leak live sessions. The table holds `user_id` and `expires_at`. Expiry contract: a session expires between 29 and 30 days after its last use. On validation, when less than 29 days remain, the server sets `expires_at` to now + 30 days and re-sends the cookie with `Max-Age` = 30 days. This writes at most once a day per session. Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` when the request is HTTPS, `Path=/`.
- First-run setup runs inside a write transaction that re-checks "no users exist", so concurrent setups produce exactly one administrator.
- Throttling: a `login_attempts` table keyed by normalized username (whether or not the account exists) and by client address, with a failure counter, a window start and `locked_until`. Storing it in SQLite keeps it working across restarts.
  - **Per username: 5 failures in 15 minutes, then locked for 15 minutes.** Why: 5 is enough for honest typos, and an attacker gets at most about 480 guesses per day per username, which is negligible against passwords of 8 or more characters hashed with Argon2. 15 minutes is short enough that someone trying to lock a real user out can only cause a brief delay.
  - **Per client address: 20 failures in 15 minutes, then locked for 15 minutes.** Why: in a home, every device usually reaches the server through the same router address. With 5, a few typos by different family members would lock the whole household out. 20 still stops one address from guessing across many usernames.
  - **A successful sign-in resets only that username's counter, never the address counter.** Why: otherwise an attacker with one valid account could sign into it between guesses and keep resetting their own address counter.
- **Sign-in flow** (no account enumeration, and failed attempts are never lost to a rollback, D16):
  1. Normalize the username.
  2. Short transaction: check the lock for the username and client address. If locked, return `Throttled`. Otherwise read the credentials (system actor).
  3. Outside any transaction: run Argon2 verification against the stored hash, or against a fixed dummy hash (computed once at startup with the same parameters) when the account doesn't exist.
  4. Second transaction: **re-check the lock**, since concurrent attempts may have locked it during step 3. If locked now, record nothing and return `throttled`. Otherwise record the outcome: on a wrong password, increment the username and address counters; when the username counter reaches 5, or the address counter reaches 20, set that counter's `locked_until` to now + 15 minutes. On success, reset **only the username counter** (never the address counter, see the throttling rules above) and create the session. Then **return** a result value: `ok`, `invalid` or `throttled`.
     - Counting rules: a failure counts only while not locked. Refused attempts are neither counted nor extend `locked_until`, so an attacker can't keep a user locked out indefinitely by retrying.
     - SQLite serializes these transactions, so the outcome doesn't depend on execution order: with 10 concurrent wrong attempts on an unlocked username, exactly 5 are counted and 5 return `throttled`.
  5. After the commit, the service turns `invalid` or `throttled` into the corresponding typed error.

  Unknown and existing usernames each cost one hash check and get the same message, status and lockout. A correct password whose attempt started before a lockout is refused at step 4.
- *Alternative: Better Auth or Auth.js.* They bring features we don't need (OAuth, email flows) and their own user schemas. Revisit if we ever need OAuth or passkeys.

### D5. Request pipeline in `hooks.server.ts`
```
request
  -> SvelteKit built-in CSRF check (always on in production in Kit 3)
  -> session: auth.resolveActor(sessionToken) -> event.locals.actor
       { kind: 'user', id, role, locale, timeZone } with a valid session,
       otherwise { kind: 'anonymous' }
  -> locale: i18n resolution; reads locals.actor first, then Accept-Language among
       the installed languages, then English (D14)
  -> setup gate: auth.setupStatus(); while no users exist, every page request
       except /setup -> 303 to /setup (static assets, manifest, service worker,
       offline page and /i18n dictionaries still served)
  -> route guard (anonymous actor only): public routes allow-list (/login, /setup, /offline,
     /i18n/*, manifest, icons, service worker, static)
       not signed in + page     -> 303 to /login?redirectTo=...
       not signed in + endpoint -> 401
  -> route handler (load / action / endpoint)
       -> data access through the policy layer (D6)
```
- The session step runs before the locale step, because locale resolution needs the user's saved language.
- `auth.resolveActor(token)` is the only entry the hook uses for sessions. It builds the `system` actor internally (inside `features/auth/server/`, where lint allows it), validates and extends the session, and returns `{ actor, session }`. `actor` is either a `user` or an `anonymous` actor. `session` is one of:
  - `{ action: 'keep' }`: nothing to send
  - `{ action: 'renew', expiresAt }`: the session was extended, so re-send the cookie
  - `{ action: 'clear' }`: the token was expired, signed out or unknown, so delete the cookie

  The service stays HTTP-free. The hook passes `session` to `server/web/session-cookie.ts`, which writes or deletes the cookie (`Max-Age` from `expiresAt`). The hook itself never handles a system actor.
- The setup gate calls `auth.setupStatus()`, a public action, which asks `users.hasAnyUser` with the system actor it builds internally. Once the answer is true it is cached, since users can't return to zero in this change, so the gate costs nothing after setup. The cache is a `WeakMap` keyed by the database instance, not a module-level boolean. Why: tests run several temporary databases in one process, and a shared flag would make an empty test database look already set up.
- After a preference changes (the profile action), the action responds with 303 to `/profile`. The next request resolves the actor, locale and time zone from scratch, so nothing in the current request has to be patched.
- Hooks are composed with `sequence`. `redirectTo` only accepts same-origin relative paths, which prevents open redirects.
- CSRF: Kit 3 removed `csrf.checkOrigin`. Origin checking is always on in production and compares against the request origin. Behind a reverse proxy, the proxy must forward the host and protocol (`PROTOCOL_HEADER`, `HOST_HEADER`), or the build sets `paths.origin` from an `APP_ORIGIN` variable read in `vite.config.ts`. `csrf.trustedOrigins` stays empty.

### D6. Policy layer: one module, deny by default, scoped queries
```
src/lib/server/policy/
  actions.ts    -- Action type: e.g. 'profile.view'; later 'transactions.view', ...
                   each action is marked public, user or system-only
  policy.ts     -- can(actor, action, target?) -> boolean
                   authorize(actor, action, target?) -> throws Forbidden
                   scope(actor, resource) -> query filter (later changes)
```
- **Actors** (`server/core/actor.ts`) are one of three kinds:
  - `anonymous`: a request without a valid session.
  - `user`: a signed-in user, with id and role.
  - `system`: trusted internal code. It is built only by `systemActor(reason)`, which lint allows only in `features/auth/server/` (session validation, setup), `server/startup.ts` (the startup sequence, D3) and `scripts/`, so no request can ever produce one.
- `can` looks the action up in a rule table. An action with no rule returns false, and nothing bypasses the policy, not even the operations needed to sign in. The full matrix for this change (each cell has a unit test):

| Action | anonymous | user | admin | system |
|---|---|---|---|---|
| `auth.setupStatus` | allow | allow | allow | allow |
| `auth.setup` | allow (1) | deny | deny | deny |
| `auth.signIn` | allow | allow | allow | deny |
| `auth.signOut` (own session) | deny | allow | allow | deny |
| `languages.read` (installed list and dictionaries) | allow | allow | allow | allow |
| `profile.view`, `profile.update` (own) | deny | allow | allow | deny |
| `profile.view`, `profile.update` (other user) | deny | deny | allow | deny |
| `settings.view` (admin settings page, a placeholder in this change) | deny | deny | allow | deny |
| `users.create`, `users.readCredentials`, `users.hasAny`, `auth.validateSession`, `languages.seed` (system-only) | deny | deny | deny | allow |
| any action not listed | deny | deny | deny | deny |

  (1) Only while no users exist. That is a precondition the service checks inside its transaction, not a policy rule.

  **The matrix is the reference**; summaries elsewhere in this design only describe it. Admin is allowed exactly what its column says: in particular, never system-only actions (so password hashes are never readable through any user-facing path), and never setup. `system` gets only the system-only actions and the setup status.
- Every function a feature exports from its `server/index.ts` authorizes before returning protected data, whoever the caller is: a route or another feature.
- Route code never queries the database directly. It calls a feature's service functions (D16), which take `ctx` (including the actor) as their first argument and call `authorize` or apply `scope` before touching data. Lint forbids importing the database client or any repository from `src/routes/`.
- Denials become a 403 "not allowed" page or JSON response (through the web adapter, D16). A denial never includes the requested data, and responses for missing and forbidden records look the same.
- Why this shape: the next access-control change adds grants and scopes by extending `can` and `scope`. Call sites don't change.
- *Alternative: checks inside each route.* Easy to forget one, and impossible to lint for.

### D7. Money as integer minor units
- `Money = { amountMinor: number; currency: Currency }`, where `Currency = { code: string; exponent: number }` is passed in by the caller (from the registry now, from the catalog later), where `amountMinor` must be a safe integer: `Number.isSafeInteger`, so at most ±9,007,199,254,740,991 minor units, which is 90 trillion BOB, or 90 million BTC at 8 decimals.
- Every constructor and operation checks the range: `parse`, `add`, `subtract` and `allocate` throw a typed `MoneyOutOfRange` error rather than lose precision. A value either round-trips exactly or is rejected.
- Storage: SQLite `INTEGER` through Drizzle `integer(..., { mode: 'number' })`. better-sqlite3 returns integers as JS numbers, which are exact within the safe range. SQL `SUM()` stays exact in SQLite (64-bit), and readers check the result is a safe integer before building `Money`.
- *Alternative: `bigint` end to end.* Drizzle 0.45's SQLite `integer()` has no `bigint` mode (only `timestamp`, `timestamp_ms` and `boolean`), and `blob({ mode: 'bigint' })` would store binary and break `SUM()`. A `customType` with better-sqlite3's safe-integers option would work, but that option turns every integer column (IDs, counters, timestamps) into `bigint`, so every column would need custom types. The safe-integer range can't be reached by a household, so the complexity isn't justified.
- The currency registry (code, minor-unit exponent, symbol) starts with BOB, USD, EUR and USDT, all with exponent 2. The exponent is per currency, so adding BTC (8) later is just data.
- **The registry is provisional.** In this change it is a constant in code, because nothing stores money yet. The `add-currencies-and-accounts` change replaces it with an admin-managed catalog in the database: currencies the household enables from a reference list, plus custom ones, with the exponent immutable once amounts exist in that currency (`docs/roadmap.md`). To make that a drop-in change, `domain/money` never reads the registry itself: every function receives the currency's exponent as data.
- Pure functions `parse(text, currency: Currency, locale)`, `format(money, locale)` (which reads the exponent from `money.currency`), `add`, `subtract`, `allocate` and `isZero`, with integer arithmetic only. Two `Money` values are the same currency only when both `code` and `exponent` match; otherwise operations throw. `parse` reads the digits as a string, never through `parseFloat`.
- **`format` never divides.** Converting minor units with `amountMinor / 10 ** exponent` loses precision near the safe limit (in Node, `9007199254740991 / 100` formats as `90,071,992,547,409.90` instead of `.91`). Instead, `format` builds an exact decimal string from the integer's digits (`"-9007199254740991"` with exponent 2 becomes `"-90071992547409.91"`) and passes that string to `Intl.NumberFormat`, which formats decimal strings exactly (`90,071,992,547,409.91` in `en`, `90.071.992.547.409,91` in `es`). Parsing and formatting are locale-aware, so "45,20" is accepted in Spanish and "45.20" in English. Formatting uses `Intl.NumberFormat`.
- Nothing in this change stores money yet. The module ships with unit tests so the ledger change can depend on it.
- *Alternative: decimal strings or a decimal library.* Integers are faster, sort and sum natively in SQL, and are harder to misuse.

### D8. Backup with `VACUUM INTO`
- `scripts/backup.ts` shares one backup function with the startup pre-migration backup. It opens the database read-only and runs `VACUUM INTO '<tmp>'`. That copies a consistent snapshot of the committed data within a single read transaction, and with WAL it neither blocks the app's writers nor restarts. It then checks the copy with `PRAGMA integrity_check` and moves it to its final name with an exclusive link (`fs.link` then `unlink` of the temp file), which fails if the name already exists, so nothing is ever overwritten.
- *Why not the online backup API (`db.backup()`):* the script runs in a separate process from the app. SQLite's online backup restarts every time another connection writes, so on a busy database it could keep restarting and never finish. `VACUUM INTO` doesn't have this problem, and its output is a compacted standalone file with no WAL.
- **Names:** scheduled backups are `app-YYYYMMDDTHHMMSSZ.db`. Pre-migration backups are `pre-migrate-<version>-YYYYMMDDTHHMMSSZ.db`, taken at startup when migrations are pending; the three most recent are kept.
- **Retention:** only after the new backup was created and verified, delete the oldest `app-*.db` files beyond `BACKUP_KEEP` (default 14), oldest first, ordered by the timestamp in their names. Other files are never counted or deleted. A failure to create or verify the new backup means retention never starts.
  - Deletions can't be undone. If one deletion fails, retention stops there: the new backup and the remaining files are kept, and the files already deleted stay deleted. Stopping at the first failure means a broken disk doesn't produce a cascade of errors.
- **Configuration and scheduling:** the script doesn't depend on the directory it's started from.
  - It finds the app directory from its own file location (the nearest `package.json`) and, when `<app>/.env` exists, loads it with `process.loadEnvFile()`. A `--env-file` flag isn't used, because Node resolves it against the current directory.
  - `DATABASE_PATH` and `BACKUP_DIR` are resolved against the app directory too.
  - The npm script is `node --import tsx scripts/backup.ts`.
  - Documented commands: cron uses `npm --prefix /opt/app run backup`; systemd uses `WorkingDirectory=/opt/app` with `ExecStart=/usr/bin/npm run backup`. These npm invocations are the only supported entry points. Calling `node --import tsx /opt/app/scripts/backup.ts` from another directory is **not** supported: Node resolves the `tsx` loader from the current directory before the script runs, so it fails with `ERR_MODULE_NOT_FOUND` outside the app.
  - The tests run these exact command lines from another directory, against a test app directory with its own `.env`, and check which database was backed up.
- **Restore** (documented in the README, and covered by a test):
  1. Stop the app.
  2. Delete `app.db-wal` and `app.db-shm` if present. A stale write-ahead log would otherwise be replayed over the restored file.
  3. Copy the backup over `app.db`.
  4. Start the app. A pre-migration backup must be started with the build that matches its schema version (see Migration Plan).
- Exit codes: `0` success; `1` the backup was not created (temp file removed, nothing pruned); `2` the backup was created and verified but retention failed (the message names the file that couldn't be deleted). Schedulers alert on any non-zero code, and the two codes tell the operator whether a fresh backup exists.

### D9. PWA with SvelteKit's built-in service worker
`@vite-pwa/sveltekit` is not used: its latest release supports only SvelteKit 1 and 2.
- `static/manifest.webmanifest`: name, short name, icons 192, 512 and maskable (committed PNGs), theme and background colors, `display: standalone`. It's linked from `app.html`.
- `src/service-worker/index.ts`, beside its own `tsconfig.json` (D2) (bundled as a module by Kit 3, typed through `$app/service-worker`, asset lists from `$app/manifest`, version from `$app/env`): precache the built app shell and the offline pages on install; on activate, delete old caches and call `clients.claim()`. Why: without `claim()`, the worker doesn't control the page on the very first visit, so going offline right after it would show a browser error.
- Fetch strategy: navigations go to the network, falling back to the offline page when offline. Other requests are served from cache only for precached build assets. Responses from pages or `/api` are never cached, so financial data never sits in the service worker cache.
- **Offline page in every installed language:** a public route `/offline` renders one small HTML page that embeds the offline texts of every installed language, read from the database, so languages installed later are covered without a rebuild. The worker caches `/offline` on install, and re-fetches it whenever it receives a locale message, which picks up newly installed languages. On every page load, the root layout sends the resolved locale through `navigator.serviceWorker.ready`, which resolves once the worker is active even on the first visit, before it controls the page, by posting to `registration.active`. The worker stores that code (a language code only, nothing private) as the single metadata entry `/__meta/locale` in its cache. The spec explicitly allows this entry, and the cache test checks its exact content. Offline, the worker serves the cached `/offline` page, and an inline script on it shows the texts for the stored locale. Without one, it matches `navigator.languages` with the same matcher as D14, then falls back to English.
- **HTTPS and browsers:** service workers and installation need HTTPS outside `localhost`. The README documents serving through a TLS-terminating reverse proxy, with a Caddy example (automatic certificates), and lists the supported browsers from the app-shell spec. Install prompts differ per browser: iOS Safari only offers "Add to Home Screen" from the share menu, and desktop Firefox can't install. The spec therefore requires the installability criteria, not a prompt.

### D10. UI foundation
- Plain CSS with design tokens (CSS custom properties) on `:root`, a dark set under `prefers-color-scheme: dark`, and a token sheet whose colors are checked for AA contrast in a unit test.
- Layout: bottom navigation below 1024 px, side navigation from 1024 px up. Only the sections the user may open are shown, using `can()` results computed in the root layout load.
- No component library for now. Primitives (button, input, field, select, dialog) live in `src/lib/components/`.
- **Right-to-left ready:** CSS uses logical properties only (`margin-inline-start`, `padding-block`, `inset-inline-end`, `text-align: start`), never `left` or `right`. Icons that point in a direction are mirrored under `[dir="rtl"]`. A stylelint rule forbids physical properties, so the layout flips correctly the day a right-to-left language is installed.
- *Alternative: Tailwind.* Fast to write, but long class strings are noisy in diffs reviewed by humans.

### D11. Testing
- Vitest for unit and integration tests: money, policy, services against a temporary SQLite file with migrations applied, backup, languages and translation checks.
- Playwright for end-to-end tests against the built app (production mode, so the CSRF check is active): setup, sign-in, throttling, sign-out, guard redirects, browser-language detection, the profile language setting, 360 px and 1024 px layouts, and the manifest. Accessibility checks with `@axe-core/playwright` on the shell pages, in both languages.
- **Behavior tests are written with each task**, as each task's verification requires. **Strict traceability is checked when the change is closed, not during it:** at the end, `scripts/check-scenarios.ts` reads every spec and fails if any scenario has no test whose name quotes it.
  - Why: while implementing and testing, specs are expected to change. When they do, the spec is updated first (`/opsx:update`) and the tests follow. Requiring exact scenario names from day one would only create churn. Writing all tests at the end instead would let early bugs surface late and cascade through later tasks.

### D12. Project layout
The app is its own npm project in `app/` (ADR 0023): `package.json`, `node_modules/`, tool configs and everything below. The repository root holds only the tooling used to build it (`.claude/`, `.githooks/`, `docs/`, `openspec/`, `CLAUDE.md`). The tree below is inside `app/`, and every path to an app file in this design and in `tasks.md` is relative to `app/`; npm commands run there.

Organized by feature, following D16.
```
src/
  hooks.server.ts          (init: runs server/startup.ts once; handle: pipeline, D5)
  service-worker/          (index.ts and its own tsconfig.json, D2)
  lib/
    domain/
      money/               (pure, no I/O, client-safe)
    validation/            (client-safe: Valibot issue -> { field, key, params } mapping)
    i18n/                  (client-safe: t(), generated keys.ts, locale matcher, formatting helpers)
    components/            (UI primitives)
    features/
      users/
        validation.ts      (client-safe Valibot schemas: credentials, profile)
        server/            (server-only: Kit 3 never bundles a `server` directory for the browser)
          index.ts         (public API: the only server file other code may import)
          service.ts       (createAdmin, getProfile, updateProfile, getCredentialsForSignIn, hasAnyUser)
          repo.ts          (all access to the users table, incl. the profile lookup)
          schema.ts        (owns table: users)
          service.test.ts, repo.test.ts
                           (no queries.ts: no read model yet)
      settings/            (no tables: only server/index.ts and server/service.ts)
        server/
          service.ts       (getOverview: authorizes settings.view, returns the app version (D13) and installed languages)
      languages/           (owns tables: languages, translations)
        server/
          index.ts, service.ts (listInstalled, getDictionary; later: add, generate, edit, activate)
          repo.ts, schema.ts, seed.ts (installs en and es, upserts messages/es.json; called by server/startup.ts)
      auth/
        server/
          index.ts, service.ts (setupStatus, setup, signIn, signOut, resolveActor)
          repo.ts, schema.ts (owns tables: sessions, login_attempts)
          queries.ts       (session validation: sessions joined with users, D16)
          password.ts, session.ts, throttle.ts, and their tests
                           (no validation.ts: sign-in input uses users/validation.ts)
    server/
      core/                (framework-free: no SvelteKit imports, enforced by lint)
        ctx.ts             (Ctx type: { db, actor, locale, inTransaction }; test ctx factory)
        actor.ts           (Actor kinds; systemActor(), restricted by lint)
        errors.ts          (typed app errors: Forbidden, NotFound, Invalid, Conflict, Throttled)
        transaction.ts     (withTransaction, D16)
        validation.ts      (parse input with a feature schema, throw Invalid)
      web/                 (SvelteKit adapter: the only server code that imports SvelteKit)
        ctx.ts             (build Ctx from a RequestEvent)
        responses.ts       (app errors -> error(), fail(), redirect(), Response.json())
        session-cookie.ts  (apply resolveActor's session result: keep, renew or clear the cookie)
      db/                  (client.ts, migrate.ts)
      startup.ts           (startup sequence: backup, migrations, language seed; D3)
      policy/              (D6)
  routes/                  (thin adapters, one folder per screen)
    +layout.server.ts      (root: passes locale, time zone and allowed navigation to every page)
    +layout.svelte         (root: html lang, tells the service worker the locale on every route)
    (public)/login, (public)/setup, (public)/offline
    (public)/i18n/[file]/+server.ts   (GET <locale>.<content-hash>.json dictionaries)
    (app)/+layout.svelte, (app)/+page.svelte (home placeholder), (app)/profile, (app)/logout
    (app)/settings         (admin-only placeholder; later changes add members, roles, languages...)
messages/en.json, messages/es.json   (English source; preinstalled Spanish seed)
drizzle/                   (generated SQL migrations, committed; drizzle-kit reads features/*/server/schema.ts)
scripts/backup.ts, scripts/gen-messages.ts, scripts/check-messages.ts, scripts/check-scenarios.ts
static/manifest.webmanifest, static/icons/
tests/e2e/
data/                      (git-ignored: app.db, backups/)
```
Later changes add folders under `features/` (`household/`, `accounts/`, `categories/`, `ledger/`, `reporting/` and so on) and pure rules under `domain/`.

### D13. Configuration
Runtime environment variables (`.env.example` committed, `.env` git-ignored, loaded with `node --env-file=.env build`): `DATABASE_PATH`, `BACKUP_DIR`, `BACKUP_KEEP`, plus adapter-node's own `PORT`, `HOST`, `PROTOCOL_HEADER`, `HOST_HEADER`, `ADDRESS_HEADER` and `XFF_DEPTH` for reverse proxies. Build-time: an optional `APP_ORIGIN`, used as `paths.origin` (D5). App code reads variables through `$app/env/private`.

App version: `package.json` `version`, in Semantic Versioning (ADR 0018), injected at build time with Vite `define`. Kit's `version.name` keeps its default, so every build still renews the service worker cache (D9) even when two builds share a version.

### D14. Internationalization: runtime dictionaries with typed English keys
Languages are app data, not build artifacts. English is the base, built into the code. Every other language is installed in the database, so a language can be added without changing code, rebuilding or redeploying.

- **English is the source of truth.** `messages/en.json` lives in the repository. Each entry is `{ "text": <ICU MessageFormat>, "description": <where and how the text is used> }`. The description is required: it gives human and AI translators the context they need ("Save" on a button is translated differently from "Save" as a title). `scripts/gen-messages.ts`, run by `predev`, `prebuild` and `npm run check`, generates `i18n/keys.ts`: a TypeScript union of every key with the parameters each message takes. `t('auth.sign_in.title')` with an unknown key, or without a required parameter, is a compile error. English is always installed and can't be deactivated.
- **Key naming and order:** every key starts with a prefix: the name of the feature that owns the text (a folder under `src/lib/features/`, for example `auth.`, `users.`, `languages.`, `settings.`) or one of the shared prefixes `common.`, `shell.`, `offline.`, `validation.`, `errors.`. The allowed prefixes are derived from the feature folders plus that fixed shared list, so a new feature needs no extra configuration. `messages/en.json` and `messages/es.json` are kept sorted by key, and `npm run i18n:sort` sorts them. Why: parallel branches (the `openspec-parallel-apply` skill) then add their keys in different places of the files, so Git merges them without conflicts, and prefixes keep texts of different features from colliding.
- **Spanish is preinstalled.** `messages/es.json` is in the repository, translated and reviewed by people. Each entry is `{ "text": ..., "source": <hash of the English text it translates> }`. At startup, a seed step upserts its texts into the database with origin `seed`. Rows edited later (origin `human` or `ai`) are never overwritten by the seed.
- **Installed languages live in the database,** in a new `languages` feature that owns two tables:
  - `languages`: `code` (BCP 47, primary key), `status` (`active` or `inactive`), `preinstalled`, `created_at`
  - `translations`: `locale`, `key`, `value`, `origin` (`seed`, `ai` or `human`), `source_hash` (hash of the English text it was translated from), `updated_at`

  "Installed" means `status = active`. That list is the single source of truth for the profile selector, browser-language matching, profile validation and the offline page. Nothing hard-codes the list of languages.
- **Runtime lookup:**
  - The `languages` feature loads each active language's dictionary once, caches it in a `WeakMap` keyed by the database instance (as the setup gate does, D5), and invalidates it when translations change.
  - **Regional fallback chain, per text:** the requested locale, then each shorter installed parent, then English. For example `es-BO` -> `es` -> `en`, so an installed `es-BO` only needs the texts that differ from Spanish. A text is never shown as a key or a blank.
  - **Stale translations:** a translation whose `source_hash` differs from the current English text is **stale**. It is reported, and the later AI tool can regenerate only the stale texts. A stale translation is still shown **only if it is compatible** with the current English text: every argument it uses must exist in the English text with the same kind (simple, number, date, plural or select). The reason is that formatjs requires a value for every argument a message uses, and the code passes the current English arguments. For example, if English changed `{name}` to `{displayName}`, a translation still using `{name}` would fail to render. An incompatible stale translation is skipped, and the fallback chain continues (installed parent, then English). Compatibility is computed once when the dictionary is built, not per request.
  - Messages are rendered with `intl-messageformat`, which handles plurals with `Intl.PluralRules` (one, few, many…), select and number formatting for any language. Compiled messages are memoized.
  - **Dictionaries are cacheable files, precompiled on the server.** The server parses every message once with `@formatjs/icu-messageformat-parser` and serves each locale's merged dictionary (fallback chain applied) as `/i18n/<locale>.<content-hash>.json`, holding the parsed messages. The response is public and `immutable`, because the hash changes whenever a translation changes. The root layout data only carries the URL. The client renders with `intl-messageformat` using formatjs's `no-parser` build, so the message parser never reaches the browser. That substitution must apply **only to the browser bundle**: the server needs the real parser to precompile. A plain `resolve.alias` in `vite.config.ts` would apply to SSR too, so a small Vite plugin swaps `@formatjs/icu-messageformat-parser` for its `no-parser.js` entry in `resolveId` only when the `ssr` flag is false. A few hundred texts are about 5–8 KB compressed, downloaded once per language and version.
  - **Performance:** on the server, a lookup is an in-memory map access, and the database is read only at startup and after an edit. In the browser, the cost is one small cached file. No measurable effect on page speed is expected; task 5.5 measures it.
- **Adding languages (later change, `add-language-catalog`):**
  - Only an administrator can add a language.
  - Adding one creates it as `inactive`. A **"Generate translation" tool** then makes an explicit call to an AI model that translates the English source, and the results are stored with origin `ai`. Only UI texts are sent to the model, never household or financial data.
  - The administrator reviews and edits the texts (edits become origin `human`), then activates the language.
  - Translations can be exported and imported as a folder of JSON files.

  This change builds the mechanism and the two seeded languages; the catalog screens and the AI tool come with that change.
- **Language names** come from `Intl.DisplayNames` in each language itself, not from a hand-written table. CLDR returns many of them in lower case (`español`, `français`, `català`), so the first letter is upper-cased with that language's rules (`name.charAt(0).toLocaleUpperCase(code) + name.slice(1)`), giving "Español", "Français", "Català".
- `users.locale` is validated against the installed languages. If a language is later deactivated, users who had chosen it fall back to "Browser default".
- No locale in URLs: this is a private app, so the paths stay clean. No language cookie and no installation-wide default either. Locale resolution order (our own module in `i18n/`, run in the hook after the session, D5):
  1. The signed-in user's `users.locale`, when not NULL and installed.
  2. The browser's language: parse `Accept-Language` per RFC 9110 (§12.5.4, §12.4.2), drop entries with `q=0`, sort by q from highest to lowest keeping header order on ties, then walk the sorted list. For each entry, use an exact match among the installed languages (`pt-BR`) if one exists, otherwise its primary subtag (`ca-ES` -> `ca`, `es-BO` -> `es`). The first match wins. The same matcher runs in the service worker against `navigator.languages` (D9).
  3. English.
- The language selector (and the time zone selector) exist only on `/profile`: "Browser default" (stores NULL) followed by every installed language, each named in its own language. Saving is a form action that updates `users.locale`; the 303 response makes the next request render in the new language. Setup and sign-in have no selector; they follow the browser. New accounts, including the administrator created at setup, start with `locale` NULL.
- Server and client must agree on the locale, or hydration flickers. The server resolves it once per request and passes it to the client through the root layout data, and the client uses that value rather than re-detecting from `navigator.languages`.
- `<html lang>` and `<html dir>` are set per request by replacing placeholders in `app.html` within `handle`'s `transformPageChunk`. The direction comes from `new Intl.Locale(code).getTextInfo().direction` (`rtl` for Arabic, Hebrew or Persian), so right-to-left languages work as soon as they are installed. See D10 for the CSS side.
- **Pseudo-locale for testing:** a generated language `en-XA` is installed only when the server starts with `I18N_PSEUDO=1`. The flag works with any build, including the production build that the e2e suite runs against, so the pseudo-locale run uses exactly the same code as the normal one. It is never set by default: `.env.example`, the README's deployment instructions and the default test run don't set it, the server logs a warning at startup when it is set, and a test checks that a production start without the flag has no `en-XA`. A dedicated `npm run test:e2e:pseudo` sets it. It transforms every English text: accented letters, brackets and about 35% extra length (`[Ŝîĝñ îñ ~~~~]`). Running the e2e suite in `en-XA` reveals hard-coded text, which stays plain, and layouts that break with longer languages.
- Formatting uses `Intl` with the active locale, through helpers in `#lib/i18n/format.ts`. The money module (D7) calls `Intl.NumberFormat` directly with an exact decimal string, since converting to a number would lose precision on large amounts.
- **Time zones:**
  - All timestamps are stored in UTC.
  - Display uses the signed-in user's `users.time_zone`, passed to the client with the locale through the root layout data, so server and client render the same text.
  - **Validation and canonical form are separate from the selector list.** A zone is valid when it is not a numeric offset and `new Intl.DateTimeFormat('en', { timeZone })` accepts it. Numeric offsets (`+02:00`, `-0400`) are rejected explicitly, because Node accepts them as time zones but they don't follow daylight saving changes. The stored value is its canonical form, `resolvedOptions().timeZone`. In the installed Node, `Asia/Kolkata` is valid and canonicalizes to `Asia/Calcutta`, and `UTC` is valid although `Intl.supportedValuesOf('timeZone')` lists neither `UTC` nor `Asia/Kolkata`.
  - The setup and sign-in forms include a hidden field filled in the browser with `Intl.DateTimeFormat().resolvedOptions().timeZone`. When the account has no time zone yet, the service stores the canonical form after a successful setup or sign-in. An invalid or missing value is ignored there: the zone stays NULL, so UTC is used, and setup or sign-in still succeeds.
  - The profile page's selector lists `UTC` first, then `Intl.supportedValuesOf('timeZone')`; the user's current zone is always selectable. An invalid value submitted there is rejected with a validation error.
  - Before sign-in, no times are shown, so no zone is needed.
  - For later changes: a transaction's date is a calendar date (`YYYY-MM-DD`) with no time zone, not a timestamp.
- **Checks:** `scripts/check-messages.ts`, part of `npm run check`, fails (naming the key in each case) when:
  - `messages/en.json` has invalid ICU syntax or an entry without a description
  - `messages/es.json` lacks a key from `en.json` or has an empty value
  - a Spanish entry's `source` hash differs from its current English text, so a changed English text forces a Spanish review
  - a translation uses different placeholders than its English text
  - a key doesn't start with an allowed prefix
  - a catalog isn't sorted by key (the message points to `npm run i18n:sort`)

  `npm run i18n:status` lists missing and stale texts per language. Spanish is checked because it ships with the code. Languages installed later may be partial, since they fall back per text.
- Validation messages from the server are returned as message keys and rendered on the client in the active language, so error text is never hard-coded in English on the server.
- *Why not Paraglide JS:* it compiles messages into the bundle at build time, so a language added from the app at runtime could never appear without a rebuild. Typed keys generated from `en.json` keep its main benefit, compile-time checking of keys.
- *Alternative: `i18next` or `svelte-i18n`.* Both support runtime dictionaries, but their keys are untyped strings and they are larger. `intl-messageformat` plus a generated key type is smaller and keeps keys checked.

### D15. Keep offline quick entry possible (decision for later changes)
The MVP is online-only. A later change may add offline quick entry: transactions logged without a network wait on the device and upload when it is back. Two rules make that possible without reworking the data model:
- **IDs the device can generate:** every household data record (members, accounts, categories, transactions, allocations and later ones) uses a UUIDv7 text primary key. The server accepts a valid ID from the client, so a record created offline already has its final ID. UUIDv7 also sorts by creation time. The `users` and `sessions` tables in this change are server-only and may keep server-generated IDs.
- **Duplicate-safe creates:** create operations for household data are idempotent by ID. Receiving the same record ID again with the same content succeeds without creating a second record; the same ID with different content is rejected as a conflict.

This change creates no household data tables, so nothing here implements these rules. The ledger and later changes must follow them, and their specs should include the duplicate-upload scenario.

### D16. Architecture: modular monolith organized by feature
**Description:** a modular monolith organized by feature, with a service layer, encapsulated data access, and pure functions for the domain rules.

The rules in this section are the contract. No other architecture school's conventions are implied. In particular, nothing requires one folder or file per command or use case: each feature keeps the internal layers listed below.

**Responsibilities:**

Each feature lives in `src/lib/features/<f>/`. Files directly in that folder are client-safe and may be imported by the browser. Everything in `<f>/server/` is server-only, which SvelteKit 3 guarantees for any `server` directory.

| Location | Exists | Responsibility | May depend on |
|---|---|---|---|
| `src/routes/` | always | HTTP adapter: read input, call one service function, map the result through `server/web/` to page data, a form failure or a redirect; render screens | feature `server/index.ts`, feature client-safe files, `server/web/`, `server/policy/` (only `can`, for navigation filtering in the root layout load, D10), `components/`, `i18n/`, `domain/`, `validation/`, SvelteKit |
| `src/hooks.server.ts` | always | `init`: runs the startup sequence once; `handle`: request pipeline (D5) | `server/startup.ts`, `server/web/`, feature `server/index.ts`, `i18n/`, SvelteKit |
| `features/languages/server/` | always | The languages feature (D14) | as any feature, plus `@formatjs/icu-messageformat-parser` and `messages/*.json` |
| `features/<f>/server/index.ts` | always | The feature's public server API: re-exports its service and query functions; the only server file other code may import | its own feature files |
| `features/<f>/server/service.ts` | always | Use cases: authorize, validate, apply rules, write through the repository, inside `withTransaction` | its own feature files; `server/core/`, `server/policy/`, `domain/`; other features' `server/index.ts` and client-safe files |
| `features/<f>/server/schema.ts` and `repo.ts` | when the feature owns tables | `schema.ts`: Drizzle tables owned by the feature. `repo.ts`: all data access to those tables, writes and simple lookups alike | `schema.ts`: Drizzle, and other features' `schema.ts` for foreign keys only (`sessions.user_id` -> `users.id`). `repo.ts`: its `schema.ts`, `server/db/`, `server/core/` |
| `features/<f>/server/queries.ts` | when there is a real read model (a list, summary or report), and always when reading other features' tables | Read-only, policy-scoped read models; the only file allowed to import other features' `schema.ts` | `server/db/`, `server/policy/`, `server/core/`, any feature's `schema.ts` (read-only) |
| `features/<f>/validation.ts` | when the feature accepts input | Client-safe Valibot schemas, used by the service and, for early feedback, by the browser | `valibot`, `validation/` |
| Other `server/` files (`session.ts`, `password.ts`, ...) | when a cohesive piece of the feature deserves its own file | Internal helpers of the feature | as `service.ts` |
| Tests | next to the code they test | Named after it: `service.test.ts`, `session.test.ts` | the file under test, test `ctx` |
| `domain/` | always | Pure domain rules and types (money, later splits and balances), no I/O | nothing in `server/` |
| `validation/` | always | Client-safe helpers turning Valibot issues into `{ field, key, params }` | `valibot` |
| `server/core/` | always | Framework-free plumbing: `ctx`, actors, typed errors, `withTransaction`, server-side validation | `server/db/` types, `validation/` |
| `server/web/` | always | The SvelteKit adapter: builds `ctx` from a request, writes or clears the session cookie from `resolveActor`'s result, and maps app errors to SvelteKit responses | SvelteKit, `server/core/`, `server/db/` (to build `ctx`), `i18n/` |
| `server/policy/` | always | Authorization decisions and query scoping (D6) | `server/core/` |
| `components/` | always | UI primitives | `i18n/`, Svelte |
| `i18n/` | always | Client-safe `t()`, generated keys, locale matcher, formatting helpers | `intl-messageformat`, `Intl` |
| `server/db/` | always | Connection, migrations and the shared backup function | Drizzle, better-sqlite3, all features' `schema.ts` (to build the schema object) |
| `server/startup.ts` | always | Startup sequence (D3): pre-migration backup, migrations, language seed | `server/db/`, `server/core/` (including `systemActor`), feature `server/index.ts` |
| `scripts/` | always | Operational commands (backup, message generation and check, scenario check) | `server/db/`, `server/core/` (including `systemActor`), `i18n/`, `@formatjs/icu-messageformat-parser` (message generation and checks); `messages/*.json` is read from disk, not imported |

**No empty structure:** don't create empty files, and don't write functions that only forward a call to another layer without adding anything (authorization, validation, mapping, a transaction). An optional file appears when its criterion above is met, and not before. A simple lookup belongs in `repo.ts` and is exposed through `service.ts`, where the policy check happens. The service function is never skipped, because it carries the authorization.

**Principles:** dependencies point inward (routes -> services -> domain), so business rules never depend on SvelteKit, SQLite or HTTP. Code that changes together lives together: one feature folder per OpenSpec capability area. Domain rules stay pure and I/O stays at the edges. No structure is added before a concrete need.

```
  routes (load/actions)  |  later: /api/v1 (JSON)      <- adapters: HTTP in/out,
            \                 /                            through server/web/
             v               v
        features/<f>/server/service.ts                 <- use cases: policy, rules,
             |        \                                   withTransaction
             v         v
  <f>/server/repo.ts, queries.ts     domain/*          <- data access | pure rules
             |
           SQLite
```

**Layer rules:**
1. **Routes are thin adapters.** They read input, call one service function and map the result to page data, a form failure or a redirect. No business logic and no SQL.
2. **Every service function takes `ctx` first** (`{ db, actor, locale, inTransaction }`) and calls `authorize` or `scope` (D6) before reading or writing. This includes functions exported for other features and public operations such as sign-in, which pass through explicit rules (D6).
3. **`domain/` has no I/O.** It holds pure functions and types only, unit tested without a database.
4. **Dependencies are explicit.** There is no DI container: `ctx` and function arguments carry them, and tests pass a `ctx` with a temporary database.
5. **Use cases own their transactions.** A use case opens its transactions through `withTransaction`; a route never does. Normally a use case uses exactly one. It uses several only when async work must happen between writes, and the design must name the case explicitly. In this change, the only such case is sign-in (D4: lock check, Argon2 verification outside any transaction, then outcome). Setup does its async work first and then uses one transaction (see Transactions below).

**Transactions:**
- `withTransaction(ctx, fn)` runs `fn(txCtx)` in a transaction and commits when it returns, or rolls back when it throws. **Failures that must keep their writes are returned, not thrown:** when a use case must persist state and still fail (for example, recording a failed sign-in), the callback returns a result value, and the service throws the typed error only after the commit. Throwing inside the callback is for failures whose writes should be undone. If `ctx.inTransaction` is already true, it simply runs `fn(ctx)` inside the existing transaction. So the outermost use case opens the transaction, and every service it calls joins it through `ctx.db`. Called services never open their own.
- **Transactions are synchronous.** better-sqlite3 (and Drizzle on it) can't await inside a transaction. `withTransaction` is typed so that `fn` returning a `Promise` is a compile error. Use cases follow one shape: **async work first, then short synchronous transactions**, normally just one. For example, setup hashes the password and generates the token before its single transaction. The documented exception (layer rule 5) is sign-in, whose Argon2 verification runs between its two transactions.
- Example, setup: hash the password, generate the session token, then in one transaction: re-check that no users exist, create the administrator (`users.createAdmin` with a system actor), create the session row. Either the administrator and the session both exist, or neither does. The route sets the cookie after the commit.

**Reads and writes are separate files, not separate systems:** `repo.ts` serves the writes and simple lookups, and `queries.ts`, once a feature needs one, serves the read models (lists, summaries, later dashboards) as optimized, policy-scoped SQL. Both use the same database.

**Boundary rules** (enforced by `eslint-plugin-boundaries`). They exist for their value today: **understanding** (one feature lives in one place), **testing** (each feature is tested through its public API) and **change control** (an OpenSpec change touches one feature folder, and lint shows when it reaches into another):
1. **Each feature owns its tables.** Only that feature's `repo.ts` writes them. Writes to another feature's data go through that feature's service.
2. **Features talk only through each other's `server/index.ts`** (public service and query functions) and client-safe files, never through another feature's `repo.ts`, `service.ts` or other internals.
3. **Cross-feature reads have one explicit path:** a feature's `queries.ts` may import other features' `schema.ts` to join their tables. The only other imports of another feature's `schema.ts` allowed are a `schema.ts` declaring a foreign key, and `server/db/` assembling the schema. `queries.ts` is read-only: lint bans `insert`, `update` and `delete` calls in those files. Keeping these reads in one kind of file makes every cross-feature dependency visible and reviewable.
4. **IDs follow D15** (UUIDv7 for household data), so records created offline already have their final identity.

**Transport-agnostic services** (the UI today, a public API later, both over the same services):
1. **Services never see HTTP.** No `Request`, cookies, `redirect()` or `error()` inside services. They take plain input plus `ctx` and return a value or throw a typed app error from `server/core/errors.ts`.
2. **`ctx.actor` doesn't depend on how the user signed in.** `server/web/ctx.ts` builds it from the session cookie now; an API adapter would build it from a token later. `server/core/` has no SvelteKit imports, and lint enforces it.
3. **Validation always runs in the service.** Each feature's client-safe `validation.ts` schemas are applied inside the service function, so every entry point validates the same way. The browser may run the same schemas for early feedback, but that never replaces the service check.
4. **Errors are codes, not text.** Errors and validation issues carry message keys and parameters. Each adapter renders them: translated text in the UI (D14), stable JSON error codes in an API.

**Validation with Valibot:** typed schemas with a small bundle, usable on the server and in the browser. `src/lib/validation/` turns Valibot issues into `{ field, key, params }` entries (usable in the browser too), `server/core/validation.ts` throws them as `Invalid`, and `server/web/responses.ts` returns them through `fail(400, ...)`.

**Deployment stance:** one process and one database. Microservices are not a goal and do not shape this design. Feature boundaries control code dependencies, but they don't make a feature independently deployable: shared transactions (for example setup creating a user and a session atomically) and cross-feature queries tie features together. Splitting a feature into its own service would mean redesigning both, as a separate decision taken only if a concrete need appears.

**Outline for a future public API** (its own change, built when there is a first consumer, such as offline quick entry from D15, a bot or script, or bank and exchange imports):
- Versioned JSON endpoints under `/api/v1`, calling the same services, with an OpenAPI document generated from the Valibot schemas.
- Personal API tokens: random, stored hashed (like sessions), scoped to a subset of actions, expiring, and revocable from the profile. A token's actor has exactly its user's permissions, and never more than its scope.
- Bearer authentication (so no CSRF exposure), rate limiting per token, and audit of the token used.

- *Alternative: logic in routes (plain SvelteKit style).* Fewer files, but rule B visibility would be repeated per route, and one missed filter leaks data.
- *Alternative: MVC grouped by type.* Spreads one feature over several folders and doesn't fit file-based routing.
- *Alternative: full Hexagonal / DDD with repository interfaces.* More indirection than one SQLite database justifies. A port can be added at a single point when a second implementation really exists.
- *Alternative: event sourcing.* Its benefits for a ledger (audit trail, history, sync) are considered for the ledger change as an append-only ledger (see Open Questions), without adopting the whole architecture.

## Risks / Trade-offs

- [SvelteKit 3 is newer than the agents' training data] → follow the Kit 3 idioms listed in D1, consult the official docs, lint-ban the removed Kit 2 modules, and keep `svelte-check` green on every task.
- [Libraries might lag Kit 3] → a scaffolding task verifies each integration early (task 1.6). The i18n stack is framework-independent (`intl-messageformat` plus our own small modules), and PWA tooling is avoided entirely (D9).
- [Runtime dictionaries lose compile-time checks] → keys and parameters are typed from `en.json` by `gen-messages.ts`, and `check-messages.ts` checks Spanish completeness and placeholders.
- [SQLite is single-writer] → WAL plus `busy_timeout` easily covers a family's write rate.
- [Our own auth code may have mistakes] → keep it small, follow the documented Lucia/Oslo pattern, hash tokens at rest, and test every auth scenario end to end.
- [The policy layer could be bypassed by querying the database directly] → lint forbids database and repository imports in routes, and service functions take `ctx`.
- [Feature boundaries erode over time (a quick import of another feature's repo)] → `eslint-plugin-boundaries` fails `npm run check` on any import that skips a feature's `server/index.ts`, on another feature's `schema.ts` imported outside `queries.ts`, and on SvelteKit imports in `server/core/`.
- [`await` inside a better-sqlite3 transaction silently breaks atomicity or throws] → `withTransaction` rejects async callbacks at compile time, and the setup atomicity test fails if the pattern is broken.
- [The `system` actor is misused to skip permissions] → only `auth` internals and scripts may construct it (lint), and system-only actions are few and listed in the policy table.
- [More files per feature than plain SvelteKit] → accepted: it buys policy safety and testability. ADR 0008 records these rules for later changes, and lint enforces the boundaries.
- [Behind a reverse proxy, the CSRF check and throttling see the proxy, not the client] → the deployment notes require `PROTOCOL_HEADER`/`HOST_HEADER` (or `APP_ORIGIN`) and `ADDRESS_HEADER`/`XFF_DEPTH`.
- [Hard-coded English strings slip in] → `svelte-check` can't catch literal text in markup, so review checks it, and the Spanish e2e run plus the axe checks in Spanish expose leftovers on the covered screens.
- [A long-running `VACUUM INTO` holds a read snapshot] → it doesn't block writers under WAL. The WAL file can grow during the backup and is checkpointed afterwards. The database is small, so the backup takes seconds.
- [Restoring with a stale WAL corrupts the result] → the documented restore removes `-wal` and `-shm` first, and a test covers it.
- [Backups on the same disk don't survive disk loss] → the README recommends copying `BACKUP_DIR` off-host.
- [Timing differences can still leak which usernames exist] → a dummy Argon2 check for unknown usernames, and a test comparing median response times.
- [Install behavior differs across browsers] → the spec requires the installability criteria rather than a prompt, and the README explains each browser's way to install.
- [Money beyond the safe-integer range] → `Money` rejects it with `MoneyOutOfRange`, and tests round-trip `Number.MAX_SAFE_INTEGER` exactly through SQLite and reject `MAX_SAFE_INTEGER + 1`.

## Migration Plan

Greenfield, so there is nothing to migrate. The first deploy is: `npm ci && npm run build`, set the environment, `node --env-file=.env build`. Migrations apply on start, and the first visit shows setup. Every later upgrade with pending migrations takes a `pre-migrate-<version>-<timestamp>.db` backup before migrating (D8). To roll back an upgrade: stop the process, restore **the pre-migration backup taken by that upgrade** (not simply the latest scheduled backup, which may already have the new schema) following the restore steps in D8, and start the previous release (check out its `vX.Y.Z` tag and build it, ADR 0018), whose schema matches it. Data written after the upgrade is lost by the rollback, so the release notes for an upgrade should say so.

## Open Questions

- The base currency for reports is decided in the ledger change. The currency registry already includes the likely candidates.
- The hosting target (home server, VPS, PaaS) can be chosen at first deploy. Nothing here depends on it.
- For the ledger change: an append-only ledger, where transactions are never edited or deleted in place and corrections are recorded as reversal or adjustment entries. It would give an audit trail and simplify offline sync (D15). Decide before writing the ledger change's specs; nothing in this change depends on it.
