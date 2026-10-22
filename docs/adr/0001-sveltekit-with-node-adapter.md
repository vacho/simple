# 0001. SvelteKit 3 with the Node adapter as the application framework

- Status: Proposed
- Date: 2026-10-22
- Change: bootstrap-app-foundation (`openspec/changes/bootstrap-app-foundation/design.md`, decision D1)

## Context

The app needs server rendering, form handling, server endpoints and an installable mobile client, written and maintained by AI agents and reviewed by one person. It runs on a home server or a small VPS.

## Decision

Build one SvelteKit 3 (Svelte 5, runes only) application in strict TypeScript, deployed with `adapter-node` as a single Node.js process. Follow the Kit 3 idioms listed in D1 and check the official docs, because Kit 3 is newer than the agents' training data.

## Consequences

- One codebase and one build serve both the UI and the server.
- Agents must not rely on Kit 2 habits; lint bans the removed modules.
- Hosting must run a long-lived Node.js process.

## Alternatives considered

- Next.js (React): heavier at runtime, harder PWA setup, more framework rules to get wrong.
- React SPA with a separate API (Hono or Fastify): two apps and duplicated validation for a single-household tool.
