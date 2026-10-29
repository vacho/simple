# Simple

A personal and family finance app for one household, self-hosted: a SvelteKit 3 web app, installable on phones and desktops, backed by a single SQLite file.

This folder is the app, its own npm project ([ADR 0023](../docs/adr/0023-app-in-its-own-folder.md)). Every command below runs here, in `app/`. The rest of the repository is the tooling used to build it: specs and changes in `openspec/`, decision records in `docs/adr/`.

## Requirements

- Node.js 22.17 or later; 24 is recommended.
- npm.
- HTTPS for any use beyond `localhost`: browsers only install the app and run its service worker over HTTPS (see [HTTPS and reverse proxies](#https-and-reverse-proxies)).

## Set up

```sh
cd app
npm ci
cp .env.example .env
mkdir -p data/backups
```

The last line creates the backup directory (`BACKUP_DIR`); see [Backups](#backups).

`npm ci` also enables the repository's Git hooks (see [Git hooks](#git-hooks)).

### Environment variables

Read from `.env` when the app starts with `node --env-file=.env build`, and by `npm run backup`. Relative paths are resolved from the app folder.

| Variable                                                        | Default           | Meaning                                                                               |
| --------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_PATH`                                                 | `./data/app.db`   | The SQLite database file. Its folder is created when missing.                         |
| `BACKUP_DIR`                                                    | `./data/backups`  | Where scheduled and pre-migration backups are written.                                |
| `BACKUP_KEEP`                                                   | `14`              | How many scheduled backups to keep.                                                   |
| `HOST`, `PORT`                                                  | `0.0.0.0`, `3000` | Where the server listens.                                                             |
| `PROTOCOL_HEADER`, `HOST_HEADER`, `ADDRESS_HEADER`, `XFF_DEPTH` | unset             | Behind a reverse proxy only: see below.                                               |
| `I18N_PSEUDO`                                                   | unset             | `1` installs the `en-XA` pseudo-locale, for testing only. Never set it in production. |

One variable is read at build time instead: `APP_ORIGIN`, the app's own URL, used as SvelteKit's `paths.origin` (see below).

`data/` and `.env` are git-ignored.

## Develop

```sh
npm run dev        # development server on http://localhost:5173
npm run check      # types, lint (code, boundaries, CSS), formatting, message catalogs
npm run test:unit  # unit and integration tests (Vitest)
npm run test:e2e   # end-to-end tests against the production build (Playwright)
```

The end-to-end tests run on Chromium, Firefox and WebKit; install the browsers once with `npx playwright install chromium firefox webkit`. Each test starts the production build on its own temporary database.

To try the development server on a phone, expose it through a [Cloudflare quick tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) (`cloudflared tunnel --url http://localhost:5173`): `server.allowedHosts` in `vite.config.ts` lets `*.trycloudflare.com` through, and the tunnel's HTTPS lets the phone install the app. It applies to `npm run dev` only.

`npm run check` must pass before a task is done. It runs `svelte-check` (including the service worker's own tsconfig), ESLint with the feature boundaries, stylelint, Prettier, and the message catalog checks.

## Build and run

```sh
npm run build
node --env-file=.env build
```

Start the server from the app folder: database migrations are read from `drizzle/` there. Migrations apply automatically before the first request is served; when they upgrade an existing database, a pre-migration backup is taken first. If the backup or a migration fails, the server does not start.

The first visit shows the setup page, which creates the first account, the administrator. Until then every page leads to setup.

## HTTPS and reverse proxies

Outside `localhost`, serve the app over HTTPS through a TLS-terminating reverse proxy. With [Caddy](https://caddyserver.com/), which obtains certificates automatically:

```caddyfile
finance.example.com {
	reverse_proxy localhost:3000
}
```

For a name that is only reachable at home, `tls internal` makes Caddy use its own certificate authority; install Caddy's root certificate on each device.

Then tell the app which headers the proxy sets, in `.env`:

```sh
PROTOCOL_HEADER=x-forwarded-proto  # the original protocol, so cookies are Secure and forms pass the origin check
ADDRESS_HEADER=x-forwarded-for     # the client address, for sign-in throttling
XFF_DEPTH=1                        # one proxy in front of the app
# HOST_HEADER=x-forwarded-host     # only if the proxy rewrites the Host header (Caddy doesn't)
```

Form submissions from any origin but the app's own are rejected. The app derives its origin from the request, assuming `https` unless `PROTOCOL_HEADER` says otherwise. To serve over plain http without a proxy, for example on `localhost`, build with the origin instead:

```sh
APP_ORIGIN=http://localhost:3000 npm run build
```

## Supported browsers and installing the app

Supported: the latest two versions of Chrome and Edge (Android and desktop), Safari on iOS 17 or later and on macOS, and the latest two versions of Firefox. Each offers installation its own way:

- **Chrome and Edge** (Android and desktop): the install prompt, or "Install app" in the browser menu.
- **Safari on iOS**: the Share menu, then "Add to Home Screen".
- **Safari on macOS**: File, then "Add to Dock".
- **Firefox**: works as a website; desktop Firefox can't install web apps.

The installed app opens without the browser's address bar. Without network it shows an offline page in the language last used on that device; it never caches pages or data.

## Languages

English is the base language, built into the code. Spanish is preinstalled. Other languages are app data in the database: a later change adds the administrators' language catalog, where a language is added, translated, reviewed and activated without changing code or redeploying. The app follows the browser's language until a user picks one on their profile page, the only place with a language selector.

Texts live in two catalogs:

- `messages/en.json`, the source: each entry is `{ "text": <ICU MessageFormat>, "description": <where and how the text is used> }`. The description is required; translators depend on it.
- `messages/es.json`: each entry is `{ "text": ..., "source": <hash of the English text it translates> }`.

Keys start with the owning feature's folder name (`auth.`, `users.`...) or a shared prefix (`common.`, `shell.`, `offline.`, `validation.`, `errors.`). Every new English text needs its reviewed Spanish translation in the same change. `npm run check` fails, naming the key, on a missing description or translation, a Spanish text made from an older English text, different placeholders, a key without a known prefix, or catalogs out of order.

```sh
npm run i18n:status  # missing and outdated texts per language
npm run i18n:sort    # sort the catalogs by key
```

`npm run test:e2e:pseudo` runs the screen checks in `en-XA`, a pseudo-locale that accents and lengthens every text: hard-coded text shows up plain, and longer languages that break a layout show up as overflow. It starts the production build with `I18N_PSEUDO=1`.

## Backups

`npm run backup` writes a verified copy of the database to `BACKUP_DIR` as `app-YYYYMMDDTHHMMSSZ.db` (UTC), without stopping the app, then deletes the oldest scheduled backups beyond `BACKUP_KEEP`. Pre-migration backups (`pre-migrate-<version>-<timestamp>.db`, the three newest kept) and other files are never touched.

`BACKUP_DIR` must exist: the command fails rather than create it, so a mistyped path is reported instead of quietly filling another disk.

Exit codes: `0` done; `1` no backup was made (nothing was deleted); `2` the backup was made, but an old one could not be deleted (the message names it). Have the scheduler report any non-zero code.

Schedule it with one of the supported command lines, for an app installed in `/opt/app`:

```cron
# crontab: every day at 03:00
0 3 * * * npm --prefix /opt/app run backup
```

```ini
# /etc/systemd/system/simple-backup.service
[Unit]
Description=Back up the household finance database

[Service]
Type=oneshot
WorkingDirectory=/opt/app
ExecStart=/usr/bin/npm run backup
```

```ini
# /etc/systemd/system/simple-backup.timer
[Unit]
Description=Daily household finance backup

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable the timer with `systemctl enable --now simple-backup.timer`. Calling `node --import tsx /opt/app/scripts/backup.ts` from another directory is not supported: Node looks for the `tsx` loader in the current directory.

Backups on the same disk don't survive the loss of that disk: copy `BACKUP_DIR` to another machine or an external drive regularly.

### Restore

1. Stop the app.
2. Delete `app.db-wal` and `app.db-shm` next to the database, if present. A leftover write-ahead log would otherwise be replayed over the restored file.
3. Copy the backup over `app.db`.
4. Start the app. A pre-migration backup must be started with the release that matches its schema (see below).

## Versions and releases

The version is `version` in `package.json` ([ADR 0018](../docs/adr/0018-versions-release-after-approval-and-rollback.md)), in Semantic Versioning, shown to administrators on the settings page. Every release is tagged `vX.Y.Z` on `main`.

### Rolling back an upgrade

1. Stop the app.
2. Restore the **pre-migration backup taken by that upgrade**, following the restore steps. The latest scheduled backup may already have the new schema.
3. Check out the previous release and build it: `git checkout vX.Y.Z`, then `npm ci && npm run build` in `app/`.
4. Start it. Its schema matches the restored backup, so no migration runs.

Data written after the upgrade is lost by the rollback.

## Git hooks

The repository's hooks in `.githooks/` check every commit ([ADR 0025](../docs/adr/0025-git-hooks-contract-with-multi-agent-tooling.md)): commit titles follow the convention, and app code never goes straight to `main`. `npm ci` and `npm install` enable them through the `prepare` script; to enable them by hand: `git config core.hooksPath .githooks`. Never bypass them with `--no-verify`.

## For contributors

How the code is organized, the feature folders and the rules between layers, is [ADR 0008](../docs/adr/0008-modular-monolith-by-feature.md); `npm run check` enforces its boundaries. In short: routes are thin adapters, services authorize and validate, each feature owns its tables, and nothing reaches the database except through a feature's service.

The app uses SvelteKit 3 and Svelte 5, which are newer than most tools' training data. Follow the Kit 3 idioms, and check [the official docs](https://svelte.dev/docs/kit) before writing Kit or Svelte code:

- Configuration lives in `vite.config.ts` as `sveltekit({ ... })` options; there is no `svelte.config.js`.
- Internal imports use `#lib/...` subpath imports with file extensions, not `$lib`.
- Page state comes from `$app/state`, environment variables from `$app/env/private` and `$app/env/public` (declared in `src/env.ts`), build information from `$app/env`. `$app/stores` and `$env/*` no longer exist; lint rejects them.
- `error(status, message)` takes a string message; use `Response.json()` instead of `json()`.
- Hook types and `sequence` come from `@sveltejs/kit/hooks`.
- `resolve()` from `$app/paths` takes paths without the leading slash: `resolve('profile')`.
- Runes only (`$state`, `$derived`, `$props`), no stores. Remote functions stay off; use form actions and `load`.
- Server-only code lives under a `server` folder or file name segment.
