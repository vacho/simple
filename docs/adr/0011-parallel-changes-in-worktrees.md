# 0011. Parallel changes only under conditions, in worktrees outside the repository

- Status: Accepted
- Date: 2026-10-22
- Change: none (process decision taken with the owner while defining the workflow, task 001)

## Context

The roadmap is mostly sequential, but some later changes are independent and could be implemented at the same time by separate agent sessions. Parallel work costs setup and risks conflicts.

## Decision

A change normally runs alone on a branch. Changes run in parallel only when neither depends on the other in the roadmap, they don't modify the same capability spec, and both proposals were made and reviewed on `main` before either branch started. Each parallel change gets a Git worktree in `../simple.worktrees/<change-id>`, outside the repository, with its own `node_modules`, `.env`, port, database and backups. An agent in a worktree works only on its change and never proposes, merges or archives.

## Consequences

- Build, lint and test tools never scan other worktrees.
- Each worktree pays for its own `npm ci` and environment setup.
- Conflicts are limited to the shared hot spots handled at merge (0010).

## Alternatives considered

- A worktree for every change: the setup cost buys nothing for a sequential roadmap.
- Worktrees inside the repository: tools would scan them.
