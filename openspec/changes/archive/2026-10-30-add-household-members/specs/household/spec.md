# Spec Delta

## Purpose

Describes the household that uses the app and the people in it: its name, the types of member it distinguishes, and its members, so that every later feature can attribute data to the household's members.

## ADDED Requirements

### Requirement: Household name
The system SHALL keep one household with a name of 1 to 64 characters after trimming, following the display name rules. The household SHALL be unnamed until an administrator sets the name. Every signed-in user SHALL see the household name, or a placeholder while it is unnamed.

#### Scenario: Unnamed household after setup
- **WHEN** setup has just been completed and nobody has named the household
- **THEN** the members page shows the placeholder "Unnamed household" instead of a name

#### Scenario: Administrator names the household
- **WHEN** an administrator saves the household name "  Familia Pérez " on the household settings page
- **THEN** the name is stored as "Familia Pérez" and every signed-in user sees it on the members page

#### Scenario: Invalid household name
- **WHEN** an administrator saves a household name that is empty after trimming, longer than 64 characters, or contains a control character
- **THEN** the system rejects it, explains why, and keeps the previous name

#### Scenario: Member cannot rename the household
- **WHEN** a signed-in user without the administrator role submits a new household name
- **THEN** the system denies it and the name does not change

### Requirement: Member types catalog
The system SHALL let administrators create, rename, archive, unarchive and delete member types. Each type SHALL have a name of 1 to 64 characters after trimming, following the display name rules, unique among all member types ignoring case, and exactly one base class: adult, minor or dependent. The system SHALL NOT create any member type by itself.

#### Scenario: Create a member type
- **WHEN** an administrator creates the member type "Abuela" with the base class "adult"
- **THEN** it is listed among the member types with the base class "adult" and can be chosen for members

#### Scenario: No member types after setup
- **WHEN** an administrator opens the member types page right after setup
- **THEN** the list is empty and offers to create a member type

#### Scenario: Duplicate member type name
- **WHEN** a member type "Son" exists and an administrator creates or renames another type to "son"
- **THEN** the system rejects it as a duplicate name

#### Scenario: Duplicate member type submission
- **WHEN** the same member type creation, with the same ID and the same name and base class, is submitted twice
- **THEN** exactly one member type exists and both submissions succeed

#### Scenario: Conflicting member type submission
- **WHEN** a member type creation reuses the ID of an existing member type with a different name or base class
- **THEN** the system rejects it as a conflict and the existing member type is unchanged

### Requirement: Base class decides, not the name
The system SHALL treat the base class as the only meaning of a member type: anything that depends on the kind of member SHALL use the base class, never the type's name. A type's base class SHALL be immutable once any member, active or archived, has that type; its name SHALL stay editable.

#### Scenario: Rename a used member type
- **WHEN** a member has the type "Hijo" and an administrator renames the type to "Hijo mayor"
- **THEN** the rename is saved and the member shows the type "Hijo mayor"

#### Scenario: Base class immutable after first use
- **WHEN** a member has the type "Hijo" with the base class "minor" and an administrator tries to change its base class to "adult"
- **THEN** the system rejects the change, explains that the type is in use, and the base class stays "minor"

#### Scenario: Base class editable before first use
- **WHEN** no member has ever had the type "Sobrino" and an administrator changes its base class from "minor" to "dependent"
- **THEN** the change is saved

### Requirement: Archiving member types
The system SHALL archive, not delete, a member type that any member has, and SHALL let administrators delete only a type no member has ever had. An archived type SHALL NOT be offered when creating a member or changing a member's type; members that already have it SHALL keep it. Archived types SHALL be unarchivable.

#### Scenario: Archive a used member type
- **WHEN** a member has the type "Sobrino dependiente" and an administrator archives the type
- **THEN** the type is no longer offered in the member form, and the member still shows the type "Sobrino dependiente"

#### Scenario: Used member type cannot be deleted
- **WHEN** an administrator tries to delete a member type that a member has
- **THEN** the system refuses, explains that the type is in use and offers to archive it instead

#### Scenario: Delete an unused member type
- **WHEN** an administrator deletes a member type that no member has ever had
- **THEN** the type no longer exists

#### Scenario: Unarchive a member type
- **WHEN** an administrator unarchives the member type "Sobrino dependiente"
- **THEN** it is offered again in the member form

### Requirement: Members
The system SHALL let administrators create members and change their name and type. Each member SHALL have a name of 1 to 64 characters after trimming, following the display name rules, unique among all members ignoring case, and one member type that is not archived when it is chosen.

#### Scenario: Create a member
- **WHEN** an administrator creates the member "Lucía" with the member type "Hija" (base class "minor")
- **THEN** Lucía is listed among the members with the type "Hija"

