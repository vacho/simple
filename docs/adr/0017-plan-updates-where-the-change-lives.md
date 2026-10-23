# 0017. Propose on main, update the plan where the change lives, archive on main

- Status: Accepted
- Date: 2026-10-23
- Change: none (process decision taken with the owner while defining the workflow)
- Supersedes: 0009

## Context

OpenSpec checks a proposal against the current specs and the other changes in flight, and archiving merges a change's delta specs into `openspec/specs/`: both need the complete picture of `main`. 0009 therefore put proposing and updating proposals on `main`. Once a change's branch exists, though, the branch also edits the same plan (ticked checkboxes, spec fixes found while applying). Updating that plan on `main` at the same time makes the two copies diverge and conflict at merge, or leaves the branch working from an outdated plan.

## Decision

- Propose new changes on `main`, and update a proposal on `main` only while its branch `change/<id>` doesn't exist yet.
- Once `change/<id>` exists, every update to that change's plan (`/opsx:update`, spec fixes) is made and committed on the branch, before the code that relies on it.
- Apply and verify on `change/<id>`. Merge into `main`, then archive on `main`.
- Work outside a change uses `fix/`, `chore/`, `docs/`, `build/` or `ci/` branches. No `develop`, `release/` or `hotfix/` branches.

## Consequences

- Each change's plan has exactly one place where it changes at any moment.
- `main` always works: a change reaches it only after verify passes.
- Proposals see every change in flight; archives never merge specs against a stale view.

## Alternatives considered

- Keep updating on `main` after the branch exists (0009): the plan diverges and conflicts.
- Propose on the branch: the proposal can't see the other changes in flight.
- Archive on the branch before merging: merges specs against an incomplete `main`.
- Git Flow: built for several environments and release trains this project doesn't have.
