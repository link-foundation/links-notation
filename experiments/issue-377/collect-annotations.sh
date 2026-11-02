#!/usr/bin/env bash
# Print every check-run annotation (level, job, message) for the given run ids.
# Usage: collect-annotations.sh RUN_ID... (repo from $REPO, default links-notation)
set -euo pipefail
repo="${REPO:-link-foundation/links-notation}"
for run in "$@"; do
  gh api "repos/$repo/actions/runs/$run/jobs?per_page=100" --paginate \
    --jq '.jobs[] | [.id, .name, .conclusion] | @tsv' |
  while IFS=$'\t' read -r job name conclusion; do
    gh api "repos/$repo/check-runs/$job/annotations" --paginate \
      --jq ".[] | [\"$run\", \"$name\", \"$conclusion\", .annotation_level, (.message|gsub(\"\\n\";\" \"))] | @tsv" || true
  done
done
