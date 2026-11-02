#!/usr/bin/env bash
# Publish the current version of the C++ project to every configured channel.
# Called by the auto-release and manual-release jobs after
# scripts/version_and_commit.py (or without a bump, to complete a release
# whose publication failed half-way). Order matters:
#
#   1. Check out the release tag when it exists, so a re-run publishes the
#      tagged sources and not whatever main has moved on to.
#   2. Build every asset (scripts/package_release.py --nuget): source
#      archives ("repository as the distribution"), the cmake --install tree,
#      the vcpkg overlay port, the native .nupkg and SHA256SUMS.
#   3. NuGet (NUGET_PUBLISH=true, skipped when NUGET_PUBLISHED=true).
#   4. Conan (CONAN_REMOTE_URL set): conan create, then conan upload.
#   5. The GitHub release with every asset -- last, because
#      scripts/check_release_needed.py treats an existing GitHub release as
#      "this version is complete". A failure in 3 or 4 therefore leaves the
#      release incomplete and the next push to main retries it.
#
# Environment:
#   GITHUB_REPOSITORY, GH_TOKEN         GitHub release (gh CLI)
#   NUGET_PUBLISH, NUGET_API_KEY        NuGet push (OIDC output or secret fallback);
#                                      NUGET_SOURCE overrides nuget.org
#   NUGET_PUBLISHED                     true: this version is already on NuGet
#   CONAN_REMOTE_URL, CONAN_LOGIN_USERNAME, CONAN_PASSWORD
#   CONAN_REMOTE_NAME                   name of the Conan remote (release)
#   RELEASE_DRY_RUN                     true: build the assets, print the
#                                       publish commands instead of running them
#   RELEASE_OUT_DIR                     asset directory (dist)
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

dry_run="${RELEASE_DRY_RUN:-false}"
out_dir="${RELEASE_OUT_DIR:-dist}"
nuget_source="${NUGET_SOURCE:-https://api.nuget.org/v3/index.json}"
conan_remote="${CONAN_REMOTE_NAME:-release}"

# Print a command, with the NuGet API key masked; run it unless this is a
# dry run. The Conan password is read by conan itself from CONAN_PASSWORD and
# never appears on a command line.
publish() {
  local shown="$*"
  if [ -n "${NUGET_API_KEY:-}" ]; then
    shown="${shown//"$NUGET_API_KEY"/***}"
  fi
  printf '+ %s\n' "$shown"
  if [ "$dry_run" != true ]; then
    "$@"
  fi
}

cpp_root="$(python3 scripts/get_version.py --print cpp_root)"
version="$(python3 scripts/get_version.py --print version)"
tag="$(python3 scripts/get_version.py --print tag)"
package="$(python3 scripts/get_version.py --print package_name)"

if git rev-parse -q --verify "refs/tags/${tag}^{commit}" >/dev/null; then
  if [ "$(git rev-parse "${tag}^{commit}")" != "$(git rev-parse HEAD)" ]; then
    echo "Checking out ${tag} to publish the tagged sources"
    git checkout -q --detach "$tag"
  fi
fi
target="$(git rev-parse HEAD)"
echo "Publishing ${package} ${version} (${tag}) from ${target}"

rm -rf "$out_dir"
python3 scripts/package_release.py --out-dir "$out_dir" --version "$version" --nuget
nupkg="$(find "$out_dir" -maxdepth 1 -name '*.nupkg' | head -n 1)"

if [ "${NUGET_PUBLISH:-false}" = true ]; then
  if [ "${NUGET_PUBLISHED:-false}" = true ]; then
    echo "NuGet: ${version} is already published"
  elif [ -z "${NUGET_API_KEY:-}" ] && [ "$dry_run" != true ]; then
    echo "::error title=NuGet publish::NUGET_PUBLISH is true but NUGET_API_KEY is empty -- configure trusted publishing with NUGET_USER or the NUGET_API_KEY secret"
    exit 1
  else
    # --skip-duplicate turns a re-run after a partial release into a no-op.
    publish dotnet nuget push "$nupkg" --source "$nuget_source" \
      --api-key "${NUGET_API_KEY:-}" --skip-duplicate
  fi
else
  echo "NuGet: publishing disabled (set the NUGET_PUBLISH variable to true)"
fi

if [ -n "${CONAN_REMOTE_URL:-}" ]; then
  publish conan profile detect --force
  publish conan create "$cpp_root" -s compiler.cppstd=20 --build=missing
  publish conan remote add "$conan_remote" "$CONAN_REMOTE_URL" --force
  # `remote auth` is the CI form of `remote login`: it takes the credentials
  # from CONAN_LOGIN_USERNAME and CONAN_PASSWORD; --strict fails on bad ones.
  publish conan remote auth "$conan_remote" --force --strict
  # The recipe's name, which may differ from the CMake project name.
  conan_name="$(python3 scripts/get_version.py --print conan_name)"
  publish conan upload "${conan_name}/${version}" --remote "$conan_remote" --confirm
else
  echo "Conan: upload disabled (set the CONAN_REMOTE_URL variable)"
fi

release_args=(--version "$version" --target "$target" --assets-dir "$out_dir")
if [ "$dry_run" = true ]; then
  release_args+=(--dry-run)
fi
python3 scripts/create_github_release.py "${release_args[@]}"
