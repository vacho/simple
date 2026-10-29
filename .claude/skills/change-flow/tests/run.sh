#!/usr/bin/env bash
# Scenario tests for close.sh and detour.sh. Each scenario builds a scratch
# repository with the project's hooks enabled. Run: bash tests/run.sh
set -u
here=$(cd "$(dirname "$0")/.." && pwd)
close="$here/close.sh"; detour="$here/detour.sh"
hooks=$(cd "$here/../../../.githooks" && pwd)
base=${TMPDIR:-/tmp}/change-flow-tests.$$
pass=0; fail=0

ok()   { pass=$((pass+1)); echo "  ok   $1"; }
bad()  { fail=$((fail+1)); echo "  FAIL $1"; }
expect() { # <description> <pattern> <text>
  if printf '%s\n' "$3" | grep -qE -- "$2"; then ok "$1"; else bad "$1"; printf '%s\n' "$3" | sed 's/^/       | /'; fi
}

new_repo() { # <name>: main with app/package.json, an OpenSpec change folder, roadmap
  r="$base/$1"; mkdir -p "$r" && cd "$r" || exit 1
  git init -q -b main && git config user.email t@t && git config user.name t
  mkdir -p app && printf '{ "name": "t", "version": "0.0.1" }\n' > app/package.json
  mkdir -p openspec/changes/x openspec/specs docs/adr
  echo "# Proposal" > openspec/changes/x/proposal.md
  echo "# Roadmap" > docs/roadmap.md
  git add -A && git commit -q -m "init"
  git config core.hooksPath "$hooks"
}

fake_archive() { # moves the change folder and syncs a new spec, like /opsx:archive
  mkdir -p openspec/changes/archive/2026-10-23-x openspec/specs/cap
  git mv -k openspec/changes/x/proposal.md openspec/changes/archive/2026-10-23-x/proposal.md 2>/dev/null \
    || mv openspec/changes/x/proposal.md openspec/changes/archive/2026-10-23-x/
  rmdir openspec/changes/x 2>/dev/null
  echo "# Spec" > openspec/specs/cap/spec.md
  echo "x: Archived" >> docs/roadmap.md
}

echo "1. full close of an OpenSpec change, resumed at every phase"
new_repo s1
git switch -q -c change/x; echo a > a.txt; git add a.txt; git commit -q -m "feat(x): add a - 003"
expect "fresh branch is not merged"            '^merged=no'                 "$("$close" status change/x)"
expect "next is sync"                          '^next=sync'                 "$("$close" status change/x)"
git switch -q main; git commit -q --allow-empty -m "docs(roadmap): note - 003"; git switch -q change/x
expect "sync stages a merge"                   'merge-staged'               "$("$close" sync change/x)"
expect "conclude-sync keeps Git's message"     "Merge branch 'main' into change/x" "$("$close" conclude-sync change/x)"
expect "release makes the commit"              'released v0.1.0'            "$("$close" release change/x minor 003)"
expect "unmerged release is found"             'released=yes v0.1.0 .*\(tip\)' "$("$close" status change/x)"
expect "resume before merge drops the release" '^next=drop-release'         "$("$close" status change/x)"
expect "drop-release removes it"               'dropped release commit'     "$("$close" drop-release change/x)"
"$close" release change/x minor 003 >/dev/null
expect "merge switches to main and merges"     "merged: .*Merge branch 'change/x'" "$("$close" merge change/x)"
expect "release still found after the merge"   'released=yes v0.1.0'        "$("$close" status change/x)"
expect "next is archive"                       '^next=archive:'             "$("$close" status change/x)"
fake_archive
expect "archive written is complete"           '^archived=complete'         "$("$close" status change/x)"
expect "archive-commit commits it"             'archived: .*docs\(x\): archive change' "$("$close" archive-commit change/x 003)"
expect "next is tag"                           '^next=tag$'                 "$("$close" status change/x)"
expect "tag goes on the archive commit"        'tagged v0.1.0'              "$("$close" tag change/x 003)"
expect "next is cleanup"                       '^next=cleanup$'             "$("$close" status change/x)"
expect "cleanup deletes the branch"            'cleaned up'                 "$("$close" cleanup change/x)"
expect "after cleanup, release still found"    'released=yes v0.1.0'        "$("$close" status change/x)"
expect "and the close is done"                 '^next=done$'                "$("$close" status change/x)"

