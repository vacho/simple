# Architecture decision records

The architecture decisions of this project, one file per decision. A change's `design.md` explains every decision the change makes, but it is archived with the change; the decisions that outlive it are recorded here so later changes can see them.

## How ADRs are written

The OpenSpec schema of this project (`openspec/schemas/simple/`) adds an `adr` step to every change, between design and tasks:

1. **Design** reads the ADRs in force and names any it departs from.
2. **ADR review** (`adr.md` in the change) creates a `Proposed` ADR for each durable decision of the design, and for each decision that replaces an ADR in force. Tasks cannot be planned until this step is done.
3. **Archive** checks each Proposed ADR against the code that shipped, sets it to `Accepted`, and marks the ADRs it replaces as `Superseded by NNNN`.

The `adr` skill (`.claude/skills/adr/SKILL.md`) does the mechanics, and can also be used outside a change to record or reverse a decision.

A decision is durable when it constrains later changes or would be costly to reverse: storage, data representation, authentication, permissions, architecture, integration contracts. Version picks, tooling and one-off implementation details stay in the change's design.

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
