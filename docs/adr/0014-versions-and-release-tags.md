# 0014. Versions and release tags

- Status: Accepted
- Date: 2026-10-22
- Change: none (process decision taken with the owner while defining the workflow, task 001)

## Context

The app will be deployed and upgraded, and rollbacks restore a pre-migration backup with the matching build (`bootstrap-app-foundation`, D8 and Migration Plan). Telling which build is running, and which commit it came from, needs a version and a tag.

## Decision

- The version lives in `package.json` (`version`), following Semantic Versioning, and the app shows it on the settings page.
- **Before 1.0.0:** closing an OpenSpec change raises the minor version (`0.1.0`, `0.2.0`...). Merging a `fix/`, `chore/`, `build/` or `ci/` branch that changes what runs raises the patch version. Changes to documentation, OpenSpec artifacts or agent tooling alone don't release.
- **1.0.0** is set by the owner when the household starts using the app for real.
- **From 1.0.0:** a change that requires manual action from the operator on upgrade (breaking configuration, a migration that can't run automatically) raises the major version; other changes the minor; fixes the patch.
- The version is bumped on the branch, as its last commit before merging (`npm version <level> --no-git-tag-version`, committed as `chore(<scope>): release vX.Y.Z - <task-code>`), so no code is committed on `main` (0009, 0013).
- After the merge, and after the archive commit for a change, `main` gets an annotated tag `vX.Y.Z` naming the change or branch and the task code.

## Consequences

- Every deployed build maps to one tag, and `git log vA..vB` lists what an upgrade brings.
- The roadmap's changes map to minor versions until 1.0.0.
- Tags are local until the owner pushes them.

## Alternatives considered

- Date-based versions: say when, not what kind of change.
- Bumping on `main` after the merge: a code commit on `main`, which 0013 blocks.
- A changelog file: duplicates the tagged history for a one-household app.
