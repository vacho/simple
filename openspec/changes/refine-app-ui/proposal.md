# Proposal

## Why

The app works but looks raw: bare lists, plain forms, one button style, and destructive actions confirmed through `?confirm=` pages. Each screen carries its own layout CSS (the same `.stack`, `.row`, `.field` and `.confirm` classes repeated in five files), because the foundation planned primitives in `src/lib/components/` (design D10 of `bootstrap-app-foundation`) but built only `Field`. Every later change (access control, categories, accounts, the ledger, quick entry, reporting) adds screens; without a visual identity and a component standard now, each one would invent its own, and the inconsistency would compound. This change sets that standard once, before change 3, and applies it to every existing screen.

This change is not in `docs/roadmap.md` yet: it is inserted as change 3, `refine-app-ui`, before `add-access-control`, which becomes change 4 (the later changes shift by one).

## What Changes

- Define the app's visual identity, direction "Modern fintech": cool-gray neutrals, an indigo accent, semantic colors for success, warning, danger and info, a type scale with tabular figures for amounts, 12 and 16 px rounding, one subtle elevation, and Lucide icons. Everything lives as design tokens in `tokens.css`, the only place colors, sizes and fonts are defined, with light and dark sets checked for WCAG AA contrast.
- Self-host the Inter typeface with the app, never from a font CDN, so no third party learns when the app is opened.
- Build the component library in `src/lib/components/`:
  - every interactive component wraps Ark UI: dialog and confirmation dialog, menu, select, field (label, hint and error), password input, toast, tooltip;
  - presentational components are plain semantic HTML on the tokens: button, icon button, card, badge, page header, empty state, data list, icon.
- Make routes use only those components: lint rejects importing Ark UI from routes, and raw `<dialog>`, `<select>` and `<details>` elements there; stylelint rejects colors outside `tokens.css`.
- **BREAKING (behavior):** destructive and disruptive actions (archive, delete, deactivate, reset password, unlink) are confirmed in a dialog that names the item and states the consequence, replacing the `?confirm=` pages. The interactive components need JavaScript; forms keep posting normally through their hidden inputs.
- Show status as labeled badges (archived, deactivated, administrator, waiting for a new password), never by color alone, and confirm every saved change with a short message.
- Restyle every existing screen with the components: setup, sign-in, home, profile, password change, members, a member, settings, household, member types, accounts, the error page and the offline page. The user menu becomes a menu button.
- Add a development-only component catalog page showing every component and token in light, dark, Spanish, the `en-XA` pseudo-locale and right-to-left.
- Record the standard in ADR 0028, and add rules to `openspec/config.yaml` so every later change's design lists the components it uses and justifies any new one, and its tasks check new screens with axe and the `en-XA` screen checks.

Out of scope: new features or data; a light/dark switch (the device setting still decides); the combobox and date picker (added, as Ark UI wrappers, by the first change that needs them: categories and the ledger); an icon or logo redesign of the installed app; animations beyond Ark UI's defaults.

## Capabilities

### New Capabilities
<!-- None: the standard is recorded in ADR 0028; the user-visible behavior belongs to app-shell. -->

### Modified Capabilities
- `app-shell`: a consistent visual identity in both themes; destructive actions confirmed in a dialog; status shown as labeled badges; saved changes confirmed with a message; the user menu as a keyboard-operable menu; dialogs operable with the keyboard; JavaScript required by the supported browsers.

## Impact

- **Roadmap:** inserts change 3, `refine-app-ui`; `add-access-control` and the later changes move down one number. Their content doesn't change, but they build on this change's components.
- **Policy matrix:** no new or changed actions.
- **Translations:** new English texts with descriptions and reviewed Spanish translations for the confirmation dialogs' buttons, the badges, the saved-change messages, empty states and the menu's accessible name. Existing texts are reused where they fit (the confirmation sentences already exist).
- **Code:** `src/lib/components/` grows from one component to the library; every page under `src/routes/` is rewritten to use it; the `?confirm=` handling in `account-actions.server.ts` and the pages goes away; forms gain progressive enhancement (`use:enhance`). `base.css` keeps only base element styles.
- **Dependencies:** `@ark-ui/svelte`, `@lucide/svelte` and `@fontsource-variable/inter` (exact versions in `design.md`).
- **Specs and tests of earlier changes:** the e2e tests that open `?confirm=` pages switch to the dialogs; the household and user-auth requirements don't change.
- **Versioning:** a minor release per ADR 0018 (`0.2.0` -> `v0.3.0`); no manual action from the operator on upgrade.
