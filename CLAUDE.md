# CLAUDE.md and AGENTS.md

A personal and family finance app for a single household, built with spec-driven development using OpenSpec.

## Where things are

- `app/`: the app, its own npm project (ADR 0023). Run npm commands there. Everything else at the root is tooling for building it.
- `openspec/config.yaml`: project context and the rules every change must follow. Read it before planning or implementing.
- `openspec/specs/`: what the system does today. `openspec/changes/`: work in progress.
- `docs/roadmap.md`: the planned changes, decisions already taken, catalog rules and rules for AI inside the app.
- `docs/adr/`: architecture and process decision records, one file per decision. ADR 0008 describes how the code is organized. The project schema `openspec/schemas/simple/` adds an ADR step to every change.
- `docs/` is a source of truth changed only through defined steps (the `adr` skill; the roadmap status through `change-flow` and the archive guidance). Other documents there are the owner's: read them when pointed to them, never edit them unasked.

## How to work

- Work through the OpenSpec workflow (`/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:verify`, `/opsx:archive`). Don't change behavior without a change that specifies it.
- If a spec is wrong or incomplete, update it with `/opsx:update` before changing code.
- Write artifacts, code, comments and commit messages in English. The owner may write in Spanish; answer in the language they use.

## Git

- Run `change-flow` `prepare` before `/opsx:propose` or `/opsx:update`.
- Every branch, commit, merge and archive goes through the `change-flow` skill, which holds the rules (branch names, commit convention with the owner's task code, merge and archive order). Read it before any Git operation. Parallel changes also use `openspec-parallel-apply`.
- Commits follow the commit mode (`git config simple.commitMode`, default `review`): propose the commits, wait for the owner's approval, then commit. With `auto`, commit directly.
- Git hooks in `.githooks/` check every commit; enable them once per clone with `git config core.hooksPath .githooks`, and never bypass them with `--no-verify`.
- Don't push unless asked.
