# Spec Delta

## ADDED Requirements

### Requirement: Destructive actions are confirmed in a dialog
The system SHALL ask for confirmation in a dialog before an action that removes, hides or disables something (archive, delete, deactivate, reset a password, unlink an account). The dialog SHALL name the item, state the consequence, and offer the action and a way to cancel. Cancelling SHALL change nothing.

#### Scenario: Confirm a deactivation
- **WHEN** an administrator chooses "Deactivate" for the account "lucia"
- **THEN** a dialog asks "Deactivate lucia?", explains that she is signed out everywhere and can't sign in until reactivated, and the account is deactivated only after the administrator confirms

#### Scenario: Cancel a deletion
- **WHEN** an administrator chooses "Delete" for the member type "Vecino" and then cancels the dialog
- **THEN** the dialog closes and the member type still exists

#### Scenario: Confirmation keeps what was typed private
- **WHEN** an administrator types a temporary password in the reset dialog and then cancels it
- **THEN** the password is not sent to the server nor shown in the page address

#### Scenario: A failed confirmed action explains why
- **WHEN** an administrator confirms archiving a member whose account is still active
- **THEN** the dialog closes, nothing is archived, and the page shows why

### Requirement: Status shown as labeled badges
The system SHALL show the state of an item (archived, deactivated, administrator, waiting for a new password, no account) as a badge with a text label in the user's language. Color MAY reinforce the label but SHALL never be its only signal.

#### Scenario: Archived member
- **WHEN** an administrator views an archived member in the members list
- **THEN** the member shows a badge reading "Archived" in English, or "Archivado" in Spanish

#### Scenario: Badge without color
- **WHEN** a badge is shown in either theme
- **THEN** its state can be read from its text alone, and its text meets the contrast requirement

### Requirement: Saved changes are confirmed
The system SHALL confirm each successful change with a short message in the user's language that screen readers announce, and SHALL show failures next to the field or form they concern.

#### Scenario: Message after saving
- **WHEN** an administrator saves the household name
- **THEN** a message reading "Household name saved." appears and is announced to screen readers

#### Scenario: Error stays with its form
- **WHEN** an administrator submits a member name that is already in use
- **THEN** the error is shown under the name field of that form, and no success message appears

### Requirement: Empty lists say what to do next
The system SHALL show, instead of an empty list, a short explanation and, when the user may act, the action that fills it.

#### Scenario: No members yet
- **WHEN** an administrator opens the members page and the household has no members
- **THEN** the page explains that there are no members yet and offers the way to add one

#### Scenario: Empty list for a user who can't act
- **WHEN** a signed-in user without the administrator role opens the members page of a household with no members
- **THEN** the page explains that there are no members yet and offers no action

### Requirement: Everything the interface loads comes from the app
The system SHALL serve its fonts, icons and styles from its own origin. Rendering a page SHALL NOT make requests to any other origin.

#### Scenario: No third-party requests
- **WHEN** any page of the app is loaded, signed in or not
- **THEN** every request the browser makes goes to the app's own origin

## MODIFIED Requirements

### Requirement: Supported browsers
The system SHALL support the latest two versions of Chrome and Edge (Android and desktop), Safari on iOS 17 or later and on macOS, and the latest two versions of Firefox, with JavaScript enabled. Firefox on desktop SHALL be supported as a website, since it cannot install web apps.

#### Scenario: Core flows on each supported browser
- **WHEN** setup, sign-in, the profile and sign-out are exercised on each supported browser engine
- **THEN** they work without errors

#### Scenario: Confirmation dialogs on each supported browser
- **WHEN** a destructive action is confirmed in its dialog on each supported browser engine
- **THEN** the dialog opens, the action runs after confirming, and the dialog closes

### Requirement: Signed-in frame
The system SHALL show signed-in users a frame with the app navigation and a user menu that displays their display name and links to their profile and to sign-out. Navigation SHALL list only sections the user is allowed to open. The user menu SHALL open as a menu from a button showing the user's display name.

#### Scenario: User menu
- **WHEN** a signed-in user opens the user menu
- **THEN** it shows their display name, a "Profile" link and a "Sign out" action

#### Scenario: Profile is always reachable
- **WHEN** any signed-in user, administrator or not, opens their profile page
- **THEN** the page is shown with their own settings only

#### Scenario: Navigation follows permissions
- **WHEN** the navigation is rendered for a user
- **THEN** it contains no links to sections that the access rules deny to that user

### Requirement: Keyboard operability
The system SHALL make every control of the frame, every menu and every dialog reachable and operable with the keyboard, with a visible focus indicator. An open dialog SHALL keep focus inside it, close with Escape, and return focus to the control that opened it.

#### Scenario: Keyboard navigation
- **WHEN** a user moves through the frame with the Tab key
- **THEN** each link and button receives focus in a logical order with a visible focus indicator and can be activated with Enter or Space

#### Scenario: Menu with the keyboard
- **WHEN** a user focuses the user menu button and presses Enter
- **THEN** the menu opens, the arrow keys move between "Profile" and "Sign out", and Escape closes it, returning focus to the button

#### Scenario: Dialog with the keyboard
- **WHEN** a confirmation dialog is open
- **THEN** Tab cycles only through the dialog's controls, focus starts on the cancel button, and Escape closes the dialog without acting, returning focus to the control that opened it
