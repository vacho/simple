# CLAUDE.md

A personal and family finance app for a single household, built with spec-driven development using OpenSpec.

## Where things are

- `openspec/config.yaml`: project context and the rules every change must follow. Read it before planning or implementing.
- `openspec/specs/`: what the system does today. `openspec/changes/`: work in progress.
- `docs/roadmap.md`: the planned changes, decisions already taken, catalog rules and rules for AI inside the app.
- `docs/architecture.md`: how the code is organized (created by the `bootstrap-app-foundation` change; until then, see D16 in that change's `design.md`).

## How to work

- Work through the OpenSpec workflow (`/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:verify`, `/opsx:archive`). Don't change behavior without a change that specifies it.
- If a spec is wrong or incomplete, update it with `/opsx:update` before changing code.
- Write artifacts, code, comments and commit messages in English. The owner may write in Spanish; answer in the language they use.

## Commits

- Format: `type(scope): description`, in the imperative, lowercase, without a final period. The scope is the OpenSpec change id, or `openspec`, `roadmap`, `deps`, `ci` for work outside a change.
- One purpose per commit: never mix OpenSpec artifacts and code in the same commit.
- Don't add `Co-Authored-By` lines or any other attribution to commits or pull requests.
- Don't push unless asked.
