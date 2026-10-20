# Spec Delta

## Purpose

Lets every household member use the app in their own language. English is the base language, Spanish is preinstalled, and further languages are installed as app data, without changing code or redeploying, with texts that fall back gracefully and adapt to each language's grammar and writing direction.

## ADDED Requirements

### Requirement: Installed languages
The system SHALL show the app in any installed language. English SHALL always be installed and can't be removed. Spanish SHALL be preinstalled, with every user-facing text translated. English SHALL be used when no installed language can be determined.

#### Scenario: Spanish is complete
- **WHEN** the app is shown in Spanish
- **THEN** no screen, message, validation error or page title of the app appears in English

#### Scenario: Browser language not installed
- **WHEN** the browser's preferred languages match none of the installed languages (for example, only French while French is not installed)
- **THEN** the app is shown in English

### Requirement: Installing a language needs no code change
The system SHALL make a newly installed language available without code changes, rebuilding or redeploying. Once installed and active, it SHALL appear in the profile selector and take part in browser-language detection automatically.

#### Scenario: Install French
- **WHEN** French and its texts are installed and activated in the running app
- **THEN** without a rebuild or restart, "Français" is offered on the profile page and a browser preferring French sees the app in French

#### Scenario: Regional variants
- **WHEN** the browser prefers `ca-ES` and Catalan `ca` is installed but `ca-ES` is not
- **THEN** the app is shown in Catalan

#### Scenario: Exact regional language wins
- **WHEN** both `pt` and `pt-BR` are installed and the browser prefers `pt-BR`
- **THEN** the app is shown in `pt-BR`

#### Scenario: Language names in their own language
- **WHEN** the profile selector lists the installed languages
- **THEN** each one is named in its own language, starting with a capital letter (for example "English", "Español", "Français", "Català"), even where the language's own name is normally written in lower case

#### Scenario: Plural forms follow the language
- **WHEN** a text with a count is shown in a language whose plural rules differ from English
- **THEN** the text uses that language's plural form for the count

### Requirement: Text fallback
The system SHALL never show a message key or a blank text. A text missing in the selected language SHALL fall back to the closest installed parent language, then to English.

#### Scenario: Regional fallback
- **WHEN** `es-BO` is installed with only a few texts, and the app is shown in `es-BO`
- **THEN** the texts it lacks are shown in Spanish, not in English

#### Scenario: Runtime fallback
- **WHEN** a text is missing in the selected language and its parents
- **THEN** the English text is shown

### Requirement: Right-to-left languages
The system SHALL declare each page's writing direction from its language and lay out every screen correctly in right-to-left languages.

#### Scenario: Right-to-left page
- **WHEN** a page is shown in a right-to-left language such as Arabic
- **THEN** the page declares a right-to-left direction, and navigation, forms and text alignment are mirrored

### Requirement: Translation quality is enforced
The system SHALL fail its automated checks when an English text lacks a translator description, when the preinstalled Spanish lacks a text or has an empty one, when a Spanish text was translated from an older version of its English text, or when a translation's placeholders differ from the English ones.

#### Scenario: Missing Spanish text
- **WHEN** a new English text is added without its Spanish translation
- **THEN** the automated checks fail and name the missing text

#### Scenario: Changed English text
- **WHEN** an English text is changed and its Spanish translation is not reviewed
- **THEN** the automated checks fail and name the Spanish text to review

#### Scenario: Missing translator description
- **WHEN** an English text is added without a description of where and how it is used
- **THEN** the automated checks fail and name the text

#### Scenario: Stale translation of an installed language
- **WHEN** an English text changes without changing its arguments, and an installed language other than Spanish still has the old translation
- **THEN** the old translation is still shown, and the text is reported as stale for that language

#### Scenario: Incompatible stale translation
- **WHEN** an English text changes its arguments (for example `{name}` becomes `{displayName}`) and an installed language still has the old translation using `{name}`
- **THEN** that old translation is not shown; the text falls back to the installed parent language or English, and is reported as stale

### Requirement: Browser language by default
The system SHALL show the app in the first installed language among the browser's preferred languages whenever the user has not chosen a language in their profile, including on the setup and sign-in pages.

