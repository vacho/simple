# 0010. Merge with --no-ff, one change at a time, re-verified on top of main

- Status: Accepted
- Date: 2026-10-22
- Change: none (process decision taken with the owner while defining the workflow, task 001)

## Context

Each change is applied in task groups, with one commit per group. Changes share hot spots (migrations, the policy matrix, message catalogs), so a change that was correct on its own can break once another one lands.

## Decision

Before merging, bring the branch up to date with `main`, regenerate its database migrations so they follow `main`'s latest one, and run the checks, the tests and `/opsx:verify` again. Then merge with `--no-ff`, never squash. Merge and archive one change at a time, in roadmap order, without bulk-archive.

## Consequences

- History keeps the per-task-group commits and shows each change as one unit.
- Every change on `main` was verified against the `main` it landed on.
- Closing several finished changes takes one full cycle each.

## Alternatives considered

- Squash merges: lose the task-group history and recovery points.
- Bulk-archive after merging several branches: skips the re-verification of each change on top of the previous one.
