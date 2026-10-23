# 0013. Git hooks as the safety net for the commit rules

- Status: Superseded by 0019
- Date: 2026-10-22
- Change: none (process decision taken with the owner while defining the workflow, task 001)

## Context

The `change-flow` skill carries out the Git workflow, but only when it is used. A commit made by hand, by another tool, or by an agent that skips the skill is not checked by anything.

## Decision

Keep two Git hooks in `.githooks/`, committed and enabled per clone with `git config core.hooksPath .githooks`:
- `commit-msg` rejects titles that don't follow 0012: type, lowercase scope, a description that starts in lowercase without a final period, a final ` - <task-code>`, the change id as scope on `change/<id>` branches, and no attribution lines. A title over 72 characters is only warned about. Messages Git writes itself (merges, reverts, fixups) pass.
- `pre-commit` rejects code commits on `main`: only `openspec/`, `docs/`, `.claude/`, `.githooks/`, `CLAUDE.md`, `AGENTS.md` and `README.md` may be committed there, except when concluding a merge.

Agents never bypass them with `--no-verify`.

## Consequences

- Wrong commits are stopped whoever makes them, as long as the hooks are enabled in that clone.
- Each new clone or worktree checkout must enable them once; `change-flow` checks it in `prepare`.
- The hooks are plain POSIX shell, with no dependency on Node.

## Alternatives considered

- Husky or lefthook: an extra dependency for two small scripts.
- Checks in CI only: catches mistakes after they are pushed, not before they are committed.
