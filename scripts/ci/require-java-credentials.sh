#!/usr/bin/env bash
# Presence checks only: never print tokens, passphrases, or key material.
set -euo pipefail
missing=()
for credential in CENTRAL_USERNAME CENTRAL_TOKEN GPG_PRIVATE_KEY GPG_PASSPHRASE; do
  if [ -z "${!credential:-}" ]; then missing+=("$credential"); fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "::error::Maven Central version is absent and publishing credentials are missing: ${missing[*]}. Follow docs/releases.md; publishing cannot be skipped."
  exit 1
fi
echo 'Maven Central token and signing credentials are configured.'
