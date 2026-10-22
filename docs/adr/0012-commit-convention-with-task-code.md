# 0012. Commit convention with the owner's task code

- Status: Accepted
- Date: 2026-10-22
- Change: none (process decision taken with the owner while defining the workflow, task 001)

## Context

Commits must be traceable both to the OpenSpec change they implement and to the owner's own to-do list, and reviewable by one person. Plan and code have different reviews.

## Decision

Titles follow `type(scope): description - <task-code>`, in English, imperative, lowercase, without a final period. The scope is the change id; outside a change, a fixed area (`openspec`, `roadmap`, `deps`, `ci`); for a fix after archive, the capability name. The task code is the owner's to-do item, never invented. Each commit has one purpose: plan changes never mix with code, a task group's ticked checkboxes go with its code, and a fix goes with its test. No attribution lines.

## Consequences

- `git log` answers both "which change?" and "which to-do item?".
- Agents must ask for the task code when they don't have it.
- A fix that changes specified behavior can't hide as a `fix`: it needs a new change.

## Alternatives considered

- Plain Conventional Commits: no link to the owner's to-do list.
- One commit per change: loses recovery points and review granularity.
