# 0029. OpenSpec commands drive the Git flow

- Status: Accepted
- Date: 2026-11-04
- Change: none (process decision taken with the owner while reviewing the workflow, task 002)

## Context

The `change-flow` skill was meant to make Git follow the OpenSpec commands, so the owner runs one command per step instead of an OpenSpec command and a Git action one after the other. Apply worked that way (the schema's apply instruction checks the branch and commits each task group), but closing grew the other way round: archiving needs the merge first (0017), and the merge needs the owner's approval and a fresh release (0018), so `change-flow` `close` became the command the owner ran, with `/opsx:archive` as one of its steps. Proposing and updating ran `prepare` before the workflow, but nothing triggered its commit step after it.

The generated OpenSpec skills are overwritten by `openspec init` and `openspec update`, so they can't be edited. The only hooks are the schema's artifact and apply instructions, the `context` of `openspec/config.yaml` (read by every artifact) and its `operations` guidance (apply and archive).

## Decision

- The owner runs the OpenSpec commands; each one runs its Git steps through `change-flow`, which stays the source of truth for the rules and the steps:
  - `/opsx:propose` and `/opsx:update` run `prepare` steps 1 to 3 before writing and its step 4 (roadmap status, commits by the commit mode) after the last artifact.
  - `/opsx:apply` starts the branch if needed and commits each task group (unchanged).
  - `/opsx:archive <id>` is the way to close a change: it runs `change-flow` `close`, which syncs the branch, re-runs the checks and verify, asks the owner, releases, merges, then performs the OpenSpec archive on `main`, commits it, tags and cleans up. `close.sh status` tells where a close stands, so the archive command resumes a close instead of starting another.
- `/change-flow` is invoked directly only for work outside an OpenSpec change (`fix/`, `chore/`, `docs/`, `build/`, `ci/` branches) and to recover a failed close.
- The order and approvals of 0017 and 0018 are unchanged: the OpenSpec archive still runs only on `main`, after the merge, within one approved close.

## Consequences

- One command per step for the owner; the Git steps can't be forgotten or run out of order.
- The hooks live in `openspec/config.yaml` and `openspec/schemas/simple/`, so they survive `openspec update`; when upgrading OpenSpec, check that the archive workflow still reads `operations.archive.guidance` and the artifacts still read `context`.
- The hooks are instructions to the agent; `close.sh` remains the guard that refuses an archive out of order.

## Alternatives considered

- Keep `/change-flow close` as the entry point: two commands to learn, and an OpenSpec command that can be run in the wrong order.
- Edit the generated OpenSpec skills: overwritten by the next `openspec update`.
- Wrap each OpenSpec command in a project command: duplicates the skills and drifts from upstream.
