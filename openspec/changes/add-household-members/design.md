# Design

## Context

See `proposal.md` for why. What exists after `bootstrap-app-foundation` (v0.1.0):

- `users` owns the `users` table (integer IDs, server-only accounts): username, display name, password hash, role `admin` or `member`, locale and time zone. `createAdmin` runs only as the system actor during setup.
- `auth` owns `sessions` and `login_attempts`, hashes passwords (Argon2id, `password.ts`), runs sign-in in two transactions around the async hash (D4 of the foundation), and resolves the request's actor from the session (`queries.ts` joins `sessions` with `users`). `auth` imports `users`; `users` imports nothing from `auth`.
- The policy (`server/policy/`) is a matrix of actions by actor (ADR 0004). Non-admin users may only sign out and use their own profile.
- The request pipeline is `session → locale → setupGate → routeGuard` (`hooks.server.ts`).
- Message key prefixes are derived from the feature folders, so a new `household` feature may use `household.` keys without changing the checks.
- ADRs in force that shape this design: 0002 (synchronous transactions), 0003 (own session auth), 0004 (deny by default), 0006 (translations), 0007 (UUIDv7 and idempotent creates), 0008 (feature layout), 0021 (timestamps in UTC), 0023 (`app/` folder). Paths below are relative to `app/`.

## Goals / Non-Goals

**Goals:**
- Members, not user accounts, become the people household data refers to, so the ledger (change 7) and the visibility rule (change 3) attribute to members.
- Account states (deactivated, temporary password) are enforced in one place each: sign-in, session validation and the policy.
- Every new action has a row in the matrix and a test per cell, as in the foundation.

**Non-Goals:**
- Roles beyond `admin` and `member`; grants; scoping queries by visibility (change 3).
- A client-side UUID generator: forms get their IDs from the server for now (D4).
- Any change to setup, the session lifetime or the throttling limits.

## Decisions

### D1. A `household` feature owns the household, member types and members

New feature folder `src/lib/features/household/` with `validation.ts` (client-safe Valibot schemas) and `server/` (`index.ts`, `service.ts`, `repo.ts`, `schema.ts`, `queries.ts`). It owns three tables:

| Table | Columns | Notes |
|---|---|---|
| `household` | `id` integer primary key, always 1 (`CHECK (id = 1)`); `name` text, null while unnamed; `updated_at` | Created on the first rename (upsert); reading a missing row means "unnamed" |
| `member_types` | `id` text UUIDv7; `name`; `name_key` unique; `base_class` (`adult`, `minor`, `dependent`); `archived_at` nullable; `created_at` | |
| `members` | `id` text UUIDv7; `name`; `name_key` unique; `member_type_id` → `member_types`; `user_id` → `users` nullable, unique; `first_linked_at` nullable; `archived_at` nullable; `created_at` | `first_linked_at` is set on the first link and never cleared: it decides "has ever been linked" for deletion |

- **The link lives on `members`**, not on `users`. Why: members are household data and users stay server-only accounts (ADR 0007 keeps integer IDs for `users`). The `users` feature doesn't need to know members exist; the household feature declares the foreign key from its own `schema.ts`, which ADR 0008 allows. A unique index on `members.user_id` gives "one account per member, one member per account" (SQLite allows many NULLs in a unique index).
- **Names unique ignoring case:** `name_key` is the name after trimming, NFKC and `toLowerCase()`, with a unique index. Why: SQLite's `NOCASE` collation only folds ASCII, so "Lucía" and "lucía" would both pass. Uniqueness covers archived rows too, as the spec says.
- **"In use" is computed, not stored:** a type is in use when any member row (archived or not) references it; the base class check and the delete check query it inside the write transaction.
- `queries.ts` builds the members list with the linked account's username, role and state (a read of `users` across features, the one path ADR 0008 allows). The service returns those fields only when the actor may view accounts (D5); for others it never selects them.
- The household's single row is not created by a device and never offline, so ADR 0007's UUIDs don't apply to it.

Alternatives: a `member_id` column on `users` (makes `users` depend on household data and mixes server-only accounts with household records); a separate `member_accounts` link table (one more table for a one-to-one link with no attributes of its own).

### D2. Account states on `users`

Two columns added to `users`, both `NOT NULL` with defaults, so existing rows need no backfill: `active` (boolean, default true) and `password_temporary` (boolean, default false).

