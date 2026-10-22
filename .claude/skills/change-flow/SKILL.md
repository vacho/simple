---
name: change-flow
description: The Git workflow of this project, and the source of truth for it. Prepare main before proposing, start a change's branch, commit plan or task-group work with the commit convention, close a change (update, re-check, release, merge --no-ff, archive and tag on main, clean up), or create a branch for work outside a change. Use it for every branch, commit, merge and archive, whenever the owner asks to propose, start, commit, merge, close or branch, and from the apply step of the OpenSpec schema "simple".
---

# Change flow

How OpenSpec changes move through Git in this project. This skill is the source of truth for the rules and the steps; the reasons are in the ADRs it cites. Parallel changes add the `openspec-parallel-apply` skill on top of this one.

## Overview

```
main                          branch change/<id>                      main
--------------------------    ------------------------------------    ---------------------------------
prepare (clean, up to date)
/opsx:propose                 start: create the branch                close:
commit: docs(<id>): propose   /opsx:apply, commit per task group        update branch, migrations,
  change - <code>               feat(<id>): ... - <code>                 checks, /opsx:verify
review, /opsx:update            (+ ticked checkboxes)                  chore(<id>): release vX.Y.Z
commit: docs(<id>): ...       spec fix: docs(<id>): update specs ...   merge --no-ff change/<id>
                              /opsx:verify                             /opsx:archive (accepts ADRs)
                                                                       docs(<id>): archive change
                                                                         and sync specs - <code>
                                                                       tag vX.Y.Z
                                                                       delete branch (and worktree)
```

- Propose and update proposals on `main`; apply and verify on `change/<id>`; merge, then archive, on `main` ([ADR 0009](../../../docs/adr/0009-propose-and-archive-on-main.md)).
- Merge with `--no-ff`, one change at a time, re-verified on top of `main` ([ADR 0010](../../../docs/adr/0010-merge-no-ff-one-change-at-a-time.md)).
- A change runs alone unless it meets the parallel conditions in `openspec-parallel-apply` ([ADR 0011](../../../docs/adr/0011-parallel-changes-in-worktrees.md)).
- Commits follow the convention below ([ADR 0012](../../../docs/adr/0012-commit-convention-with-task-code.md)), checked by the Git hooks in `.githooks/` ([ADR 0013](../../../docs/adr/0013-git-hooks-for-commit-rules.md)).
- Each change, and each branch that changes what runs, ends in a version and a tag ([ADR 0014](../../../docs/adr/0014-versions-and-release-tags.md)).

## Inputs

- The action: `prepare`, `start`, `commit`, `close` or `branch`. Infer it from the request; ask only if it is unclear.
- The change id, for `start`, `commit` and `close`. When there is exactly one active change (`openspec list --json`) or the current branch is `change/<id>`, use it without asking.
- The owner's task code (`<task-code>`, for example `002`) for every commit: the code of the owner's own to-do list item the work belongs to, not an OpenSpec task number. Use the code the owner gave for the current work; if none was given, ask before committing. Never invent one or reuse an earlier one by assumption. Several commits may share a code.

## Branch names

| Work | Branch | Example |
|---|---|---|
| An OpenSpec change (the usual case) | `change/<change-id>` | `change/bootstrap-app-foundation` |
| A fix after the change was archived (the spec is already correct) | `fix/<capability>-<what-it-fixes>` | `fix/ledger-archived-account-transfers` |
| Tooling, configuration, dependencies | `chore/<topic>` | `chore/bump-svelte` |
| Documentation outside a change | `docs/<topic>` | `docs/roadmap-counterparties` |
| Packaging or continuous integration | `build/<topic>` or `ci/<topic>` | `build/docker-compose` |

- For a change, use exactly the folder name under `openspec/changes/`.
- Lowercase with hyphens only (no spaces, accents or `ñ`), about 50 characters at most, no task code.
- The prefix states the purpose of the whole branch; a `change/` branch holds commits of several types.
- No `develop`, `release/` or `hotfix/` branches.

## Commit convention

Title: `type(scope): description - <task-code>`

- **type:** `feat`, `fix`, `test`, `refactor`, `perf`, `style`, `docs` (documentation and OpenSpec artifacts), `chore` (tooling, configuration, dependencies, scripts), `build` (build, packaging, Docker), `ci`.
- **scope:** the change id. Outside a change: `openspec`, `roadmap`, `deps`, `ci` or the tool concerned. For a fix after archive that aligns code with the current spec: the capability name (its folder under `openspec/specs/`), for example `fix(ledger): reject transfers to archived accounts - 027`. A fix that changes specified behavior needs a new OpenSpec change.
- **description:** English, imperative, lowercase, no final period; the whole title ideally within 72 characters.
- **body (optional):** after a blank line, about 72 characters per line, explaining why rather than what.
- No `Co-Authored-By` or any other attribution, in commits or pull requests.

One purpose per commit:

- Plan (proposal, specs, design, `adr.md`, ADRs, the text of tasks) never mixes with code.
- A task group's ticked checkboxes in `tasks.md` go in the code commit of that group.
- A fix and the test proving it go together.
- Archive commits contain no code.

## Git hooks

`.githooks/commit-msg` rejects titles that break the commit convention, and `.githooks/pre-commit` rejects code commits on `main` (only `openspec/`, `docs/`, `.claude/`, `.githooks/`, `CLAUDE.md`, `AGENTS.md` and `README.md` may be committed there, except when concluding a merge). They run only when enabled in the clone: `git config core.hooksPath .githooks`. When a hook rejects a commit, fix the commit; never bypass it with `--no-verify`.

## Versions

The version is `package.json` `version`, in Semantic Versioning. Pick the level when closing:

