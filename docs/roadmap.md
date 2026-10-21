# Roadmap

How the household finance app is built, one OpenSpec change at a time. This is a planning guide, not a contract: each change is explored, proposed and reviewed on its own, and may adjust what is written here. When a change is archived, its specs in `openspec/specs/` become the source of truth.

## Process for every change

```
/opsx:explore  ->  /opsx:propose  ->  review  ->  /opsx:apply  ->  /opsx:verify  ->  /opsx:archive
                                         ^              |
                                         +-- /opsx:update (specs change while implementing)
```

- **Explore** settles the open decisions of that change before anything is written.
- **Propose** writes `proposal.md`, the delta specs, `design.md` and `tasks.md`.
- **Apply** implements the tasks in order. Each task writes the tests its verification needs.
- **Verify** checks the code against the specs. Strict scenario traceability is checked when the change is closed.
- **Archive** merges the change's delta specs into `openspec/specs/`.

Git flow (one branch per change, parallel worktrees, merge and archive order) and the commit convention are in `docs/workflow.md`.

## Planned changes

| # | Change | Delivers | Specs |
|---|---|---|---|
| 1 | `bootstrap-app-foundation` | App skeleton, setup, sign-in, sessions, deny-by-default policy, profile (language, time zone), runtime translations (English base, Spanish preinstalled), PWA shell, backups | `user-auth`, `access-control`, `app-shell`, `localization`, `data-backup` |
| 2 | `add-household-members` | Household, member types catalog, members, admin creating users and linking them to members | `household`, modifies `user-auth` |
| 3 | `add-access-control` | Roles as a catalog, per-user grants, visibility rule B (visible if the account or the attributed member is visible) | modifies `access-control` |
| 4 | `add-language-catalog` | The in-app AI assistant (first consumer: translation); admin installs languages, generates their translations with an AI model, reviews, edits and activates them; export and import | `ai-assistant`, modifies `localization` |
| 5 | `add-categories` | Category trees for income and expenses, tags, essential vs discretionary, seeded defaults | `categories` |
| 6 | `add-currencies-and-accounts` | Currency, bank and crypto-network catalogs; accounts (bank, cash, crypto wallet, card, other) with owner, currency and opening balance | `currencies`, `accounts` |
| 7 | `add-transaction-ledger` | Income, expenses, transfers (including cross-currency), allocations to members or the shared pool, splits, balance adjustments | `ledger` |
| 8 | `add-quick-entry` | Fast entry form, shortcuts, smart defaults, recent suggestions, counterparties catalog | `quick-entry`, `counterparties` |
| 9 | `add-dashboard-reporting` | Balances, net cash flow, breakdowns by category, member and period, household vs per-member views | `reporting` |
| | **MVP** | | |
| 10 | `add-recurring-transactions` | Recurring templates (shared or per member) proposing due entries to confirm | `recurrence` |
| 11 | `add-budgets` | Budgets per category, member and period | `budgets` |
| 12 | `add-multi-currency-reports` | Exchange rates table by date; reports totalled in a base currency | `exchange-rates`, modifies `reporting` |
| 13 | `add-offline-quick-entry` | Log transactions offline, upload when back online | modifies `ledger`, `app-shell` |
| 14 | `add-public-api` | Versioned JSON API with personal tokens | `public-api` |

### Decisions already taken for later changes

- **Attribution:** an expense is allocated to the shared pool or to one or more members. Whether something is shared is decided per transaction, never by a global formula. Splitting equally among selected members is a helper.
- **Transfers** are their own kind and are excluded from income and expense totals. A cross-currency transfer records the amount out, the amount in and an optional fee.
- **Crypto** accounts count units. There is no market valuation in the MVP.
- **Transaction dates** are calendar dates with no time zone. Timestamps are stored in UTC.
- **IDs and creates:** household data uses UUIDv7 IDs that a device can generate, and creates are idempotent by ID (design D15 of change 1).
- **Member-specific recurring items** are recurrence templates with an optional member.

### Open questions, by change

- **Change 7:** an append-only ledger (corrections recorded as reversal or adjustment entries)? The base currency for reports?
- **Change 3:** which role presets ship by default?
- **Change 4:** confirm the defaults proposed in "AI inside the app" below (model, key handling, spending limit).
- **Change 9:** which periods and comparisons belong in the MVP dashboard?

## Catalogs

Some data is managed by users in the app rather than fixed in code. Each catalog has its own CRUD, but they all follow common rules.

### Common rules

1. **Archive instead of delete** for anything that is referenced. Only items that were never used can be deleted. Archived items disappear from entry forms but stay in history and reports.
2. **Fields become immutable after first use** when changing them would rewrite history (for example, a currency's decimals or an account's currency).
3. **Names are unique** within a catalog, ignoring case.
4. **Each catalog has its own permission** (`currencies.manage`, `accounts.manage`, `roles.manage`, `categories.manage`, ...), added to the policy matrix.
5. **Names are user data and are not translated.** Seeded defaults (such as the initial categories) are created in the administrator's language at setup.
6. **IDs follow D15** (UUIDv7, idempotent creates).

### The catalogs