- **Sign-in:** `getCredentialsForSignIn` also returns `active`. The second sign-in transaction treats `!credentials.active` exactly like a wrong password (records the failure, same message). The hash is still verified once, so the response time doesn't reveal the state (the "No account enumeration" requirement).
- **Session validation:** `findSessionWithUser` also selects `active` and `password_temporary`. A session of an inactive user is invalidated and the cookie cleared, like an expired one, so the request is anonymous. Deactivation also deletes the sessions (D6); the check at validation covers a session created in the same instant.
- **The actor:** `UserActor` gains `passwordTemporary: boolean`, read on every request, so a reset or a first sign-in takes effect at once, and a role change applies from the next request without touching sessions (the "Account roles" requirement).

### D3. Account management split between `users` and `auth`

The `users` feature owns the `users` rows; `auth` owns hashing and sessions. Dependencies stay one-way: `household → auth → users` and `household → users`.

| Use case | Where | Transactions |
|---|---|---|
| Create an account for a member | `household` service: hashes through `auth`'s exported `hashNewPassword`, then calls `users.createAccount` and links the member | hash first, then one transaction (account and link together, or neither) |
| Link and unlink an existing account | `household` service | one |
| Reset a password | `auth` service: hash, then `users.setPassword(temporary)` and delete all the user's sessions | hash first, then one |
| Deactivate, reactivate | `auth` service: `users.setActive`, and on deactivation delete all the user's sessions | one |
| Change role | `users` service | one |
| Change own password, including the forced change | `auth` service | **two**, see below |
| List accounts | `users` service (settings accounts page) | none |

