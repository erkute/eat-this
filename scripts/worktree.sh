#!/bin/sh
#
# One checkout per parallel session.
#
# Two agents in one working copy fight over a single HEAD: a branch switch in
# one yanks the files out from under the other, `git stash` moves the other's
# uncommitted work, and both `next build` runs write into the same
# `.next-verify/`, so files vanish mid-build:
#
#   ENOENT … rename .next-verify/export/500.html → .next-verify/server/pages/500.html
#
# A worktree gives each session its own directory, its own HEAD and — because
# every dist dir is relative to the checkout — its own `.next` and
# `.next-verify`. Nothing else changes: same repo, same remotes, same
# `core.hooksPath`, so the pre-push build still runs.
#
#   scripts/worktree.sh fix-hero        # new branch off origin/staging
#   scripts/worktree.sh hotfix main     # ... or off another base
#   scripts/worktree.sh staging         # or check out an existing branch
#
# The base is only read when the branch does not exist yet. It takes a remote
# branch name ("main"), or anything else git can resolve — a tag, a SHA, a
# local branch.
#
# node_modules and .env.local are symlinked from the primary checkout rather
# than reinstalled — one install stays authoritative. The flip side: `npm
# install` inside a worktree mutates the shared tree. Run installs in the
# primary checkout.
#
# Remove a worktree when the session is done:
#
#   git worktree remove ../eat-this-worktrees/<name>

set -e

name="$1"
base="${2:-staging}"
if [ -z "$name" ]; then
  echo "usage: scripts/worktree.sh <branch> [base]   # base defaults to staging" >&2
  exit 1
fi

# Anchor on the primary checkout, not on `pwd`: run from inside a worktree,
# `git rev-parse --show-toplevel` returns that worktree and the destination
# nests as eat-this-worktrees/eat-this-worktrees/.
primary="$(git worktree list --porcelain | awk '/^worktree /{print substr($0,10); exit}')"
dest="$(dirname "$primary")/eat-this-worktrees/$name"

if [ -e "$dest" ]; then
  echo "✖ $dest exists already." >&2
  echo "  Use it, or: git worktree remove $dest" >&2
  exit 1
fi

mkdir -p "$(dirname "$dest")"
if git show-ref --verify --quiet "refs/heads/$name"; then
  [ -n "$2" ] && echo "note: branch $name exists — base '$2' ignored." >&2
  git worktree add "$dest" "$name"
  start="$name"
else
  # Prefer the remote branch of that name, so `main` means origin/main and not
  # a stale local ref. Anything else git can resolve still works: tag, SHA,
  # local branch.
  git fetch origin "$base" --quiet 2>/dev/null || true
  if git rev-parse --verify --quiet "refs/remotes/origin/$base" >/dev/null; then
    start="origin/$base"
  elif git rev-parse --verify --quiet "$base^{commit}" >/dev/null; then
    start="$base"
  else
    echo "✖ base '$base' is not a branch, tag or commit." >&2
    exit 1
  fi
  git worktree add -b "$name" "$dest" "$start"
fi

# Symlink, not copy: node_modules is ~1 GB and .env.local holds the Sanity
# token. Both stay single-sourced in the primary checkout.
for dir in nextjs studio; do
  [ -d "$primary/$dir/node_modules" ] && ln -s "$primary/$dir/node_modules" "$dest/$dir/node_modules"
done
[ -f "$primary/nextjs/.env.local" ] && ln -s "$primary/nextjs/.env.local" "$dest/nextjs/.env.local"

echo ""
echo "✓ worktree ready:"
echo "    $dest"
echo ""
echo "  branch:       $(git -C "$dest" rev-parse --abbrev-ref HEAD)  (from $start)"
echo "  node_modules: symlinked from the primary checkout"
echo "  build dirs:   .next / .next-verify are local to this worktree"
echo ""
echo "  cd \"$dest/nextjs\" && npm run dev   # pick a free port"
echo ""
