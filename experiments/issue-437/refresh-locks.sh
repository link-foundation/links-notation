#!/usr/bin/env bash
# Regenerate every committed lockfile at its latest in-range resolution,
# including transitive entries (issue #437). Run from the repository root.
# Requires: npm, bun, uv, composer (or COMPOSER=path/to/composer.phar), cargo, go.
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
UV=${UV:-uv}
COMPOSER=${COMPOSER:-composer}

step() { printf '\n== %s\n' "$*"; }

for lock in $(git ls-files '*package-lock.json'); do
  dir=$(dirname "$lock")
  step "npm $dir"
  (cd "$dir" && npm update --package-lock-only --ignore-scripts --no-audit --no-fund >/dev/null &&
    npm install --package-lock-only --ignore-scripts --no-audit --no-fund >/dev/null)
done

step "bun js"
(cd js && bun update >/dev/null)

for lock in $(git ls-files '*requirements.lock'); do
  cmd=$(sed -n 2p "$lock" | sed 's/^#    //')
  case "$cmd" in
    "uv pip compile"*) step "$lock"; $UV ${cmd#uv } --upgrade --quiet ;;
  esac
done
for lock in $(git ls-files '*uv.lock'); do
  dir=$(dirname "$lock")
  step "uv lock $dir"
  $UV lock --project "$dir" --upgrade --quiet
  req="$dir/requirements.lock"
  if [ -f "$req" ]; then
    cmd=$(sed -n 2p "$req" | sed 's/^#    //')
    $UV ${cmd#uv } --quiet >/dev/null
  fi
done

for lock in $(git ls-files 'composer.lock' '*/composer.lock'); do
  dir=$(dirname "$lock")
  step "composer $dir"
  (cd "$dir" && $COMPOSER update --with-all-dependencies --no-install --no-scripts --no-plugins) || echo "composer update failed in $dir" >&2
done

for lock in $(git ls-files '*Cargo.lock'); do
  dir=$(dirname "$lock")
  step "cargo $dir"
  (cd "$dir" && cargo update --quiet)
done

for mod in $(git ls-files '*go.mod'); do
  dir=$(dirname "$mod")
  step "go $dir"
  (cd "$dir" && GOFLAGS=-mod=mod go get -u ./... >/dev/null 2>&1 || true; go mod tidy >/dev/null 2>&1 || true)
done