| Work closed | Before 1.0.0 | From 1.0.0 |
|---|---|---|
| An OpenSpec change that requires manual action from the operator on upgrade (breaking configuration, a migration that can't run automatically) | minor | major |
| Any other OpenSpec change | minor | minor |
| A `fix/`, `chore/`, `build/` or `ci/` branch that changes what runs | patch | patch |
| Only documentation, OpenSpec artifacts or agent tooling | no release | no release |

1.0.0 is set only when the owner says the household uses the app for real. Until `package.json` exists, nothing is released.

## Actions

### prepare

Before `/opsx:propose` or `/opsx:update` of a proposal, so the plan commit holds only the plan.

1. The Git hooks are enabled: `git config core.hooksPath` prints `.githooks`. If not, run `git config core.hooksPath .githooks` and say so.
2. The current branch is `main`, up to date with its upstream if there is one.
3. The working tree is clean (`git status --porcelain` is empty). If not, show what is pending and ask the owner whether to commit it separately, stash it or leave the proposal for later. Never fold it into the plan commit.
4. After the proposal or update is written, commit it with `commit` (a plan commit).

### start

Creates the branch a change is applied on.

1. Check, and stop with a report if any fails:
   - The current branch is `main` and the working tree is clean.
   - The change exists, is committed on `main`, and passes `openspec validate <id> --strict`.
   - `openspec status --change <id>` shows every planning artifact complete.
   - No branch `change/<id>` exists yet. If it does, say so and offer to switch to it instead.
2. Create the branch: `git switch -c change/<id>`. For a parallel change, `openspec-parallel-apply` creates a worktree instead.
3. Report the branch and the next step (`/opsx:apply`).

### commit

Commits the work in progress with the convention. Never pushes.

1. Check the branch:
   - Plan work is committed on `main` while proposing or updating a proposal, and on `change/<id>` when a spec is corrected during apply (before the code that relies on it).
   - Code is committed only on `change/<id>` or a `fix/`, `chore/`, `docs/`, `build/` or `ci/` branch. Never on `main`: stop and report.
2. Split the changes by purpose (see "One purpose per commit"), one commit each.
3. Pick the type that describes each commit as a whole, and write the title with the convention.
4. Before a task-group commit, run `npm run check` and the tests the group's tasks name. If they fail, don't commit the group as done: report.
5. **Intermediate commits** are allowed inside a long task group, as recovery points if a session stops: same type and scope, a description that says what part is done, and no ticked checkboxes. Checks may still fail in an intermediate commit; the group's final commit ticks its checkboxes and passes the checks.
6. Show the commits made (`git log --oneline` of the new ones).

### close

Brings a finished change into `main`. Only with the owner's explicit approval, given for this change.

1. On `change/<id>`, with a clean tree:
   1. Bring it up to date: `git merge main` (or `git rebase main` if the branch was never pushed).
   2. Resolve conflicts in the shared hot spots:
      - **Database migrations:** generated migration files are numbered and tracked in a journal. Delete the branch's generated migrations and generate them again from the schema, so they follow `main`'s latest one. Commit them as `chore(<id>): regenerate migrations - <task-code>`.
      - **Message catalogs** (`messages/*.json`): keys are prefixed by feature and sorted; keep both sides' keys and run `npm run i18n:sort`.
      - **Policy matrix and shared modules** (`server/policy/`, `server/core/`): resolve by hand and re-run the policy tests.
      - `openspec/specs/` never conflicts: only archive on `main` writes it.
   3. Run `npm run check`, the full tests and `/opsx:verify <id>`. Stop on any failure and report.
   4. Release: pick the level from "Versions", run `npm version <level> --no-git-tag-version` (it updates `package.json` and `package-lock.json`), and commit them as `chore(<id>): release vX.Y.Z - <task-code>`. Skip it while `package.json` doesn't exist.
2. Show the owner what will be merged (`git log main..change/<id> --oneline`) and the new version, and wait for a yes.
3. On `main`: `git switch main`, then `git merge --no-ff change/<id>`. Never squash.
4. Run `/opsx:archive <id>` on `main`. It merges the delta specs and accepts the change's ADRs (`adr` skill, action `accept`). Commit the result, with no code, as `docs(<id>): archive change and sync specs - <task-code>`.
5. Tag the archive commit, when a release was made: `git tag -a vX.Y.Z -m "<id> - <task-code>"`.
6. Clean up: `git worktree remove ../simple.worktrees/<id>` if a worktree exists, then `git branch -d change/<id>`.
7. Report: version and tag, merge commit, archive commit, ADRs accepted, branch and worktree removed. Don't push commits or tags unless asked.

### branch

Creates a branch for work outside an OpenSpec change.

1. Pick the prefix and name from "Branch names". A fix that changes specified behavior is not a branch: it needs a new OpenSpec change.
2. From an up-to-date, clean `main`: `git switch -c <name>`.
3. Merging it back follows `close` steps 1.1 to 1.4 (without verify; release only when "Versions" says so), 2, 3 and 6; there is nothing to archive. When a release was made, tag the merge commit: `git tag -a vX.Y.Z -m "<branch> - <task-code>"`.

## Rules

- Never push (commits or tags), force-push, rebase a pushed branch, or delete an unmerged branch (`git branch -D`) unless the owner asks.
- Never use `--no-verify`, and never move or delete a tag.
- Never merge or archive from a branch or a worktree; both happen on `main`.
- An agent working in a worktree may use `commit` only, never `prepare`, `start`, `close` or `branch`.
- To change a rule in this skill, record the decision first: a new ADR that supersedes the one the rule cites (`adr` skill), then the edit here.
