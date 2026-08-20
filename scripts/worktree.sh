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
#   scripts/worktree.sh fix-hero      # new branch off origin/staging
#   scripts/worktree.sh staging       # or an existing branch
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
if [ -z "$name" ]; then
  echo "usage: scripts/worktree.sh <branch>" >&2
  exit 1
fi

root="$(git rev-parse --show-toplevel)"
primary="$(git worktree list --porcelain | awk '/^worktree /{print substr($0,10); exit}')"
dest="$(dirname "$root")/eat-this-worktrees/$name"

if [ -e "$dest" ]; then
  echo "✖ $dest exists already." >&2
  echo "  Use it, or: git worktree remove $dest" >&2
  exit 1
fi

git fetch origin staging --quiet

mkdir -p "$(dirname "$dest")"
if git show-ref --verify --quiet "refs/heads/$name"; then
  git worktree add "$dest" "$name"
else
  git worktree add -b "$name" "$dest" origin/staging
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
echo "  branch:       $(git -C "$dest" rev-parse --abbrev-ref HEAD)"
echo "  node_modules: symlinked from the primary checkout"
echo "  build dirs:   .next / .next-verify are local to this worktree"
echo ""
echo "  cd \"$dest/nextjs\" && npm run dev   # pick a free port"
echo ""
