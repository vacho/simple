# CLAUDE.md

A personal and family finance app for a single household, built with spec-driven development using OpenSpec.

## Where things are

- `openspec/config.yaml`: project context and the rules every change must follow. Read it before planning or implementing.
- `openspec/specs/`: what the system does today. `openspec/changes/`: work in progress.
- `docs/roadmap.md`: the planned changes, decisions already taken, catalog rules and rules for AI inside the app.
- `docs/adr/`: architecture decisions still in force, one file per decision. Read them before designing a change.
- `docs/architecture.md`: how the code is organized (created by the `bootstrap-app-foundation` change; until then, see D16 in that change's `design.md`).

## How to work

- Work through the OpenSpec workflow (`/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:verify`, `/opsx:archive`). Don't change behavior without a change that specifies it.
- If a spec is wrong or incomplete, update it with `/opsx:update` before changing code.
- Write artifacts, code, comments and commit messages in English. The owner may write in Spanish; answer in the language they use.

## Branches and worktrees

Full guide: `docs/workflow.md`.

- Propose and update proposals on `main`. Apply and verify on the branch `change/<change-id>`. Merge into `main` with `--no-ff`, then archive on `main`. Never archive or merge from a branch or worktree.
- Changes run in parallel only under the conditions in `docs/workflow.md`, each in its own worktree under `../simple.worktrees/<change-id>`. An agent in a worktree works only on that change: it never proposes, archives or merges.
- Before merging a branch: bring it up to date with `main`, regenerate its migrations, and run the checks and `/opsx:verify` again.

## Commits

- Format: `type(scope): description - <task-code>`, in the imperative, lowercase, without a final period, ideally within 72 characters. The scope is the OpenSpec change id, or `openspec`, `roadmap`, `deps`, `ci` for work outside a change. Example: `feat(add-transaction-ledger): record expenses with allocations - 014`.
- Scope for fixes: while a change is active, use its change id. Once it is archived, a fix that aligns the code with the current spec uses the capability name (the spec's directory under `openspec/specs/`), for example `fix(ledger): reject transfers to archived accounts - 027`. A fix that changes specified behavior is not a plain fix: it needs a new OpenSpec change.
- `<task-code>` is the code of the owner's own to-do list item the work belongs to (for example `002`); it is not an OpenSpec task number. Use the code the owner gave for the current work. If none was given, ask before committing; never invent one or reuse a previous one by assumption. Several commits may share a code.
- One purpose per commit: never mix changes to the plan (proposal, specs, design, or the text of tasks) with code. Ticking task checkboxes in `tasks.md` is progress tracking and goes in the code commit of that task group.
- Don't add `Co-Authored-By` lines or any other attribution to commits or pull requests.
- Don't push unless asked.
