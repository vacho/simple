---
name: openspec-parallel-apply
description: DRAFT, not yet used. Apply two or more independent OpenSpec changes in parallel, each in its own git worktree with its own agent, on top of the change-flow skill. Only when the owner explicitly asks for parallel changes.
disable-model-invocation: true
---

# OpenSpec parallel apply (draft)

> **Status: DRAFT.** Written on 2026-10-21, before the app had any code and before any parallel change existed. It has never been run. On its first real use, walk through it step by step with the owner, fix whatever doesn't match reality (see "Known gaps" at the end), then remove this notice.

Runs several OpenSpec changes in parallel: one git worktree and one agent per change. It implements and verifies; it never merges or archives without the owner's explicit approval. It is the source of truth for parallel work (eligibility, worktrees, agents); everything else (branches, commits, closing a change) comes from the `change-flow` skill. The reasons are in [ADR 0011](../../../docs/adr/0011-parallel-changes-in-worktrees.md). The roadmap is mostly sequential, and `bootstrap-app-foundation` runs alone: when in doubt, run changes one after the other.

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

Every condition must hold:

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

Worktrees live outside the repository folder (`../simple.worktrees/`), so build, lint and test tools never scan them. Each has its own `node_modules` and its own database: nothing in one worktree's `data/` is visible from another.

Then create its `.env` from the main checkout's `.env` (`.env` is not in Git), changing:

- `PORT`: a free port, different for each worktree (for example the main port + 1, + 2, ...)
- `DATABASE_PATH` and `BACKUP_DIR`: inside that worktree's own `data/`

Check that `npm run check` passes in each worktree before starting work.

### 5. Start one agent per worktree

Start the agents in parallel, one per change, each told:

- Work only inside `<worktree path>`, on change `<change-id>`. Read `CLAUDE.md` and `openspec/config.yaml` there first.
- Run the apply workflow for `<change-id>`, then the verify workflow.
- Commit with the `change-flow` skill (action `commit`): one commit per task group as `type(<change-id>): description - <task-code>`, with the group's ticked checkboxes in `tasks.md`.
- If a spec must change, commit it first as `docs(<change-id>): update specs ... - <task-code>`, and report it, because it may affect the other changes.
- Never propose a new change, archive, merge, push, or touch another worktree.
- Stop and report on any blocker instead of working around it (never weaken a lint rule, a permission or a test).
- Finish with a report: apply status (complete, paused, failed), verify result, commits made, spec changes, blockers.

### 6. Check and report, without merging

- For each worktree, check the agent's report yourself: run `npm run check` and the tests, and read `git log main..change/<change-id> --oneline`.
- Report to the owner: per change, status, verify result, commits, spec changes, blockers, and which changes look ready to merge.
- State clearly that nothing was merged or archived.

### 7. Merge and archive, only with the owner's approval

When the owner approves, one change at a time, in roadmap order, run the `change-flow` skill's `close` action for it. It updates the branch with `main`, regenerates migrations, re-runs the checks and verify, merges with `--no-ff`, archives on `main`, and removes the worktree and branch. Then continue with the next change, which now updates on top of the one just archived.

## Known gaps (resolve on first use)

- **Subagents and OpenSpec skills:** check how a spawned agent runs the apply and verify workflows (slash commands or skills) inside its worktree, and adjust step 5.
- **Environment variables:** confirm the real names and defaults once the app exists (`PORT`, `DATABASE_PATH`, `BACKUP_DIR` per design D13 of `bootstrap-app-foundation`), and whether `.env` can be generated by a script.
- **Migration regeneration:** write the exact commands (drizzle-kit) once migrations exist, and check them on a real conflict.
- **Message catalogs:** confirm the feature-prefix and sorted-keys rules are enforced by `check-messages`, so parallel additions merge cleanly.
- **Claude Code's own worktrees:** Claude Code can create worktrees for agents by itself; decide whether to use that feature or the manual `../simple.worktrees/` layout above, and update this skill and ADR 0011 to match.
- **Resources:** `npm ci` per worktree takes time and disk; check whether a shared cache is enough.
- **Reference:** the idea follows `openspec-bulk-apply-change` from intent-driven-dev/openspec-schemas (an OpenCode skill). Nothing was copied from it; check its license before reusing any of its text.