echo "2. an uncommitted release bump is dropped, never bumped twice"
new_repo s2
git switch -q -c change/x; echo a > a.txt; git add a.txt; git commit -q -m "feat(x): add a - 003"
(cd app && npm version minor --no-git-tag-version >/dev/null)
expect "release written is detected"           '^release_written=yes'       "$("$close" status change/x)"
expect "release refuses to bump again"         'already exists'             "$("$close" release change/x minor 003 2>&1)"
expect "drop-release restores app/package.json"    'dropped the uncommitted'    "$("$close" drop-release change/x)"
expect "package.json is back to 0.0.1"         '"version": "0.0.1"'         "$(cat app/package.json)"

echo "3. a reused branch name isn't taken as already merged"
new_repo s3
git switch -q -c chore/bump; echo a > a.txt; git add a.txt; git commit -q -m "chore(deps): bump a - 004"
git switch -q main; git merge -q --no-ff --no-edit chore/bump; git branch -q -d chore/bump
git switch -q -c chore/bump; echo b > b.txt; git add b.txt; git commit -q -m "chore(deps): bump b - 005"
expect "new branch with an old name is not merged" '^merged=no'             "$("$close" status chore/bump)"

echo "4. an earlier release with the same scope isn't this branch's"
new_repo s4
git switch -q -c chore/a; echo a > a.txt; git add a.txt; git commit -q -m "chore(deps): bump a - 004"
"$close" release chore/a patch 004 --scope deps >/dev/null; git switch -q main; git merge -q --no-ff --no-edit chore/a
git switch -q -c chore/b; echo b > b.txt; git add b.txt; git commit -q -m "chore(deps): bump b - 005"
expect "chore/b has no release of its own"     '^released=no'               "$("$close" status chore/b)"

echo "5. undo refuses to remove a commit the owner made after the merge"
new_repo s5
git switch -q -c change/x; echo a > a.txt; git add a.txt; git commit -q -m "feat(x): add a - 003"
"$close" release change/x minor 003 >/dev/null; "$close" merge change/x >/dev/null
git commit -q --allow-empty -m "docs(roadmap): owner note - 006"
expect "undo stops"                            "isn't this close's"        "$("$close" undo change/x 2>&1)"

echo "6. undo after the merge restores everything, with no remote"
new_repo s6
git switch -q -c change/x; echo a > a.txt; git add a.txt; git commit -q -m "feat(x): add a - 003"
before_main=$(git rev-parse main); before_branch=$(git rev-parse change/x)
"$close" release change/x minor 003 >/dev/null; "$close" merge change/x >/dev/null; fake_archive
expect "undo plan lists the steps"             'reset --keep'               "$("$close" undo change/x)"
"$close" undo change/x --run >/dev/null 2>&1
expect "main is back where it was"             "^$before_main\$"            "$(git rev-parse main)"
expect "branch is back where it was"           "^$before_branch\$"          "$(git rev-parse change/x)"
expect "the tree is clean"                     '^$'                         "$(git status --porcelain)"

echo "7. a partly written archive is undone, new files included"
new_repo s7
git switch -q -c change/x; echo a > a.txt; git add a.txt; git commit -q -m "feat(x): add a - 003"
"$close" merge change/x >/dev/null
mkdir -p openspec/specs/cap; echo "# Spec" > openspec/specs/cap/spec.md; echo "more" >> docs/roadmap.md
expect "partial archive detected"              '^archived=partial'          "$("$close" status change/x)"
expect "next is undo"                          '^next=undo'                 "$("$close" status change/x)"
"$close" undo change/x --run >/dev/null 2>&1
expect "tree clean after undo"                 '^$'                         "$(git status --porcelain)"

echo "8. a docs branch closes with no release and no tag"
new_repo s8
git switch -q -c docs/notes; echo n >> docs/roadmap.md; git commit -q -am "docs(roadmap): add notes - 007"
"$close" merge docs/notes >/dev/null
expect "no release, next is cleanup"           '^next=cleanup$'             "$("$close" status docs/notes)"
expect "cleanup works without a tag"           'cleaned up'                 "$("$close" cleanup docs/notes)"

echo "9. an existing tag blocks a release with the same version"
new_repo s9
git tag -a v0.1.0 -m "old" ; git switch -q -c change/x; echo a > a.txt; git add a.txt; git commit -q -m "feat(x): add a - 003"
expect "release refuses"                       'already exists; release not made' "$("$close" release change/x minor 003 2>&1)"
expect "and leaves app/package.json untouched"     '^$'                         "$(git status --porcelain)"

