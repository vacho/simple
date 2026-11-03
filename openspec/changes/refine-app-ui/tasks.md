# Tasks

Tests: each task writes the behavior tests its verification requires. Strict traceability, meaning every spec scenario has a test whose name quotes it in the `Name: detail` form, is checked when the change is closed (task 7.2). Specs may change while implementing and testing: update the spec first (update workflow, skill `openspec-update-change`), then the tests. When a task cites a requirement, it covers all of that requirement's scenarios.

Paths are relative to `app/`, and commands run there (ADR 0023). Ark UI wrappers are written against the Ark UI docs for Svelte (ADR 0028). E2e tests locate elements by role and accessible name, so restyling doesn't break them.

## 1. Dependencies and visual identity

- [x] 1.1 Add `@ark-ui/svelte` 5.24.3, `@lucide/svelte` 1.57.0 and `@fontsource-variable/inter` 5.3.0 (D2, D3), and verify `npm ci` and `npm run check` pass
- [x] 1.2 Rewrite `tokens.css` with the D1 tokens for both themes, choosing the semantic colors and their soft variants within direction B, and extend `tokens.test.ts` to check every text-on-background pair at 4.5:1, every control boundary at 3:1 and every badge text on its soft background, in both themes. Keep the old token names working until group 4 replaces their uses, then remove them. Verify the contrast tests pass (spec app-shell: Light and dark appearance, Status shown as labeled badges, "Badge without color")
- [x] 1.3 Declare the two Inter `@font-face` rules (latin, latin-ext, the package's `unicode-range`) in `base.css`, set `--font-body`, apply tabular figures to numbers, and add the stylelint rules rejecting color literals outside `tokens.css` (D5), each with a passing and a failing case in `stylelint.test.ts`. Verify the build emits exactly the two Inter files and that `npm run check` passes

## 2. Presentational components and the catalog

- [x] 2.1 Build `Button`, `IconButton`, `Card`, `Badge`, `PageHeader`, `EmptyState`, `DataList` and `Icon` in `src/lib/components/` (D3): logical CSS only, tokens only, no visible English, `Icon` mirroring directional icons in right-to-left. Verify component tests (rendering, variants, accessible names, `aria-hidden` icons) and `npm run check`
- [x] 2.2 Add the development-only catalog at `/dev/components` (D6) showing every component, variant and state, the color tokens with their contrast pairs and the type scale, with `?dir=rtl`. Verify an e2e test against the production build that the page answers 404, and a check on the dev server that it renders without axe violations in light and dark

## 3. Interactive components

- [x] 3.1 Wrap Ark UI's `Field` (replacing today's `Field.svelte`, same props), `Select` (with its hidden native select) and `PasswordInput`, and wrap the root layout in Ark's `LocaleProvider` fed with the resolved locale. Verify component tests that label, hint and error are wired for screen readers, that a `Select` and a `PasswordInput` inside a form post their values, and that the direction follows `en`, `es` and a right-to-left test locale
- [x] 3.2 Wrap Ark UI's `Dialog` and build `ConfirmDialog` (title, description naming the item and consequence, danger action, cancel; focus starts on cancel), `Menu`, `Tooltip`, and the `Toaster` with `toast()` as a live region, mounted once in the root layout. Verify component tests for opening, closing with Escape, focus returning to the trigger, focus kept inside the dialog, and the toast region's `role="status"` (spec app-shell: Keyboard operability)
- [x] 3.3 Build `Form` (D4): `use:enhance`, a `success` message key shown as a toast after a successful result, results applied so field errors render in place, no toast on failure, and a busy state on its submit button. Verify component tests for success, failure and redirect results (spec app-shell: Saved changes are confirmed)

## 4. Frame and personal screens

- [x] 4.1 Rebuild the signed-in frame: the user menu as a `Menu` on a button with the display name, the navigation with icons and labels, the household name in the header. Update the keyboard test for the new order and add one for the menu. Verify the frame e2e tests, the axe checks and the 360 px and 1024 px layout tests (spec app-shell: Signed-in frame, Keyboard operability, "Menu with the keyboard")
- [x] 4.2 Rebuild setup, sign-in, the password change page, home, profile and the error page from the components, using `PasswordInput` for passwords and `Form` with success messages (profile saved, password changed), removing the `?password-changed` flag. Restyle the offline page with the new tokens, keeping it self-contained. Verify the existing e2e tests for these pages pass with role-based locators, and the axe checks in English and Spanish

## 5. Household screens and confirmations

- [x] 5.1 Rebuild members, a member, settings, household, member types and accounts per D7: `PageHeader`, `DataList`, `Badge` for every state, `EmptyState` with an action only for administrators, a danger zone, and `Form` with success messages, removing the `?saved` and `?done` flags. Verify the existing e2e tests pass with role-based locators and add tests for the badges ("Archived"/"Archivado") and the empty states (spec app-shell: Status shown as labeled badges, Empty lists say what to do next)
- [x] 5.2 Replace every `?confirm=` page with a `ConfirmDialog`: archive and delete (members, member types), deactivate, reset password (with the password field inside the dialog) and unlink. Remove `accountConfirmation()`, the GET forms and the `confirm` value in failures. Add the new message keys (dialog titles, danger buttons) in English and Spanish. Verify e2e tests for confirming, cancelling, the reset password not reaching the server or the address on cancel, and a confirmed action that fails (archiving a member with an active account) (spec app-shell: Destructive actions are confirmed in a dialog, Keyboard operability, "Dialog with the keyboard")
- [x] 5.3 Remove from routes every remaining page-level `<style>` rule that duplicates a component, and the element styles in `base.css` that components now own. Verify `npm run check`, the full e2e suite and the axe checks

## 6. The standard, enforced and documented

- [ ] 6.1 Add the ESLint rules for routes (D5): no `@ark-ui/svelte` or `@lucide/svelte` imports, no `<dialog>`, `<select>`, `<details>` or `<summary>`, each with a forbidden and an allowed fixture in `tests/lint/`. Verify `npm run check` passes on the app and fails on each forbidden fixture
- [ ] 6.2 Add an e2e test that loads every page, signed out and signed in, and fails on any request to another origin; add the dialog confirmation to the core flows run on Firefox and WebKit. Verify both pass on the three browsers (spec app-shell: Everything the interface loads comes from the app, Supported browsers)
- [ ] 6.3 Add the new screens and states (dialogs open, badges, empty states, toasts) to the Spanish and `en-XA` screen checks, and update `README.md`: the components and the rules for contributors (pointing to ADR 0028 and the catalog), and that JavaScript is required. Verify `npm run test:e2e:pseudo` and the Spanish screen checks pass

## 7. Final verification

- [ ] 7.1 Check the code against ADR 0028 and ADR 0008: every interactive element in routes comes from an Ark UI wrapper, no route styles duplicate a component, colors appear only in `tokens.css`. Verify `npm run check` passes and record any deviation in the design
- [ ] 7.2 From a clean clone of the branch: `npm ci`, `npm run check`, `npm run test:unit`, `npm run build`, `npm run test:e2e`, `npm run test:e2e:pseudo` and `npm run check:scenarios -- refine-app-ui`, and verify every command passes

## Workflow follow-up

- Close the change with the `change-flow` skill's `close` action after every task is done: it re-runs the checks and `/opsx:verify`, asks the owner for approval, releases `v0.3.0`, merges into `main`, archives the change (accepting ADR 0028) and tags it.
- After the archive, on `main`: add rules to `openspec/config.yaml` so every later change's design lists the components it uses and justifies any new one, and its tasks check new screens with axe and the `en-XA` screen checks (agent tooling, its own commit).
