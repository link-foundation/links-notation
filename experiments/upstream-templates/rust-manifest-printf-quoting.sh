#!/usr/bin/env bash
# Reproduces the single-quote bug in
# link-foundation/rust-ai-driven-development-pipeline-template
# .github/workflows/release.yml, step "Create multi-architecture manifest".
#
# The step builds the digest list with
#     mapfile -t digests < <(printf '${DOCKERHUB_IMAGE}@sha256:%s\n' *)
# Single quotes stop the shell expanding ${DOCKERHUB_IMAGE}, so every element is
# the literal text "${DOCKERHUB_IMAGE}@sha256:<digest>" and
# `docker buildx imagetools create` is handed an invalid image reference.
#
# shellcheck flags it as SC2016; actionlint surfaces it only when shellcheck is
# on PATH, which is why nothing in the template's CI has ever reported it.
set -euo pipefail

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cd "$work"
touch abc123 def456

export DOCKERHUB_IMAGE=myorg/myimage

echo "As written in the template:"
mapfile -t digests < <(printf '${DOCKERHUB_IMAGE}@sha256:%s\n' *)
printf '  %s\n' "${digests[@]}"

echo "With double quotes:"
mapfile -t fixed < <(printf "${DOCKERHUB_IMAGE}@sha256:%s\n" *)
printf '  %s\n' "${fixed[@]}"

if [[ ${digests[0]} == '${DOCKERHUB_IMAGE}'* ]]; then
  echo "REPRODUCED: the image name is not expanded."
  exit 0
fi
echo "Not reproduced."
exit 1
