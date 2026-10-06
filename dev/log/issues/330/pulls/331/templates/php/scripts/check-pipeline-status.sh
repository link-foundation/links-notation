#!/usr/bin/env bash
# Terminal status gate: turn unsuccessful jobs into a red workflow run.
#
# GitHub reports both timeout-minutes overruns and concurrency supersedes as
# `cancelled`. A cancellation is excused only when the branch moved on AND the
# cancelled job's effective concurrency.cancel-in-progress is literal true.
# Unknown or unreadable policy fails closed (issues #9 and #14).
#
# Environment:
#   NEEDS_JSON       required; `${{ toJSON(needs) }}` from the gate job
#   RUN_SHA          commit this run tests (${{ github.sha }})
#   BRANCH_REF       branch to compare against (${{ github.ref_name }})
#   BRANCH_HEAD_SHA  optional pre-resolved branch head for offline tests
#   WORKFLOW_FILE    optional workflow path; inferred from GITHUB_WORKFLOW_REF
#   GIT_REMOTE       remote used to resolve the branch head (default: origin)
#   PIPELINE_STATUS_VERBOSE=1 prints classification details
set -euo pipefail

: "${NEEDS_JSON:?NEEDS_JSON is required (pass toJSON(needs))}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH_REF="${BRANCH_REF:-main}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
verbose="${PIPELINE_STATUS_VERBOSE:-0}"

trace() { [ "$verbose" = "1" ] && echo "[pipeline-status] $*" >&2 || true; }

select_by_result() {
  # shellcheck disable=SC2016 # PHP source is intentionally single-quoted.
  NEEDS_JSON="$NEEDS_JSON" WANT_RESULT="$1" php -r '
    $needs = json_decode((string) getenv("NEEDS_JSON"), true);
    if (!is_array($needs)) {
        fwrite(STDERR, "check-pipeline-status: NEEDS_JSON is not a JSON object\n");
        exit(2);
    }
    $want = getenv("WANT_RESULT");
    foreach ($needs as $name => $job) {
        $result = is_array($job) ? ($job["result"] ?? null) : null;
        $matches = $want === "cancelled"
            ? $result === "cancelled"
            : !in_array($result, ["success", "skipped", "cancelled"], true);
        if ($matches) {
            echo (string) $name, "\n";
        }
    }
  '
}

join_names() {
  local names="$1" out="" name
  while IFS= read -r name; do
    [ -z "$name" ] && continue
    if [ -z "$out" ]; then out="$name"; else out="$out, $name"; fi
  done <<<"$names"
  printf '%s' "$out"
}

run_is_superseded() {
  local head_sha="${BRANCH_HEAD_SHA:-}"
  if [ -z "${RUN_SHA:-}" ]; then
    echo "check-pipeline-status: RUN_SHA is not set; a cancellation cannot be proven superseded" >&2
    return 1
  fi
  if [ -z "$head_sha" ]; then
    if ! head_sha="$(git ls-remote "$GIT_REMOTE" "refs/heads/${BRANCH_REF}" 2>/dev/null | awk 'NR == 1 { print $1 }')"; then
      head_sha=""
    fi
  fi
  if [ -z "$head_sha" ]; then
    echo "check-pipeline-status: could not resolve refs/heads/${BRANCH_REF}; a cancellation cannot be proven superseded" >&2
    return 1
  fi
  trace "run SHA ${RUN_SHA}; ${BRANCH_REF} head ${head_sha}"
  [ "$RUN_SHA" != "$head_sha" ]
}

resolve_workflow_file() {
  local ref path
  if [ -n "${WORKFLOW_FILE:-}" ]; then
    printf '%s' "$WORKFLOW_FILE"
    return 0
  fi
  ref="${GITHUB_WORKFLOW_REF:-}"
  [ -n "$ref" ] || return 1
  ref="${ref%%@*}"
  path="${ref#*/.github/}"
  [ "$path" != "$ref" ] || return 1
  printf '.github/%s' "$path"
}

