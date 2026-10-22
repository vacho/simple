# Architecture decision records

The architecture decisions still in force, one file per decision. A change's `design.md` explains every decision the change made, but it is archived with the change; the decisions that outlive it are copied here so later changes can see them.

## When to write one

When a change is archived, each decision in its `design.md` that outlives the change gets an ADR: it constrains later changes, or it would be costly to reverse (storage, money representation, authentication, permissions, architecture). Version picks, tooling and one-off implementation details stay in the archived design.

## Rules

- File name: `NNNN-kebab-title.md`, numbered in order and never reused (`0001-sqlite-with-drizzle.md`).
- An accepted ADR is never edited, except to set its status to `Superseded by NNNN`. A changed decision gets a new ADR that names the one it supersedes.
- Keep each ADR short: the reasoning in full belongs to the change's design, which the ADR links to.
- Add every ADR to the index below.

## Template

```markdown
# NNNN. Title in the imperative or as a noun phrase

- Status: Accepted | Superseded by NNNN
- Date: YYYY-MM-DD
- Change: <change-id> (`openspec/changes/archive/<date>-<change-id>/design.md`, decision Dn)
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
