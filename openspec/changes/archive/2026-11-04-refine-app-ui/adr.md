# ADR Review

## ADRs in force reviewed

- 0001 (SvelteKit 3): followed; forms use form actions with `use:enhance`.
- 0005 (money as integer minor units): respected; ADR 0028 forbids Ark's number input for amounts, which the ledger will enter through a field parsed by `domain/money`.
- 0006 (runtime translations; right-to-left with logical CSS): followed; every component text comes from the catalogs, Ark's `LocaleProvider` gets the resolved locale, and the logical-property lint rule stays.
- 0008 (modular monolith by feature): followed; routes stay thin adapters and gain one more boundary (they use only `src/lib/components/`).
- 0021 (calendar dates): not affected now; the date picker added later should use Ark's calendar-date type, which matches it.
- 0002, 0003, 0004, 0007, 0026, 0027: not affected; no data, permission or account behavior changes.
- 0010, 0015, 0017, 0018, 0020, 0023, 0024, 0025 (process): carried out by the `change-flow` skill. This change is a minor release (0018); paths are relative to `app/` (0023).

The design departs from none of them. It replaces a design decision that was never an ADR: D10 of `bootstrap-app-foundation` ("no component library for now").

## ADRs created

- [0028 One component library on Ark UI, and one visual identity as tokens](../../../docs/adr/0028-ui-components-and-visual-identity.md), from D1, D3, D4 and D5

## ADRs to supersede

None.

## Design decisions not recorded as ADRs

- D2 Inter with two subsets: a packaging detail of the identity in 0028.
- D6 Component catalog page: a development aid.
- D7 Screen layouts: reversible, built from the patterns 0028 records.
- Package versions (Ark UI, Lucide, Inter): version picks.
