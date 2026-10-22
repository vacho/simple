# 0006. Runtime translation dictionaries with typed English keys

- Status: Proposed
- Date: 2026-10-22
- Change: bootstrap-app-foundation (`openspec/changes/bootstrap-app-foundation/design.md`, decision D14)

## Context

Every household member uses the app in their own language. English and Spanish ship with the app, and administrators must be able to add languages without changing code or redeploying.

## Decision

English messages in `messages/en.json` are the source of truth; a generated TypeScript type makes every key and its parameters compile-time checked. Other languages are app data in the database (`languages` and `translations` tables), with Spanish seeded at startup. Messages use ICU MessageFormat rendered by `intl-messageformat`, with a per-text fallback chain (locale, its installed parents, English). Dictionaries are precompiled on the server and served as cacheable files. There is no locale in URLs; the locale comes from the user's setting, then the browser, then English.

## Consequences

- Every user-facing text goes through the catalogs, with a translator description and a reviewed Spanish translation in the same change.
- Keys are prefixed by the owning feature and catalogs stay sorted, so parallel branches merge cleanly.
- A changed English text marks its translations stale; `check-messages` enforces Spanish completeness.
- Right-to-left languages work once installed, together with logical CSS properties (D10).

## Alternatives considered

- Paraglide JS: compiles messages into the bundle, so a language added at runtime would need a rebuild.
- `i18next` or `svelte-i18n`: runtime dictionaries, but untyped keys and larger bundles.
