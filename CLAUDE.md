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

- Work through the OpenSpec workflow (`explore` → `propose` → `apply` → `verify` → `archive`). Never change behavior without an OpenSpec change that specifies it.
- If a spec is wrong or incomplete, update the plan (`update` workflow) before changing code.
- Write artifacts, code, comments and commit messages in English. The owner may write in Spanish; answer in the language they use.

### Agent Workflow Commands

Each action is a skill in `.claude/skills/` and `.agents/skills/`. When the user invokes a command, asks for an action, or `change-flow` calls for one, read and follow the matching skill's `SKILL.md`. The commands below are user-facing shortcuts, not shell commands for agents to run.

| Action | Skill | Claude Code command | Antigravity CLI command | Antigravity IDE workflow | Codex CLI or IDE |
|---|---|---|---|---|---|
| **Explore** | `openspec-explore` | `/opsx:explore` | `/openspec-explore` | `/opsx-explore` | `$openspec-explore` |
| **Propose** | `openspec-propose` | `/opsx:propose` | `/openspec-propose` | `/opsx-propose` | `$openspec-propose` |
| **Apply** | `openspec-apply-change` | `/opsx:apply` | `/openspec-apply-change` | `/opsx-apply` | `$openspec-apply-change` |
| **Update** | `openspec-update-change` | `/opsx:update` | `/openspec-update-change` | `/opsx-update` | `$openspec-update-change` |
| **Verify** | `openspec-verify-change` | `/opsx:verify` | `/openspec-verify-change` | `/opsx-verify` | `$openspec-verify-change` |
| **Archive** | `openspec-archive-change` | `/opsx:archive` | `/openspec-archive-change` | `/opsx-archive` | `$openspec-archive-change` |

The skills use the `openspec` CLI (`status`, `instructions`, `validate`, `archive`) as needed; never run those commands as a substitute for following a skill. In particular, `openspec update` refreshes the generated tool files, not a change's plan, and archiving happens only inside `change-flow` `close`.

Codex uses the OpenSpec skills in `.agents/skills/` alongside Antigravity. In the Codex desktop app, select the matching skill from the Skills sidebar. To refresh both integrations, run `openspec init --tools antigravity,codex`; the CLI keeps one shared skill tree and Antigravity's workflows.

*To add support for another AI assistant: run `openspec init --tools <tool>`, and symlink or share the project skills (`change-flow`, `adr`).*

## Git

- Run `change-flow` `prepare` before proposing a change or updating a plan.
- Every branch, commit, merge and archive goes through the `change-flow` skill, which holds the rules (branch names, commit convention with the owner's task code, merge and archive order). Read it before any Git operation. Parallel changes also use `openspec-parallel-apply`.
- Commits follow the commit mode (`git config simple.commitMode`, default `review`): propose the commits, wait for the owner's approval, then commit. With `auto`, commit directly.
- Git hooks in `.githooks/` check every commit; enable them once per clone with `git config core.hooksPath .githooks`, and never bypass them with `--no-verify`.
- Don't push unless asked.
