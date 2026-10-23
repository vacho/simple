# Architecture decision records

The architecture and process decisions of this project, one file per decision. A change's `design.md` explains every decision the change makes, but it is archived with the change; the decisions that outlive it are recorded here so later changes can see them. Process decisions (how changes move through Git, commit conventions) are recorded here too, so the skills that carry them out hold the steps and the ADRs hold the reasons.

## How ADRs are written

The OpenSpec schema of this project (`openspec/schemas/simple/`) adds an `adr` step to every change, between design and tasks:

1. **Design** reads the ADRs in force and names any it departs from.
2. **ADR review** (`adr.md` in the change) creates a `Proposed` ADR for each durable decision of the design, and for each decision that replaces an ADR in force. Tasks cannot be planned until this step is done.
3. **Archive** checks each Proposed ADR against the code that shipped, sets it to `Accepted`, and marks the ADRs it replaces as `Superseded by NNNN`.

The `adr` skill (`.claude/skills/adr/SKILL.md`) does the mechanics, and can also be used outside a change to record or reverse a decision.

A decision is durable when it constrains later changes or would be costly to reverse: storage, data representation, authentication, permissions, architecture, integration contracts. Version picks, tooling and one-off implementation details stay in the change's design.

A process decision taken outside a change is recorded directly as `Accepted`, with `Change: none` and where it was decided.

## Statuses

| Status | Meaning |
|---|---|
| Proposed | Written during a change; may still be edited |
| Accepted | The change shipped; never edited again |
| Superseded by NNNN | Replaced by a later ADR; kept as history |
| Rejected | The change that proposed it was abandoned |

## Rules

- File name: `NNNN-kebab-title.md`, numbered in order and never reused (`0001-sqlite-with-drizzle.md`).
- An accepted ADR is never edited, except to set its status to `Superseded by NNNN`. A changed decision gets a new ADR that names the one it supersedes.
- ADR files are never deleted.
- Keep each ADR short: the reasoning in full belongs to the change's design, which the ADR links to.
- Add every ADR to the index below.

## Template

```markdown
# NNNN. Title in the imperative or as a noun phrase

- Status: Proposed | Accepted | Superseded by NNNN | Rejected
- Date: YYYY-MM-DD
- Change: <change-id> (`openspec/changes/<change-id>/design.md`, decision Dn)
- Supersedes: NNNN (only when it does)

## Context

The forces at play: what had to be decided and the constraints that mattered.

## Decision

What was decided, in one or two short paragraphs.

## Consequences

What becomes easier, what becomes harder, and what later changes must respect.

## Alternatives considered

The options rejected and why, one line each.
```

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-sveltekit-with-node-adapter.md) | SvelteKit 3 with the Node adapter as the application framework | Proposed |
| [0002](0002-sqlite-with-drizzle.md) | SQLite through better-sqlite3 and Drizzle ORM | Proposed |
| [0003](0003-own-session-authentication.md) | Own session authentication following the Lucia/Oslo pattern | Proposed |
| [0004](0004-deny-by-default-policy-layer.md) | Single policy layer that denies by default | Proposed |
| [0005](0005-money-as-integer-minor-units.md) | Money as integer minor units | Proposed |
| [0006](0006-runtime-translation-dictionaries.md) | Runtime translation dictionaries with typed English keys | Proposed |
| [0007](0007-device-generated-ids-and-idempotent-creates.md) | Device-generated UUIDv7 IDs and idempotent creates for household data | Proposed |
| [0008](0008-modular-monolith-by-feature.md) | Modular monolith organized by feature | Proposed |
| [0009](0009-propose-and-archive-on-main.md) | Propose and archive on main, apply on a branch per change | Superseded by 0017 |
| [0010](0010-merge-no-ff-one-change-at-a-time.md) | Merge with --no-ff, one change at a time, re-verified on top of main | Accepted |
| [0011](0011-parallel-changes-in-worktrees.md) | Parallel changes only under conditions, in worktrees outside the repository | Superseded by 0020 |
| [0012](0012-commit-convention-with-task-code.md) | Commit convention with the owner's task code | Superseded by 0016 |
| [0013](0013-git-hooks-for-commit-rules.md) | Git hooks as the safety net for the commit rules | Superseded by 0019 |
| [0014](0014-versions-and-release-tags.md) | Versions and release tags | Superseded by 0018 |
| [0015](0015-commits-reviewed-before-they-are-made.md) | Commits reviewed before they are made, configurable to automatic | Accepted |
| [0016](0016-commit-convention-and-contents.md) | Commit convention and what each commit contains | Accepted |
| [0017](0017-plan-updates-where-the-change-lives.md) | Propose on main, update the plan where the change lives, archive on main | Accepted |
| [0018](0018-versions-release-after-approval-and-rollback.md) | Versions, release after approval, and recovery of a failed close | Accepted |
| [0019](0019-git-hooks-contract.md) | Git hooks contract | Accepted |
| [0020](0020-parallel-changes-in-worktrees.md) | Parallel changes only under conditions, in worktrees outside the repository | Accepted |
