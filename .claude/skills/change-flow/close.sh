#!/usr/bin/env bash
# Deterministic Git steps of the change-flow `close` action (see SKILL.md).
# The agent runs these, asks the owner where SKILL.md says so, and runs the
# OpenSpec workflows (/opsx:verify, /opsx:archive) itself; this script never
# pushes, never forces, and never discards work it can't prove is its own.
#
# Usage: close.sh <command> <branch> [options]
#   status   <branch> [--published]   print the facts and the next step
#   drop-release <branch>             remove an unmerged release (written or committed)
#   sync     <branch>                 merge main into the branch, without committing
#   conclude-sync <branch>            commit a finished sync merge with Git's message
#   abort-sync <branch>               abort a sync merge or rebase in progress
#   release  <branch> <level> <task-code> [--scope <scope>]
#   merge    <branch>                 merge --no-ff into main, in the main checkout
#   show-archive <branch>             show the uncommitted archive output in full, new files included
#   undo-archive <branch> [--run]     discard only the uncommitted archive output (keeps merge and release)
#   archive-commit <branch> <task-code>
#   tag      <branch> <task-code>
#   cleanup  <branch>
#   undo     <branch> [--run]         print (or, with --run, apply) the undo for this state
#
# <branch> is change/<id> for an OpenSpec change, or a fix/, chore/, docs/,
# build/ or ci/ branch. Exit codes: 0 done, 1 refused or failed (message on
# stderr), 2 usage error.

set -u

die()  { echo "close.sh: $*" >&2; exit 1; }
usage() { sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }

[ $# -ge 2 ] || usage
cmd=$1; branch=$2; shift 2

git rev-parse --git-dir >/dev/null 2>&1 || die "not inside a Git repository"

case "$branch" in
  change/*) kind=change; id=${branch#change/} ;;
  fix/*|chore/*|docs/*|build/*|ci/*) kind=branch; id=${branch#*/} ;;
  *) die "unsupported branch name: $branch" ;;
esac

release_re='^chore\(.*\): release v[0-9]+\.[0-9]+\.[0-9]+ - [0-9]+$'

# --- where things are checked out --------------------------------------

# Path of the worktree that has refs/heads/<name> checked out, or empty.
checkout_of() {
  git worktree list --porcelain | awk -v ref="refs/heads/$1" '
    /^worktree /{ path=substr($0,10) } $0=="branch " ref { print path; exit }'
}

main_co=$(checkout_of main)
branch_co=$(checkout_of "$branch")
# Without a worktree the main checkout switches between main and the branch.
if [ -z "$main_co" ] && [ -n "$branch_co" ]; then
  first=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
  [ "$first" = "$branch_co" ] && main_co=$branch_co
fi
top=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
[ -n "$main_co" ] || main_co=$top

branch_exists() { git show-ref --verify --quiet "refs/heads/$branch"; }

in_progress() { # <checkout> -> merge | rebase | none
  local gd; gd=$(git -C "$1" rev-parse --absolute-git-dir)
  if [ -f "$gd/MERGE_HEAD" ]; then echo merge
  elif [ -d "$gd/rebase-merge" ] || [ -d "$gd/rebase-apply" ]; then echo rebase
  else echo none; fi
}

dirty_files() { git -C "$1" status --porcelain=v1 --untracked-files=all; }

# --- evidence ------------------------------------------------------------

# The merge commit Git wrote on main's first-parent history for this branch.
# A reused branch name only counts when that merge brought in the current tip.
find_merge() {
  local m
  m=$(git log main --first-parent --merges --format='%H' \
        --grep="^Merge branch '$branch'\$" -n 1)
  [ -n "$m" ] || return 0
  if branch_exists; then
    [ "$(git rev-parse "$m^2")" = "$(git rev-parse "$branch")" ] && echo "$m"
  else
    echo "$m"
  fi
}

