#!/usr/bin/env bash
# Give a long CI step its own deadline, warning before it expires and exiting
# 124 on an overrun so GitHub records a failure rather than a cancelled job.
#
# The command runs in its own process group. Liveness is read from `ps` rather
# than `kill -0`, which cannot distinguish a missing process from a live one
# the caller lacks permission to signal. Output is captured and incrementally
# relayed so a surviving descendant cannot retain the CI step's stdout pipe.
#
# Usage: run-with-budget-warning.sh SECONDS LABEL COMMAND [ARG...]
# Environment:
#   BUDGET_WARN_RATIO_PERCENT warning threshold percentage (default 70)
#   BUDGET_ENFORCE            false warns without terminating (default true)
#   BUDGET_GRACE_SECONDS      SIGTERM-to-SIGKILL grace (default 15)
#   BUDGET_KILL_SECONDS       wait after SIGKILL (default 5)
#   BUDGET_POLL_SECONDS       polling interval (default 1)
#   BUDGET_HEARTBEAT_SECONDS  verbose heartbeat interval (default 60)
#   BUDGET_CAPTURE_OUTPUT     capture and relay separate streams (default 1)
#   BUDGET_SUDO_KILL          use passwordless sudo for survivors (default 1)
#   BUDGET_STATE_PARENT       private-state parent (RUNNER_TEMP/TMPDIR//tmp)
#   CI_VERBOSE                true enables progress tracing (default false)
set -uo pipefail

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 SECONDS LABEL COMMAND [ARG...]" >&2
  exit 2
fi

budget_seconds="$1"
label="$2"
shift 2

case "$budget_seconds" in
  '' | *[!0-9]*)
    echo "Budget must be a whole number of seconds, got '${budget_seconds}'." >&2
    exit 2
    ;;
esac
[ "$budget_seconds" -gt 0 ] || {
  echo "Budget must be greater than zero seconds." >&2
  exit 2
}

warn_percent="${BUDGET_WARN_PERCENT:-${BUDGET_WARN_RATIO_PERCENT:-70}}"
enforce="${BUDGET_ENFORCE:-true}"
grace_seconds="${BUDGET_GRACE_SECONDS:-15}"
kill_seconds="${BUDGET_KILL_SECONDS:-5}"
poll_seconds="${BUDGET_POLL_SECONDS:-1}"
heartbeat_seconds="${BUDGET_HEARTBEAT_SECONDS:-60}"
capture_output="${BUDGET_CAPTURE_OUTPUT:-1}"
sudo_kill="${BUDGET_SUDO_KILL:-1}"
verbose="${BUDGET_VERBOSE:-${CI_VERBOSE:-false}}"
warn_seconds=$((budget_seconds * warn_percent / 100))
[ "$warn_seconds" -gt 0 ] || warn_seconds=1

case "$poll_seconds" in
  '' | *[!0-9.]* | *.*.* | .)
    echo "BUDGET_POLL_SECONDS must be a positive number, got: ${poll_seconds}" >&2
    exit 2
    ;;
esac

trace() {
  { [ "$verbose" = "1" ] || [ "$verbose" = true ]; } && echo "[budget] $*" >&2 || true
}

state_parent="${BUDGET_STATE_PARENT:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}}"
if ! status_dir="$(mktemp -d "${state_parent%/}/budget-status.XXXXXX")"; then
  echo "Could not create budget control state under ${state_parent}." >&2
  exit 2
fi
status_file="${status_dir}/status"
stdout_file="${status_dir}/stdout"
stderr_file="${status_dir}/stderr"
# shellcheck disable=SC2329 # invoked indirectly by the EXIT trap
cleanup() { rm -rf "${status_dir}"; }
trap cleanup EXIT
trace "control state: ${status_dir}"

if [ "$capture_output" = "1" ]; then
  : >"$stdout_file"
  : >"$stderr_file"
fi
stdout_offset=0
stderr_offset=0

stream_size() {
  local size
  size="$(wc -c <"$1" 2>/dev/null || echo 0)"
  size="${size//[![:digit:]]/}"
  echo "${size:-0}"
}

# Emit the bounded byte range [from, to), so the recorded offset is exact even
# while the command appends concurrently.
emit_range() {
  tail -c "+$(($2 + 1))" "$1" 2>/dev/null | head -c "$(($3 - $2))"
}

relay_output() {
  [ "$capture_output" = "1" ] || return 0
  local size
  size="$(stream_size "$stdout_file")"
  if [ "$size" -gt "$stdout_offset" ]; then
    emit_range "$stdout_file" "$stdout_offset" "$size"
    stdout_offset="$size"
  fi
  size="$(stream_size "$stderr_file")"
  if [ "$size" -gt "$stderr_offset" ]; then
    emit_range "$stderr_file" "$stderr_offset" "$size" >&2
    stderr_offset="$size"
  fi
}

