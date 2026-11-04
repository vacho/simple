# Design

How the interface looks, and how designs reach the code ([ADR 0030](../adr/0030-ux-artifact-and-design-docs.md)). The tokens and the components themselves live in the app ([ADR 0028](../adr/0028-ui-components-and-visual-identity.md)): `app/src/lib/components/tokens.css` and `app/src/lib/components/`, shown together at `/dev/components` on the development server.

| File | What it holds |
|---|---|
| [`style-guide.md`](style-guide.md) | Principles, how to use the tokens and components, screen patterns, texts, accessibility and responsive rules |
| [`screens.md`](screens.md) | The screen map: every screen, its route, who reaches it and from where |
| `screens/<screen>/` | The approved mockup of each screen, in the handoff format below |

**Who changes it:** archiving a change promotes the mockups and patterns its `ux.md` approved; the owner may also ask for an edit. Tasks never write here.

## Handoff contract

Designs may come from any tool: Claude (Design artifacts, design systems), Google Stitch, Figma, or by hand. Whatever the tool, a change keeps a snapshot of what was approved, under `openspec/changes/<id>/mockups/<screen>/`:

```
mockups/<screen>/
  phone.html | phone.png | phone.webp       the screen at 390 px wide
  desktop.html | desktop.png | desktop.webp the screen at 1280 px wide
  states/<state>.(html|png|webp)            empty, error, no permission, long content…
  source.md                                 where it came from
```

`source.md`:

```markdown
- Tool: Figma | Google Stitch | Claude | by hand
- Link: <URL of the file, frame or project>, or "none"
- Version: <frame id, version name or export date>
- Exported: YYYY-MM-DD
- Approved by: <owner>, YYYY-MM-DD
- Notes: anything the export lost (interactions, fonts)
```

Rules:

- **The snapshot is the truth**, not the tool: links expire, need a login or change after approval.
- **HTML is preferred**, because agents read it exactly; images go with it when the tool exports nothing else. Compress images (PNG or WebP, under about 300 KB each).
- **Exported code is reference only.** Tools export Tailwind, React or their own CSS; the app rebuilds every screen from its components and tokens.
- **Fictitious data only.** Use the demo household (made-up names and amounts). Never design with, paste, capture or upload data or screenshots of the household's real instance: the tools are external services, and household data never leave the server.
- A mockup made by hand is static HTML that links `app/src/lib/components/tokens.css` by a relative path, so it uses the real tokens.

## Giving the system to a tool

So that a tool designs with what the app can build, give it the system first:

- **Any tool:** the summary in [`style-guide.md`](style-guide.md) (tokens by role, components, patterns), pasted as instructions.
- **Claude:** sync the component library to a design-system project with `/design-sync`; then make designs from Claude's Design artifacts with that system.
- **Google Stitch:** a `DESIGN.md` describing the system, imported in Stitch.
- **Figma:** the tokens as variables, imported from a tokens file (W3C design tokens format).

The `DESIGN.md` and the tokens file are generated from `tokens.css` once the export script exists; until then, use the style guide summary.

## Optional connectors

Agents can read designs directly through MCP servers. They are optional: the handoff contract never depends on them, and each one is enabled by the owner in their own Claude Code settings, never committed with credentials.

- **Figma:** the remote MCP server (`https://mcp.figma.com/mcp`), added with `claude mcp add`. It reads frames, variables and layout from a link, and can write to the canvas; some features need a paid seat. Export the approved frames into the change anyway.
- **Google Stitch:** an MCP server that returns a screen's HTML and image. At the time of writing it is set up through a third-party package; check Google's current documentation before using it.
- **Claude:** `/design-sync` keeps the design-system project in step with `app/src/lib/components/`.
