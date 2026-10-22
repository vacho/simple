---
name: change-flow
description: Run the Git side of an OpenSpec change in this project, following docs/workflow.md. Start a change's branch, commit plan or task-group work with the commit convention, close a change (update, re-check, merge --no-ff, archive on main, clean up), or create a branch for work outside a change. Used by the apply step of the OpenSpec schema "simple", and whenever the owner asks to start, commit, merge, close or branch.
---

# Change flow

Automates the Git workflow of `docs/workflow.md`. That document is the source of truth: if this skill and it disagree, the document wins and this skill must be updated.

## Inputs

- The action: `start`, `commit`, `close` or `branch`. Infer it from the request; ask only if it is unclear.
- The change id, for `start`, `commit` and `close`. When there is exactly one active change (`openspec list --json`) or the current branch is `change/<id>`, use it without asking.
- The owner's task code (`<task-code>`, for example `002`) for every commit. Use the code the owner gave for the current work; if none was given, ask before committing. Never invent one or reuse an earlier one by assumption.

## Actions

### start

Creates the branch a change is applied on.

1. Check, and stop with a report if any fails:
   - The current branch is `main` and the working tree is clean (`git status --porcelain` is empty).
   - The change exists, is committed on `main`, and passes `openspec validate <id> --strict`.
   - `openspec status --change <id>` shows every planning artifact complete.
   - No branch `change/<id>` exists yet. If it does, say so and offer to switch to it instead.
2. Create the branch: `git switch -c change/<id>`.
   For a parallel change, the `openspec-parallel-apply` skill creates a worktree instead (`git worktree add ../simple.worktrees/<id> -b change/<id>`) and prepares it.
3. Report the branch and the next step (`/opsx:apply`).

### commit

Commits the work in progress with the convention. Never pushes.

1. Check the branch:
   - Plan work (proposal, specs, design, `adr.md`, ADRs, the text of tasks) is committed on `main` while proposing or updating a proposal, and on `change/<id>` when a spec is corrected during apply.
   - Code is committed only on `change/<id>` (or a `fix/`, `chore/`, `docs/`, `build/` or `ci/` branch outside a change). Never commit code on `main`: stop and report.
2. Split the staged and unstaged changes by purpose, one commit each:
   - **Plan:** `docs(<id>): <description> - <task-code>`, with no code in it.
   - **A task group:** the group's code, tests and docs, plus its ticked checkboxes in `tasks.md`. Type: `feat` for new behavior, `fix`, `test`, `refactor`, `perf`, `style`, `chore` (tooling, scripts, configuration), `build` or `ci`, whichever describes the group as a whole.
   - **A fix:** the fix and the test proving it, together.
3. Write the title as `type(scope): description - <task-code>`: English, imperative, lowercase, no final period, ideally within 72 characters. The scope is the change id; outside a change, `openspec`, `roadmap`, `deps`, `ci` or the tool concerned; for a fix after archive, the capability name. Add a body only to explain why, wrapped at about 72 characters. No `Co-Authored-By` or other attribution.
4. Before a task-group commit, run `npm run check` and the tests the group's tasks name. If they fail, don't commit: report.
5. Show the commits made (`git log --oneline` of the new ones).

### close

Brings a finished change into `main`. Only with the owner's explicit approval, given for this change.

1. On `change/<id>`, with a clean tree:
   1. Bring it up to date: `git merge main` (or `git rebase main` if the branch was never pushed).
   2. Regenerate the branch's migrations so they follow `main`'s latest one (`docs/workflow.md`, "Shared hot spots"), and commit them as `chore(<id>): regenerate migrations - <task-code>`.
   3. Run `npm run check`, the full tests and `/opsx:verify <id>`. Stop on any failure and report.
2. Show the owner what will be merged (`git log main..change/<id> --oneline`) and wait for a yes.
3. On `main`: `git switch main`, then `git merge --no-ff change/<id>`. Never squash.
4. Run `/opsx:archive <id>` on `main`. It merges the delta specs and accepts the change's ADRs (`adr` skill, action `accept`). Commit the result, with no code, as `docs(<id>): archive change and sync specs - <task-code>`.
5. Clean up: `git worktree remove ../simple.worktrees/<id>` if a worktree exists, then `git branch -d change/<id>`.
6. Report: merge commit, archive commit, ADRs accepted, and branch and worktree removed. Don't push unless asked.

### branch

Creates a branch for work outside an OpenSpec change.

1. Pick the prefix from `docs/workflow.md`, "Branch names": `fix/<capability>-<what-it-fixes>` for a fix after archive whose spec is already correct, `chore/<topic>`, `docs/<topic>`, `build/<topic>` or `ci/<topic>`. A fix that changes specified behavior is not a branch: it needs a new OpenSpec change.
2. Name it in lowercase with hyphens, about 50 characters at most, no task code.
3. From an up-to-date, clean `main`: `git switch -c <name>`.
4. Merging it back follows `close` steps 1.3, 2, 3 and 5; there is nothing to archive.

## Rules

- Never push, force-push, rebase a pushed branch, or delete an unmerged branch (`git branch -D`) unless the owner asks.
- Never merge or archive from a branch or a worktree; both happen on `main`.
- An agent working in a worktree may use `commit`, never `close` or `start`.
