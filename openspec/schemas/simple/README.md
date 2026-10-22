# Schema `simple`

The OpenSpec workflow of this project: proposal → specs → design → **adr** → tasks.

It is a fork of OpenSpec's built-in `spec-driven` schema, taken from OpenSpec 1.14.3 with `openspec schema fork spec-driven simple`. Changes from the original:

- `design`: reads the ADRs in force in `docs/adr/` before writing decisions, and names any ADR a decision departs from.
- `adr` (new): reviews the design against the ADRs in force, creates Proposed ADRs for its durable decisions and writes `adr.md` in the change. See `docs/adr/README.md` and the `adr` skill.
- `tasks`: requires `adr` and honors the ADRs it lists.
- `templates/adr.md` (new).
- `apply`: checks the change branch and commits each task group through the `change-flow` skill (`.claude/skills/change-flow/`), following `docs/workflow.md`.

## Upgrading OpenSpec

The fork does not receive improvements to `spec-driven`. To bring them in when upgrading OpenSpec:

1. Before upgrading, copy the built-in schema somewhere temporary. `openspec schema which spec-driven` prints its folder.
2. Upgrade OpenSpec, then `diff -r` the old copy against the new built-in folder. That diff is what upstream changed.
3. Apply those changes to this schema, keeping the changes listed above.
4. Update the OpenSpec version named at the top of this file.
5. Run `openspec schema validate simple` and `openspec validate --all --strict`.