# The release commit among this branch's own commits: before the merge,
# main..branch; after it, what the merge brought in.
find_release() { # <merge or empty>
  if [ -n "$1" ]; then
    git log "$1^1..$1^2" -E --grep="$release_re" --format='%H' -n 1
  elif branch_exists; then
    git log "main..$branch" -E --grep="$release_re" --format='%H' -n 1
  fi
}

version_of_commit() { git log -1 --format=%s "$1" | sed -E 's/.*release v([0-9.]+) - .*/\1/'; }

json_version() { node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).version||"")'; }

# An uncommitted version bump in the branch's checkout: only package.json
# (and package-lock.json) changed, and the version differs from HEAD's.
release_written() {
  [ -n "$branch_co" ] || return 1
  local files other head_v work_v
  files=$(git -C "$branch_co" status --porcelain=v1 --untracked-files=all | cut -c4-)
  [ -n "$files" ] || return 1
  other=$(printf '%s\n' "$files" | grep -Ev '^(package\.json|package-lock\.json)$')
  [ -z "$other" ] || return 1
  printf '%s\n' "$files" | grep -qx 'package.json' || return 1
  head_v=$(git -C "$branch_co" show HEAD:package.json 2>/dev/null | json_version)
  work_v=$(json_version < "$branch_co/package.json")
  [ -n "$work_v" ] && [ "$work_v" != "$head_v" ]
}

find_archive() { # <merge>
  [ "$kind" = change ] || return 0
  git log "$1..main" --first-parent --format='%H' \
    --grep="^docs($id): archive change" -n 1
}