**Changing one's own password needs two transactions**, like sign-in: the first checks the username's lock and reads the current hash; Argon2 verification and hashing of the new password run outside any transaction (async, ADR 0002); the second re-checks the lock, then either records a failure (wrong current password, returned and thrown after commit so the counted failure isn't rolled back) or saves the new hash, clears `password_temporary` and deletes the user's other sessions. In the forced change (password temporary), the current password isn't asked: the user has just signed in with it. The new password must differ from the temporary one, checked by verifying it against the stored hash.

**The last active administrator** (the "At least one active administrator" requirement): `users.setRole` and `users.setActive` count the other active administrators inside their transaction and refuse with a `Conflict` when none would remain. Self-targeting is refused by the policy (D5) before that. The app is one Node.js process and better-sqlite3 runs transactions synchronously, so two of them never interleave: concurrent demotions are serialized and the second one sees the first's result.

Alternative: everything in a new `accounts` feature. Rejected: it would own no table and only forward to `users` and `auth`, which ADR 0008's "no functions that only forward a call" rules out.

### D4. IDs and idempotent creates for member types and members

Following ADR 0007: both tables use UUIDv7 text keys, and `create` is idempotent by ID: the same ID with the same content (name key, base class or type) returns success without a second row; the same ID with different content is a `Conflict`.

- **Who generates the ID:** for now the server, when it renders the form: the ID goes in a hidden field, so a double submission or a resubmitted form sends the same ID. Offline entry (change 13) will generate IDs on the device; the service already accepts any valid UUIDv7.
- **Validation:** the ID must be a UUID with version nibble 7 (`v.regex` in `household/validation.ts`).
- **Generator:** `uuid` **14.0.3** (`v7()`), checked on npm on 2026-10-29, published 2026-10-10; ESM, no dependencies, server-only for now. Alternative: a hand-written generator (about 20 lines, but monotonicity within a millisecond and the random bits are easy to get subtly wrong).
- User accounts keep server-generated integer IDs (ADR 0007 allows it for server-only tables); a double submission of the new account form is refused because the member already has an account (spec "Duplicate account submission").

### D5. Policy matrix

New actions, by actor. ✓ allowed, ✗ denied; "user" is a signed-in user with the role member.

| Action | anonymous | user | admin | system | Used by |
|---|---|---|---|---|---|
| `household.view` | ✗ | ✓ | ✓ | ✗ | household name, members list, member types list |
| `household.update` | ✗ | ✗ | ✓ | ✗ | rename the household |
| `memberTypes.manage` | ✗ | ✗ | ✓ | ✗ | create, rename, change base class, archive, unarchive, delete types |
| `members.manage` | ✗ | ✗ | ✓ | ✗ | create, change, archive, unarchive, delete members; link and unlink accounts; see archived members |
| `accounts.view` | ✗ | ✗ | ✓ | ✗ | usernames, roles and states, in the members list and the accounts page |
| `accounts.create` | ✗ | ✗ | ✓ | ✗ | create an account for a member |
| `accounts.manage` (target `{ userId }`) | ✗ | ✗ | ✓ except own account | ✗ | reset password, deactivate, reactivate, change role |
| `password.changeOwn` | ✗ | ✓ | ✓ | ✗ | change own password, forced or not |

- Viewing members and member types uses the single `household.view`: they are shown together and change 3 will refine visibility per member through `scope()`, not through more view actions.
- Existing rows don't change, except that `users.create` stays system-only (setup); administrators create accounts through `accounts.create`.
- **Temporary password gate:** in `can()`, a user actor with `passwordTemporary` is denied every action except `password.changeOwn`, `auth.signOut` and the public ones (`auth.setupStatus`, `auth.signIn`, `languages.read`). This keeps the rule in the one place every operation passes through (ADR 0004), so no endpoint can forget it. The route guard adds the redirect for pages (D6).
- The matrix test gains one row per new action and a column for "user with a temporary password".

### D6. Pages and the request pipeline

| Route | Who | What |
|---|---|---|
| `(app)/members` | every signed-in user | household name and active members; for administrators also archived members, accounts and links, and the actions |
| `(app)/members/[id]` | administrators | edit name and type, archive, unarchive, delete; account section: create, link, unlink, and reset, deactivate, reactivate, role for the linked account |
| `(app)/settings/household` | administrators | rename the household |
| `(app)/settings/member-types` | administrators | the catalog, with member counts |
| `(app)/settings/accounts` | administrators | every account, including those with no member, with the same account actions |
| `(app)/profile` | every signed-in user | gains a "Change password" form (current, new, confirm) |
| `(password)/password` | a user whose password is temporary | new password twice; its own minimal layout without navigation, so its load needs nothing the gate denies |

- **Route guard:** after resolving a user with `passwordTemporary`, page requests other than `/password`, `/logout` and the public paths redirect (303) to `/password?redirectTo=<path>`; other requests get a 403. After the change, the page redirects to `redirectTo` through the existing `safeRedirect`.
- **Navigation:** "Members" is added for every signed-in user; "Settings" stays administrators-only and gains links to household, member types and accounts.
- Every form action is a thin adapter: parse the form, call one service function, map errors with `failForAction`. Confirmation for destructive actions (archive, delete, deactivate, reset) is a second step on the page, not a browser dialog.

### D7. Translations

- New keys under `household.` (household, member types, members, base classes), `users.` (accounts, roles, states) and `auth.` (password change, reset). Each has a description and a reviewed Spanish translation, checked by `npm run check`.
- The three base classes are fixed list values with translated labels (`household.base_class.adult`, `.minor`, `.dependent`): "Adult"/"Adulto", "Minor"/"Menor", "Dependent"/"Dependiente".
- Counts use ICU plurals (`{count, plural, one {# member} other {# members}}`); member, type and household names are passed as arguments, never concatenated.

### D8. Migration

One generated migration (`drizzle/0001_*.sql`): `CREATE TABLE household`, `member_types` and `members` with their indexes, and `ALTER TABLE users ADD COLUMN active ... DEFAULT 1` and `password_temporary ... DEFAULT 0`. No hand-written SQL. It runs at startup after the automatic pre-migration backup, as every migration does.

## Risks / Trade-offs

- [Deactivated users see "Invalid username or password" and may think they mistyped] → accepted, to keep sign-in from revealing account states; the administrator who deactivated the account tells them. Their attempts are throttled like any other.
- [A temporary password is known to the administrator until the user replaces it] → the gate allows nothing else until it's replaced, and a reset ends all sessions.
- [The forced change asks no current password, so someone holding a fresh session cookie of a user with a temporary password could set the password] → that cookie comes from signing in with the temporary password, so they already know it; sessions are HttpOnly.
- [Unicode lowercasing differs from locale-aware folding for a few scripts (Turkish dotted i)] → accepted for a household's names; the same `name_key` function is used everywhere, so the result is consistent.
- [The members list query reads `users` from the household feature] → the one cross-feature read path ADR 0008 allows, read-only, and only the fields the actor may see.

## Migration Plan

Upgrade: deploy v0.2.0 and start it; the pre-migration backup is taken, then the migration adds the tables and columns. The existing administrator stays active with their own password, and the household starts unnamed with no member types or members.

Rollback: restore the pre-migration backup of this upgrade and start v0.1.0, as the README describes. Members, types and accounts created after the upgrade are lost.
