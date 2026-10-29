# 0021. Calendar dates, UTC timestamps and canonical time zones

- Status: Accepted
- Date: 2026-10-23
- Change: bootstrap-app-foundation (`openspec/changes/archive/2026-10-29-bootstrap-app-foundation/design.md`, decision D14)

## Context

Household members may live in, or travel between, different time zones, and every later change records dates and times: transactions, sessions, backups, reports. How time is stored and which zone is valid must be the same everywhere and is costly to change once data exists. D14 decided it inside the internationalization decision, which 0006 records only for translations.

## Decision

- All timestamps are stored in UTC.
- A transaction's date is a calendar date (`YYYY-MM-DD`) with no time zone, not a timestamp.
- Each user has an optional time zone (`users.time_zone`); times are shown in it, and in UTC when it's not set. Server and client render with the same zone, passed through the root layout data.
- A zone is valid when it is an IANA name that `Intl.DateTimeFormat` accepts; numeric offsets (`+02:00`, `-0400`) are rejected because they don't follow daylight saving changes. The stored value is the canonical form, `resolvedOptions().timeZone`.

## Consequences

- Later changes never store a local time, and never derive a transaction's date from a timestamp.
- Reports group by calendar date as entered, whatever zone the viewer is in.
- A zone that `Intl` renames is stored in its canonical form, so comparisons stay stable.

## Alternatives considered

- Store local times with an offset: ambiguous across daylight saving changes, and different for each member.
- Transaction dates as timestamps: a purchase near midnight would land on a different day depending on the viewer's zone.
- Accept numeric offsets as time zones: they don't follow daylight saving changes.
