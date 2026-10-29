# 0007. Device-generated UUIDv7 IDs and idempotent creates for household data

- Status: Accepted
- Date: 2026-10-22
- Change: bootstrap-app-foundation (`openspec/changes/archive/2026-10-29-bootstrap-app-foundation/design.md`, decision D15)

## Context

The first version is online-only, but offline quick entry (transactions logged without a network and uploaded later) is a likely later change. Retrofitting IDs and duplicate handling into an existing data model is costly.

## Decision

Every household data record (members, accounts, categories, transactions, allocations and later ones) uses a UUIDv7 text primary key that the client may generate and the server accepts. Creates of household data are idempotent by ID: the same ID with the same content succeeds without a second record, and the same ID with different content is rejected as a conflict. Server-only tables such as `users` and `sessions` may keep server-generated IDs.

## Consequences

- Records created offline already have their final identity, and IDs sort by creation time.
- Every create of household data needs a duplicate-submission scenario in its spec.
- Services must compare content on a repeated ID instead of failing on the primary key.

## Alternatives considered

- Server-generated integer IDs: simpler today, but offline entry would need temporary IDs and remapping.
