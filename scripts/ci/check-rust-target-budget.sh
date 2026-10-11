#!/usr/bin/env bash
set -euo pipefail

: "${CARGO_TARGET_DIR:?Set one shared CARGO_TARGET_DIR before building}"
: "${CARGO_TARGET_BUDGET_KIB:=2097152}"
case "$CARGO_TARGET_BUDGET_KIB" in
  ''|*[!0-9]*) echo 'CARGO_TARGET_BUDGET_KIB must be a positive integer' >&2; exit 2 ;;
esac
if [ "$CARGO_TARGET_BUDGET_KIB" -eq 0 ]; then exit 2; fi
if [ ! -d "$CARGO_TARGET_DIR" ]; then exit 0; fi
used=$(du -sk "$CARGO_TARGET_DIR" | cut -f1)
echo "Rust target: ${used} KiB / ${CARGO_TARGET_BUDGET_KIB} KiB"
if [ "$used" -gt "$CARGO_TARGET_BUDGET_KIB" ]; then
  echo 'Rust build budget exceeded; stop builds and explicitly clean target output.' >&2
  exit 1
fi
