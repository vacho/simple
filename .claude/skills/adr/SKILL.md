---
name: adr
description: Manage the project's architecture decision records in docs/adr/. List the ADRs in force, create a new ADR, supersede one, or accept the Proposed ADRs of an archived change. Used by the adr artifact of the OpenSpec schema "simple" and by /opsx:archive, and directly when the owner asks to record or reverse an architecture decision.
---

# ADR

Architecture decision records live in `docs/adr/`, one file per decision. `docs/adr/README.md` holds the rules, the template and the index; if this skill and that file disagree, the README wins and this skill must be updated.

## Inputs

- The action: `list`, `new`, `supersede` or `accept`. Infer it from the request; ask only if it is unclear.
- For `new` and `supersede`: the decision, and where it comes from (a change and its design decision label, or the owner's explanation when there is no change).
- For `accept`: the change id.

## Statuses

- `Proposed`: written during a change's `adr` step. It may still be edited.
- `Accepted`: the change shipped. Never edited again, except to mark it superseded.
- `Superseded by NNNN`: replaced by a later ADR. The file stays as history.
- `Rejected`: the change that proposed it was abandoned.

## Actions

### list

1. Read every `docs/adr/NNNN-*.md` and its `Status` line.
2. Show the ADRs in force (Accepted and Proposed), then the rest, each with number, title and status. Flag any file missing from the index, or any index row whose status differs from its file.

### new

1. Run `list` and check that no ADR in force already covers the decision. If one does, stop and say which.
2. Take the next number: the highest `NNNN` in `docs/adr/` plus one, zero-padded to four digits. Numbers are never reused, even for Rejected ADRs.
3. Name the file `NNNN-kebab-title.md` with a short title, and fill the template from `docs/adr/README.md`:
   - Status: `Proposed` when written from a change's `adr` step; `Accepted` when the owner records a decision already in force outside a change.
   - Date: today.
   - Change: the change id with its design decision label; when there is no change, write `none` and say where the decision was taken.
4. Keep it short: context, decision and consequences in a few lines each, alternatives one line each. The full reasoning stays in the design.
5. Add a row to the index in `docs/adr/README.md`.

### supersede

1. Create the new ADR with `new`, adding `Supersedes: NNNN` to its header.
2. If the new ADR is `Proposed`, leave the old one as it is: it is marked when the change is archived (`accept`).
3. If the new ADR is `Accepted` (no change involved), set the old ADR's status to `Superseded by NNNN` now. That status line is the only edit ever made to an accepted ADR.
4. Update both rows in the index.

### accept

Runs when a change is archived, on `main`.

1. Read the change's `adr.md` for the ADRs it created and the ones it supersedes.
2. Check each Proposed ADR against the code that shipped. If the implementation changed the decision, update the ADR to match before accepting it, and say so in the archive summary.
3. Set each one to `Accepted`, and each ADR it supersedes to `Superseded by NNNN`.
4. Update the change path in each ADR's `Change` line to the archived folder (`openspec/changes/archive/<date>-<change-id>/`).
5. Update the index.

If a change is abandoned instead of archived, set its Proposed ADRs to `Rejected`.

## Rules

- Never edit an Accepted ADR, except its status line when it is superseded.
- Never delete an ADR file.
- ADRs are numbered on `main` only (proposals and archives happen there), so parallel changes never collide on a number.
- Write ADRs in English, even when the owner writes in Spanish.
