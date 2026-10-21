# Git workflow

How OpenSpec changes move through Git in this project: one branch per change, optional worktrees to run independent changes in parallel, and the commit convention.

This is a working guide, not an OpenSpec artifact. `CLAUDE.md` and `openspec/config.yaml` summarize the rules agents must follow; this document explains them.

## The flow of one change

```
main                        branch change/<id>                       main
------------------------    -------------------------------------    -----------------------------------
/opsx:explore (optional)
/opsx:propose               create the branch (or a worktree)
docs(<id>): propose         /opsx:apply, one commit per task group   merge --no-ff change/<id>
  change - 001                feat(<id>): ... - 002 (+ checkboxes)   /opsx:archive
review, /opsx:update        docs(<id>): update specs ... - 002       docs(<id>): archive change and
  docs(<id>): update ...    /opsx:verify                               sync specs - 002
                              fix(<id>): ... - 002                   delete the branch (and worktree)
```

Rules:

1. **Propose and update proposals on `main`.** OpenSpec checks a proposal against the current specs and the other changes in flight; that only works with the complete picture on `main`.
2. **Apply and verify on the change's branch**, named `change/<change-id>`. `main` only receives a change once verify passes, so `main` always works.
3. **Spec corrections found while implementing** are committed on the branch, as `docs(<id>): update specs ...`, before the code that relies on them.
4. **Merge with `--no-ff`**, keeping the per-task-group commits and making the change visible as one unit in history. Never squash.
5. **Archive only on `main`, after the merge.** Archiving merges the delta specs into `openspec/specs/`; doing it from a branch would merge against an incomplete view of `main`.
6. **Delete the branch** after archive (and remove its worktree, if any).

## Branch names

| Work | Branch | Example |
|---|---|---|
| An OpenSpec change (the usual case) | `change/<change-id>` | `change/bootstrap-app-foundation` |
| A fix after the change was archived (the spec is already correct) | `fix/<capability>-<what-it-fixes>` | `fix/ledger-archived-account-transfers` |
| Tooling, configuration, dependencies | `chore/<topic>` | `chore/bump-svelte` |
| Documentation outside a change (roadmap, workflow) | `docs/<topic>` | `docs/roadmap-counterparties` |
| Packaging or continuous integration | `build/<topic>` or `ci/<topic>` | `build/docker-compose` |

Rules:

- For a change, use exactly the OpenSpec id: `change/` plus the folder name under `openspec/changes/`. That links the change, its branch and its commits, and the parallel-apply skill relies on this format.
- Lowercase with hyphens only; no spaces, accents or `ñ`.
- The prefix states the purpose of the whole branch, not the type of each commit. A `change/` branch holds commits of several types (`docs`, `feat`, `test`, `fix`, `chore`). `fix/`, `chore/`, `docs/`, `build/` and `ci/` branches are for single-purpose work outside a change; most of their commits match the prefix, but they may include others when the work needs it.
- Short and descriptive, about 50 characters at most.
- Don't put the task code in the branch name: each commit already carries it, and a branch may span several codes. If ever needed, append it at the end (`change/add-transaction-ledger-014`) so the prefix stays intact.
- No `develop`, `release/` or `hotfix/` branches (Git Flow): with one environment and one person integrating, `main` plus short-lived branches is enough.

## Parallel changes with worktrees

A Git worktree is an extra working folder attached to the same repository, with a different branch checked out. Several worktrees let several changes be implemented at the same time (for example by separate agent sessions) without stepping on each other.

### When changes may run in parallel

Only when **all** of these hold:

- Neither change depends on the other in `docs/roadmap.md`, and both depend only on changes already archived.
- They don't modify the same capability spec (the same `specs/<capability>/` in both changes).
- Both proposals were made and reviewed on `main` before either branch started, so each proposal already accounts for the other.

When in doubt, run them one after the other. The roadmap is mostly sequential; `bootstrap-app-foundation` in particular runs alone.

### Setting up a worktree

Worktrees live **outside** the repository folder, so that build, lint and test tools never scan them:

```
~/projects/pocs/simple/                                  main
~/projects/pocs/simple.worktrees/<change-id>/            change/<change-id>
```

```
git worktree add ../simple.worktrees/<change-id> -b change/<change-id>
cd ../simple.worktrees/<change-id>
npm ci                      # each worktree has its own node_modules
cp ../../simple/.env .env   # .env is not in Git; then edit it:
                            #   PORT: a free port for this worktree
                            #   DATABASE_PATH and BACKUP_DIR: this worktree's own data/
```

Each worktree has its own database. Nothing in one worktree's `data/` is visible from another.

### Shared hot spots

Most changes touch the same few shared places. These rules keep parallel branches mergeable:

- **Database migrations:** generated migration files are numbered and tracked in a journal, so two branches generating migrations will conflict. While on the branch, generate migrations freely for testing. **Right before merging**, after bringing the branch up to date with `main`, delete the branch's generated migrations and generate them again from the schema, so they follow `main`'s latest migration.
- **Message catalogs** (`messages/en.json`, `messages/es.json`): keys are prefixed by feature (`ledger.*`, `budgets.*`) and the files are kept sorted by key, so parallel additions land in different places. Resolve any conflict by keeping both sets of keys.
- **The policy matrix and shared modules** (`server/policy/`, `server/core/`): changes to them are expected to conflict; resolve by hand and re-run the policy tests.
- **`openspec/specs/`** is only written by archive on `main`, so branches never conflict there.

### Merging parallel branches

One at a time, in roadmap order:

1. Bring the branch up to date with `main` (merge `main` into it, or rebase if it hasn't been pushed).
2. Regenerate migrations as described above.
3. Run `npm run check`, the tests and `/opsx:verify` again on the updated branch.
4. Merge into `main` with `--no-ff`, archive on `main`, delete the branch and its worktree.
5. The next branch starts again at step 1, now on top of the change just archived.

### Agents and worktrees

A draft skill, `.claude/skills/openspec-parallel-apply/`, automates this section (it can only be started by hand with `/openspec-parallel-apply`). It has never been used: review and update it on its first real use.

- One agent session per worktree, working only on that worktree's change.
- An agent in a worktree may apply, verify, commit and update its change's specs. It never proposes a new change, never archives, and never merges.
- Merging and archiving are done on `main`, with the owner's approval.

## Commits

Format:

```
type(scope): description - <task-code>
```

- **type:** `feat`, `fix`, `test`, `refactor`, `perf`, `style`, `docs` (documentation and OpenSpec artifacts), `chore` (tooling, configuration, dependencies, scripts), `build` (build, packaging, Docker), `ci`.
- **scope:** the OpenSpec change id. Outside a change: `openspec`, `roadmap`, `deps`, `ci` or the tool concerned. For a fix after the change was archived, when the spec already describes the correct behavior: the capability name (`fix(ledger): ...`). A fix that changes specified behavior needs a new change.
- **description:** English, imperative, lowercase, no final period, the whole title ideally within 72 characters.
- **task-code:** the code of the owner's to-do list item the work belongs to. Agents use the code they were given and ask for it when they don't have it; they never invent one. Several commits can share a code.
- **Body (optional):** one blank line after the title, lines of about 72 characters, explaining why rather than what.
- **No attribution lines** (`Co-Authored-By` or similar).

What goes together:

- Never mix changes to the plan (proposal, specs, design, task text) with code.
- Ticking checkboxes in `tasks.md` is progress tracking: it goes in the code commit of that task group.
- A fix and the test proving it go in the same commit.
- Archive commits contain no code.
