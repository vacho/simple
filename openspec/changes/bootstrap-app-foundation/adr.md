# ADR Review

## ADRs in force reviewed

None yet: this is the first change, and `docs/adr/` had no ADRs.

## ADRs created

- [0001 SvelteKit 3 with the Node adapter as the application framework](../../../docs/adr/0001-sveltekit-with-node-adapter.md), from D1
- [0002 SQLite through better-sqlite3 and Drizzle ORM](../../../docs/adr/0002-sqlite-with-drizzle.md), from D3
- [0003 Own session authentication following the Lucia/Oslo pattern](../../../docs/adr/0003-own-session-authentication.md), from D4
- [0004 Single policy layer that denies by default](../../../docs/adr/0004-deny-by-default-policy-layer.md), from D6
- [0005 Money as integer minor units](../../../docs/adr/0005-money-as-integer-minor-units.md), from D7
- [0006 Runtime translation dictionaries with typed English keys](../../../docs/adr/0006-runtime-translation-dictionaries.md), from D14
- [0007 Device-generated UUIDv7 IDs and idempotent creates for household data](../../../docs/adr/0007-device-generated-ids-and-idempotent-creates.md), from D15
- [0008 Modular monolith organized by feature](../../../docs/adr/0008-modular-monolith-by-feature.md), from D16

## ADRs to supersede

None.

## Design decisions not recorded as ADRs

- D0 Versions: version picks, refreshed by each change.
- D2 TypeScript strict, npm, ESLint, Prettier: tooling.
- D5 Request pipeline: implementation of 0003, 0004 and 0006 inside `hooks.server.ts`.
- D8 Backup with `VACUUM INTO`: the behavior is fixed by the `data-backup` spec; the mechanism can be swapped without affecting other changes.
- D9 PWA with the built-in service worker: the behavior is fixed by the `app-shell` spec; the tooling can be swapped.
- D10 UI foundation: plain CSS and own primitives are reversible; the right-to-left rule is enforced by lint and covered by 0006.
- D11 Testing: tooling and process.
- D12 Project layout: the concrete layout of 0008, documented in `docs/architecture.md`.
- D13 Configuration: environment variables, a one-off detail.
