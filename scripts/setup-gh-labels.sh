#!/usr/bin/env bash
set -euo pipefail

# One-shot: create the label palette for the eat-this repo.
# Idempotent — gh label create errors on duplicate, the || true swallows it.
#
# Usage: ./scripts/setup-gh-labels.sh

create_label() {
  local name="$1"
  local color="$2"
  local desc="$3"
  gh label create "$name" --color "$color" --description "$desc" 2>/dev/null || \
    gh label edit "$name" --color "$color" --description "$desc"
}

# Domain labels
create_label migration  "8b5cf6" "Guest+20 rebuild"
create_label seo        "0e7afe" "SEO + sitemap + metadata"
create_label voice      "16a34a" "Restaurant description voice rewrites"
create_label bug        "dc2626" "Defects"
create_label infra      "6b7280" "Hosting, secrets, CI"
create_label design     "ec4899" "Visual/layout"
create_label content    "eab308" "Sanity data"
create_label chore      "9ca3af" "Cleanups"
create_label epic       "facc15" "Roadmap-level umbrella issue"

# Priority labels
create_label p0         "dc2626" "Blocker — now"
create_label p1         "ea580c" "This week"
create_label p2         "eab308" "This month"

echo "Labels created/updated."
