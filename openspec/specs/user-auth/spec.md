# user-auth Specification

## Purpose

Lets people who use the household finance app sign in with their own account, so that every action can be tied to a known user and checked against their permissions.

## Requirements

### Requirement: First-run administrator setup
The system SHALL offer a setup page only while no user accounts exist. Completing setup SHALL create one account with the administrator role and sign that user in.

#### Scenario: Setup on an empty installation
- **WHEN** a visitor opens the setup page and no user accounts exist
- **THEN** the system shows the setup form asking for a display name, a username and a password

#### Scenario: Setup creates the administrator
- **WHEN** the visitor submits valid setup details
- **THEN** the system creates an account with the administrator role, starts a session for it and shows the app home

#### Scenario: Setup is closed once a user exists
- **WHEN** a visitor requests the setup page and at least one user account exists
- **THEN** the system does not show the setup form and redirects to the sign-in page

#### Scenario: Concurrent setup attempts
- **WHEN** two setup submissions arrive at the same time on an empty installation
- **THEN** exactly one administrator account is created and the other submission is rejected

### Requirement: Initial entry leads to setup
While no user accounts exist, the system SHALL redirect every page request, including the app root and the sign-in page, to the setup page. Static assets and the app manifest SHALL still be served.

#### Scenario: Opening the app root on an empty installation
- **WHEN** a visitor opens `/` and no user accounts exist
- **THEN** the system redirects to the setup page

#### Scenario: Sign-in page on an empty installation
- **WHEN** a visitor opens the sign-in page and no user accounts exist
- **THEN** the system redirects to the setup page

#### Scenario: After setup
- **WHEN** at least one user account exists and a visitor who is not signed in opens `/`
- **THEN** the system redirects to the sign-in page

### Requirement: Username rules
The system SHALL accept usernames of 3 to 32 characters using only ASCII lowercase letters `a-z`, digits `0-9`, dot, underscore and hyphen, after normalization. Normalization (trim, Unicode NFKC, lowercase) SHALL be applied identically at account creation, sign-in and throttling. Usernames SHALL be unique after normalization.

#### Scenario: Valid username after normalization
- **WHEN** the username " Ana.Perez " is submitted
- **THEN** it is accepted and stored as "ana.perez"

#### Scenario: Non-ASCII letters are rejected
- **WHEN** the username "toño" is submitted
- **THEN** the system rejects it and explains the allowed characters

#### Scenario: Username uniqueness ignores case
- **WHEN** an account "ana" exists and a new account "ANA" is submitted
- **THEN** the system rejects the new account as a duplicate

#### Scenario: Sign-in uses the same normalization
- **WHEN** the user "ana.perez" signs in as "Ana.Perez"
- **THEN** the username matches the account

### Requirement: Display name rules
The system SHALL accept display names of 1 to 64 characters after trimming, allowing letters of any script, accents, digits, spaces and punctuation, and SHALL reject control characters.

#### Scenario: Accented display name
- **WHEN** the display name "  María José Ñuflo " is submitted
- **THEN** it is accepted and stored as "María José Ñuflo"

#### Scenario: Empty or invalid display name
- **WHEN** the display name is empty after trimming, longer than 64 characters, or contains a control character
- **THEN** the system rejects it and explains why

### Requirement: Password rules
The system SHALL accept passwords of 8 to 128 characters counted as Unicode code points after NFKC normalization, without trimming, and SHALL store them only as a salted, slow hash.

#### Scenario: Too short or too long
- **WHEN** a password shorter than 8 or longer than 128 characters is submitted
- **THEN** the system rejects it and explains the limits

#### Scenario: Spaces are significant
- **WHEN** an account was created with the password "  secret phrase  "
- **THEN** signing in with "secret phrase" fails and signing in with "  secret phrase  " succeeds

#### Scenario: Password is never stored in plain text
- **WHEN** an account is created
- **THEN** the stored record contains a password hash and not the password itself

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

