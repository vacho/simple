# 0008. Modular monolith organized by feature

- Status: Proposed
- Date: 2026-10-22
- Change: bootstrap-app-foundation (`openspec/changes/bootstrap-app-foundation/design.md`, decision D16)

## Context

The app grows one OpenSpec change per capability area, written by AI agents. Code for one feature should live in one place, permissions must never be skipped, and the same services should later serve a public API.

## Decision

One deployable app organized by feature under `src/lib/features/<feature>/`, with a server-only `server/` part. Routes are thin adapters; every service function takes `ctx` first, authorizes (0004), validates with Valibot and owns its transactions; `domain/` holds pure rules with no I/O. Each feature owns its tables, features talk only through each other's `server/index.ts`, and cross-feature reads go only through read-only `queries.ts`. Services never see HTTP and return error codes, not text. `eslint-plugin-boundaries` enforces the boundaries. `docs/architecture.md` is the full guide.

## Consequences

- An OpenSpec change usually touches one feature folder, and lint shows when it reaches into another.
- More files per feature than plain SvelteKit, in exchange for policy safety and testability.
- No empty files or pass-through functions: optional files appear only when needed.
- Splitting a feature into its own service would need a new decision: shared transactions and cross-feature queries tie features together.

## Alternatives considered

- Logic in routes: visibility rules repeated per route, and one missed filter leaks data.
- MVC grouped by type: spreads one feature over several folders.
- Full hexagonal or DDD with repository interfaces: more indirection than one SQLite database justifies.
- Event sourcing: considered for the ledger only, as an append-only ledger.
