# Spec Delta

## Purpose

Provides the frame every screen of the app lives in: installable on phones and desktops, usable at any screen width, readable in light and dark mode, with consistent navigation and the signed-in user's controls.

## ADDED Requirements

### Requirement: Installable app
The system SHALL meet the installability criteria of the supported browsers: served over HTTPS (or `localhost`), a web app manifest with name, icons (192 px, 512 px and maskable), theme colors, a start URL and standalone display, and a registered service worker. How installation is offered (a prompt, a menu entry or "Add to Home Screen") is up to each browser.

#### Scenario: Installability criteria
- **WHEN** the production build is served over HTTPS
- **THEN** the manifest is served without sign-in with all the fields above, and a service worker is registered and controls the page

#### Scenario: Installed app opens standalone
- **WHEN** the app is opened from its installed icon
- **THEN** it opens at the start URL without the browser's address bar

### Requirement: Supported browsers
The system SHALL support the latest two versions of Chrome and Edge (Android and desktop), Safari on iOS 17 or later and on macOS, and the latest two versions of Firefox. Firefox on desktop SHALL be supported as a website, since it cannot install web apps.

#### Scenario: Core flows on each supported browser
- **WHEN** setup, sign-in, the profile and sign-out are exercised on each supported browser engine
- **THEN** they work without errors

### Requirement: Offline fallback
The system SHALL show an offline page instead of a browser error when the app is opened without network access, in the language last used on that device. Its offline cache SHALL hold only the app files, the offline pages and one record of the last used language code, never page or API responses.

#### Scenario: Offline page
- **WHEN** the installed app is opened without network access
- **THEN** it shows an "offline, reconnect to continue" page and no financial data

#### Scenario: Offline page keeps the user's language
- **WHEN** a user whose profile language is Spanish used the app on a device whose browser prefers English, and the network is then cut
- **THEN** the offline page is shown in Spanish

#### Scenario: Offline right after the first visit
- **WHEN** a user's first visit on a device installs the offline support, and the network is cut before any further navigation
- **THEN** the offline page is shown in the language that first visit used

#### Scenario: Offline page without a previous visit
- **WHEN** the offline page is needed and no language was recorded on the device
- **THEN** it is shown in the browser's preferred available language, or English

#### Scenario: No private responses in the cache
- **WHEN** a signed-in user has browsed the app and the offline cache is inspected
- **THEN** it contains only the precached app files, the offline pages, and the language record holding nothing but a language code, and no page or API responses

### Requirement: Responsive layout
The system SHALL render every screen usable from 360 px to desktop widths without horizontal page scrolling, switching between a bottom navigation bar on narrow screens and a side navigation on wide screens.

#### Scenario: Narrow screen
- **WHEN** the app is viewed at a width of 360 px
- **THEN** the navigation appears as a bottom bar and content fits the width without horizontal scrolling

#### Scenario: Wide screen
- **WHEN** the app is viewed at a width of 1024 px or more
- **THEN** the navigation appears as a side bar next to the content

### Requirement: Light and dark appearance
The system SHALL follow the device's light or dark preference and SHALL meet WCAG 2.1 AA contrast for text and controls in both.

#### Scenario: Device prefers dark
- **WHEN** the device is set to dark mode
- **THEN** the app renders with its dark theme

#### Scenario: Contrast
- **WHEN** any text or control is rendered in either theme
- **THEN** its contrast ratio is at least 4.5:1 for normal text and 3:1 for large text and control boundaries

### Requirement: Signed-in frame
The system SHALL show signed-in users a frame with the app navigation and a user menu that displays their display name and links to their profile and to sign-out. Navigation SHALL list only sections the user is allowed to open.

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
The system SHALL make every control of the frame reachable and operable with the keyboard, with a visible focus indicator.

#### Scenario: Keyboard navigation
- **WHEN** a user moves through the frame with the Tab key
- **THEN** each link and button receives focus in a logical order with a visible focus indicator and can be activated with Enter or Space
