#!/usr/bin/env bash
# Validate the stdlib-built native .nupkg with the real NuGet client: push it
# to a local folder feed and let `dotnet restore` extract it via
# <PackageDownload> (which skips the TFM compatibility check that a native
# package would fail in an SDK-style project), then check that the MSBuild
# targets and the headers are where Visual Studio projects expect them.
#
# Usage: bash scripts/check-nuget-package.sh [PACKAGE.nupkg]
# Without an argument the package is packed with scripts/pack_nuget.py.
# Needs the dotnet SDK (preinstalled on GitHub-hosted runners).
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cd "$repo_root"
if [ "$#" -gt 0 ]; then
  nupkg="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  python3 scripts/pack_nuget.py --out-dir "$work/dist" > "$work/pack.log"
  nupkg="$(sed -n 's/^Output: nupkg=//p' "$work/pack.log")"
fi
# <id>.<version>.nupkg; the version is the last three dot-separated fields.
name="$(basename "$nupkg" .nupkg)"
version="$(printf '%s\n' "$name" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+([-+].*)?$')"
id="${name%."$version"}"

mkdir -p "$work/feed" "$work/project"
dotnet nuget push "$nupkg" --source "$work/feed"
cat > "$work/project/check.csproj" <<XML
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup><TargetFramework>netstandard2.0</TargetFramework><DisableImplicitNuGetFallbackFolder>true</DisableImplicitNuGetFallbackFolder><DisableImplicitFrameworkReferences>true</DisableImplicitFrameworkReferences></PropertyGroup>
  <ItemGroup><PackageDownload Include="$id" Version="[$version]" /></ItemGroup>
</Project>
XML
cat > "$work/project/nuget.config" <<XML
<configuration><packageSources><clear /><add key="local" value="$work/feed" /></packageSources></configuration>
XML
dotnet restore "$work/project/check.csproj" --packages "$work/packages"
extracted="$work/packages/$(printf '%s' "$id" | tr '[:upper:]' '[:lower:]')/$version"
test -f "$extracted/build/native/$id.targets"
find "$extracted/lib/native/include" -type f | grep -q .
echo "NuGet restore of $id $version: OK"
