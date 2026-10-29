# 0024. Commit convention, file kinds, and multi-agent tooling

- Status: Accepted
- Date: 2026-10-29
- Change: none (process decision taken with the owner to add Antigravity and .agents/ to agent tooling)
- Supersedes: 0022

## Context

0022 established the commit convention and the four kinds of files (plan, project docs, agent tooling, app), with agent tooling committed on `main` or a `chore/` branch. It included `.claude/`, `CLAUDE.md`, and anticipated `AGENTS.md`.

With the introduction of Antigravity (and other tools following the open agent standard), agent tooling also lives in `.agents/` (`.agents/skills/` and `.agents/workflows/`).

## Decision

Agent tooling includes `.agents/` alongside `.claude/`, `AGENTS.md`, and `CLAUDE.md`.

Titles follow `type(scope): description - <task-code>`, in English, imperative, lowercase, without a final period. The scope is the change id; outside a change, a fixed area (`openspec`, which also covers ADRs recorded outside a change, `roadmap`, `deps`, `build`, `ci`) or the tool concerned; for a fix after archive, the capability name. The task code is the owner's to-do item, digits only, never invented: agents ask for it when they don't have it. A fix that changes specified behavior can't hide as a `fix`: it needs a new OpenSpec change. No attribution lines.

Every file belongs to one of four kinds, and each commit holds one kind:

| Kind | Files | Committed on |
|---|---|---|
| Plan | `openspec/changes/<id>/`; `openspec/specs/` and `openspec/changes/archive/` (written by archive; by hand only to fill a `TBD` Purpose after archive) | `main` while proposing; `change/<id>` for plan updates and spec fixes once it exists; `main` for `openspec/specs/` and the archive |
| Project docs | everything in `docs/` (ADRs, roadmap, documents the owner adds) | `main`. The roadmap and the owner's documents may also use a `docs/<topic>` branch for longer work; ADRs never do, so their numbers can't collide |
| Agent tooling | `.claude/`, `.agents/`, `.githooks/`, `openspec/schemas/`, `openspec/config.yaml`, `CLAUDE.md`, `AGENTS.md` | `main` or a `chore/` branch, never `change/<id>` |
| App | everything else, including `README.md` (the one document that describes the code) and tool configs such as `.gitignore` and `.env.example` | branches only |

`docs/` is a source of truth that changes only through defined steps: ADRs through the `adr` skill, the roadmap's status through the `change-flow` skill (proposing, abandoning) and the archive guidance, and nothing else unless the owner asks. Documents the owner adds there are the owner's: agents read them when a prompt, skill, schema or config points to them, and never edit or delete them unasked. There is no separate architecture document: the code organization is recorded in ADR 0008 and enforced by lint.

Exceptions: a task group's ticked checkboxes in `tasks.md` go with that group's app commit; a fix goes with the test proving it; the archive commit holds what archiving writes (synced `openspec/specs/`, the archived change, accepted ADRs, the roadmap status) and no app code.

## Consequences

- Antigravity, Claude Code, and other AI agents can co-exist with shared rules and skills.
- The pre-commit hook and `change-flow` allow `.agents/` on `main`.
- Custom skills in `.agents/skills/` symlink to `.claude/skills/`, preventing drift.

## Alternatives considered

- Only allow `.claude/`: prevents non-Claude agents from using native workspace skills.
- Commit `.agents/` on feature branches: violates the clean separation between app code and agent tooling.
