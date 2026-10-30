# 0027. Account states are enforced by session validation and the policy

- Status: Accepted
- Date: 2026-10-29
- Change: add-household-members (`openspec/changes/archive/2026-10-30-add-household-members/design.md`, decisions D2, D3 and D5)

## Context

Administrators now create accounts with temporary passwords, reset passwords, deactivate accounts and change roles. Each state must hold for every page and operation, including those later changes add, and the household must never lose its last administrator.

## Decision

Account state lives on the `users` row (`active`, `password_temporary`, `role`) and is read on every request with the session, so changes apply from the next request. A deactivated account is refused at sign-in exactly like a wrong password, and its sessions are ended and rejected at validation. While a password is temporary, the policy's `can()` denies every action except changing one's own password, signing out and the public actions, and the route guard sends pages to the password change page. Deactivation, reactivation, role changes and password resets never target the acting administrator's own account, and role or state changes that would leave no active administrator are refused inside their transaction.

## Consequences

- New actions are covered by the temporary password gate without any code of their own.
- Every role or state change takes effect at the next request; nothing caches the actor across requests.
- Sign-in keeps revealing nothing about account states (ADR 0003).
- Deleting accounts stays out: accounts are deactivated, so history keeps its references.

## Alternatives considered

- Checking the temporary password in each route or service: one forgotten check would bypass it.
- Ending sessions on role changes: unnecessary, because the role is read on every request.
- Telling deactivated users their account is deactivated: reveals which usernames exist.
