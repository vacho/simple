# Proposal

## Why

The app has one administrator account and nothing else: no notion of a household, of the people in it, or a way to let other members sign in. Every later change attributes data to people (the ledger allocates expenses to members or the shared pool, access control makes items visible by member, budgets and reports group by member), so the household and its members must exist first, together with the accounts members use to sign in. This is change 2 of `docs/roadmap.md`, `add-household-members`.

## What Changes

- Add the household: a single record with a name the administrator sets after setup. Until then the household is unnamed. Every signed-in user sees the household name.
- Add the member types catalog, managed by administrators: free names ("Son", "Grandmother", "Dependent nephew"), each mapped to a fixed base class (adult, minor or dependent). It follows the common catalog rules of the roadmap: names unique ignoring case, archived instead of deleted once used, and the base class immutable once a member uses the type. No types are seeded: setup stays as it is, and the administrator creates the types the household needs.
- Add members, managed by administrators: a name and a member type, optionally linked to one user account. Members are archived, not deleted, once referenced. Every signed-in user can see the list of active members and their types, read-only.
- Let administrators manage user accounts:
  - create an account for a member, with a username, a display name, a role (administrator or member) and a temporary password, linked to that member;
  - link an existing account that has no member to a member (for example the administrator created at setup), and unlink it;
  - reset a user's password to a new temporary one, which ends that user's sessions;
  - deactivate and reactivate an account: a deactivated account can't sign in and its sessions end, while its member and history stay;
  - change an account's role between administrator and member.
  The household always keeps at least one active administrator, and administrators can't deactivate or demote their own account.
- Require a new password at the first sign-in after an account is created or its password is reset: until the user chooses their own, every page leads to the password change page.
- Let every signed-in user change their own password from the profile page, giving their current password; their other sessions end.
- **Changed behavior:** signed-in users who aren't administrators may now view the household, its members and member types and change their own password; before this change they were denied everything but their profile and sign-out. Deactivated accounts and accounts with a pending password change are new account states that sign-in and every request respect.

Out of scope: roles as a catalog, per-user grants and the visibility rule by account or member (change 3, `add-access-control`); members' own data such as birth dates or contact details; attributing anything to members (the ledger, change 7); self-service password recovery and email of any kind; deleting user accounts (they are deactivated); seeded member types; household settings beyond its name (currencies and others arrive with their changes).

## Capabilities

### New Capabilities
- `household`: the household record, the member types catalog with its fixed base classes, and the members of the household with their optional link to a user account; who may see and change each of them.

### Modified Capabilities
- `user-auth`: administrators create accounts for members, reset passwords, deactivate and reactivate accounts and change roles, always keeping one active administrator; temporary passwords must be replaced at the next sign-in; users change their own password; sign-in and sessions refuse deactivated accounts.
- `access-control`: the operations allowed to every signed-in user now include viewing the household, its members and member types, and changing their own password; a pending password change restricts a session to the password change page and sign-out.

## Impact

- **Roadmap:** implements change 2 as planned. Beyond the roadmap's "modifies `user-auth`", it also modifies `access-control`, because the operations allowed to users who aren't administrators change.
- **Policy matrix:** new actions to view and update the household, view and manage member types, view and manage members, manage user accounts (create, link, reset password, deactivate, reactivate, change role) and change one's own password. Viewing is allowed to every signed-in user; managing, only to administrators. The full matrix is in `design.md`.
- **Translations:** new English texts with descriptions and reviewed Spanish translations for the household, member types, members, account management and password change screens, including the three base class names. Member, member type and household names are user data and are not translated.
- **Code:** a new `household` feature owning the household, member types and members tables; account management added to the `users` and `auth` features; new pages under the signed-in frame (members for everyone; household, member types and accounts under settings for administrators; password change). One database migration adds the new tables and the account state columns to `users`; it runs automatically, after the pre-migration backup.
- **Dependencies:** possibly a UUIDv7 generator (decided in `design.md`).
- **Versioning:** a minor release per ADR 0018 (`0.1.0` -> `v0.2.0`): no manual action is needed from the operator on upgrade.