# Print <job><TAB><supersede|overrun><TAB><reason> for every cancelled job.
classify_cancellations() {
  local names="$1" superseded="$2" workflow reason name value table
  local -A policy=()

  workflow="$(resolve_workflow_file || true)"
  if [ -z "$workflow" ]; then
    reason="the gate could not identify its workflow (GITHUB_WORKFLOW_REF is unset)"
  elif [ ! -f "$workflow" ]; then
    reason="the gate could not read ${workflow} from this checkout"
  else
    reason=""
    table=""
    if ! table="$(WORKFLOW_FILE="$workflow" JOB_NAMES="$names" php "$SCRIPT_DIR/read-job-cancel-in-progress.php" 2>&1)"; then
      reason="the gate could not read job concurrency from ${workflow}: ${table}"
      table=""
    fi
    while IFS=$'\t' read -r name value; do
      [ -z "$name" ] || policy["$name"]="$value"
    done <<<"$table"
  fi

  while IFS= read -r name; do
    [ -z "$name" ] && continue
    value="${policy[$name]:-unreadable}"
    trace "cancelled ${name}: cancel-in-progress=${value}, superseded=${superseded}"
    if [ "$superseded" != yes ]; then
      printf '%s\t%s\t%s\n' "$name" overrun "the run is still the head of ${BRANCH_REF}, so nothing overtook it"
      continue
    fi
    case "$value" in
      true)
        printf '%s\t%s\t%s\n' "$name" supersede "it sets cancel-in-progress: true, so a supersede can cancel it"
        ;;
      false)
        printf '%s\t%s\t%s\n' "$name" overrun "it sets cancel-in-progress: false, so a supersede queues behind it rather than cancelling it"
        ;;
      none)
        printf '%s\t%s\t%s\n' "$name" overrun "it has no job- or workflow-level concurrency group, so a supersede cannot cancel it"
        ;;
      missing)
        printf '%s\t%s\t%s\n' "$name" overrun "${workflow} declares no job by that name"
        ;;
      *)
        printf '%s\t%s\t%s\n' "$name" overrun "${reason:-its cancel-in-progress value is an expression or otherwise unknown}"
        ;;
    esac
  done <<<"$names"
}

failed_lines="$(select_by_result not-success)"
cancelled_lines="$(select_by_result cancelled)"
failed="$(join_names "$failed_lines")"
cancelled="$(join_names "$cancelled_lines")"

echo "Failed jobs:    ${failed:-<none>}"
echo "Cancelled jobs: ${cancelled:-<none>}"

status=0
if [ -n "$failed" ]; then
  echo "::error title=Pipeline failed::Failing jobs: ${failed}"
  status=1
fi

if [ -n "$cancelled" ]; then
  superseded=no
  run_is_superseded && superseded=yes
  superseded_lines=""
  overrun_lines=""
  while IFS=$'\t' read -r job verdict reason; do
    [ -z "$job" ] && continue
    echo "  ${job}: ${reason}"
    if [ "$verdict" = supersede ]; then
      superseded_lines+="${job}"$'\n'
    else
      overrun_lines+="${job}"$'\n'
    fi
  done < <(classify_cancellations "$cancelled_lines" "$superseded")

  superseded_jobs="$(join_names "$superseded_lines")"
  overrun_jobs="$(join_names "$overrun_lines")"
  if [ -n "$superseded_jobs" ]; then
    echo "::warning title=Cancelled jobs in a superseded run::${superseded_jobs}. The branch moved on and these jobs cancel in progress."
  fi
  if [ -n "$overrun_jobs" ]; then
    echo "::error title=Pipeline has cancelled jobs::${overrun_jobs}. No supersede accounts for these cancellations (see the reasons above); timeout-minutes overruns are reported as cancelled."
    status=1
  fi
fi

[ "$status" -ne 0 ] || echo "All required jobs succeeded or were legitimately skipped."
exit "$status"
