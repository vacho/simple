# 0008. Modular monolith organized by feature

- Status: Accepted
- Date: 2026-10-22
- Change: bootstrap-app-foundation (`openspec/changes/archive/2026-10-29-bootstrap-app-foundation/design.md`, decision D16)

## Context

The app grows one OpenSpec change per capability area, written by AI agents. Code for one feature should live in one place, permissions must never be skipped, and the same services should later serve a public API. This ADR is also the reference for how the code is organized: there is no separate architecture document, and `eslint-plugin-boundaries` enforces the import rules below.

## Decision

One deployable app, organized by feature, with a service layer, encapsulated data access and pure domain rules. Dependencies point inward: routes -> services -> domain.

**Where things live** (`src/lib/`):

| Location | Exists | Responsibility |
|---|---|---|
| `src/routes/` | always | Thin HTTP adapters: read input, call one service function, map the result to page data, a form failure or a redirect |
| `features/<f>/` (files directly in it) | when needed | Client-safe code, such as `validation.ts` (Valibot schemas) |
| `features/<f>/server/index.ts` | always | The feature's public server API; the only server file other code may import |
| `features/<f>/server/service.ts` | always | Use cases: authorize, validate, apply rules, write inside `withTransaction` |
| `features/<f>/server/schema.ts`, `repo.ts` | when the feature owns tables | Its Drizzle tables; all access to them |
| `features/<f>/server/queries.ts` | for real read models, and always when reading other features' tables | Read-only, policy-scoped queries |
| `domain/` | always | Pure rules and types (money, later splits and balances), no I/O |
| `server/core/` | always | Framework-free plumbing: `ctx`, actors, typed errors, `withTransaction`, validation |
| `server/web/` | always | The only server code that imports SvelteKit: builds `ctx`, writes cookies, maps errors to responses |
| `server/policy/` | always | Authorization and query scoping (ADR 0004) |
| `server/db/`, `server/startup.ts` | always | Connection, migrations, backup function; the startup sequence |

**Layer rules:**
1. Routes hold no business logic and no SQL, and never import the database or a repository.
2. Every service function takes `ctx` first (`{ db, actor, locale, inTransaction }`) and authorizes or scopes before touching data, including functions other features call.
3. `domain/` has no I/O. There is no DI container: `ctx` and arguments carry dependencies.
4. Use cases own their transactions, normally one, synchronous (ADR 0002); async work comes first. Failures that must keep their writes are returned from the transaction, then thrown.

**Boundary rules:**
1. Each feature owns its tables; only its `repo.ts` writes them.
2. Features talk only through each other's `server/index.ts` and client-safe files.
3. Another feature's `schema.ts` may be imported only by a `queries.ts` (read-only), by a `schema.ts` declaring a foreign key, and by `server/db/`.
4. IDs follow ADR 0007.

**Transport-agnostic services:** services never see HTTP; they take plain input plus `ctx` and return a value or throw a typed error. Validation always runs in the service. Errors carry message keys, rendered by each adapter.

**No empty structure:** no empty files and no functions that only forward a call. An optional file appears when its criterion above is met.

## Consequences

- An OpenSpec change usually touches one feature folder, and lint shows when it reaches into another.
- More files per feature than plain SvelteKit, in exchange for policy safety and testability.
- Changing these rules means a new ADR that supersedes this one, and updating the lint rules with it.
- Splitting a feature into its own service would need a new decision: shared transactions and cross-feature queries tie features together.

## Alternatives considered

- Logic in routes: visibility rules repeated per route, and one missed filter leaks data.
- MVC grouped by type: spreads one feature over several folders.
- Full hexagonal or DDD with repository interfaces: more indirection than one SQLite database justifies.
- Event sourcing: considered for the ledger only, as an append-only ledger.
