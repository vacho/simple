# 0023. The app lives in its own folder

- Status: Proposed
- Date: 2026-10-29
- Change: bootstrap-app-foundation (`openspec/changes/bootstrap-app-foundation/design.md`, decision D12)

## Context

The repository holds two things: the app, and the tools used to build it with AI agents (agent skills, Git hooks, OpenSpec specs and changes, project documents). With the app at the repository root, its project files (`package.json`, `node_modules/`, tool configs, `scripts/`, `messages/`, `drizzle/`, `static/`, `tests/`) mix with that tooling, and the owner wants the app kept apart from the tools that build it.

## Decision

The app is a self-contained npm project in `app/`: `package.json`, `package-lock.json`, `node_modules/`, its tool configs, SvelteKit's `src/`, and its `messages/`, `drizzle/`, `scripts/`, `static/` and `tests/`. The repository root holds only the tooling: `.claude/`, `.githooks/`, `docs/`, `openspec/`, `CLAUDE.md` and `AGENTS.md`.

Paths to app files in ADRs, specs, designs and tasks are relative to `app/` (`src/lib/features/`, `messages/en.json`, `package.json`), unless they say otherwise.

## Consequences

- npm, build, test and check commands run in `app/` (`npm --prefix app run check`, or from inside it). The app's `prepare` script still enables the hooks for the whole repository.
- Release and Git tooling read the version from `app/package.json`.
- Deploying copies or checks out `app/` only; nothing at the root is needed to run the app.

## Alternatives considered

- App at the repository root, the usual SvelteKit layout: mixes the app's project files with the build tooling.
- The folder named `src/`: SvelteKit keeps its own `src/` inside the app, giving `src/src/lib/`.
