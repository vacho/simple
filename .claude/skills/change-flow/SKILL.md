---
name: change-flow
description: The Git workflow of this project, and the source of truth for it. Prepare before proposing or updating a plan, start a change's branch, commit plan or task-group work with the commit convention, close a change (update, re-check, release after approval, merge --no-ff, archive and tag on main, clean up, resumable, with a confirmed undo on failure), or create a branch for work outside a change. Use it for every branch, commit, merge and archive, whenever the owner asks to propose, start, commit, merge, close or branch, and from the apply step of the OpenSpec schema "simple".
---

# Change flow

How OpenSpec changes move through Git in this project. This skill is the source of truth for the rules and the steps; the reasons are in the ADRs it cites. Parallel changes add the `openspec-parallel-apply` skill on top of this one.

The exact Git mechanics of closing and of detours are scripts next to this file, tested by `tests/run.sh`: `close.sh` (state, sync, release, merge, archive commit, tag, clean up, undo) and `detour.sh` (stash by object id). Use them instead of typing those Git commands; this text says when to run them and when to ask the owner. If a script refuses, report its message; never work around it with manual Git commands.

## Overview

```
main                          branch change/<id>                      main
--------------------------    ------------------------------------    ---------------------------------
prepare (clean, up to date)
/opsx:propose                 start: create the branch                close:
commit: docs(<id>): propose   /opsx:apply, commit per task group        update branch, migrations,
  change - <code>, plus         feat(<id>): ... - <code>                 checks, /opsx:verify
  project docs (ADRs, roadmap)
review, /opsx:update            (+ ticked checkboxes)                  owner approves the merge
  (until the branch exists)   plan update or spec fix:                 chore(<id>): release vX.Y.Z
commit: docs(<id>): ...         docs(<id>): update specs ...           merge --no-ff change/<id>
                              /opsx:verify                             /opsx:archive (accepts ADRs)
                                                                       docs(<id>): archive change
                                                                         and sync specs - <code>
                                                                       tag vX.Y.Z
                                                                       delete branch (and worktree)
```

- Propose on `main`; update a change's plan on `main` until its branch exists, then on the branch; apply and verify on `change/<id>`; merge, then archive, on `main` ([ADR 0017](../../../docs/adr/0017-plan-updates-where-the-change-lives.md)).
- Merge with `--no-ff`, one change at a time, re-verified on top of `main` ([ADR 0010](../../../docs/adr/0010-merge-no-ff-one-change-at-a-time.md)).
- A change runs alone unless it meets the parallel conditions in `openspec-parallel-apply` ([ADR 0020](../../../docs/adr/0020-parallel-changes-in-worktrees.md)).
- Commits follow the convention below ([ADR 0022](../../../docs/adr/0022-commit-convention-and-contents.md)), checked by the Git hooks in `.githooks/` ([ADR 0019](../../../docs/adr/0019-git-hooks-contract.md)).
- Each change, and each branch that changes what runs, ends in a version and a tag, released only after the owner approves the merge; a failed close is never undone without the owner's yes ([ADR 0018](../../../docs/adr/0018-versions-release-after-approval-and-rollback.md)).
- Commits are proposed for review before they are made, unless the commit mode is `auto` ([ADR 0015](../../../docs/adr/0015-commits-reviewed-before-they-are-made.md)).

## Inputs

- The action: `prepare`, `start`, `commit`, `close` or `branch`. Infer it from the request; ask only if it is unclear.
- The change id, for `start`, `commit` and `close`. When there is exactly one active change (`openspec list --json`) or the current branch is `change/<id>`, use it without asking.
- The owner's task code (`<task-code>`, digits only, for example `002`) for every commit: the code of the owner's own to-do list item the work belongs to, not an OpenSpec task number. Use the code the owner gave for the current work; if none was given, ask before committing. Never invent one or reuse an earlier one by assumption. Several commits may share a code.

## Branch names

