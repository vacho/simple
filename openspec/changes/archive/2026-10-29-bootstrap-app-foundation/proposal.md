# Proposal

## Why

The repository has OpenSpec scaffolding but no application yet. Every later slice (household members, access control, categories, ledger, quick entry, reporting) needs the same base: a running web app, a database with migrations, authenticated users, and a server-side place where every read and write is authorized. Building that base first, with permissions in mind from day one, avoids retrofitting access rules into finished queries and reports later.

## What Changes

- Create a self-hosted, lightweight web application that can be installed as a PWA on phones and desktops, backed by a single SQLite database file.
- Add a first-run setup flow: when no users exist, the app asks for the first account and makes it the administrator.
- Add sign-in and sign-out with server-side sessions, throttling of repeated failed sign-in attempts, and no user enumeration.
- Add a server-side access policy layer that denies by default: every request except the public sign-in, setup and offline pages requires a signed-in user, and every operation must pass an explicit rule. In this change: anyone may check setup status, read the installed languages and their translations, and sign in; visitors may run setup only while no accounts exist; every signed-in user may sign out and manage their own profile; administrators may do everything else; and internal operations (account creation during setup, reading stored credentials, checking whether any account exists, session validation, installing the preinstalled languages) are reserved to the application itself. The policy matrix in `design.md` (D6) is the complete reference. Per-user grants come in a later change.
- Make the app translatable from the start: English and Spanish are fully translated, the app follows the browser's language by default (English when the browser's language isn't supported), and each user can choose a language on their profile page, the only place with a language selector.
- Add a profile page where each signed-in user chooses their language and time zone. Times are stored in UTC and shown in the user's zone.
- Add a consistent backup of the SQLite database that can be run on a schedule, with retention of a fixed number of copies, an automatic backup before every schema upgrade, and documented restore and rollback steps.
- Add the internal foundations later slices rely on: schema migrations, an exact money representation (integer minor units per currency), and a test harness (unit and end-to-end).
- Choose the concrete stack (UI framework, ORM, build and test tools) in `design.md`, targeting the latest stable releases (SvelteKit 3).
- Version the app from the start: `package.json` `version`, shown to administrators on the settings page. Closing this change makes the first release, `v0.1.0` (ADR 0018). Every clone enables the project's Git hooks through npm's `prepare` script (ADR 0019).

Out of scope: household members, linking users to members, admin creation of additional users, granular permission grants, categories, accounts, transactions, and the choice of a base reporting currency. Each belongs to a later change. Packaging and deployment automation (Docker, hosting, CI) are decided once the app is built.

## Capabilities

### New Capabilities
- `user-auth`: user accounts, first-run administrator setup, sign-in, sign-out, sessions, and protection against brute-force sign-in.
- `access-control`: server-side authorization of every request and operation, deny by default, with an explicit rule for every action and kind of actor (anonymous, signed-in user, administrator, the application itself); later changes add grants and scopes to this capability.
- `app-shell`: the installable, responsive application shell (PWA manifest, icons, mobile and desktop layout, navigation frame, signed-in user menu).
- `localization`: the UI language (English and Spanish fully translated, more addable), browser language by default, the per-user language and time zone on the profile page, and language-aware formatting of dates, times and numbers.
- `data-backup`: consistent, scheduled snapshots of the database with bounded retention, pre-upgrade backups, and restore and rollback.

### Modified Capabilities
<!-- None: the project has no existing specs. -->

## Impact

- New application code at the repository root (Node.js 24, npm), including the server, UI, database schema and migrations, and tests.
- New runtime data directory (SQLite database and backups) that must be excluded from git, together with environment files.
- New dependencies: a UI framework with server rendering, a SQLite driver, an ORM with migrations, a password hashing library, an internationalization library, and unit and end-to-end test runners (exact choices and versions in `design.md`).
- Every user-facing string, in this and all later changes, goes through the translation catalogs; later changes must ship English and Spanish text together.
- Operational: the app runs as a single Node.js process; the backup is a command meant to be called by a scheduler (cron or systemd timer) on the host.
- Versioning: this change is the first release, a minor one per ADR 0018 (`0.0.1` -> `v0.1.0`), tagged on `main` when it is archived.
