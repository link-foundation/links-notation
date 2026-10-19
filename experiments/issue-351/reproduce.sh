#!/usr/bin/env bash
# Reproduce issue #351: bundle `import { Parser } from 'links-notation'` for the
# browser with esbuild, against the published package or this working tree.
#
#   bash experiments/issue-351/reproduce.sh            # local js/ package
#   bash experiments/issue-351/reproduce.sh 0.27.0     # published release
#
# 0.27.0 fails with: Could not resolve "events". The fixed package bundles and
# the bundle runs; the script prints whether the output mentions "events".
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
version="${1:-local}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cd "$work"
npm init -y >/dev/null
if [ "$version" = local ]; then
  (cd "$root/js" && bun run build >/dev/null)
  npm pack "$root/js" --pack-destination "$work" >/dev/null 2>&1
  package="$(ls "$work"/links-notation-*.tgz)"
else
  package="links-notation@$version"
fi
npm install --no-audit --no-fund "$package" esbuild@0.28.2 >/dev/null 2>&1

cat > entry.js <<'JS'
import { Parser } from 'links-notation';
console.log(new Parser().parse('(law: text)').map(String));
JS

npx esbuild entry.js --bundle --platform=browser --outfile=bundle.js
node bundle.js
if grep -q '"events"' bundle.js; then
  echo 'bundle imports "events"'
  exit 1
fi
echo 'bundle has no "events" import'
