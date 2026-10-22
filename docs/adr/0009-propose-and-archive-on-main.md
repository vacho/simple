# 0009. Propose and archive on main, apply on a branch per change

- Status: Accepted
- Date: 2026-10-22
- Change: none (process decision taken with the owner while defining the workflow, task 001)

## Context

OpenSpec checks a proposal against the current specs and the other changes in flight, and archiving merges a change's delta specs into `openspec/specs/`. Both need the complete picture of `main`. Implementation, on the other hand, should not leave `main` half-built.

## Decision

Propose and update proposals on `main`. Apply and verify each change on its own short-lived branch, `change/<change-id>`. Merge into `main`, then archive on `main`. Work outside a change uses `fix/`, `chore/`, `docs/`, `build/` or `ci/` branches. No `develop`, `release/` or `hotfix/` branches.

## Consequences

- `main` always works: a change reaches it only after verify passes.
- Proposals see every change in flight; archives never merge specs against a stale view.
- Spec corrections found during apply are committed on the branch, before the code that relies on them.
- With one environment and one integrator, Git Flow's extra branches add nothing.

## Alternatives considered

- Propose on the change branch: the proposal can't see the other changes in flight.
- Archive on the branch before merging: merges specs against an incomplete `main`.
- Git Flow: built for several environments and release trains this project doesn't have.
