#!/bin/sh
# Native mode must never silently skip actionlint's optional integrations.
set -eu
for tool in actionlint shellcheck pyflakes; do
  command -v "$tool" >/dev/null || { echo "Required lint integration missing: $tool" >&2; exit 1; }
done
# shellcheck disable=SC2016 # This is deliberately invalid input for the probe.
if printf '%s\n' '#!/bin/sh' 'echo $UNSET_VARIABLE' | shellcheck - >/dev/null 2>&1; then
  echo 'ShellCheck regression: expected finding was missed' >&2
  exit 1
fi
if printf '%s\n' 'undefined_variable' | pyflakes >/dev/null 2>&1; then
  echo 'Pyflakes regression: expected finding was missed' >&2
  exit 1
fi
sh experiments/issue-82/verify-lint-integrations.sh
actionlint -color -ignore 'unexpected key .queue. for .concurrency. section'
find scripts experiments -type f -name '*.sh' -exec shellcheck '{}' +