| Catalog | Change | How it is managed | Specific rules |
|---|---|---|---|
| Currencies | 6 | The household enables currencies from a built-in reference list (ISO 4217 and common crypto) and may add custom ones (code, symbol, decimals) | Decimals are immutable once amounts exist; a currency in use can be disabled, not deleted |
| Banks and institutions | 6 | Name, country, optional logo | Archived, not deleted, once used by an account |
| Crypto networks | 6 | Seeded with common networks (TRC20, BEP20, ERC20, ...); the administrator adds others | Archived, not deleted, once used by a wallet |
| Accounts | 6 | One catalog for bank accounts, cash boxes, crypto wallets, cards and others, with a fixed **type** list and free names | Optional fields per type (bank from the banks catalog and last 4 digits; network from the crypto networks catalog); currency immutable after the first transaction; opening balance recorded as an opening entry; archived, not deleted, once used |
| Roles | 3 | Named sets of permissions created and edited by the administrator, assigned to users, with per-user grants for exceptions | The built-in Administrator role can't be edited or deleted; at least one administrator always exists; a role in use can't be deleted until its users are reassigned |
| Member types | 2 | Free names ("Son", "Grandmother", "Dependent nephew"), each mapped to a fixed **base class**: adult, minor or dependent | Rules and permissions use the base class, never the name; archived, not deleted, once used |
| Members | 2 | Household members, optionally linked to a user account | Archived, not deleted, once referenced |
| Languages | 4 | Only an administrator installs a language. A "Generate translation" tool explicitly calls an AI model on the English source texts and their descriptions; the administrator reviews, edits and activates | English is the base and can't be removed; Spanish is preinstalled; only UI texts are sent to the model, never household data; stale texts are flagged when English changes |
| Categories and tags | 5 | Separate trees for income (salary, dividends, freelance) and expenses, with essential or discretionary flags, plus free tags | Archived, not deleted, once used; moving a category keeps its history; payment details such as "paid by QR" are tags, not a catalog |
| Counterparties | 8 | Merchants, schools, employers ("Hipermaxi", "Colegio San Ignacio"), with a default category and attribution for suggestions | Archived, not deleted, once used |
| Exchange rates | 12 | Not a catalog but dated reference data: the rate between two currencies on a date, entered by the administrator (imports later) | A rate used by a report is kept; corrections add a new dated rate |

**Fixed lists, not catalogs**, because they drive behavior: account types, transaction kinds, member base classes and time zones (from `Intl`). Users still name accounts freely ("Petty cash", "Ana's Binance").

**Records, not catalogs:** recurring templates, budgets and transactions have their own screens, but they are domain records, not lists of values to choose from, so the catalog rules don't apply to them (a transaction is corrected, not archived).

## AI inside the app

The app can call an AI model for features that an administrator triggers explicitly. Translating a newly installed language is the first one. Later candidates (each one needs its own change and an explicit permission): suggesting a category for a transaction, reading a receipt.

This is about AI used **by the app**. AI that maintains the **code** (Claude Code with OpenSpec) is the development workflow and is out of scope here. The app never modifies its own code.

### Rules

1. **One entry point.** All calls go through one `ai-assistant` feature (`features/ai-assistant/server/`). No other feature imports the AI SDK; lint enforces it, like the database client.
2. **Administrators only**, through explicit actions in the policy matrix (`ai.translate` first). Nothing runs automatically or in the background without an administrator starting it.
3. **No household data by default.** Each use case declares exactly what it sends. Translation sends only the English UI texts and their descriptions, never names, amounts, accounts or transactions. A future use case that needs household data must say so in its spec and be approved in its change.
4. **Optional.** Without an API key the app works fully; AI actions are hidden and the administrator translates by hand or imports files.
5. **Every call is recorded:** who started it, which use case, which model, tokens used, estimated cost, outcome. The log holds no prompt or response contents.
6. **Spending limit.** A monthly cost cap set by the administrator; calls beyond it are refused with a clear message.
7. **Results are validated before they are stored**, and AI output is never trusted as is. For translation: valid ICU syntax and the same placeholders as the English text; failures are reported per text and left untranslated (they fall back to English).
8. **Human in the loop.** AI results are drafts (origin `ai`) that the administrator reviews, edits and activates.

### Proposed defaults (to confirm in change 4)

- **Provider and SDK:** Anthropic's Claude API through the official TypeScript SDK, `@anthropic-ai/sdk`, server-side only.
- **Model:** `claude-opus-5-5`, the current default model, with `effort` set explicitly. The model ID is a setting, not hard-coded.
- **API key:** the `ANTHROPIC_API_KEY` environment variable on the server, like the other secrets in `.env`. It is never stored in the database, never sent to the browser and never logged. The administrator sees only whether AI is configured.
- **Structured output:** responses are requested as JSON validated against a schema (`client.messages.parse` with a schema of `{ key: translated text }`), then checked by rule 7.
- **Batching:** the texts are sent in chunks of about 100, so a failure only retries one chunk and progress can be shown. The Message Batches API (50% cheaper, asynchronous, can take up to a day) isn't worth it at this size.
- **Prompt caching:** not needed. A translation run is a handful of requests; the shared instructions are small.
- **Refusals:** check the stop reason before reading results, and enable the server-side fallback the API offers, so a declined request is retried on another model automatically.
- **Estimated cost:** a few hundred texts with descriptions is roughly 20–30K input tokens and 15–25K output tokens. At Claude Opus 5.5 prices ($4 per million input tokens, $20 per million output tokens) that is about US$0.60 per language, and around US$1 counting the model's reasoning tokens. Regenerating only stale texts costs a fraction of that.
