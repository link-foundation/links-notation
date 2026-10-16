#!/usr/bin/env bash
# Writes the C++ release asset, links-notation-cpp-VERSION.tar.gz, and its
# .sha256 file into OUTPUT_DIR. publish-cpp.yml uploads exactly these files,
# and cpp.yml builds a consumer from the same archive on every pull request.
#
# Usage: scripts/ci/cpp-release-archive.sh OUTPUT_DIR
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo 'Usage: scripts/ci/cpp-release-archive.sh OUTPUT_DIR' >&2
  exit 2
fi
output_dir=$1
root=$(git rev-parse --show-toplevel)
version=$(tr -d '[:space:]' < "$root/cpp/VERSION")
if [ -z "$version" ]; then
  echo '::error::cpp/VERSION is empty' >&2
  exit 1
fi
asset="links-notation-cpp-$version.tar.gz"
mkdir -p "$output_dir"

# git archive limits a tree to the caller's subdirectory, so `HEAD:cpp` run
# from cpp/ archives cpp/cpp, which is empty. That shipped an empty
# cpp_0.26.0 asset. Running from the top level removes the dependency on the
# caller's directory.
git -C "$root" archive --format=tar.gz --prefix="links-notation-cpp-$version/" \
  --output="$(cd "$output_dir" && pwd)/$asset" HEAD:cpp
# The listing is read in full: with pipefail, `grep -q` would end the pipe
# early and fail the check on tar's SIGPIPE.
listing=$(tar -tzf "$output_dir/$asset")
if ! grep -qxF "links-notation-cpp-$version/CMakeLists.txt" <<< "$listing"; then
  echo "::error::$asset has no CMakeLists.txt" >&2
  exit 1
fi
(cd "$output_dir" && sha256sum "$asset" > "$asset.sha256" && cat "$asset.sha256")
