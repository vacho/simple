# 0026. Members, not user accounts, are the people household data refers to

- Status: Proposed
- Date: 2026-10-29
- Change: add-household-members (`openspec/changes/add-household-members/design.md`, decision D1)

## Context

Household data will be attributed to people: expenses allocated to members or the shared pool, visibility by member, budgets and reports per member. Not every person in the household signs in (young children, dependents), and an account can exist before anyone decides which person it belongs to (the administrator created at setup).

## Decision

Household members are household data (UUIDv7 IDs, ADR 0007) owned by the `household` feature, each with a member type mapped to a fixed base class: adult, minor or dependent. User accounts stay server-only sign-in credentials owned by `users`. A member is linked to at most one account and an account to at most one member; the link is stored on the member (`members.user_id`, unique). Rules and permissions that depend on the kind of person use the base class, never the member type's name.

## Consequences

- Later changes attribute data and visibility to member IDs, never to user IDs; "the current user's member" is found through the link.
- A person with no account can still own and be attributed data; an account with no member sees no member-scoped data until it is linked.
- The `users` feature doesn't depend on household data; the household feature reads `users` only through its `queries.ts` (ADR 0008).
- Adding a base class is a new decision; renaming member types never changes behavior.

## Alternatives considered

- Attribute data to user accounts: leaves out household members who don't sign in.
- Store the link on `users` (`member_id`): makes server-only accounts depend on household data.
- A link table: one more table for a one-to-one link with no attributes.
