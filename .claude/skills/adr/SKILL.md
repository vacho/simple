---
name: adr
description: Manage the project's architecture and process decision records in docs/adr/. List the ADRs in force, create a new ADR, supersede one, accept the Proposed ADRs of an archived change, or reject Proposed ADRs that won't ship. Used by the adr artifact of the OpenSpec schema "simple", by /opsx:archive, by change-flow (detours, abandoning a change), and directly when the owner asks to record or reverse a decision.
---

# ADR

Architecture and process decision records live in `docs/adr/`, one file per decision. `docs/adr/README.md` holds the rules, the template and the index; if this skill and that file disagree, the README wins and this skill must be updated.

## Inputs

- The action: `list`, `new`, `supersede`, `accept` or `reject`. Infer it from the request; ask only if it is unclear.
- For `new` and `supersede`: the decision, and where it comes from (a change and its design decision label, or the owner's explanation when there is no change).
- For `accept`: the change id. For `reject`: the ADR numbers, or the change id when the whole change is abandoned.

## Before any action that writes

ADRs are written and committed on `main` only: `git branch --show-current` must print `main`. On a change branch, stop and use the `change-flow` skill's "Detour to main". On a `docs/` branch, stop: ADRs don't go there. This keeps numbering in one place, so two changes never take the same number.

## Statuses

- `Proposed`: written for a change that is still open. It may still be edited, within its own change.
- `Accepted`: the change shipped, or the owner recorded a decision already in force outside a change. Never edited again, except to mark it superseded.
- `Superseded by NNNN`: replaced by a later ADR. The file stays as history.
- `Rejected`: it won't ship. Either its change was abandoned, or the decision was dropped while the change continues.

ADRs **in force** are the `Accepted` and `Proposed` ones. When an Accepted ADR has a Proposed ADR that supersedes it, the Accepted one stays the rule for every other change until that supersession is accepted.

## Actions

### list

1. Read every `docs/adr/NNNN-*.md` and its `Status` line.
2. Show the ADRs in force, then the rest, each with number, title and status. Flag any file missing from the index, any index row whose status differs from its file, and any Accepted ADR that a Proposed ADR supersedes (a pending supersession).

### new

1. Run `list` and check that no ADR in force already covers the decision. If one does, stop and say which, unless this is a supersession (`supersede`) and that is the ADR being superseded.
2. Take the next number: the highest `NNNN` in `docs/adr/` plus one, zero-padded to four digits. Numbers are never reused, even for Rejected ADRs.
3. Name the file `NNNN-kebab-title.md` with a short title, and fill the template from `docs/adr/README.md`. The header lines are read by scripts, so keep their exact form:
   - `- Status: Proposed` when written for a change that is still open (from its `adr` step, or through a detour to `main` while the change is in progress); `- Status: Accepted` when the owner records a decision already in force outside a change.
   - `- Date: YYYY-MM-DD` (today).
   - ``- Change: <change-id> (`openspec/changes/<change-id>/design.md`, decision Dn)``: the bare change id first, then a space. With no change: `- Change: none (<where the decision was taken>)`.
   - `- Supersedes: NNNN`, only when it does.
4. Keep it short: context, decision and consequences in a few lines each, alternatives one line each. The full reasoning stays in the design.
5. Add a row to the index in `docs/adr/README.md`.

### supersede

1. Check the target: it must be `Accepted`, and no other `Proposed` ADR may already list it under `Supersedes`. A `Proposed` ADR is changed inside its own change, never superseded by another change; and when a supersession is already pending, a second one waits until the first is accepted or rejected. If the check fails, stop and tell the owner.
2. Create the new ADR with `new`, adding `- Supersedes: NNNN` to its header. The ADR being superseded doesn't count as a duplicate in `new` step 1. The new ADR restates everything from the old one that still holds, so the old one is no longer needed to know the rule.
3. If the new ADR is `Proposed`, leave the old one as it is: it is marked when the change is archived (`accept`).
4. If the new ADR is `Accepted` (no change involved), set the old ADR's status to `Superseded by NNNN` now. That status line is the only edit ever made to an accepted ADR.
5. Update both rows in the index.

### accept

Runs when a change is archived, on `main`, as part of `/opsx:archive` inside `change-flow` `close`.

1. Read the change's `adr.md` for the ADRs it created and the ones it supersedes. Every `docs/adr/` file whose `Change` line names this change must be in it; a Proposed one that isn't was dropped and must be rejected first (`reject`).
2. Check each Proposed ADR against the code that shipped. If the implementation changed the decision, update the ADR to match, then **show the owner that change and wait for their yes** before accepting it: once Accepted it can never be edited again.
3. Set each one to `Accepted`, and each ADR it supersedes to `Superseded by NNNN`.
4. Update the path in each ADR's `Change` line to the archived folder (`openspec/changes/archive/<date>-<change-id>/design.md`), keeping the change id first.
5. Update the index: the change's ADRs to `Accepted`, the superseded ones to `Superseded by NNNN`.

`change-flow`'s `close.sh status` checks all of this before the archive can be committed, and lists anything missing.

### reject

For a `Proposed` ADR that won't ship: its change was abandoned, or the decision was dropped while the change continues.

1. Set its status to `Rejected`.
2. Add the reason after the `Change` line's path, for example `(… decision D3; dropped on 2026-11-02: folded into 0024)` or `(…; change abandoned on 2026-11-02)`. When the change is abandoned its folder is deleted, so this line is the record of where the ADR came from.
3. Update its index row to `Rejected`.
4. If the change continues, remove the ADR from the change's `adr.md` (a plan update on the change's branch, after the detour) and say why.

ADR files are never deleted, and a Rejected ADR's number is never reused.

## Rules

- Never edit an Accepted ADR, except its status line when it is superseded.
- Never delete an ADR file.
- Write and commit ADRs on `main` only (see "Before any action that writes").
- Write ADRs in English, even when the owner writes in Spanish.
