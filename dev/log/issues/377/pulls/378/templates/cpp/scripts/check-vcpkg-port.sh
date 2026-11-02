#!/usr/bin/env bash
# Round trip of the release vcpkg port, exactly as a vcpkg user gets it:
# package the release with a file:// "GitHub server", let vcpkg download the
# source asset through the rendered port, verify its SHA512, build and install
# it, then build and run the find_package() consumer with the vcpkg toolchain.
#
# Usage: VCPKG_ROOT=/path/to/vcpkg bash scripts/check-vcpkg-port.sh
# (GitHub-hosted Ubuntu and Windows runners ship vcpkg at
# $VCPKG_INSTALLATION_ROOT.)
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
: "${VCPKG_ROOT:?set VCPKG_ROOT to a bootstrapped vcpkg checkout}"

cd "$repo_root"
cpp_root="$(python3 scripts/get_version.py --print cpp_root)"
version="$(python3 scripts/get_version.py --print version)"
tag="$(python3 scripts/get_version.py --print tag)"
GITHUB_SERVER_URL="file://$work/server" GITHUB_REPOSITORY=owner/repo \
  python3 scripts/package_release.py --out-dir "$work/dist" --skip-install-tree
mkdir -p "$work/server/owner/repo/releases/download/$tag"
cp "$work"/dist/*.tar.gz "$work/server/owner/repo/releases/download/$tag/"
mkdir -p "$work/ports"
tar -xzf "$work"/dist/*-vcpkg-port-"$version".tar.gz -C "$work/ports"
port="$(ls "$work/ports")"

# Run vcpkg outside the repository so a vcpkg.json there cannot switch it to
# manifest mode.
(cd "$work" && "$VCPKG_ROOT/vcpkg" install "$port" --classic --overlay-ports="$work/ports" \
  --x-install-root="$work/installed" --x-buildtrees-root="$work/buildtrees" \
  --downloads-root="$work/downloads" --binarysource=clear)
cmake -S "$cpp_root/examples/consumers/find_package" -B "$work/consumer" \
  -DCMAKE_TOOLCHAIN_FILE="$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake" \
  -DVCPKG_INSTALLED_DIR="$work/installed" -DVCPKG_MANIFEST_MODE=OFF
cmake --build "$work/consumer"
ctest --test-dir "$work/consumer" --output-on-failure --no-tests=error
echo "vcpkg release port round trip of $port $version: OK"
