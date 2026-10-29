# 0005. Money as integer minor units

- Status: Accepted
- Date: 2026-10-22
- Change: bootstrap-app-foundation (`openspec/changes/archive/2026-10-29-bootstrap-app-foundation/design.md`, decision D7)

## Context

The app records amounts in several currencies (BOB, USD, EUR, USDT, later crypto with 8 decimals). Floating-point arithmetic loses cents.

## Decision

Represent money as `{ amountMinor, currency: { code, exponent } }`, where `amountMinor` is a safe JavaScript integer, stored as SQLite `INTEGER`. All arithmetic is integer-only; parsing reads digits as text and formatting never divides. Values outside the safe-integer range are rejected with `MoneyOutOfRange`. The currency's exponent is always passed in as data.

## Consequences

- Sums and sorting work natively in SQL and stay exact.
- Every money input and output goes through the `domain/money` module.
- Amounts above about 9 × 10^15 minor units are rejected, which no household reaches.

## Alternatives considered

- `bigint` end to end: Drizzle's SQLite `integer()` has no `bigint` mode, and the workarounds turn every integer column into `bigint`.
- Decimal strings or a decimal library: slower, don't sum in SQL, and easier to misuse.