# What archiving still has to write: the change folder moved, the roadmap
# status updated, and every ADR of this change accepted. Empty when done.
archive_missing() {
  local miss= f
  if [ -d "$main_co/openspec/changes/$id" ] || ! ls -d "$main_co"/openspec/changes/archive/*-"$id" >/dev/null 2>&1; then
    miss="$miss folder-not-moved"
  fi
  [ -n "$(git -C "$main_co" status --porcelain=v1 -- docs/roadmap.md)" ] || miss="$miss roadmap-status"
  for f in "$main_co"/docs/adr/[0-9]*.md; do
    [ -f "$f" ] || continue
    grep -Eq "^- Change: $id( |\$)" "$f" && grep -q '^- Status: Proposed' "$f" && miss="$miss adr-$(basename "$f" .md)"
  done
  echo "${miss# }"
}

# none | complete | partial | foreign  (uncommitted archive output on main)
archive_written_state() {
  local files foreign
  files=$(dirty_files "$main_co" | cut -c4-)
  [ -n "$files" ] || { echo none; return; }
  foreign=$(printf '%s\n' "$files" | grep -Ev '^(openspec/|docs/adr/|docs/roadmap\.md$|"openspec/|"docs/)')
  [ -z "$foreign" ] || { echo foreign; return; }
  [ -z "$(archive_missing)" ] && echo complete || echo partial
}

# yes | no | unknown: is any of the given commits or the tag on a remote?
published() { # <tag or -> <commit>...
  local tag=$1; shift
  local remotes r c out
  remotes=$(git remote)
  [ -n "$remotes" ] || { echo no; return; }
  git fetch --all --quiet >/dev/null 2>&1 || { echo unknown; return; }
  for c in "$@"; do
    [ -n "$c" ] || continue
    [ -n "$(git branch -r --contains "$c" 2>/dev/null)" ] && { echo yes; return; }
  done
  if [ "$tag" != - ]; then
    for r in $remotes; do
      out=$(git ls-remote --tags "$r" "refs/tags/$tag" 2>/dev/null) || { echo unknown; return; }
      [ -n "$out" ] && { echo yes; return; }
    done
  fi
  echo no
}

collect() {
  merge=$(find_merge)
  release=$(find_release "$merge")
  version=; [ -n "$release" ] && version=$(version_of_commit "$release")
  rel_written=no; release_written && rel_written=yes
  rel_position=none
  if [ -n "$release" ] && [ -z "$merge" ]; then
    [ "$release" = "$(git rev-parse "$branch")" ] && rel_position=tip || rel_position=buried
  fi
  archive=; arch_state=na
  if [ "$kind" = change ] && [ -n "$merge" ]; then
    archive=$(find_archive "$merge")
    [ -n "$archive" ] && arch_state=committed || arch_state=$(archive_written_state)
  fi
  tag_state=na; tag_target=
  if [ -n "$version" ]; then
    if [ "$kind" = change ]; then tag_target=$archive; else tag_target=$merge; fi
    if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
      if [ -n "$tag_target" ] && [ "$(git rev-parse "v$version^{commit}")" = "$tag_target" ]; then
        tag_state=yes
      else
        tag_state=conflict
      fi
    else
      tag_state=no
    fi
  fi
  branch_ip=none; [ -n "$branch_co" ] && branch_ip=$(in_progress "$branch_co")
  main_ip=$(in_progress "$main_co")
  main_on=$(git -C "$main_co" branch --show-current)
}

next_step() {
  if [ -n "$branch_co" ] && [ "$branch_ip" != none ]; then
    echo "resolve-sync: a $branch_ip is in progress in $branch_co; conclude-sync or abort-sync"; return
  fi
  if [ "$main_ip" != none ] && [ "$main_on" = main ]; then
    echo "resolve-merge: a merge is in progress on main; finish it or undo"; return
  fi
  if [ -z "$merge" ]; then
    if [ "$rel_written" = yes ] || [ "$rel_position" = tip ]; then
      echo "drop-release: an unmerged release exists; drop it, then sync, check and ask again"; return
    fi
    [ "$rel_position" = buried ] && { echo "stop: the release commit is not the branch tip; report to the owner"; return; }
    branch_exists || { echo "stop: $branch doesn't exist and isn't merged"; return; }
    echo "sync: then checks, the owner's approval, release (if any) and merge"; return
  fi
  if [ "$kind" = change ]; then
    case "$arch_state" in
      none)      echo "archive: run /opsx:archive $id in the main checkout, then archive-commit"; return ;;
      complete)  echo "archive-commit: review the staged archive output, then commit it"; return ;;
      partial)   echo "undo-archive: the archive is partly written; show-archive, then undo-archive (keeps the merge and release), then archive again"; return ;;
      foreign)   echo "stop: the main checkout has changes that aren't archive output"; return ;;
    esac
  fi
  case "$tag_state" in
    no)       echo "tag"; return ;;
    conflict) echo "stop: tag v$version exists but points elsewhere"; return ;;
  esac
  if branch_exists || [ -n "$branch_co" ]; then echo "cleanup"; return; fi
  echo "done"
}

print_status() {
  collect
  echo "branch=$branch kind=$kind"
  echo "main_checkout=$main_co (on ${main_on:-detached}, in progress: $main_ip)"
  echo "branch_checkout=${branch_co:-none} (in progress: $branch_ip)"
  echo "branch_exists=$(branch_exists && echo yes || echo no)"
  echo "merged=$([ -n "$merge" ] && echo "yes $merge" || echo no)"
  echo "released=$([ -n "$release" ] && echo "yes v$version $release ($rel_position)" || echo no)"
  echo "release_written=$rel_written"
  echo "archived=$arch_state${archive:+ $archive}$([ "$arch_state" = partial ] && echo " (missing: $(archive_missing))")"
  echo "tagged=$tag_state"
  if [ "${1:-}" = --published ]; then
    echo "published=$(published "${version:+v$version}${version:--}" "$release" "$merge" "$archive")"
  fi
  echo "next=$(next_step)"
}

# The archive output paths that Git knows (in HEAD, the index or the tree):
# a pathspec that matches nothing makes the whole command fail.
archive_paths() {
  local p out=
  for p in openspec/ docs/adr/ docs/roadmap.md; do
    if git -C "$main_co" cat-file -e "HEAD:${p%/}" 2>/dev/null \
       || [ -n "$(git -C "$main_co" ls-files --cached --others --exclude-standard -- "$p")" ]; then
      out="$out $p"
    fi
  done
  echo "$out"
}

# Full diff of the uncommitted archive output, new files included, using a
# temporary index so the real one is never touched.
show_archive_output() {
  local tmp; tmp=$(mktemp)
  # shellcheck disable=SC2046
  GIT_INDEX_FILE=$tmp git -C "$main_co" read-tree HEAD &&
    GIT_INDEX_FILE=$tmp git -C "$main_co" add -A -- $(archive_paths) &&
    GIT_INDEX_FILE=$tmp git -C "$main_co" diff --cached -M HEAD
  rm -f "$tmp"
}

# Discard the uncommitted archive output: restore tracked paths from HEAD
# (index and tree), then delete the untracked files it created, by name.
restore_archive_output() {
  local ap; ap=$(archive_paths)
  # shellcheck disable=SC2086
  git -C "$main_co" restore --source=HEAD --staged --worktree -- $ap || return 1
  # shellcheck disable=SC2086
  git -C "$main_co" ls-files -z --others --exclude-standard -- $ap |
    (cd "$main_co" && xargs -0 -r rm -f --)
}

need_clean() { [ -z "$(dirty_files "$1")" ] || die "$2 has uncommitted changes"; }

# --- commands ------------------------------------------------------------

case "$cmd" in
  status) print_status "${1:-}" ;;

  drop-release)
    collect
    [ -z "$merge" ] || die "already merged: undo the merge first (undo)"
    if [ "$rel_written" = yes ]; then
      paths=package.json
      git -C "$branch_co" ls-files --error-unmatch package-lock.json >/dev/null 2>&1 && paths="$paths package-lock.json"
      # shellcheck disable=SC2086
      git -C "$branch_co" restore --source=HEAD --staged --worktree -- $paths || die "restore failed"
      echo "dropped the uncommitted release"
    elif [ "$rel_position" = tip ]; then
      [ "$(published - "$release")" = no ] || die "the release commit may be published; not dropping it"
      if [ -n "$branch_co" ]; then
        git -C "$branch_co" reset --keep "$release^" || die "reset refused"
      else
        git branch -f "$branch" "$release^" || die "branch -f failed"
      fi
      echo "dropped release commit $release (v$version)"
    elif [ "$rel_position" = buried ]; then
      die "the release commit isn't the branch tip; report to the owner"
    else
      echo "no unmerged release"
    fi ;;

  sync)
    [ -n "$branch_co" ] || die "$branch isn't checked out anywhere"
    collect
    [ "$rel_written" = no ] && [ "$rel_position" != tip ] || die "drop the release first (drop-release)"
    need_clean "$branch_co" "the branch checkout"
    out=$(git -C "$branch_co" merge --no-commit --no-ff main 2>&1); rc=$?
    if git -C "$branch_co" rev-parse -q --verify MERGE_HEAD >/dev/null; then
      if [ -n "$(git -C "$branch_co" diff --name-only --diff-filter=U)" ]; then
        echo "conflicts:"; git -C "$branch_co" diff --name-only --diff-filter=U | sed 's/^/  /'
        exit 1
      fi
      echo "merge-staged: review it (git -C $branch_co diff --cached --stat), then conclude-sync"
    elif [ $rc -eq 0 ]; then
      echo "up-to-date"
    else
      echo "$out" >&2; die "sync failed"
    fi ;;

  conclude-sync)
    [ -n "$branch_co" ] || die "$branch isn't checked out anywhere"
    git -C "$branch_co" rev-parse -q --verify MERGE_HEAD >/dev/null || die "no sync merge in progress"
    [ -z "$(git -C "$branch_co" diff --name-only --diff-filter=U)" ] || die "unresolved conflicts remain"
    git -C "$branch_co" commit --no-edit -q || die "commit failed"
    echo "sync merge committed: $(git -C "$branch_co" log -1 --format='%h %s')" ;;

  abort-sync)
    [ -n "$branch_co" ] || die "$branch isn't checked out anywhere"
    case "$(in_progress "$branch_co")" in
      merge)  git -C "$branch_co" merge --abort && echo "sync merge aborted" ;;
      rebase) git -C "$branch_co" rebase --abort && echo "rebase aborted" ;;
      *) echo "nothing in progress" ;;
    esac ;;

  release)
    level=${1:-}; code=${2:-}; shift 2 2>/dev/null || true
    scope=$id
    [ "$kind" = change ] || scope=
    while [ $# -gt 0 ]; do case "$1" in --scope) scope=$2; shift 2 ;; *) usage ;; esac; done
    case "$level" in major|minor|patch) ;; *) die "level must be major, minor or patch" ;; esac
    echo "$code" | grep -Eq '^[0-9]+$' || die "task code must be digits"
    [ -n "$scope" ] || die "--scope is required outside an OpenSpec change"
    [ -n "$branch_co" ] || die "$branch isn't checked out anywhere"
    collect
    [ -z "$merge" ] || die "already merged"
    [ -z "$release" ] && [ "$rel_written" = no ] || die "a release already exists; drop-release first"
    [ -f "$branch_co/package.json" ] || die "no package.json: nothing to release"
    need_clean "$branch_co" "the branch checkout"
    new=$(cd "$branch_co" && npm version "$level" --no-git-tag-version 2>/dev/null | tail -1) || die "npm version failed"
    v=${new#v}
    if git rev-parse -q --verify "refs/tags/v$v" >/dev/null; then
      "$0" drop-release "$branch" >/dev/null
      die "tag v$v already exists; release not made"
    fi
    paths=package.json
    [ -f "$branch_co/package-lock.json" ] && paths="$paths package-lock.json"
    # shellcheck disable=SC2086
    git -C "$branch_co" add -- $paths && \
      git -C "$branch_co" commit -q -m "chore($scope): release v$v - $code" || die "release commit failed (the bump is left written; drop-release undoes it)"
    echo "released v$v: $(git -C "$branch_co" log -1 --format='%h %s')" ;;

  merge)
    collect
    [ -z "$merge" ] || { echo "already merged: $merge"; exit 0; }
    if [ "$main_on" != main ]; then
      [ "$main_on" = "$branch" ] || die "the main checkout is on ${main_on:-detached}, not main"
      need_clean "$main_co" "the checkout"
      git -C "$main_co" switch -q main || die "switch to main failed"
    fi
    [ "$(git -C "$main_co" branch --show-current)" = main ] || die "the main checkout isn't on main"
    need_clean "$main_co" "the main checkout"
    git -C "$main_co" merge -q --no-ff --no-edit "$branch" || die "merge failed or has conflicts; resolve or undo"
    echo "merged: $(git -C "$main_co" log -1 --format='%h %s')" ;;

  show-archive)
    [ "$kind" = change ] || die "only OpenSpec changes are archived"
    collect
    case "$arch_state" in complete|partial) show_archive_output ;; *) echo "no uncommitted archive output (archived=$arch_state)" ;; esac ;;

  undo-archive)
    [ "$kind" = change ] || die "only OpenSpec changes are archived"
    collect
    case "$arch_state" in
      complete|partial) ;;
      foreign) die "the main checkout has changes that aren't archive output; not touching them" ;;
      *) echo "no uncommitted archive output (archived=$arch_state)"; exit 0 ;;
    esac
    if [ "${1:-}" != --run ]; then
      echo "This discards the uncommitted archive output on main and keeps the merge and the release."
      echo "Show the owner: $0 show-archive '$branch'"
      echo "Then, after the owner's yes: $0 undo-archive '$branch' --run"
      exit 0
    fi
    restore_archive_output || die "restore failed"
    echo "archive output discarded; status now:"; "$0" status "$branch" ;;

  archive-commit)
    code=${1:-}
    [ "$kind" = change ] || die "only OpenSpec changes are archived"
    echo "$code" | grep -Eq '^[0-9]+$' || die "task code must be digits"
    collect
    [ "$arch_state" = complete ] || die "archive state is '$arch_state', not complete"
    # shellcheck disable=SC2046
    git -C "$main_co" add -A -- $(archive_paths) || die "staging the archive output failed"
    git -C "$main_co" commit -q -m "docs($id): archive change and sync specs - $code" || die "archive commit failed"
    echo "archived: $(git -C "$main_co" log -1 --format='%h %s')" ;;

  tag)
    code=${1:-}
    echo "$code" | grep -Eq '^[0-9]+$' || die "task code must be digits"
    collect
    [ -n "$version" ] || die "no release: nothing to tag"
    [ -n "$tag_target" ] || die "nothing to tag yet (not merged or not archived)"
    [ "$tag_state" = no ] || { [ "$tag_state" = yes ] && { echo "already tagged"; exit 0; }; die "tag v$version exists but points elsewhere"; }
    name=$branch; [ "$kind" = change ] && name=$id
    git tag -a "v$version" -m "$name - $code" "$tag_target" || die "tag failed"
    [ "$(git rev-parse "v$version^{commit}")" = "$tag_target" ] || die "tag check failed"
    echo "tagged v$version on $tag_target" ;;

  cleanup)
    collect
    [ -n "$merge" ] || die "not merged: nothing to clean up"
    [ "$kind" != change ] || [ "$arch_state" = committed ] || die "not archived yet"
    [ -z "$version" ] || [ "$tag_state" = yes ] || die "released but not tagged yet"
    if [ -n "$branch_co" ] && [ "$branch_co" != "$main_co" ]; then
      git worktree remove "$branch_co" || die "git refused to remove $branch_co (untracked or modified files); not forcing it"
    fi
    if branch_exists; then git branch -d "$branch" || die "branch -d refused"; fi
    echo "cleaned up" ;;

  undo)
    run=no; [ "${1:-}" = --run ] && run=yes
    collect
    steps=()
    pub=$(published "${version:+v$version}${version:--}" "$release" "$merge" "$archive")
    [ "$pub" = no ] || die "publication is '$pub': nothing will be undone; report the state to the owner"
    if [ -n "$merge" ]; then
      # Every commit a reset of main would remove must be this close's own.
      own="$merge${archive:+ $archive}"
      for c in $(git rev-list --first-parent "$merge^1..main"); do
        case " $own " in *" $c "*) ;; *) die "main has commit $c after the merge that isn't this close's; not resetting" ;; esac
      done
      branch_exists || steps+=("git branch '$branch' $merge^2")
      [ "$tag_state" = yes ] && steps+=("git tag -d v$version")
      if [ "$arch_state" = complete ] || [ "$arch_state" = partial ]; then
        steps+=("$0 undo-archive '$branch' --run")
      fi
      [ "$arch_state" = foreign ] && die "the main checkout has changes that aren't archive output; not touching them"
      steps+=("git -C '$main_co' reset --keep $merge^1")
    else
      [ "$main_on" = main ] && [ "$main_ip" != none ] && steps+=("git -C '$main_co' merge --abort")
      [ "$branch_ip" = merge ] && steps+=("git -C '$branch_co' merge --abort")
      [ "$branch_ip" = rebase ] && steps+=("git -C '$branch_co' rebase --abort")
    fi
    if [ "$rel_written" = yes ] || [ -n "$release" ]; then
      steps+=("$0 drop-release '$branch'   # after the steps above")
    fi
    [ ${#steps[@]} -gt 0 ] || { echo "nothing to undo"; exit 0; }
    if [ "$run" = no ]; then
      echo "This undoes the whole close: merge, archive, tag and release. To discard only a partly written archive, use undo-archive."
      if [ "$arch_state" = complete ] || [ "$arch_state" = partial ]; then
        echo "Before running, show the owner the archive output it discards: $0 show-archive '$branch'"
      fi
      echo "Undo, in order:"; printf '  %s\n' "${steps[@]}"
      echo "Run with --run only after the owner's yes."
      exit 0
    fi
    for s in "${steps[@]}"; do
      s=${s%%   #*}
      echo "+ $s"; eval "$s" || die "step failed: $s"
    done
    echo "undone; status now:"; "$0" status "$branch" ;;

  *) usage ;;
esac
