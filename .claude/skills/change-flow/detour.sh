#!/usr/bin/env bash
# Stash handling for the change-flow "Detour to main" (see SKILL.md). Worktrees
# share one stash list, so positions like stash@{0} move when anyone stashes:
# this script works only with the stash's object id.
#
# Usage: detour.sh <command> ...
#   stash   <change-id>      stash all work (untracked included); prints the stash's object id
#   restore <object-id>      apply that stash to the current checkout (keeps it in the list)
#   drop    <object-id>      drop the stash-list entry with that object id, and only that one
#
# Exit codes: 0 done, 1 refused or failed (message on stderr), 2 usage error.

set -u
die() { echo "detour.sh: $*" >&2; exit 1; }
usage() { sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }

[ $# -eq 2 ] || usage
cmd=$1; arg=$2

case "$cmd" in
  stash)
    [ -n "$(git status --porcelain=v1 --untracked-files=all)" ] || die "nothing to stash"
    msg="$arg: detour"
    git stash push -q -u -m "$msg" || die "stash failed"
    oid=$(git rev-parse -q --verify 'stash@{0}') || die "stash not found"
    # Check the entry just made is ours (another worktree could stash at the same moment).
    git log -1 --format=%gs -g 'stash@{0}' | grep -qF "$msg" || die "stash@{0} isn't ours; find '$msg' in git stash list"
    echo "$oid" ;;
  restore)
    git cat-file -e "$arg^{commit}" 2>/dev/null || die "no such stash object: $arg"
    git stash apply -q "$arg" || die "apply had conflicts or failed; resolve, then check with the owner before drop"
    echo "restored $arg (still in the stash list until drop)" ;;
  drop)
    ref=$(git stash list --format='%gd %H' | awk -v id="$arg" '$2==id { print $1; exit }')
    [ -n "$ref" ] || die "no stash-list entry has object id $arg; nothing dropped"
    git stash drop -q "$ref" || die "drop failed"
    echo "dropped $ref ($arg)" ;;
  *) usage ;;
esac
