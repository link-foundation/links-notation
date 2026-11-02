#!/usr/bin/env bash
# Keep one event-aware policy shared by local regressions and the required gate.
set -euo pipefail
: "${NEEDS_JSON:?NEEDS_JSON is required (pass toJSON(needs))}"
node scripts/pipeline-gate.mjs
