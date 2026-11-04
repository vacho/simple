# 0030. A UX artifact per change, and docs/design/ as the visual source of truth

- Status: Accepted
- Date: 2026-11-04
- Change: none (process decision taken with the owner while reviewing the workflow, task 002)

## Context

Screens are written by AI agents and reviewed by the owner. ADR 0028 fixed the visual identity and the component library, but each screen was still designed directly in code: no wireframes, flows or mockups were agreed before building, and the patterns of a change lived only in its `design.md`, which is archived with it. Designs may come from tools such as Claude (Design artifacts and design systems), Google Stitch or Figma, each with its own exports (HTML, images, Figma files, design-system files) and agent connectors (MCP servers), which change quickly. Those tools are external services, while the household's data must never leave the server.

## Decision

- **A `ux` artifact in every change** (schema `simple`: proposal → specs → **ux** → design → adr → tasks), written to `ux.md` with its `mockups/` folder. It holds the user flows (Mermaid), wireframes, one mockup per new or changed screen, the states of each screen (empty, error, no permission, offline, long content), the components used or added, and the interface texts. A change without interface says "No UI" in one line.
- **A tool-neutral handoff contract.** Whatever tool made a design, the change keeps a snapshot of what was approved: `mockups/<screen>/` with an export (`.html` or `.png`/`.webp`), its states, and `source.md` (tool, link, frame or version, date, approved by). The snapshot in the repository is the truth, not the tool; connectors are optional.
- **Exported code is reference, never app code.** Agents rebuild every screen from the library and tokens (ADR 0028); deviations of a mockup from the system (a color, size or component that doesn't exist) are listed in `ux.md` and either fixed in the mockup or proposed as a deliberate change to the system.
- **The design system flows out to the tools**, generated from `tokens.css` and the library (a tokens file, a system summary, the Claude design-system sync), so tools design with what the app can build.
- **`docs/design/` is the durable visual source of truth**: `style-guide.md`, `screens.md` (screen map and navigation) and `screens/<screen>/` (the current approved mockup). Archiving a change promotes its approved mockups there, as it syncs specs into `openspec/specs/`.
- **Only fictitious data in designs.** Screens, captures and exports given to any external tool use made-up data (a demo household), never data or captures from the household's real instance. "Household data never leave the server" applies to the app's data; "everything the interface loads comes from the app" applies to the running app, not to mockups kept in the repository.
- Applying a change checks each new screen against its mockup (a screenshot of the real screen next to the mockup, judged by the owner), besides axe and the screen checks.

## Consequences

- Each screen is agreed before it is built, and later changes can see how every screen looks today.
- The schema, the config, the archive guidance and `close.sh` (which accepts `docs/design/` as archive output) carry this; the generated OpenSpec skills stay untouched.
- Binary exports are kept small (compressed PNG or WebP).
- Changing the handoff contract or the tools it names needs a new ADR only when a rule here changes.

## Alternatives considered

- Mockups only in the design tool: links expire or need a login, and agents can't always read them.
- One mandated tool: the tools change quickly, and the owner wants to choose per change.
- Pixel-diff tests against mockups: noisy; the owner judges the look, tests guard regressions.
- Relaxing the privacy and same-origin rules for design tools: designs don't need real data, so the rules are scoped instead.