#### Scenario: First use with a Spanish browser
- **WHEN** someone opens the setup page with a browser whose preferred language is Spanish (for example `es-BO`)
- **THEN** the setup page is shown in Spanish

#### Scenario: Preference order of the browser
- **WHEN** the browser's preferred languages are French, then Spanish, then English
- **THEN** the app is shown in Spanish

#### Scenario: Quality values are respected
- **WHEN** the browser sends `Accept-Language: en;q=0.5, es;q=1`
- **THEN** the app is shown in Spanish

#### Scenario: Excluded language
- **WHEN** the browser sends `Accept-Language: es;q=0, en;q=0.8`
- **THEN** the app is shown in English

#### Scenario: New account follows the browser
- **WHEN** a user who has never chosen a language signs in from an English browser and later from a Spanish browser
- **THEN** the app is shown in English on the first and in Spanish on the second

### Requirement: Language chosen only in the profile
The system SHALL let a signed-in user choose their language only on their profile page, offering every installed language plus "Browser default". No other screen, including setup and sign-in, SHALL show a language selector.

#### Scenario: No selector outside the profile
- **WHEN** the setup, sign-in or any other page except the profile is shown
- **THEN** it contains no language selector

#### Scenario: Choose a language in the profile
- **WHEN** a signed-in user selects "Español" on their profile page and saves
- **THEN** the app is shown in Spanish immediately

#### Scenario: Return to browser default
- **WHEN** a user selects "Browser default" on their profile page and saves
- **THEN** the app follows the browser's preferred language again

### Requirement: Language preference follows the user
The system SHALL save a language chosen in the profile in the user's account and apply it after sign-in on every device, regardless of that device's browser language.

#### Scenario: Preference wins over the browser
- **WHEN** a user whose saved language is Spanish signs in from a browser whose preferred language is English
- **THEN** the app is shown in Spanish after sign-in

#### Scenario: Before sign-in the browser decides
- **WHEN** that same user opens the sign-in page on the English browser before signing in
- **THEN** the sign-in page is shown in English

### Requirement: Time zone
The system SHALL store timestamps in UTC and show them in the signed-in user's time zone, defaulting to UTC. Any valid IANA zone, including `UTC` and aliases, SHALL be accepted and stored in its canonical form. A new account's zone SHALL come from the browser at setup or first sign-in, and the user SHALL be able to change it on the profile page.

#### Scenario: Time zone from the browser
- **WHEN** a user whose account has no time zone signs in from a browser set to `America/La_Paz`
- **THEN** their time zone becomes `America/La_Paz`

#### Scenario: Times shown in the user's zone
- **WHEN** an event stored at 2026-10-20 03:00 UTC is shown to a user whose time zone is `America/La_Paz`
- **THEN** it is shown as 2026-10-19 23:00

#### Scenario: Change time zone in the profile
- **WHEN** a user selects `Europe/Madrid` on their profile page and saves
- **THEN** times are shown in `Europe/Madrid` from then on, on every device

#### Scenario: UTC and aliases are accepted
- **WHEN** a user selects `UTC` on the profile page, or a browser reports the alias `Asia/Kolkata`
- **THEN** the zone is accepted and stored in its canonical form

#### Scenario: Numeric offsets are not time zones
- **WHEN** the value `+02:00` is submitted as a time zone on the profile page
- **THEN** the system rejects it, because a fixed offset does not follow daylight saving changes

#### Scenario: Invalid zone on the profile page
- **WHEN** a user submits a time zone that is not a valid IANA zone on the profile page
- **THEN** the system rejects it with an error and keeps the previous zone

#### Scenario: Invalid zone reported by the browser
- **WHEN** the browser reports an invalid time zone during setup or sign-in
- **THEN** setup or sign-in succeeds and the account's zone stays unset, so UTC is used

### Requirement: Language-aware formatting
The system SHALL format dates, times and numbers according to the language in use, and SHALL declare the page language to browsers and assistive technology.

#### Scenario: Number formatting
- **WHEN** the number 1234.5 is displayed in English and in Spanish
- **THEN** it is shown as "1,234.5" in English and "1234,5" in Spanish

#### Scenario: Page language
- **WHEN** a page is shown in Spanish
- **THEN** the page declares its language as Spanish
