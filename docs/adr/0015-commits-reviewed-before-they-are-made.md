# 0015. Commits reviewed before they are made, configurable to automatic

- Status: Accepted
- Date: 2026-10-23
- Change: none (process decision taken with the owner while defining the workflow)

## Context

Agents make most commits in this project. The owner wants to see what will be committed, and how it is split and titled, before it enters history: a commit is easy to propose and awkward to undo once more work sits on top of it. Some contributors or sessions may prefer agents to commit on their own.

## Decision

Commits made through the `change-flow` skill follow a commit mode read from the clone's local Git config, `simple.commitMode`:
- `review` (the default, also when the setting is missing): the agent first shows the proposed commits (title, files and purpose of each), stops so the owner can review the working tree, and commits only after the owner approves, with any renames, splits or drops the owner asks for.
- `auto`: the agent commits directly and reports what it committed.

The owner can override the mode for one request ("commit this automatically", "show me before committing"); the setting itself only changes when the owner changes it. The mode never relaxes the other rules: the task code is still asked for, the hooks still run, and merging still needs the owner's approval in `close`.

## Consequences

- No commit enters history unseen, unless the owner chose `auto`.
- Each person or machine picks a mode without touching the repository, like the Git hooks (0019).
- In `review` mode, work pauses at every commit point until the owner answers; parallel agents in worktrees stop after each task group.

## Alternatives considered

- Always automatic: fast, but history fills with commits the owner never saw.
- Always review: no way to speed up trusted, repetitive work.
- A setting committed in the repository: one choice for everyone, while this is a personal preference.