# Job control makes the background wrapper the leader of a new process group.
# The atomic status-file rename is the authoritative completion marker: an
# exited child remains in the process table as a zombie until `wait` reaps it.
set -m
if [ "$capture_output" = "1" ]; then
  {
    "$@"
    command_status=$?
    printf '%s\n' "$command_status" >"${status_file}.partial"
    mv "${status_file}.partial" "$status_file"
  } >"$stdout_file" 2>"$stderr_file" &
else
  {
    "$@"
    command_status=$?
    printf '%s\n' "$command_status" >"${status_file}.partial"
    mv "${status_file}.partial" "$status_file"
  } &
fi
command_pid=$!
set +m

have_ps=false
ps -eo pgid=,pid=,stat= >/dev/null 2>&1 && have_ps=true

group_members() {
  ps -eo pgid=,pid=,stat=,user=,args= 2>/dev/null |
    awk -v group="$command_pid" '$1 == group && $3 !~ /^Z/ {
      pid = $2; user = $4
      $1 = ""; $2 = ""; $3 = ""; $4 = ""
      sub(/^ +/, "")
      printf "%s %s %s\n", pid, user, $0
    }'
}

group_is_populated() {
  if [ "$have_ps" = true ]; then
    [ -n "$(group_members)" ]
  else
    kill -0 -- "-$command_pid" 2>/dev/null
  fi
}

sudo_kill_available=""
can_sudo_kill() {
  [ "$sudo_kill" = "1" ] || return 1
  if [ -z "$sudo_kill_available" ]; then
    if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
      sudo_kill_available=yes
    else
      sudo_kill_available=no
    fi
  fi
  [ "$sudo_kill_available" = yes ]
}

signal_command() {
  local signal="$1"
  kill "-$signal" -- "-$command_pid" 2>/dev/null ||
    kill "-$signal" "$command_pid" 2>/dev/null || true
  if group_is_populated && can_sudo_kill; then
    trace "survivors after SIG${signal}; retrying as root"
    sudo -n kill "-$signal" -- "-$command_pid" 2>/dev/null ||
      sudo -n kill "-$signal" "$command_pid" 2>/dev/null || true
  fi
}

# shellcheck disable=SC2329 # invoked indirectly by the signal traps
forward_cancellation() {
  signal_command TERM
  exit 143
}
trap forward_cancellation INT TERM

command_is_running() {
  [ -f "$status_file" ] && return 1
  group_is_populated
}

wait_while_group_populated() {
  local deadline=$((SECONDS + $1))
  while group_is_populated && [ "$SECONDS" -lt "$deadline" ]; do
    relay_output
    sleep "$poll_seconds"
  done
}

report_survivors() {
  [ "$have_ps" = true ] || return 0
  local survivors
  survivors="$(group_members)"
  [ -n "$survivors" ] || return 0
  echo "::error title=${label} left processes running::${label} could not be terminated. Still running: $(echo "$survivors" | tr '\n' ';')"
  echo "$survivors" >&2
}

terminate_over_budget() {
  echo "::error title=${label} exceeded its execution budget::${label} did not finish within its ${budget_seconds}s budget and was terminated. Shorten the step or raise its budget while keeping it below timeout-minutes."
  signal_command TERM
  # Once a deadline expires, every non-zombie group member matters even if the
  # command root exits and writes its status during the grace window.
  wait_while_group_populated "$grace_seconds"
  if group_is_populated; then
    echo "${label} ignored SIGTERM after ${grace_seconds}s; sending SIGKILL."
    signal_command KILL
    wait_while_group_populated "$kill_seconds"
  fi
  report_survivors
  wait "$command_pid" 2>/dev/null || true
  relay_output
  exit 124
}

echo "Running ${label} with a ${budget_seconds}s budget (warning at ${warn_seconds}s)."
SECONDS=0
warned=false
last_heartbeat=0

while command_is_running; do
  if [ "$warned" = false ] && [ "$SECONDS" -ge "$warn_seconds" ]; then
    warned=true
    echo "::warning title=${label} is approaching its execution budget::${label} has run for ${SECONDS}s of its ${budget_seconds}s budget."
  fi
  if { [ "$verbose" = "1" ] || [ "$verbose" = true ]; } &&
    [ $((SECONDS - last_heartbeat)) -ge "$heartbeat_seconds" ]; then
    last_heartbeat="$SECONDS"
    echo "[budget] ${label} has run for ${SECONDS}s of its ${budget_seconds}s budget." >&2
  fi
  if [ "$enforce" = true ] && [ "$SECONDS" -ge "$budget_seconds" ]; then
    terminate_over_budget
  fi
  relay_output
  sleep "$poll_seconds"
done

wait "$command_pid" 2>/dev/null
wait_status=$?
relay_output
trap - INT TERM

if [ -f "$status_file" ]; then
  status="$(cat "$status_file")"
else
  status="$wait_status"
fi
echo "${label} finished in ${SECONDS}s of its ${budget_seconds}s budget (exit ${status})."
exit "$status"
