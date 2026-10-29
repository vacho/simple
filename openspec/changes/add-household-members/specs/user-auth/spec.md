# Spec Delta

## ADDED Requirements

### Requirement: Administrators create accounts for members
The system SHALL let administrators create a user account for a member that has no account, with a username, a display name and a temporary password following the existing rules, and the role administrator or member. The account SHALL be linked to that member when it is created. Accounts SHALL NOT be deleted; they are deactivated.

#### Scenario: Create an account for a member
- **WHEN** an administrator creates, for the member "Lucía", the account "lucia" with the display name "Lucía", the role "member" and the temporary password "primer-dia-2026"
- **THEN** the account exists, is active, is linked to Lucía, and the password is stored only as a hash

#### Scenario: Display name suggested from the member
- **WHEN** an administrator opens the new account form for the member "Lucía"
- **THEN** the display name field is filled in with "Lucía" and can be changed

#### Scenario: Member already has an account
- **WHEN** an administrator tries to create an account for a member that is already linked to an account
- **THEN** the system refuses and no account is created

#### Scenario: Username already taken
- **WHEN** an account "lucia" exists and an administrator creates another account "Lucia"
- **THEN** the system rejects it as a duplicate username and no account is created

#### Scenario: Duplicate account submission
- **WHEN** the same new account form is submitted twice
- **THEN** exactly one account is created, linked to the member, and the other submission is refused without changing it

#### Scenario: Member cannot create accounts
- **WHEN** a signed-in user without the administrator role submits a new account
- **THEN** the system denies it and no account is created

### Requirement: Temporary password replaced at first sign-in
The system SHALL mark a password set by an administrator, at account creation or by a reset, as temporary. While the password is temporary, every page SHALL lead the signed-in user to the password change page, and every other operation except sign-out SHALL be refused, until the user chooses a new password that differs from the temporary one.

#### Scenario: First sign-in asks for a new password
- **WHEN** the user "lucia" signs in for the first time with her temporary password
- **THEN** the password change page is shown instead of the app home

#### Scenario: Other pages wait for the new password
- **WHEN** a user whose password is temporary opens the members page or their profile
- **THEN** the system redirects to the password change page and shows no other data

#### Scenario: Other operations wait for the new password
- **WHEN** a user whose password is temporary submits any form or calls any endpoint other than the password change and sign-out
- **THEN** the system refuses it and performs no operation

#### Scenario: Choosing the new password
- **WHEN** a user whose password is temporary submits the new password "mi-clave-propia" twice, matching
- **THEN** the password is changed, it is no longer temporary, and the page the user requested, or the app home, is shown

#### Scenario: New password equal to the temporary one
- **WHEN** a user whose password is temporary submits the temporary password as their new password
- **THEN** the system rejects it and the password stays temporary

#### Scenario: Sign-out with a temporary password
- **WHEN** a user whose password is temporary signs out
- **THEN** the system signs them out, and at the next sign-in the password change page is shown again

### Requirement: Changing one's own password
The system SHALL let every signed-in user change their own password from their profile by giving their current password and the new password twice. A wrong current password SHALL count as a failed sign-in for that username and be throttled the same way. A successful change SHALL end the user's other sessions and keep the current one.

#### Scenario: Change own password
- **WHEN** a signed-in user gives their correct current password and the new password "otra-clave-larga" twice, matching
- **THEN** the password is changed, the user stays signed in on this device, and their sessions on other devices end

#### Scenario: Wrong current password
- **WHEN** a signed-in user gives a wrong current password
- **THEN** the system rejects the change with "The current password is wrong", the password stays the same, and one failure is counted for that username

#### Scenario: Throttled password change
- **WHEN** the user's username is locked after 5 failures within 15 minutes, counting sign-in attempts and wrong current passwords
- **THEN** further password changes are refused with the lockout message until the lock ends, even with the correct current password

#### Scenario: New passwords don't match
- **WHEN** a signed-in user types two different new passwords
- **THEN** the system rejects the change and the password stays the same

