# 0020. Parallel changes only under conditions, in worktrees outside the repository

- Status: Accepted
- Date: 2026-10-23
- Change: none (process decision taken with the owner while defining the workflow)
- Supersedes: 0011

## Context

0011 set when changes may run in parallel and how worktrees are laid out, and said an agent in a worktree "never proposes, merges or archives". The workflow since then needs that agent to merge `main` into its own branch: after a detour to `main` (a tooling fix or an ADR) and when its branch is brought up to date before closing. 0011 didn't distinguish that sync from integrating into `main`.

## Decision

A change normally runs alone on a branch. Changes run in parallel only when neither depends on the other in the roadmap, they don't modify the same capability spec, and both proposals were made and reviewed on `main` before either branch started. Each parallel change gets a Git worktree in `../simple.worktrees/<change-id>`, outside the repository, with its own `node_modules`, `.env`, port, database and backups.

An agent in a worktree works only on its change. It may update that change's plan, commit, and merge `main` into its own branch (a sync merge). It never proposes a change, merges into `main`, archives or pushes: integration and archive happen in the main checkout, on `main`.

## Consequences

- Build, lint and test tools never scan other worktrees.
- Each worktree pays for its own `npm ci` and environment setup.
- A worktree agent can pick up fixes made on `main` without leaving its worktree; only the main checkout changes `main`.
- Conflicts are limited to the shared hot spots handled at merge (0010).

## Alternatives considered

- A worktree for every change: the setup cost buys nothing for a sequential roadmap.
- Worktrees inside the repository: tools would scan them.
- Forbid every merge in a worktree (0011): the agent couldn't take in a detour's fix or bring its branch up to date.