#### Scenario: Members need a member type
- **WHEN** an administrator opens the new member form and no member type that is not archived exists
- **THEN** the form explains that a member type is needed first and links to the member types page

#### Scenario: Duplicate member name
- **WHEN** a member "Lucía" exists, even archived, and an administrator creates or renames another member to "lucía"
- **THEN** the system rejects it as a duplicate name

#### Scenario: Duplicate member submission
- **WHEN** the same member creation, with the same ID and the same name and type, is submitted twice
- **THEN** exactly one member exists and both submissions succeed

#### Scenario: Conflicting member submission
- **WHEN** a member creation reuses the ID of an existing member with a different name or type
- **THEN** the system rejects it as a conflict and the existing member is unchanged

#### Scenario: Archived type cannot be chosen
- **WHEN** an administrator submits a new member, or a type change for an existing member, with an archived member type
- **THEN** the system rejects it and the member keeps its previous type

### Requirement: Archiving members
The system SHALL archive, not delete, a member that is referenced, and SHALL let administrators delete only a member that has never been linked to a user account. Archived members SHALL be hidden from the members list of users who aren't administrators and SHALL be unarchivable. A member linked to an active account SHALL NOT be archived until that account is deactivated or unlinked.

#### Scenario: Archive a member
- **WHEN** an administrator archives the member "Tío Carlos", who has no linked account
- **THEN** Tío Carlos is listed only in the administrators' archived members, and users who aren't administrators no longer see him

#### Scenario: Member with an active account cannot be archived
- **WHEN** an administrator tries to archive a member linked to an active user account
- **THEN** the system refuses and explains that the account must be deactivated or unlinked first

#### Scenario: Previously linked member cannot be deleted
- **WHEN** an administrator tries to delete a member that has been linked to a user account at any time
- **THEN** the system refuses and offers to archive the member instead

#### Scenario: Delete a member never linked
- **WHEN** an administrator deletes a member that was never linked to a user account
- **THEN** the member no longer exists

#### Scenario: Unarchive a member
- **WHEN** an administrator unarchives the member "Tío Carlos"
- **THEN** he is listed again among the active members for every signed-in user

### Requirement: Member linked to at most one account
The system SHALL let a member be linked to at most one user account, and an account to at most one member. Administrators SHALL be able to link an account that has no member to a member that has no account, and to unlink them.

#### Scenario: Link the setup administrator to a member
- **WHEN** an administrator links their own account, which has no member, to the member "Osvaldo", which has no account
- **THEN** the members list shows Osvaldo as having an account

#### Scenario: Account already linked
- **WHEN** an administrator tries to link an account that is already linked to another member
- **THEN** the system refuses and both existing links stay unchanged

#### Scenario: Unlink an account
- **WHEN** an administrator unlinks the account of the member "Osvaldo"
- **THEN** Osvaldo has no account, the account still exists and can still sign in, and it can be linked again

### Requirement: Household visible to every signed-in user
The system SHALL show every signed-in user, read-only, the household name, the active members with their member type and base class, and the member types that are not archived. Usernames, roles and account states SHALL be shown only to administrators.

#### Scenario: Member views the household
- **WHEN** a signed-in user without the administrator role opens the members page
- **THEN** they see the household name and the active members with their types and base classes, and no controls to change them

#### Scenario: Member cannot change members
- **WHEN** a signed-in user without the administrator role submits a create, change, archive, unarchive, delete or link of a member or member type
- **THEN** the system denies it and nothing changes

#### Scenario: Account details are hidden from members
- **WHEN** a signed-in user without the administrator role views the members page
- **THEN** it shows no usernames, roles or account states

#### Scenario: Administrator views the household
- **WHEN** a signed-in administrator opens the members page
- **THEN** they see the active and archived members, each member's linked username and account state, and the controls to manage them

#### Scenario: Visitors cannot see the household
- **WHEN** a visitor who is not signed in requests the members page
- **THEN** the system redirects to the sign-in page and shows no household data

### Requirement: Household texts are translated
The system SHALL show every household text in the user's language, including the base class names, while member, member type and household names SHALL be shown exactly as entered, in every language.

#### Scenario: Base class names in Spanish
- **WHEN** a user whose language is Spanish views a member whose type has the base class "minor"
- **THEN** the base class is shown as "Menor", and the type's name is shown as entered

#### Scenario: Member count
- **WHEN** an administrator views the member types page and the type "Hijo" is used by 1 member and the type "Abuela" by 3 members
- **THEN** it reads "1 member" and "3 members" in English, and "1 miembro" and "3 miembros" in Spanish