#### Scenario: New password breaks the password rules
- **WHEN** a signed-in user chooses a new password shorter than 8 characters
- **THEN** the system rejects it and explains the limits

### Requirement: Administrators reset passwords
The system SHALL let administrators set a new temporary password for another user's account. The reset SHALL end every session of that account. Administrators SHALL change their own password from their profile, not by a reset.

#### Scenario: Reset a forgotten password
- **WHEN** an administrator resets the password of "lucia" to "nueva-temporal-1"
- **THEN** Lucía's sessions end, she can sign in only with "nueva-temporal-1", and she must choose a new password at that sign-in

#### Scenario: No reset of one's own account
- **WHEN** an administrator tries to reset the password of their own account
- **THEN** the system refuses and points to the password change on their profile

#### Scenario: Member cannot reset passwords
- **WHEN** a signed-in user without the administrator role submits a password reset for any account
- **THEN** the system denies it and the password does not change

### Requirement: Deactivating accounts
The system SHALL let administrators deactivate and reactivate other users' accounts. A deactivated account SHALL NOT be able to sign in, and deactivating it SHALL end all its sessions. Reactivating SHALL restore sign-in with the same password. The account's member link and history SHALL stay unchanged.

#### Scenario: Deactivate an account
- **WHEN** an administrator deactivates the account "lucia" while Lucía is signed in on her phone
- **THEN** Lucía's next request on her phone is treated as not signed in, and the account stays linked to the member Lucía

#### Scenario: Deactivated account cannot sign in
- **WHEN** someone signs in as "lucia" with her correct password while the account is deactivated
- **THEN** the system shows "Invalid username or password" and does not start a session

#### Scenario: Reactivate an account
- **WHEN** an administrator reactivates the account "lucia"
- **THEN** Lucía can sign in again with the password she had before

#### Scenario: Member cannot deactivate accounts
- **WHEN** a signed-in user without the administrator role submits the deactivation of any account
- **THEN** the system denies it and the account stays active

### Requirement: Account roles
The system SHALL let administrators change another user's role between administrator and member. The new role SHALL apply from that user's next request, without ending their sessions.

#### Scenario: Promote a member to administrator
- **WHEN** an administrator changes the role of "lucia" from member to administrator while Lucía is signed in
- **THEN** Lucía's next request can open the settings pages

#### Scenario: Demote an administrator
- **WHEN** an administrator changes the role of another administrator to member
- **THEN** from that user's next request, the settings pages are denied to them

#### Scenario: Member cannot change roles
- **WHEN** a signed-in user without the administrator role submits a role change for any account, including their own
- **THEN** the system denies it and no role changes

### Requirement: At least one active administrator
The system SHALL always keep at least one active account with the administrator role. Administrators SHALL NOT be able to deactivate their own account or change their own role.

#### Scenario: Own account cannot be deactivated
- **WHEN** an administrator tries to deactivate their own account
- **THEN** the system refuses and the account stays active

#### Scenario: Own role cannot be changed
- **WHEN** an administrator tries to change their own role to member
- **THEN** the system refuses and they stay an administrator

#### Scenario: Concurrent demotions of the last two administrators
- **WHEN** the household has exactly two active administrators and each submits, at the same time, the demotion or deactivation of the other
- **THEN** exactly one of the two operations succeeds, and one active administrator remains

## MODIFIED Requirements

### Requirement: Sign-in
The system SHALL let a user sign in with username and password and start a session. A deactivated account SHALL be refused exactly as a wrong password is.

#### Scenario: Successful sign-in
- **WHEN** a user submits a correct username and password
- **THEN** the system starts a session and shows the page the user originally requested, or the app home

#### Scenario: Wrong credentials
- **WHEN** a user submits an unknown username or a wrong password
- **THEN** the system shows "Invalid username or password" and does not start a session

#### Scenario: Deactivated account looks like wrong credentials
- **WHEN** a sign-in attempt uses the correct password of a deactivated account
- **THEN** the system responds with the same status, message and throttling as for a wrong password, and does not start a session
