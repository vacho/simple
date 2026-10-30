# Design

## Context

See `proposal.md` for why. What exists after v0.2.0 (paths relative to `app/`, ADR 0023):

- **Styling:** `src/lib/components/tokens.css` (9 colors per theme, 5 spacing steps, one radius; AA contrast checked by `tokens.test.ts`) and `base.css` (element styles, including the only button style). Stylelint forbids physical properties (`left`, `right`, `margin-left`…), so layouts mirror for right-to-left languages (D10 of `bootstrap-app-foundation`).
- **Components:** `Field.svelte` and `form-errors.ts` only. Every page carries its own `<style>`; `.stack`, `.row`, `.field`, `.confirm` and `.error` repeat across five files.
- **Forms:** plain posts, none use `use:enhance`. Destructive actions are confirmed through GET forms (`?confirm=<action>&id=`, `?confirm=…&user=` in `routes/(app)/account-actions.server.ts`). Saved changes are signalled with query flags (`?saved`, `?done`, `?password-changed`).
- **Frame:** `routes/(app)/+layout.svelte` with a `<details>` user menu; bottom navigation below 1024 px, side navigation above.
- **Checks to keep passing:** AA contrast in both themes, axe on pages, keyboard order in the frame, 360 px without horizontal scroll, Spanish completeness and the `en-XA` screen checks (`tests/e2e/screens.spec.ts`), the core flows on Chromium, Firefox and WebKit.
- **ADRs in force that shape this:** 0006 (every text through the catalogs; right-to-left works once installed, with logical CSS), 0008 (routes are thin adapters; feature layout), 0021 (calendar dates), 0005 (money as integer minor units). None covers UI components or visual identity: D10 recorded "no component library for now", and this change replaces that design decision with ADR 0028.

## Goals / Non-Goals

**Goals:**
- One visual identity, defined once as tokens, used by every screen in both themes.
- One component library that every route uses, so later changes compose screens instead of styling them.
- Rules that `npm run check` enforces, so the standard holds without review effort.

**Non-Goals:**
- Combobox and date picker: added as Ark UI wrappers by the first change that needs them (categories, the ledger), following this standard.
- A money input: the ledger change builds it on `Field`, parsing with `domain/money` (ADR 0005), never on Ark's number input, which works with floating-point numbers.
- Changing any server behavior, permission or stored data.

## Decisions

### D1. Visual identity "Modern fintech", as tokens only

`tokens.css` is the only place colors, font sizes, radii and shadows are defined; stylelint rejects color literals elsewhere (D5). Token names describe roles, not colors.

| Group | Tokens | Light | Dark |
|---|---|---|---|
| Neutrals | `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-text`, `--color-text-muted`, `--color-border` | `#F7F8FA`, `#EEF1F5`, `#FFFFFF`, `#111827`, `#4B5563`, `#7A8591` | `#0F1115`, `#181B21`, `#1F232B`, `#E5E7EB`, `#9CA3AF`, `#7F8A96` |
| Accent | `--color-primary`, `--color-on-primary`, `--color-primary-soft` | `#4F46E5`, `#FFFFFF`, `#E0E7FF` | `#A5B4FC`, `#1E1B4B`, `#272A4A` |
| Semantic | `--color-success`, `--color-warning`, `--color-danger`, `--color-info`, each with `-soft` (badge background) and `--color-on-danger` | chosen and checked in task 1.2 | chosen and checked in task 1.2 |
| Focus | `--color-focus` | `#4F46E5` | `#A5B4FC` |
| Type | `--font-body` (Inter, then the system stack), `--text-xs` … `--text-2xl` (12, 14, 16, 20, 24, 28 px), `--weight-regular` 400, `--weight-strong` 600, `--leading` 1.5 | | |
| Shape | `--radius-control` 12 px, `--radius-card` 16 px, `--shadow-raised` (one subtle shadow; dark uses a border instead) | | |
| Space | `--space-1` … `--space-6` (4, 8, 16, 24, 32, 48 px); touch targets stay at least 44 px | | |