echo "10. detour stash survives another stash"
new_repo s10
git switch -q -c change/x; echo wip > wip.txt
oid=$("$detour" stash x)
echo other > other.txt; git stash push -q -u -m "someone else"
"$detour" restore "$oid" >/dev/null
expect "our work is back"                      'wip'                        "$(cat wip.txt 2>/dev/null)"
expect "the other stash is untouched"          'someone else'               "$(git stash list)"
"$detour" drop "$oid" >/dev/null
expect "only our entry was dropped"            'someone else'               "$(git stash list)"
expect "and ours is gone"                      '^1$'                        "$(git stash list | wc -l | tr -d ' ')"

echo "11. worktree: cleanup removes it (ignored files don't block)"
new_repo s11
printf 'node_modules/\n.env\n' > .gitignore; git -c core.hooksPath=/dev/null add .gitignore; git -c core.hooksPath=/dev/null commit -q -m "init ignore"
git worktree add -q "$base/s11.wt" -b change/x
( cd "$base/s11.wt" && mkdir node_modules && echo e > .env && echo a > a.txt && git add a.txt && git commit -q -m "feat(x): add a - 003" )
expect "merge from main checkout"              "merged:"                    "$("$close" merge change/x)"
fake_archive; "$close" archive-commit change/x 003 >/dev/null
expect "cleanup removes the worktree"          'cleaned up'                 "$("$close" cleanup change/x)"

echo "12. archive is complete only when specs, folder, roadmap and every ADR step are done"
new_repo s12
printf -- '- Status: Accepted\n- Change: none\n' > docs/adr/0001-old.md
printf -- '- Status: Proposed\n- Change: x (`openspec/changes/x/design.md`, decision D1)\n- Supersedes: 0001\n' > docs/adr/0002-new.md
printf '| ADR | Title | Status |\n|---|---|---|\n| [0001](0001-old.md) | Old | Accepted |\n| [0002](0002-new.md) | New | Proposed |\n' > docs/adr/README.md
mkdir -p openspec/changes/x/specs/cap; echo "## ADDED Requirements" > openspec/changes/x/specs/cap/spec.md
git -c core.hooksPath=/dev/null add -A; git -c core.hooksPath=/dev/null commit -q -m "add adrs"
git switch -q -c change/x; echo a > a.txt; git add a.txt; git commit -q -m "feat(x): add a - 003"
"$close" merge change/x >/dev/null
mkdir -p openspec/changes/archive; mv openspec/changes/x openspec/changes/archive/2026-10-23-x
expect "folder moved only"                     'missing: specs-not-synced roadmap-status adr-0002 adr-0002-change-path adr-0001-not-superseded' "$("$close" status change/x)"
mkdir -p openspec/specs/cap; echo "# Spec" > openspec/specs/cap/spec.md; echo "x: Archived" >> docs/roadmap.md
sed -i 's/^- Status: Proposed/- Status: Accepted/' docs/adr/0002-new.md
expect "status set, path and index still stale" 'missing: adr-0002-index adr-0002-change-path adr-0001-not-superseded adr-0001-index\)' "$("$close" status change/x)"
sed -i 's#openspec/changes/x/#openspec/changes/archive/2026-10-23-x/#' docs/adr/0002-new.md
sed -i 's/| New | Proposed |/| New | Accepted |/' docs/adr/README.md
sed -i 's/^- Status: Accepted/- Status: Superseded by 0002/' docs/adr/0001-old.md
expect "superseded file done, its index row not" 'missing: adr-0001-index\)' "$("$close" status change/x)"
sed -i 's/| Old | Accepted |/| Old | Superseded by 0002 |/' docs/adr/README.md
expect "everything done: complete"             '^archived=complete'         "$("$close" status change/x)"

echo "13. undo-archive discards only the archive output, keeping merge and release"
new_repo s13
git switch -q -c change/x; echo a > a.txt; git add a.txt; git commit -q -m "feat(x): add a - 003"
"$close" release change/x minor 003 >/dev/null; "$close" merge change/x >/dev/null
merged_main=$(git rev-parse main)
mkdir -p openspec/specs/cap; echo "# Spec" > openspec/specs/cap/spec.md; echo "more" >> docs/roadmap.md
expect "next is undo-archive"                  '^next=undo-archive'         "$("$close" status change/x)"
expect "show-archive shows the new file's content" '^\+# Spec'             "$("$close" show-archive change/x)"
expect "show-archive leaves the index untouched" '^$'                       "$(git diff --cached --name-only)"
"$close" undo-archive change/x --run >/dev/null
expect "tree clean"                            '^$'                         "$(git status --porcelain)"
expect "merge kept"                            "^$merged_main\$"           "$(git rev-parse main)"
expect "release kept, next is archive"         '^next=archive:'             "$("$close" status change/x)"

