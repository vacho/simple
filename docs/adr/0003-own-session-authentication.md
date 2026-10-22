# 0003. Own session authentication following the Lucia/Oslo pattern

- Status: Proposed
- Date: 2026-10-22
- Change: bootstrap-app-foundation (`openspec/changes/bootstrap-app-foundation/design.md`, decision D4)

## Context

Household members sign in with a username and password from their own devices. No OAuth or email flows are needed, and every action must be tied to a known user.

## Decision

Implement authentication in the app: Argon2id password hashes, random session tokens stored only as SHA-256 hashes, sliding 30-day sessions in an `HttpOnly` cookie, and sign-in throttling per username and per client address stored in SQLite. Sign-in never reveals whether a username exists.

## Consequences

- The auth code is small and fully under our control, and it must be tested end to end.
- A leaked database does not leak live sessions.
- Adding OAuth or passkeys later needs a new decision.

## Alternatives considered

- Better Auth or Auth.js: bring OAuth and email features we don't need, and their own user schemas.
