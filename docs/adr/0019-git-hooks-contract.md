# 0019. Git hooks contract

- Status: Superseded by 0025
- Date: 2026-10-23
- Change: none (process decision taken with the owner while defining the workflow)
- Supersedes: 0013

## Context

0013 introduced the Git hooks as the safety net for the commit rules. Since then the rules moved: the commit convention is 0016 (which superseded 0012), `README.md` became app documentation that doesn't belong on `main`, and a review found that the hooks misread file names with accents and let attribution through in merge messages.

## Decision

Keep two Git hooks in `.githooks/`, committed and enabled per clone with `git config core.hooksPath .githooks` (the app's npm `prepare` script enables them once `package.json` exists):

- `commit-msg` first rejects attribution lines (`Co-Authored-By`) in any message, merges and reverts included. It then checks the title against 0016: type, lowercase scope, a description that starts in lowercase without a final period, a final ` - <task-code>` where the task code is digits only, and the change id as scope on `change/<id>` branches. A title over 72 characters is only warned about. Messages Git writes itself (merges, reverts, fixups) are exempt from the title check only.
- `pre-commit` rejects app code on `main`: only `openspec/`, `docs/`, `.claude/`, `.githooks/`, `CLAUDE.md` and `AGENTS.md` may be committed there, except when concluding a merge. It asks Git for staged paths outside the allowlist with exclude pathspecs instead of parsing file names, so any file name (accents, spaces, newlines) is classified correctly.

Agents never bypass them with `--no-verify`. The hooks check the title and code on `main`; the other commit rules (one kind per commit) stay in the `change-flow` skill.

## Consequences

- Wrong commits are stopped whoever makes them, as long as the hooks are enabled in that clone.
- The owner's documents in `docs/` can have any file name.
- Task codes must be digits; a different format would need a new decision and a hook change.
- Each new clone or worktree must enable the hooks once; `change-flow` checks it in `prepare`.
- The hooks are plain POSIX shell, with no dependency on Node.

## Alternatives considered

- Husky or lefthook: an extra dependency for two small scripts.
- Checks in CI only: catches mistakes after they are pushed, not before they are committed.
- Enforcing every commit-kind rule in the hooks: the exceptions make it complex; added only if mixing happens in practice.
