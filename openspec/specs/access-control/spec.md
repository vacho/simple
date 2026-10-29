# access-control Specification

## Purpose

Decides on the server, for every request and operation, whether the current user may perform it, so that household financial data is only shown to or changed by people the administrator has allowed.

## Requirements

### Requirement: Authentication required by default
The system SHALL require a signed-in user for every page and server endpoint except the sign-in page, the first-run setup page, the offline page, the translation dictionaries, and the static assets needed to render them and install the app.

#### Scenario: Anonymous request to a protected page
- **WHEN** a visitor who is not signed in requests a protected page
- **THEN** the system redirects to the sign-in page and remembers the requested page for after sign-in

#### Scenario: Anonymous request to a protected endpoint
- **WHEN** a request that is not signed in calls a protected server endpoint or form action
- **THEN** the system responds with "unauthorized" and performs no operation

#### Scenario: Public pages stay reachable
- **WHEN** a visitor who is not signed in requests the sign-in page, the setup page or the app manifest
- **THEN** the system serves them

#### Scenario: Translations load before sign-in
- **WHEN** a visitor with no session cookie requests a translation dictionary, both before and after setup
- **THEN** the system serves it, so the setup and sign-in pages render in the visitor's language

### Requirement: Explicit authorization of protected operations
The system SHALL check, on the server, every read and write of protected data against the current user before performing it. An operation without an explicit permission rule SHALL be denied.

#### Scenario: Operation with no rule is denied
- **WHEN** a signed-in user requests an operation for which no permission rule exists
- **THEN** the system denies it and performs no read or write

#### Scenario: Denied operation reveals nothing
- **WHEN** an operation is denied
- **THEN** the response does not include any of the protected data and is the same whether or not the targeted record exists

### Requirement: Public operations
The system SHALL allow anyone, signed in or not, to check whether setup is still open, to read the installed languages and their translations, and to sign in. It SHALL allow first-run setup only to visitors who are not signed in, and only while no user accounts exist.

#### Scenario: Setup status is public
- **WHEN** a visitor who is not signed in needs to know whether setup is open
- **THEN** the system answers without requiring sign-in

#### Scenario: Sign-in is public
- **WHEN** a visitor who is not signed in submits the sign-in form
- **THEN** the system processes the attempt

#### Scenario: Setup after the first account
- **WHEN** anyone attempts setup while at least one user account exists
- **THEN** the system refuses it

### Requirement: Operations of every signed-in user
The system SHALL allow every signed-in user, whatever their role, to sign out of their own session and to view and change their own profile. Until per-user grants exist, a user without the administrator role SHALL be denied every other protected operation.

#### Scenario: Own sign-out
- **WHEN** a signed-in user without the administrator role signs out
- **THEN** the system allows it and ends only that session

#### Scenario: Own profile is allowed
- **WHEN** a signed-in user without the administrator role views or saves their own profile
- **THEN** the system allows it

#### Scenario: Another user's profile is denied
- **WHEN** a signed-in user without the administrator role tries to view or change another user's profile
- **THEN** the system denies it

#### Scenario: Non-administrator is denied
- **WHEN** a signed-in user without the administrator role requests any other protected operation
- **THEN** the system denies it and shows a "not allowed" page instead of the data

### Requirement: Administrator operations
The system SHALL allow users with the administrator role every protected operation except internal operations, including viewing and changing any user's profile.

#### Scenario: Administrator is allowed
- **WHEN** a signed-in administrator requests a protected operation that is not internal
- **THEN** the system allows it

#### Scenario: Administrator views another profile
- **WHEN** a signed-in administrator requests another user's profile
- **THEN** the system allows it

### Requirement: Internal operations
The system SHALL reserve internal operations (creating accounts during setup, reading stored credentials for sign-in, checking whether any account exists, validating sessions, and installing the preinstalled languages at startup) to the application itself. No user, including an administrator, SHALL be able to perform them directly, and stored password hashes SHALL never be returned to any user.

#### Scenario: Administrator cannot read credentials
- **WHEN** a signed-in administrator attempts to read another user's stored credentials
- **THEN** the system denies it

#### Scenario: Requests cannot act as the application
- **WHEN** any request, signed in or not, reaches the server
- **THEN** it is handled as an anonymous visitor or as the signed-in user, never with the application's internal permissions

### Requirement: Cross-site request protection
The system SHALL reject state-changing requests that do not originate from the app's own origin.

#### Scenario: Forged form submission
- **WHEN** a state-changing request arrives with an origin different from the app's own origin
- **THEN** the system rejects it without performing the operation
