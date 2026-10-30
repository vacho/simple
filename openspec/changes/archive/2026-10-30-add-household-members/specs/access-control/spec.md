# Spec Delta

## MODIFIED Requirements

### Requirement: Operations of every signed-in user
The system SHALL allow every signed-in user, whatever their role, to sign out of their own session, to view and change their own profile, to change their own password, and to view the household name, its active members and its member types. Until per-user grants exist, a user without the administrator role SHALL be denied every other protected operation. While a user's password is temporary, only the password change and sign-out SHALL be allowed.

#### Scenario: Own sign-out
- **WHEN** a signed-in user without the administrator role signs out
- **THEN** the system allows it and ends only that session

#### Scenario: Own profile is allowed
- **WHEN** a signed-in user without the administrator role views or saves their own profile
- **THEN** the system allows it

#### Scenario: Another user's profile is denied
- **WHEN** a signed-in user without the administrator role tries to view or change another user's profile
- **THEN** the system denies it

#### Scenario: Own password change is allowed
- **WHEN** a signed-in user without the administrator role changes their own password
- **THEN** the system allows it

#### Scenario: Viewing the household is allowed
- **WHEN** a signed-in user without the administrator role views the household name, its active members or its member types
- **THEN** the system allows it

#### Scenario: Non-administrator is denied
- **WHEN** a signed-in user without the administrator role requests any other protected operation, such as managing members, member types, the household name or user accounts
- **THEN** the system denies it and shows a "not allowed" page instead of the data

#### Scenario: Temporary password allows only the password change
- **WHEN** a signed-in user whose password is temporary, administrator or not, requests their profile, the members page or the settings
- **THEN** the system does not perform the operation and leads them to the password change page
