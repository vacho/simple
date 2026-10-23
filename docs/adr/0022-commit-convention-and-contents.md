# 0022. Commit convention and what each commit contains

- Status: Accepted
- Date: 2026-10-23
- Change: none (process decision taken with the owner while defining the workflow)
- Supersedes: 0016

## Context

0012 set the commit title format and kept plan and code apart; 0016 added the kinds of files (plan, project docs, agent tooling, app) and where each is committed. 0016 let all project docs, ADRs included, be committed on a `docs/<topic>` branch. But ADRs take the next number from what is on `main`: one written on a branch while another is written on `main` (a proposal, or a detour) can take the same number.

## Decision

Titles follow `type(scope): description - <task-code>`, in English, imperative, lowercase, without a final period. The scope is the change id; outside a change, a fixed area (`openspec`, which also covers ADRs recorded outside a change, `roadmap`, `deps`, `build`, `ci`) or the tool concerned; for a fix after archive, the capability name. The task code is the owner's to-do item, digits only, never invented: agents ask for it when they don't have it. A fix that changes specified behavior can't hide as a `fix`: it needs a new OpenSpec change. No attribution lines.

Every file belongs to one of four kinds, and each commit holds one kind:

| Kind | Files | Committed on |
|---|---|---|
| Plan | `openspec/changes/<id>/`; `openspec/specs/` and `openspec/changes/archive/` (written by archive; by hand only to fill a `TBD` Purpose after archive) | `main` while proposing; `change/<id>` for plan updates and spec fixes once it exists; `main` for `openspec/specs/` and the archive |
| Project docs | everything in `docs/` (ADRs, roadmap, documents the owner adds) | `main`. The roadmap and the owner's documents may also use a `docs/<topic>` branch for longer work; ADRs never do, so their numbers can't collide |
| Agent tooling | `.claude/`, `.githooks/`, `openspec/schemas/`, `openspec/config.yaml`, `CLAUDE.md`, `AGENTS.md` | `main` or a `chore/` branch, never `change/<id>` |
| App | everything else, including `README.md` (the one document that describes the code) and tool configs such as `.gitignore` and `.env.example` | branches only |

`docs/` is a source of truth that changes only through defined steps: ADRs through the `adr` skill, the roadmap's status through the `change-flow` skill (proposing, abandoning) and the archive guidance, and nothing else unless the owner asks. Documents the owner adds there are the owner's: agents read them when a prompt, skill, schema or config points to them, and never edit or delete them unasked. There is no separate architecture document: the code organization is recorded in ADR 0008 and enforced by lint.

Exceptions: a task group's ticked checkboxes in `tasks.md` go with that group's app commit; a fix goes with the test proving it; the archive commit holds what archiving writes (synced `openspec/specs/`, the archived change, accepted ADRs, the roadmap status) and no app code.

## Consequences

- History can be read by kind: plan, decisions, tooling and app never hide inside each other.
- A tooling fix found while applying a change waits for, or moves to, its own commit on `main` or a `chore/` branch.
- ADRs created while a change is in progress go through a detour to `main` (`change-flow` skill).
- The rule lives in the `change-flow` skill; the hooks still check only the title and code on `main` (0019).

## Alternatives considered

- Plan versus code only (0012): left tooling and docs unaccounted for.
- ADRs on `docs/<topic>` branches too (0016): two places to take the next number.
- Plain Conventional Commits: no link to the owner's to-do list.
- One commit per change: loses recovery points and review granularity.
- Enforcing the kinds in the `pre-commit` hook: possible later, but the exceptions make it complex; added only if mixing happens in practice.