### Requirement: No account enumeration
The system SHALL respond to sign-in attempts for unknown usernames exactly as for existing usernames with a wrong password: same message, same status, same throttling, and comparable response time.

#### Scenario: Same response for unknown and existing usernames
- **WHEN** one attempt uses an unknown username and another uses an existing username with a wrong password
- **THEN** both receive the same status code and the same message

#### Scenario: Same work for unknown and existing usernames
- **WHEN** a sign-in attempt uses an unknown username, and another uses an existing username with a wrong password
- **THEN** each attempt performs exactly one password hash verification with the same parameters, so response times are comparable

#### Scenario: Unknown usernames are throttled too
- **WHEN** 5 consecutive attempts for an unknown username fail within 15 minutes
- **THEN** further attempts for that username are refused with the same lockout message an existing account would get

### Requirement: Sign-in throttling
The system SHALL count failed sign-in attempts per normalized username, whether or not an account exists, and per client address. A username SHALL be locked after 5 failures within 15 minutes, and an address after 20, each for 15 minutes from the failure reaching the limit. Attempts refused while locked SHALL NOT be counted nor extend a lock. A success SHALL reset only the username's counter.

#### Scenario: Too many failures
- **WHEN** 5 consecutive sign-in attempts for the same username fail within 15 minutes
- **THEN** further attempts for that username are refused for 15 minutes with a message to try again later, even with the correct password

#### Scenario: Success resets the counter
- **WHEN** a user signs in successfully before reaching the limit
- **THEN** the failure count for that username is reset, and the failure count for the client address is not

#### Scenario: Address lock across usernames
- **WHEN** 20 failed attempts with different usernames come from the same client address within 15 minutes
- **THEN** further attempts from that address are refused for 15 minutes, for any username

#### Scenario: Shared household address
- **WHEN** several household members behind the same address mistype their passwords, for 5 failures in total across their usernames
- **THEN** none of them is locked out, and each can still sign in with the correct password

#### Scenario: Concurrent wrong attempts
- **WHEN** 10 sign-in attempts with a wrong password for the same, previously unlocked username are processed concurrently
- **THEN** exactly 5 are recorded as failures and lock the username, and the other 5 are refused with the lockout message without being counted

#### Scenario: Refused attempts don't extend the lock
- **WHEN** attempts keep arriving for a locked username
- **THEN** the lock still ends 15 minutes after the failure that triggered it

#### Scenario: Lockout during a pending attempt
- **WHEN** an attempt with the correct password is being checked while other attempts lock the username
- **THEN** that attempt is refused with the lockout message

### Requirement: Sessions
The system SHALL keep a signed-in session in an HTTP-only, same-site cookie. A session SHALL expire between 29 and 30 days after its last use; using it SHALL extend it accordingly, renewing the cookie's lifetime too.

#### Scenario: Session persists across visits
- **WHEN** a signed-in user returns to the app within 29 days of their last request
- **THEN** the user is still signed in

#### Scenario: Tolerance window
- **WHEN** a user returns between 29 and 30 days after their last request
- **THEN** the session may or may not still be valid, depending on when it was last extended

#### Scenario: Idle session expires
- **WHEN** a user returns more than 30 days after their last request
- **THEN** the session is no longer valid, the session cookie is cleared, and the user must sign in again

#### Scenario: Daily use keeps the session alive
- **WHEN** a user uses the app once a day for 60 days
- **THEN** the session stays valid throughout, and the cookie's lifetime is renewed with it

### Requirement: Sign-out
The system SHALL let a signed-in user sign out, invalidating the current session on the server.

#### Scenario: Sign-out
- **WHEN** a signed-in user chooses "Sign out"
- **THEN** the session is invalidated, the cookie is cleared and the sign-in page is shown

#### Scenario: Reusing a signed-out session
- **WHEN** a request presents the cookie of a session that was signed out
- **THEN** the system treats the request as not signed in

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
