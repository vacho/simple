# 0004. Single policy layer that denies by default

- Status: Proposed
- Date: 2026-10-22
- Change: bootstrap-app-foundation (`openspec/changes/bootstrap-app-foundation/design.md`, decision D6)

## Context

Household members see only what an administrator allows. Permission rules grow in later changes (grants, visibility by account or member), so they need one place to live.

## Decision

All authorization goes through one policy module: `can(actor, action, target?)`, `authorize(...)` and `scope(actor, resource)`, backed by a matrix of actions by actor kind (anonymous, user, admin, system). An action without a rule is denied. Every service function authorizes or scopes before touching data, and routes never query the database (enforced by lint). The `system` actor can only be built by auth internals, the startup sequence and scripts.

## Consequences

- Every new action needs a row in the matrix and a test per cell.
- Later permission changes extend `can` and `scope` without touching call sites.
- Responses for missing and forbidden records look the same, so denials leak nothing.

## Alternatives considered

- Checks inside each route: easy to forget one, and impossible to lint for.