| Work | Branch | Example |
|---|---|---|
| An OpenSpec change (the usual case) | `change/<change-id>` | `change/bootstrap-app-foundation` |
| A fix after the change was archived (the spec is already correct) | `fix/<capability>-<what-it-fixes>` | `fix/ledger-archived-account-transfers` |
| Tooling, configuration, dependencies | `chore/<topic>` | `chore/bump-svelte` |
| Project documents in `docs/` other than ADRs (the roadmap, the owner's documents), when they need longer work than a commit on `main`. ADRs are never written on a branch | `docs/<topic>` | `docs/roadmap-counterparties` |
| Packaging or continuous integration | `build/<topic>` or `ci/<topic>` | `build/docker-compose` |

- For a change, use exactly the folder name under `openspec/changes/`.
- Lowercase with hyphens only (no spaces, accents or `ñ`), about 50 characters at most, no task code.
- The prefix states the purpose of the whole branch; a `change/` branch holds commits of several types.
- No `develop`, `release/` or `hotfix/` branches.

## Where each step runs

A branch can be checked out in only one place at a time. When a change has a worktree (`../simple.worktrees/<id>`), its branch lives there and the main checkout stays on `main`; otherwise the main checkout switches between them.

| Step | Runs in |
|---|---|
| `prepare` for a new proposal, `/opsx:propose`, `start` | The main checkout, on `main` |
| `prepare` and plan updates for a change whose branch exists | Where the branch is checked out (its worktree, or the main checkout switched to it) |
| `/opsx:apply`, `commit`, spec fixes | Where the branch is checked out |
| `close` steps 1 to 5 (state, drop an old release, sync, checks, verify, approval, release) | Where the branch is checked out (`close.sh` finds the right checkout itself) |
| `close` steps 6 to 9 (merge, archive, tag, clean up) | The main checkout, on `main` |
| A detour to `main` | The main checkout, on `main` |

An agent working in a worktree may run `prepare` and plan updates for its own change, `commit`, and sync merges of `main` into its branch (`git merge main`); never `start`, `close`, `branch`, `/opsx:propose`, a merge into `main` or an archive.

## Commit convention

Title: `type(scope): description - <task-code>`

- **type:** `feat`, `fix`, `test`, `refactor`, `perf`, `style`, `docs` (documentation and OpenSpec artifacts), `chore` (tooling, configuration, dependencies, scripts), `build` (build, packaging, Docker), `ci`.
- **scope:** the change id. Outside a change: `openspec` (agent tooling, and ADRs recorded outside a change), `roadmap`, `deps`, `build`, `ci` or the tool concerned. The roadmap status set when proposing uses `roadmap`. For a fix after archive that aligns code with the current spec: the capability name (its folder under `openspec/specs/`), for example `fix(ledger): reject transfers to archived accounts - 027`. A fix that changes specified behavior needs a new OpenSpec change.
- **description:** English, imperative, lowercase, no final period; the whole title ideally within 72 characters.
- **body (optional):** after a blank line, about 72 characters per line, explaining why rather than what.
- No `Co-Authored-By` or any other attribution, in any commit (merges included) or pull request.

One purpose per commit. Every file belongs to one kind, and a commit holds one kind:

| Kind | Files | Committed on |
|---|---|---|
| **Plan** | `openspec/changes/<id>/` (proposal, specs, design, `adr.md`, the text of tasks); `openspec/specs/` and `openspec/changes/archive/`, which only archive writes, except filling a `TBD` Purpose by hand after archive | `main` while proposing, and for updates while `change/<id>` doesn't exist; once it exists, every update and spec fix goes on `change/<id>`, before the code that relies on it. `openspec/specs/` and the archive: `main` only |
| **Project docs** | everything in `docs/` (ADRs, roadmap, documents the owner adds) | `main`; the roadmap and the owner's documents may also use a `docs/<topic>` branch, ADRs never do |
| **Agent tooling** | `.claude/`, `.githooks/`, `openspec/schemas/`, `openspec/config.yaml`, `CLAUDE.md`, `AGENTS.md` | `main` or a `chore/` branch, never `change/<id>` |
| **App** | everything else: `src/`, `tests/`, `scripts/`, `messages/`, `drizzle/`, `static/`, `package*.json`, tool configs (`.gitignore`, `.env.example`, `vite.config.ts` and the like), and `README.md` (the one document that describes the code, kept up to date by the tasks) | `change/<id>`, `fix/`, `chore/`, `build/` or `ci/` branches only |

Exceptions:

- A task group's ticked checkboxes in `tasks.md` go in that group's app commit.
- A fix and the test proving it go together.
- The archive commit holds what archiving writes (synced `openspec/specs/`, the archived change folder, accepted ADRs, the roadmap status) and no app code.

`docs/` is a source of truth that changes only through defined steps: ADRs through the `adr` skill; the roadmap's Status column through `prepare` (Proposed), the archive guidance in `openspec/config.yaml` (Archived) and "Abandoning a change" below (back to Planned); the rest of the roadmap only when the owner asks. Anything else in `docs/` was added by the owner: read it when a prompt, a skill, the schema or the config points to it, and never edit or delete it unless the owner asks. Tasks never write in `docs/`: the documentation a task writes goes in `README.md`. There is no separate architecture document: the code organization is ADR 0008, enforced by lint.

**Merge commits** keep the message Git writes (`Merge branch 'change/<id>'`, `Merge branch 'main' into change/<id>`). They don't follow the title convention and the hook lets them through; the change id is already in the branch name.

## Detour to main

Some work found while applying a change belongs on `main`, not in the change: a fix to agent tooling, or an ADR that must be created, superseded or edited while still Proposed (`adr` skill). Never fold it into the change. Do it like this:

1. Tell the owner what needs doing and why.
2. In the branch's checkout: finish and commit the current task group, or stash it with `detour.sh stash <id>`, which prints the stash's object id. Keep that id; never use positions like `stash@{0}`, which move when anyone else stashes.
3. In the main checkout, on `main`. Without a worktree, the main checkout is on `change/<id>`: `git switch main`, and check that `git branch --show-current` prints `main`. Make the tooling fix, or run the `adr` skill (an ADR made for a change in progress is `Proposed`, with that change in its `Change` line), and commit it there (its own kind).
4. Back in the branch's checkout (without a worktree: `git switch change/<id>`, and check the current branch), with a clean tree: `close.sh sync change/<id>`, then `close.sh conclude-sync change/<id>` (a sync merge; follows the commit mode).
5. If the detour changed an ADR the change depends on, and the stashed work is app code, update the change's plan (`design.md`, `adr.md`) now, while the tree is still clean, and commit it as its own plan commit.
6. Only then restore the work: `detour.sh restore <object id>`. Resolve any conflict and check the result with the owner. Then `detour.sh drop <object id>`, which drops exactly that entry.

**A detour from inside `/opsx:update`:** when the work in progress is the plan update itself (only files under `openspec/changes/<id>/`), skip step 5: restore and drop the stash right after step 4, finish the update (`adr.md` now naming the ADR made on `main`), and commit it with `prepare` step 4. Updating `design.md` before restoring would conflict with the stashed copy of it.

## Commit mode

Every commit this skill makes follows the clone's commit mode: `git config simple.commitMode`.

| Mode | What happens |
|---|---|
| `review` (default, also when unset) | Show the proposed commits, then stop. Commit only after the owner approves |
| `auto` | Commit directly, then report |

- **Proposal format:** for each planned commit, its title, its files, and one line on its purpose, in the order they will be made. Point the owner to `git diff` or `git status` for the content. Ask for the task code in the proposal if it is missing.
- **Merges:** a sync merge (`main` into a change or work branch) is a commit too: `close.sh sync` stages it without committing, and `close.sh conclude-sync` commits it with Git's own message (`--no-edit`). In `review` mode, show what came in and how any conflict was resolved before concluding.
- **Inside `close`:** the owner's approval in `close` step 4 covers the release commit, the merge into `main` and the archive commit, so `close` doesn't stop again for them in `review` mode. The one exception: if archiving had to change a Proposed ADR to match the shipped code, show that change and wait.
- **On approval:** make exactly the approved commits. If the owner renames, splits, merges or drops one, propose the result again only when it changes which files go where.
- **Per request:** the owner may override the mode for the current work ("commit this automatically", "show me before committing"). Don't change the setting unless the owner asks; to set it: `git config simple.commitMode auto` (or `review`).
- The mode never relaxes other rules: the task code is still required, the hooks still run, and `close` still asks before merging.

## Git hooks

- `.githooks/commit-msg` rejects attribution lines in any message, then titles that break the commit convention (merges, reverts and fixups are exempt from the title check only).
- `.githooks/pre-commit` rejects app code on `main`: only `openspec/`, `docs/`, `.claude/`, `.githooks/`, `CLAUDE.md` and `AGENTS.md` may be committed there, except when concluding a merge.

They run only when enabled in the clone: `git config core.hooksPath .githooks`. When a hook rejects a commit, fix the commit; never bypass it with `--no-verify`.

## Versions

The version is `package.json` `version`, in Semantic Versioning. Pick the level when closing:

| Work closed | Before 1.0.0 | From 1.0.0 |
|---|---|---|
| An OpenSpec change that requires manual action from the operator on upgrade (breaking configuration, a migration that can't run automatically) | minor | major |
| An OpenSpec change with `skip_specs: true` (a refactor of app code, no behavior change) | patch | patch |
| Any other OpenSpec change | minor | minor |
| A `fix/`, `chore/` or `build/` branch that changes what runs in production (app code, dependencies, packaging) | patch | patch |
| Anything that doesn't change what runs: documentation, OpenSpec artifacts, agent tooling, CI, tests only, dev-only tool configs, `README.md` only | no release | no release |

- OpenSpec changes are for app code. Agent tooling and project documentation are never OpenSpec changes: they go on `main`, or a `chore/` or `docs/` branch.
- Work that requires manual action from the operator on upgrade is always an OpenSpec change, never a `fix/`, `chore/`, `build/` or `ci/` branch. If such a branch turns out to need it, stop and propose a change instead.
- 1.0.0 is set only when the owner says the household uses the app for real: the next `close` releases with level `major`, which turns `0.x.y` into `1.0.0`.
- Until `package.json` exists, nothing is released.
- The version is bumped only after the owner approves the merge, in the same run (`close` steps 4 and 5).

## Checks by stage

Run the checks that exist; never skip one that exists. A task-group commit checks the group; `close` checks the whole change.

| Check | Task-group commit | `close` |
|---|---|---|
| Hooks enabled (`git config core.hooksPath` prints `.githooks`) | yes | yes |
| `openspec validate <id> --strict` (OpenSpec changes) | when the group changed the plan | yes |
| `npm run check` (once `package.json` exists) | yes | yes |
| Tests | the tests the group's tasks name | the full suite |
| `/opsx:verify <id>` (OpenSpec changes) | no: it checks the whole change | yes |
| Migration regeneration (when both `main` and the branch added migrations under `drizzle/` since they split) | no | yes |
| `npm run i18n:sort` (once `messages/` exists and both sides added keys) | no | yes |

## Actions

### prepare

Around `/opsx:propose`, or `/opsx:update` of a change's plan, so the plan commit holds only the plan. Steps 1 to 3 run **before** invoking the workflow; step 4 runs **after** it has written everything. When the schema's proposal step asks for `prepare` from inside the workflow, run steps 1 to 3 only if they weren't run before it started.

1. The Git hooks are enabled: `git config core.hooksPath` prints `.githooks`. If not, run `git config core.hooksPath .githooks` and say so.
2. The right branch: `main` for a new proposal, or for updating a change whose branch `change/<id>` doesn't exist yet; `change/<id>`, in the checkout where it lives, when it does. `main` up to date with its upstream if there is one.
3. The working tree is clean (`git status --porcelain` is empty). The only exception: when this runs after `openspec new change` already created the new change's folder, that untracked folder is allowed. Otherwise, show what is pending and ask the owner whether to commit it separately, stash it or leave the proposal for later. Never fold it into the plan commit.
4. After the workflow: for a new proposal, set the change's Status to **Proposed** in the "Planned changes" table of `docs/roadmap.md`. Then commit everything the proposal or update wrote with `commit`. Sorted by kind, that is usually several commits: the plan commit (`openspec/changes/<id>/`), and project docs commits for the Proposed ADRs the `adr` step created in `docs/adr/` and for the roadmap status (`docs(roadmap): mark <id> as proposed - <task-code>`). An update on `change/<id>` has only the plan commit: an ADR it needs goes through a detour to `main`.

### start

Creates the branch a change is applied on, in the main checkout.

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
   - Each kind goes where the kinds table says. In particular: plan work for a change whose branch exists goes on that branch; project docs go on `main` or a `docs/` branch; agent tooling never goes on `change/<id>` (use a detour to `main`).
   - App code is committed only on `change/<id>`, `fix/`, `chore/`, `build/` or `ci/` branches. Never on `main` or a `docs/` branch: stop and report.
2. Sort the changed files by kind (see "One purpose per commit"), then split each kind by purpose, one commit each.
3. Pick the type that describes each commit as a whole, and write the title with the convention.
4. Before a task-group commit, run the task-group checks (see "Checks by stage"). If they fail, don't commit the group as done: report.
5. **Intermediate commits** are allowed inside a long task group, as recovery points if a session stops: same type and scope, a description that says what part is done, and no ticked checkboxes. Checks may still fail in an intermediate commit; the group's final commit ticks its checkboxes and passes the checks.
6. Follow the commit mode: in `review`, show the proposal and wait for approval; in `auto`, commit.
7. Show the commits made (`git log --oneline` of the new ones).

### close

Brings a finished change into `main`. Only with the owner's explicit approval, given for this change in this run. `close.sh` does every Git step and refuses anything unsafe; the agent runs the OpenSpec workflows, the checks and the conversation. While it runs, the owner doesn't edit either checkout, or says so.

1. **Find where it stands:** `close.sh status change/<id>`. It reads the evidence history keeps (the merge commit Git wrote for this branch, the release commit among the branch's own commits, the archive commit, the tag) and any step left written but not committed, and prints `next=`. Follow `next`; if it says `stop`, report to the owner. Phases that don't apply (no release, nothing to archive) are skipped by the script.
2. **Unmerged release:** if `next=drop-release`, run `close.sh drop-release change/<id>`. A release is always made fresh, right before the merge, after this run's approval: one left by an interrupted run is dropped, never reused, because `main` may have moved and the version may have been taken.
3. **Update the branch**, where it is checked out: every command of this step, `npm` and `/opsx:verify` included, runs in the `branch_checkout` path that `status` prints (the change's worktree when it has one), never in the main checkout on `main`. `close.sh` finds that path by itself; the agent's own commands must `cd` there first.
   1. `close.sh sync change/<id>`. On conflicts, resolve them (hot spots below), then `close.sh conclude-sync change/<id>`; or `close.sh abort-sync change/<id>` and report. The sync merge is concluded **before** anything else is committed.
   2. Hot spots, each as its own commit after the sync merge is concluded:
      - **Database migrations**, only when both sides added migrations since they split: regenerate the branch's migrations so they follow `main`'s latest one. Keep a copy of hand-written SQL (data conversions, backfills, custom statements) and put it back; regeneration from the schema doesn't recreate it. Test upgrading a database at the last released schema. Commit as `chore(<id>): regenerate migrations - <task-code>`. The exact drizzle-kit commands are defined on first use.
      - **Message catalogs** (`messages/*.json`): keep both sides' keys and run `npm run i18n:sort`; commit as `chore(<id>): sort message catalogs - <task-code>`.
      - **Policy matrix and shared modules** (`server/policy/`, `server/core/`): resolve by hand and re-run the policy tests.
   3. Run the `close` checks (see "Checks by stage"), including `/opsx:verify <id>`. Stop on any failure and report.
4. **Ask the owner**, in this run: show what will be merged (`git log main..change/<id> --oneline`) and the version it will become (level from "Versions", or "no release"). Their yes covers the release, merge and archive commits. If the answer is no, stop.
5. **Release** (when there is one and `package.json` exists): `close.sh release change/<id> <level> <task-code>`. It bumps, commits `chore(<id>): release vX.Y.Z - <task-code>`, and refuses if that version's tag already exists.
6. **Merge:** `close.sh merge change/<id>`. It switches the main checkout to `main` when there is no worktree, and merges with `--no-ff` and Git's message.
7. **Archive**, in the main checkout: `/opsx:archive <id>`. The archive is complete only when all four of its outputs are written: the delta specs synced, the change folder moved, the change's ADRs accepted and the roadmap status set; `status` lists what is missing. Archiving runs the `adr` skill's `accept`; if it had to change a Proposed ADR to match the shipped code, it shows the owner that change and waits for their yes before accepting it (the one exception to the approval in step 4). `status` also checks every step of `accept`: status, `Change` path, index row, superseded ADRs. Then `close.sh archive-commit change/<id> <task-code>`. If `status` reports it complete but not committed, only run `archive-commit`. If it reports it partly written: `close.sh show-archive change/<id>` to show the owner what was written (new files included, without touching the index), then, after the owner's yes, `close.sh undo-archive change/<id> --run`, which discards only that output and keeps the merge and release; then run this step again.
8. **Tag** (when a release was made): `close.sh tag change/<id> <task-code>`. It tags the archive commit and checks it.
9. **Clean up:** `close.sh cleanup change/<id>`. It removes the worktree (never with `--force`: if Git refuses, the worktree has untracked work; report it) and deletes the branch.
10. **Report:** version and tag (or "no release"), merge commit, archive commit, ADRs accepted, branch and worktree removed. Don't push commits or tags unless asked.

### branch

Creates a branch for work outside an OpenSpec change.

1. Pick the prefix and name from "Branch names". A fix that changes specified behavior, or work that requires manual action on upgrade, is not a branch: it needs a new OpenSpec change.
2. From an up-to-date, clean `main`: `git switch -c <name>`.
3. To merge it back, run `close` with `<name>` in place of `change/<id>`, without `/opsx:verify` and without the archive: `close.sh` knows the branch kind. The release needs `--scope <scope>` (for example `close.sh release chore/bump-svelte patch 012 --scope deps`), and the tag goes on the merge commit. A `docs/` branch never releases.

### Abandoning a change

When the owner decides not to go on with a proposed change, in the main checkout on `main`: reject its Proposed ADRs (`adr` skill, action `reject`, which also updates the index), set its roadmap Status back to **Planned**, and, only with the owner's yes since this deletes work, delete its folder under `openspec/changes/`, remove its worktree if it has one (`git worktree remove ../simple.worktrees/<id>`, never `--force`), and delete its branch. Commit as project docs and plan commits.

## When close fails

1. **Stop.** Don't retry the step and don't run Git commands by hand.
2. **Read the state:** `close.sh status change/<id> --published`. It also checks, with a fresh fetch, whether anything this close made is published; with no remote, nothing is.
3. **Report to the owner**, plainly: what failed (the step and the exact error), where things stand (the status lines), and the options: (a) fix the cause and run `close` again, which resumes from where it stands; (b) undo what this close made; (c) leave it for later.
4. **To undo:** for a partly written archive, `close.sh undo-archive` (step 7) is enough and keeps the merge and release. To undo the whole close, `close.sh undo change/<id>` prints the steps for this state. It refuses when anything is published, or when `main` has commits after the merge that aren't this close's; if the branch was already deleted, its first step recreates it. When the steps discard archive output, it says so: show the owner `close.sh show-archive change/<id>` first and get their confirmation that every change in it is the close's own. Only after the owner's yes: `close.sh undo change/<id> --run`, then report the status it prints.

## Rules

- Never push (commits or tags), force-push, rebase a pushed branch, or delete an unmerged branch (`git branch -D`) unless the owner asks.
- Never use `--no-verify`. Never move or delete a tag, except undoing a failed `close` with the owner's yes, for a tag that close created and never published.
- Never merge into `main` or archive outside the main checkout on `main`. Merging `main` into a change or work branch (a sync merge) is allowed where that branch is checked out, including its worktree.
- To change a rule in this skill, record the decision first: a new ADR that supersedes the one the rule cites (`adr` skill), then the edit here.