- **Contrast:** `tokens.test.ts` checks every text-on-background pair at 4.5:1 and every control boundary at 3:1, in both themes, including each badge's text on its `-soft` background. The border is `#7A8591` (today's), because the lighter gray first considered measured 2.85:1.
- **Numbers:** amounts and counts use `font-variant-numeric: tabular-nums`. Income and expense are never told apart by color alone: a sign and an icon go with the color (rule for the ledger, recorded in ADR 0028).
- **Character:** a household name in the header, money shown large, one icon weight, a slightly warm dark theme. These keep "Modern fintech" from looking generic.
- *Alternatives:* "Calm notebook" (warm neutrals, deep blue) and "Warm family" (cream, terracotta, too close to the danger red). The owner chose this direction.

### D2. Inter, self-hosted, two subsets

`@fontsource-variable/inter` **5.3.0** (OFL-1.1, published 2026-07-19, checked on npm on 2026-10-30). Its ready-made CSS declares all 7 subsets, and Vite would emit, and the service worker would precache, every file. Instead, `base.css` declares two `@font-face` rules of our own, for the `latin` and `latin-ext` variable files (132 KB together), with the package's `unicode-range` values. Spanish and the other Latin-script languages are covered; other scripts fall back to the system stack. No font request leaves the app's origin (the "Everything the interface loads comes from the app" requirement).

*Alternative:* the system font stack only. Rejected by the owner's choice of direction B, which relies on Inter's tabular figures and crisp look.

### D3. Ark UI for every interactive component; plain HTML for the rest

`@ark-ui/svelte` **5.24.3** (MIT; published 2026-10-05; peer `svelte >= 5.20`, the app has 5.57.3). The newest version, 5.25.0, came out the day before this design; the latest version at least two weeks old is chosen. Ark's API changes between majors: wrappers are written against the docs at ark-ui.com for Svelte, not from memory.

The library in `src/lib/components/`, each component in its own file:

