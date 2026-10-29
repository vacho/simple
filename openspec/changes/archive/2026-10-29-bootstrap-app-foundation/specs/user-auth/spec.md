# Spec Delta

## Purpose

Lets people who use the household finance app sign in with their own account, so that every action can be tied to a known user and checked against their permissions.

## ADDED Requirements

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
The system SHALL let a user sign in with username and password and start a session.

#### Scenario: Successful sign-in
- **WHEN** a user submits a correct username and password
- **THEN** the system starts a session and shows the page the user originally requested, or the app home

#### Scenario: Wrong credentials
- **WHEN** a user submits an unknown username or a wrong password
- **THEN** the system shows "Invalid username or password" and does not start a session

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
