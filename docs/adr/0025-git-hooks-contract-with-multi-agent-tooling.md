# 0025. Git hooks contract, with multi-agent tooling

- Status: Accepted
- Date: 2026-10-29
- Change: none (process decision taken with the owner when Antigravity joined the project)
- Supersedes: 0019

## Context

0019 defined the two Git hooks and the paths `pre-commit` allows on `main`. 0024 then made `.agents/` agent tooling, committed on `main` like `.claude/`, and the hook was changed to allow it; 0019 still listed the old paths, so the hook and its recorded contract disagreed. 0019 also pointed to 0016 for the commit convention, which 0022 and then 0024 superseded.

## Decision

Keep two Git hooks in `.githooks/`, committed and enabled per clone with `git config core.hooksPath .githooks` (the app's npm `prepare` script enables them):

- `commit-msg` first rejects attribution lines (`Co-Authored-By`) in any message, merges and reverts included. It then checks the title against the commit convention of 0024: type, lowercase scope, a description that starts in lowercase without a final period, a final ` - <task-code>` where the task code is digits only, and the change id as scope on `change/<id>` branches. A title over 72 characters is only warned about. Messages Git writes itself (merges, reverts, fixups) are exempt from the title check only.
- `pre-commit` rejects app code on `main`: only `openspec/`, `docs/`, `.claude/`, `.agents/`, `.githooks/`, `CLAUDE.md` and `AGENTS.md` may be committed there, except when concluding a merge. It asks Git for staged paths outside the allowlist with exclude pathspecs instead of parsing file names, so any file name (accents, spaces, newlines) is classified correctly.

Agents never bypass them with `--no-verify`. The hooks check the title and code on `main`; the other commit rules (one kind per commit) stay in the `change-flow` skill.

## Consequences

- Wrong commits are stopped whoever makes them, Claude Code, Antigravity or a person, as long as the hooks are enabled in that clone.
- The allowlist follows the agent tooling of 0024: a new tool folder needs a new decision and a hook change.
- The owner's documents in `docs/` can have any file name.
- Task codes must be digits; a different format would need a new decision and a hook change.
- Each new clone or worktree must enable the hooks once; `change-flow` checks it in `prepare`.
- The hooks are plain POSIX shell, with no dependency on Node.

## Alternatives considered

- Husky or lefthook: an extra dependency for two small scripts.
- Checks in CI only: catches mistakes after they are pushed, not before they are committed.
- Enforcing every commit-kind rule in the hooks: the exceptions make it complex; added only if mixing happens in practice.
