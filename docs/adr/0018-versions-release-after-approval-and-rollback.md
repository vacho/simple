# 0018. Versions, release after approval, and recovery of a failed close

- Status: Accepted
- Date: 2026-10-23
- Change: none (process decision taken with the owner while defining the workflow)
- Supersedes: 0014

## Context

The app will be deployed and upgraded, and rollbacks restore a pre-migration backup with the matching build (`bootstrap-app-foundation`, D8 and Migration Plan). Telling which build is running, and which commit it came from, needs a version and a tag.

0014 defined versions and tags, but bumped the version before the owner approved the merge, so a declined close left a stale version on the branch and the next close skipped a number. It also said nothing about a close that fails or stops halfway, leaving `main` merged but not archived or tagged. Reviews of the written procedure then kept finding edge cases in its Git mechanics (resuming, partial steps, undo), which prose alone couldn't make reliable.

## Decision

**Versions**

- The version lives in `package.json` `version`, in Semantic Versioning, and the app shows it to administrators on the settings page. Until `package.json` exists, nothing is released.
- **Before 1.0.0:** closing an OpenSpec change raises the minor version, or the patch version for one with `skip_specs: true` (a refactor of app code). Merging a `fix/`, `chore/` or `build/` branch that changes what runs in production raises the patch version. Anything that doesn't change what runs (documentation, OpenSpec artifacts, agent tooling, CI, tests only, dev-only tool configs, `README.md` only) doesn't release.
- **1.0.0** is set by the owner when the household starts using the app for real: the next close releases with level `major`. **From then on:** a change that requires manual action from the operator on upgrade (breaking configuration, a migration that can't run automatically) raises the major version, other changes the minor, fixes the patch.
- OpenSpec changes are for app code only; agent tooling and project documentation never are. Work that requires manual action on upgrade is always an OpenSpec change, so it can never ship as a patch.

**Release and tag**

- The version is bumped on the branch (`npm version <level> --no-git-tag-version`, committed as `chore(<scope>): release vX.Y.Z - <task-code>`) only after the owner approves the merge in the same close run, right before merging; `main` gets no code commit. The owner's approval covers the release, merge and archive commits, so a close in `review` mode doesn't stop again for them (except to show a Proposed ADR that archiving had to change).
- After the merge, `main` gets an annotated tag `vX.Y.Z` naming the change or branch and the task code: on the archive commit for a change, on the merge commit for a branch outside a change. A version whose tag already exists is never released again.

**Resuming and recovery**

- The Git steps of closing are a tested script, `close.sh` in the `change-flow` skill, not prose. Its tests replay the failure scenarios that reviews found.
- A close is resumable: the script reads where it stands from evidence history keeps (the merge commit Git wrote on `main`'s first-parent history for that branch's current tip; the release commit by its title among that branch's own commits or what its merge brought in; the archive by its commit; the tag on its target) and from steps written but not committed.
- Until the merge is done, a release left by an interrupted run is dropped, never reused: every run syncs with `main`, re-runs the checks, asks the owner again and releases fresh. An approval from an interrupted run never carries over.
- After the merge, an archive is complete only when all its outputs are written (specs synced, change folder moved, ADRs accepted, roadmap status set). A complete archive that isn't committed is finished by committing it, never by archiving again; a partly written one has only its own output discarded, keeping the merge and the release, and is archived again.
- When a step fails, the agent stops and reports what failed, where things stand and the options: resume, undo, or leave it. The undo runs only with the owner's yes; only when nothing the close made is published (checked after a fresh fetch; with no remote, nothing is); only when every commit a reset would remove is the close's own; with commands that refuse to discard other work (`git reset --keep`, `git merge --abort`, path-limited restores, never `git clean`); and, before restoring files, after the owner has seen the staged diff and confirmed it is all the close's. An undo after the branch was deleted first recreates the branch at the merge's second parent.

## Consequences

- Every deployed build maps to one tag, and `git log vA..vB` lists what an upgrade brings.
- The roadmap's changes map to minor versions until 1.0.0.
- A declined close leaves no stale version; a failed one is resumed or undone by the owner's choice, never silently.
- A tag may be deleted only when undoing, with the owner's yes, a failed close that created it and never published it; otherwise tags are never moved or deleted. Tags are local until the owner pushes them.
- Changing how closing works means changing `close.sh` and its tests together, then this ADR if a rule changes.

## Alternatives considered

- Bump before approval (0014): a declined close leaves a stale bump.
- Reuse a release commit from an interrupted run: `main` may have moved and its version may be taken by then.
- Leave a failed close for manual repair: `main` would stay merged but unarchived until someone notices.
- Undo a failed close automatically by resetting both branches to recorded commits: can discard work made while the close waited, and doesn't handle half-finished steps.
- Keep the procedure as prose only: each review found new edge cases in the Git mechanics; a script can be tested against them.
- Date-based versions: say when, not what kind of change.
- Bumping on `main` after the merge: a code commit on `main`, which the hooks (0019) block.
- A changelog file: duplicates the tagged history for a one-household app.
