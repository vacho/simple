---
name: openspec-parallel-apply
description: DRAFT, not yet used. Apply two or more independent OpenSpec changes in parallel, each in its own git worktree with its own agent, following docs/workflow.md. Only when the owner explicitly asks for parallel changes.
disable-model-invocation: true
---

# OpenSpec parallel apply (draft)

> **Status: DRAFT.** Written on 2026-10-21, before the app had any code and before any parallel change existed. It has never been run. On its first real use, walk through it step by step with the owner, fix whatever doesn't match reality (see "Known gaps" at the end), then remove this notice.

Runs several OpenSpec changes in parallel: one git worktree and one agent per change. It implements and verifies; it never merges or archives without the owner's explicit approval. The rules come from `docs/workflow.md`; if this skill and that document disagree, the document wins and this skill must be updated.

## Inputs

- The change ids to run in parallel (at least two). If fewer than two remain eligible, stop and suggest the normal sequential flow.
- The owner's task code for each change (used in commit titles). Ask for any that are missing; never invent them.

## Steps

### 1. Check preconditions on `main`

- The current branch is `main` and the working tree is clean.
- Each change exists, is committed on `main`, and passes `openspec validate <change-id> --strict`.
- `openspec status --change <change-id> --json` shows its planning artifacts complete.

If anything fails, stop and report it.

### 2. Check that the changes may run in parallel

Apply every condition in `docs/workflow.md`, "When changes may run in parallel":

- Neither change depends on the other in `docs/roadmap.md`, and their dependencies are archived.
- No capability spec is modified by more than one of them: compare the `specs/<capability>/` folders under each `openspec/changes/<change-id>/`.
- Both proposals were made on `main` before either branch exists (`git branch --list 'change/*'`).

Report the result per change. Drop any change that fails, and say why.

### 3. Confirm the plan with the owner

Show the plan before touching anything: for each change, its worktree path (`../simple.worktrees/<change-id>`), branch (`change/<change-id>`), port, database path and task code. Wait for an explicit yes.

### 4. Create and prepare the worktrees

For each change, from the main checkout:

```
git worktree add ../simple.worktrees/<change-id> -b change/<change-id>
cd ../simple.worktrees/<change-id>
npm ci
```

Then create its `.env` from the main checkout's `.env`, changing:

- `PORT`: a free port, different for each worktree (for example the main port + 1, + 2, ...)
- `DATABASE_PATH` and `BACKUP_DIR`: inside that worktree's own `data/`

Check that `npm run check` passes in each worktree before starting work.

### 5. Start one agent per worktree

Start the agents in parallel, one per change, each told:

- Work only inside `<worktree path>`, on change `<change-id>`. Read `CLAUDE.md` and `openspec/config.yaml` there first.
- Run the apply workflow for `<change-id>`, then the verify workflow.
- Commit per task group as `type(<change-id>): description - <task-code>`, ticking the group's checkboxes in `tasks.md` in the same commit.
- If a spec must change, commit it first as `docs(<change-id>): update specs ... - <task-code>`, and report it, because it may affect the other changes.
- Never propose a new change, archive, merge, push, or touch another worktree.
- Stop and report on any blocker instead of working around it (never weaken a lint rule, a permission or a test).
- Finish with a report: apply status (complete, paused, failed), verify result, commits made, spec changes, blockers.

### 6. Check and report, without merging

- For each worktree, check the agent's report yourself: run `npm run check` and the tests, and read `git log main..change/<change-id> --oneline`.
- Report to the owner: per change, status, verify result, commits, spec changes, blockers, and which changes look ready to merge.
- State clearly that nothing was merged or archived.

### 7. Merge and archive, only with the owner's approval

When the owner approves, one change at a time, in roadmap order, follow `docs/workflow.md`, "Merging parallel branches":

1. Bring the branch up to date with `main`.
2. Regenerate its migrations so they follow `main`'s latest migration.
3. Run `npm run check`, the tests and the verify workflow again.
4. Merge into `main` with `--no-ff`, then run the archive workflow on `main`.
5. Remove the worktree (`git worktree remove`) and delete the branch (`git branch -d`).
6. Continue with the next change from step 1.

## Known gaps (resolve on first use)

- **Subagents and OpenSpec skills:** check how a spawned agent runs the apply and verify workflows (slash commands or skills) inside its worktree, and adjust step 5.
- **Environment variables:** confirm the real names and defaults once the app exists (`PORT`, `DATABASE_PATH`, `BACKUP_DIR` per design D13 of `bootstrap-app-foundation`), and whether `.env` can be generated by a script.
- **Migration regeneration:** write the exact commands (drizzle-kit) once migrations exist, and check them on a real conflict.
- **Message catalogs:** confirm the feature-prefix and sorted-keys rules are enforced by `check-messages`, so parallel additions merge cleanly.
- **Claude Code's own worktrees:** Claude Code can create worktrees for agents by itself; decide whether to use that feature or the manual `../simple.worktrees/` layout above, and make `docs/workflow.md` and this skill agree.
- **Resources:** `npm ci` per worktree takes time and disk; check whether a shared cache is enough.
- **Reference:** the idea follows `openspec-bulk-apply-change` from intent-driven-dev/openspec-schemas (an OpenCode skill). Nothing was copied from it; check its license before reusing any of its text.
