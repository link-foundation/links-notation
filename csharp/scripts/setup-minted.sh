#!/usr/bin/env bash
# Install the upstream LaTeX styles matching the Python tools/requirements.lock.
set -euo pipefail

destination="${1:?Usage: setup-minted.sh DESTINATION}"
mkdir -p "$destination"

fetch_style() {
  local package="$1" reference="$2" source="$3" checksum="$4"
  curl --fail --show-error --location --retry 3 \
    "https://raw.githubusercontent.com/gpoore/$package/$reference/$source" \
    --output "$destination/$package.sty"
  printf '%s  %s\n' "$checksum" "$destination/$package.sty" | sha256sum --check
}

fetch_style minted latex/v3.8.0 latex/minted/minted.sty \
  812de081cda8f4b6c40cb1ce57390d07a86215170c728b51257d274be06ec2c4
fetch_style fvextra v1.14.0 fvextra/fvextra.sty \
  e91f5114fb99355111835093f4f736fa1d4887fafd09910a65db0dd1ac347fab
fetch_style latex2pydata latex/v0.7.0 latex/latex2pydata/latex2pydata.sty \
  b837b21e687da0309c8c155d25eca00ccab5c844a6dcd838de1408a14bd39975
