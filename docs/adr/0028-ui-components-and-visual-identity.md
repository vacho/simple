# 0028. One component library on Ark UI, and one visual identity as tokens

- Status: Accepted
- Date: 2026-10-30
- Change: refine-app-ui (`openspec/changes/archive/2026-11-04-refine-app-ui/design.md`, decisions D1, D3, D4 and D5)

## Context

Every change adds screens, written by AI agents and reviewed by one person. The foundation planned primitives but built only a field component, so each screen styled itself and the interface drifted. Interactive widgets (dialogs, menus, selects, comboboxes, date pickers) are easy to get subtly wrong for keyboard and screen-reader users. The app must also stay right-to-left ready (logical CSS only), meet WCAG AA contrast in both themes, translate every text, and load nothing from other origins.

## Decision

- **Visual identity "Modern fintech", defined only as tokens** in `src/lib/components/tokens.css`: cool-gray neutrals, an indigo accent, semantic success, warning, danger and info colors with soft badge backgrounds, a 12–28 px type scale in Inter (self-hosted, never from a CDN) with tabular figures for numbers, 12 and 16 px rounding, one elevation, Lucide icons. No color is defined anywhere else.
- **One component library** in `src/lib/components/`: every interactive component wraps **Ark UI** (`@ark-ui/svelte`), with no other source of behavior; presentational components (button, card, badge, page header, empty state, data list, icon) are plain semantic HTML on the tokens. Agents check the Ark UI docs for Svelte before writing a wrapper.
- **Routes use only that library:** they never import Ark UI or the icon package, and never use raw `<dialog>`, `<select>`, `<details>` or `<summary>`.
- **Patterns:** a page header with one primary action; badges with text for every state (color never alone); empty states that say what to do next; destructive actions confirmed in a dialog naming the item and the consequence; a toast after each saved change, errors next to their field; forms progressively enhanced. Money is entered with a field parsed by `domain/money` (ADR 0005), never Ark's number input; income and expense are told apart by sign and icon as well as color.
- Lint enforces the route rules and the color rule; the contrast test covers every token pair.

## Consequences

- New screens are composed from existing components; a change that needs a new one (a combobox, a date picker) adds it to the library as an Ark UI wrapper, and its design says why.
- JavaScript is required for interactive components; forms still post through hidden inputs.
- Upgrading or replacing Ark UI touches only `src/lib/components/`.
- Changing the identity is a token change, checked by the contrast test, plus a new ADR when the direction itself changes.

## Alternatives considered

- Bits UI: Svelte-first and lighter, but a narrower set of components; the owner preferred Ark UI.
- Components written from scratch: accessible menus, selects and dialogs are costly to get right.
- Mixing native elements with a library for behavior: two ways to build the same thing.
- A styled kit (shadcn-svelte, Skeleton, Flowbite): Tailwind-based, rejected in the foundation's design for noisy diffs, and fighting our tokens.
