# Style guide

The visual direction is **"Modern fintech"** ([ADR 0028](../adr/0028-ui-components-and-visual-identity.md)): calm, clear, with money front and center. This guide says how to use the system; the values live in `app/src/lib/components/tokens.css` and the components in `app/src/lib/components/`, both shown at `/dev/components` on the development server. Don't copy values here: link to the tokens.

## Principles

1. **One primary action per screen.** The page header carries it; everything else is secondary or ghost.
2. **State is always written.** Badges carry text; color only reinforces it.
3. **Every list says what to do when it's empty.**
4. **Destructive actions are confirmed** in a dialog that names the item and the consequence.
5. **Every saved change is confirmed** with a short message; errors stay next to their field.
6. **Money is easy to read:** tabular figures, shown large where it matters; income and expense are told apart by sign and icon as well as color.
7. **Works for every member:** keyboard, screen readers, phone, Spanish and longer languages, right-to-left.

## Tokens by role

Use tokens by their role, never by their color. A design that needs a value outside these roles is a departure (see "Conformance" in `ux.md`).

| Role | Tokens | Use |
|---|---|---|
| Surfaces | `--color-bg`, `--color-surface`, `--color-surface-raised` | Page, sections, cards and dialogs |
| Text | `--color-text`, `--color-text-muted` | Body and secondary text |
| Lines | `--color-border`, `--color-focus` | Control boundaries, focus ring |
| Accent | `--color-primary`, `--color-on-primary`, `--color-primary-soft` | Primary actions, current navigation, selection |
| Semantic | `--color-success`, `--color-warning`, `--color-danger`, `--color-info`, each with `-soft` | Badges, messages, danger zone |
| Type | `--font-body` (Inter, self-hosted), `--text-xs` … `--text-2xl` (12–28 px), `--weight-regular`, `--weight-strong` | One family, two weights |
| Shape | `--radius-control` (12 px), `--radius-card` (16 px), `--shadow-raised` | Controls, cards, the one elevation |
| Space | `--space-1` … `--space-6` (4–48 px) | Gaps and padding; touch targets at least 44 px |

Light and dark themes follow the device; every text pair meets WCAG AA (checked by `tokens.test.ts`).

## Components

| Component | Use it for | Notes |
|---|---|---|
| `PageHeader` | Title, subtitle and the one primary action | Top of every page |
| `Card` | A group of content or a form | Forms live in cards |
| `DataList`, `DataListRow` | Lists of items with badges and actions | Archived items muted |
| `EmptyState` | A list with nothing in it | Says what to do; the action only if the user may act |
| `Button` | Actions: `primary`, `secondary`, `ghost`, `danger`; sizes `sm`, `md` | One `primary` per form |
| `IconButton`, `Icon` | Compact actions; Lucide icons, one weight | Always with an accessible name |
| `Badge` | State: `neutral`, `success`, `warning`, `danger`, `info`, `muted` | Always with a text label |
| `Field` | Label, hint and error around an input | Errors under their field |
| `PasswordInput` | Passwords, with show and hide | |
| `Select` | Choosing one option | Ark UI |
| `Menu` | Menus such as the user menu | Ark UI, keyboard operable |
| `Dialog`, `ConfirmDialog` | Dialogs; confirming destructive actions | Focus starts on cancel; Escape closes |
| `Toaster` | Saved-change messages | Announced to screen readers |
| `Tooltip` | Short help on a control | Never the only place for information |

Routes use only these components. A screen that needs something else adds it to the library, with the reason, in its change (`ux.md` and `design.md`).

## Screen patterns

```
PageHeader(title, subtitle, primary action)
Card or DataList for content; EmptyState when a list is empty
Badges for state; muted rows for archived items; "Show archived" for administrators
Danger zone (Card with danger buttons) at the bottom of detail pages, each behind a ConfirmDialog
Forms in Cards: Field, Select, PasswordInput; one primary Button per form
```

- **Public pages** (setup, sign-in, password change): one centered card.
- **Signed-in frame:** bottom navigation on phones, side navigation on wider screens, each item with icon and label; the user menu opens from a button with the display name.
- **Detail pages:** an edit card first, related cards next, the danger zone last.

## Texts

- Short, plain and friendly; address the user directly. Sentence case for titles and buttons.
- Buttons say what they do ("Archive member", not "OK"). Confirmations name the item and the consequence.
- Every text goes through the message catalogs, in English with a translator description and a reviewed Spanish translation. Never build a sentence from fragments; use arguments and plurals.
- Design for 40% longer texts (the `en-XA` pseudo-locale) and for right-to-left.

## Accessibility and layout

- Every control reachable and operable with the keyboard, with a visible focus ring.
- Contrast: 4.5:1 for text, 3:1 for control boundaries, in both themes.
- Logical CSS properties only (inline and block, never left and right), so right-to-left works.
- Design at least two widths: phone (390 px) and desktop (1280 px). Nothing scrolls sideways.
- New screens pass axe and the Spanish and `en-XA` screen checks.

## Summary for design tools

Paste this when asking a tool for a design:

> A household finance web app, installable, used on phones and desktops by the members of one family. Visual direction "Modern fintech": cool-gray neutrals, one indigo accent, semantic green, amber, red and blue used only for state, the Inter typeface with tabular figures for money, 12 px rounding on controls and 16 px on cards, one subtle shadow, Lucide line icons, light and dark themes. Layout: a page header with one primary action, content in cards and lists, labeled badges for state, empty states that say what to do, destructive actions confirmed in a dialog, a danger zone at the bottom of detail pages. Bottom navigation on phones, side navigation on desktop. Touch targets of at least 44 px. Use made-up names and amounts only. Show the phone (390 px) and desktop (1280 px) versions, and the empty and error states.