| Kind | Components | Built on |
|---|---|---|
| Interactive | `Dialog`, `ConfirmDialog`, `Menu`, `Select`, `Field` (replaces today's), `PasswordInput`, `Toaster` and `toast()`, `Tooltip` | Ark UI: Dialog, Menu, Select (with its hidden native select, so forms post), Field, PasswordInput, Toast, Tooltip |
| Presentational | `Button` (variants primary, secondary, ghost, danger; sizes), `IconButton`, `Card`, `Badge` (neutral, success, warning, danger, info, muted), `PageHeader` (title, subtitle, primary action), `EmptyState`, `DataList` (rows with title, meta and trailing badges/actions), `Icon` | Semantic HTML and tokens; Ark has no such components |
| Form wiring | `Form` | A `<form>` with `use:enhance` (D4) |

- **Locale and direction:** the root layout wraps the app in Ark's `LocaleProvider`, fed with the request's resolved locale, so Ark components lay out and announce correctly in right-to-left languages.
- **Texts:** every visible or announced string a component shows comes from the catalogs through props or `t()`; components hold no English.
- **Icons:** `@lucide/svelte` **1.57.0** (ISC; published 2026-10-14). `Icon` imports icons one by one (`@lucide/svelte/icons/<name>`), sets `aria-hidden` unless given a label, and mirrors directional icons under `[dir="rtl"]` (the rule already in `base.css`).
- *Alternatives:* Bits UI (Svelte-first headless library; considered and declined by the owner in favour of Ark UI's broader, state-machine-based set); in-house widgets (accessible menus, selects and dialogs are easy to get subtly wrong); mixing a native `<dialog>` for confirmations with a library for the rest (rejected: one source for every behavior).

### D4. Forms: progressive enhancement and saved-change messages

- `Form` wraps `use:enhance`. On success it shows a toast with the message key the page gives it (`success="household.settings.saved"`), then lets SvelteKit apply the result (redirects included). On failure it applies the result, so field errors render in place, and shows no toast.
- Actions keep redirecting with 303 after success, as today. The query flags (`?saved`, `?done`, `?password-changed`) and the code reading them go away: the toast replaces them.
- The toast region is an ARIA live region (`role="status"`), so screen readers announce messages (the "Saved changes are confirmed" requirement).
- Destructive actions are a `ConfirmDialog` containing a `Form`: the trigger opens the dialog; confirming submits; on success the dialog closes and the toast shows; on failure the dialog closes and the page shows the error (the "A failed confirmed action explains why" scenario). Focus starts on Cancel. The reset dialog contains the temporary password field, inside the dialog's own form, so cancelling sends nothing.
- The confirmation texts already in the catalogs (`users.confirm.reset`, `household.confirm.archive_member`…) are reused as dialog descriptions; new keys cover the dialog titles and the danger buttons.
- `accountConfirmation()`, the `?confirm=` links, the GET forms and the `confirm` value in account failures are removed.

### D5. Rules that keep the standard

| Rule | Tool | Where |
|---|---|---|
| Routes may not import `@ark-ui/svelte` or `@lucide/svelte` | ESLint `no-restricted-imports` | `src/routes/**` |
| Routes may not use `<dialog>`, `<select>`, `<details>`, `<summary>` | ESLint `svelte/no-restricted-html-elements` | `src/routes/**` |
| No color literals (`#…`, `rgb()`, `hsl()`, `oklch()`, named colors) outside `tokens.css` | Stylelint `color-no-hex`, `function-disallowed-list`, `color-named` | everything except `tokens.css` |
| Physical properties forbidden | Stylelint (existing) | everything |

Each new rule gets a passing and a failing fixture in the existing lint tests (`tests/lint/`, `src/lib/components/stylelint.test.ts`).

### D6. Component catalog for development

A page at `/dev/components` shows every component in each variant and state, the color tokens with their contrast pairs, and the type scale. Its load returns 404 unless the server runs in development (`dev` from `$app/env`), so it never exists in production; it still sits behind sign-in. Locale switching uses the profile; `?dir=rtl` previews right-to-left. It replaces a screenshot test suite: humans judge looks, while axe and the `en-XA` checks guard regressions automatically.

### D7. Screens

Every page is rebuilt from the library, keeping its routes, actions and texts. The patterns:

```
 PageHeader(title, subtitle, primary action)
 Card or DataList for content; EmptyState when a list is empty
 Badges for state; muted rows for archived items; "Show archived" toggle for administrators
 Danger zone (Card, danger buttons) at the bottom of detail pages, each behind a ConfirmDialog
 Forms in Cards: Field, Select, PasswordInput; one primary Button per form
```

| Screen | Notes |
|---|---|
| Setup, sign-in, password change | Centered Card on the public layout; `PasswordInput` with show/hide |
| Home | PageHeader with the household name; a placeholder card until the ledger exists |
| Members | DataList: name, "Type (Base class)", badges (account, administrator, deactivated, archived); member types as a compact list; EmptyState with the action for administrators only |
| A member | Edit Card; Account Card (create, link, role `Select`, reset in a dialog with the password field, deactivate/reactivate, unlink); Danger zone (archive, delete) |
| Settings | Version; Cards linking to Household, Member types, Accounts |
| Household | One Field and Button in a Card |
| Member types | DataList with member counts, base class `Select` (disabled with a note when in use), archive and delete through dialogs; the create form in a Card |
| Accounts | DataList of accounts with badges; the same account actions; the own account without actions |
| Profile | Language and time zone Card; Change password Card |
| Error, offline | EmptyState-style card; the offline page stays self-contained (no component imports), restyled with the tokens copied in at build, as today |

The user menu becomes a `Menu` triggered by a button showing the display name; the bottom and side navigation keep their behavior, restyled with icons and labels.

## Risks / Trade-offs

- [JavaScript becomes required for menus, selects and dialogs] → accepted: the app is an installed PWA on the household's own devices; forms still post through hidden inputs. The supported browsers requirement now says "with JavaScript enabled".
- [Ark's custom select replaces the phones' native picker] → accepted for one consistent look and richer options (a badge per option); Ark's select is keyboard and screen-reader accessible, and axe checks every page.
- [Ark's Svelte API changes between majors; agents may remember older APIs] → ADR 0028 tells them to check the docs; the wrappers confine Ark to `src/lib/components/`, so an upgrade touches one folder.
- [Bundle size grows with each Ark component] → each component brings only its own state machine; only used components are bundled.
- [Every screen changes at once, so e2e locators break] → tests move to roles and accessible names, which the components keep stable; the core flows and screen checks run on every task group.
- [Inter adds about 132 KB to the first load] → cached by the service worker once; other scripts fall back to the system stack.

## Migration Plan

No data or configuration changes. Deploying v0.3.0 replaces the interface; rollback is starting v0.2.0 (no migration runs, so no backup restore is needed).

## Open Questions

- The exact semantic colors (success, warning, danger, info and their soft variants) are picked in task 1.2 within direction B and must pass the contrast test; this doesn't change the approach or the task breakdown.