echo "14. the whole-close undo dry run doesn't offer an archive review when there's none"
new_repo s14
git switch -q -c fix/cap-a; echo a > a.txt; git add a.txt; git commit -q -m "fix(cap): fix a - 004"
"$close" merge fix/cap-a >/dev/null
out=$("$close" undo fix/cap-a)
if printf '%s\n' "$out" | grep -q "show-archive\|add -A"; then bad "no archive review line"; else ok "no archive review line"; fi

echo "15. a release made with --scope is found by every later command (reviewer finding 1)"
new_repo s15
git switch -q -c chore/bump; echo a > a.txt; git add a.txt; git commit -q -m "chore(deps): bump a - 004"
"$close" release chore/bump patch 004 --scope deps >/dev/null
expect "status finds it before the merge"      'released=yes v0.0.2 .*\(tip\)' "$("$close" status chore/bump)"
expect "drop-release finds it"                 'dropped release commit'     "$("$close" drop-release chore/bump)"
"$close" release chore/bump patch 004 --scope deps >/dev/null; "$close" merge chore/bump >/dev/null
expect "status finds it after the merge"       '^next=tag$'                 "$("$close" status chore/bump)"
expect "tag finds it"                          'tagged v0.0.2'              "$("$close" tag chore/bump 004)"

echo "16. an interrupted sync merge in a worktree is detected (reviewer finding 5)"
new_repo s16
git worktree add -q "$base/s16.wt" -b change/x
( cd "$base/s16.wt" && echo a > a.txt && git add a.txt && git commit -q -m "feat(x): add a - 003" )
git commit -q --allow-empty -m "docs(roadmap): note - 003"
"$close" sync change/x >/dev/null
expect "status says resolve-sync"              '^next=resolve-sync'         "$("$close" status change/x)"
expect "undo plans merge --abort in the worktree" "s16.wt' merge --abort"   "$("$close" undo change/x)"

echo "19. a rejected ADR of the change still needs its index row updated"
new_repo s19
printf -- '- Status: Proposed\n- Change: x (`openspec/changes/x/design.md`, decision D2)\n' > docs/adr/0001-dropped.md
printf '| ADR | Title | Status |\n|---|---|---|\n| [0001](0001-dropped.md) | Dropped | Proposed |\n' > docs/adr/README.md
git -c core.hooksPath=/dev/null add -A; git -c core.hooksPath=/dev/null commit -q -m "add adr"
git switch -q -c change/x; echo a > a.txt; git add a.txt; git commit -q -m "feat(x): add a - 003"
"$close" merge change/x >/dev/null; fake_archive
sed -i 's/^- Status: Proposed/- Status: Rejected/' docs/adr/0001-dropped.md
expect "file rejected, index row not"          'missing: adr-0001-index\)'   "$("$close" status change/x)"
sed -i 's/| Dropped | Proposed |/| Dropped | Rejected |/' docs/adr/README.md
expect "both rejected: complete"               '^archived=complete'         "$("$close" status change/x)"

echo "17. an owner document in docs/ with an accented name isn't archive output"
new_repo s17
git switch -q -c change/x; echo a > a.txt; git add a.txt; git commit -q -m "feat(x): add a - 003"
"$close" merge change/x >/dev/null
fake_archive; echo "notes" > "docs/niños.md"
expect "it is reported as foreign"             '^archived=foreign'          "$("$close" status change/x)"

echo "18. an ADR whose Change line uses backticks or a comma still belongs to the change"
new_repo s18
printf -- '- Status: Proposed\n- Change: `x`, decision D1\n' > docs/adr/0001-a.md
git -c core.hooksPath=/dev/null add -A; git -c core.hooksPath=/dev/null commit -q -m "add adr"
git switch -q -c change/x; echo a > a.txt; git add a.txt; git commit -q -m "feat(x): add a - 003"
"$close" merge change/x >/dev/null; fake_archive
expect "the Proposed ADR is still missing"     'missing: adr-0001'          "$("$close" status change/x)"

rm -rf "$base" "$base".*
echo; echo "passed $pass, failed $fail"
[ "$fail" -eq 0 ]
