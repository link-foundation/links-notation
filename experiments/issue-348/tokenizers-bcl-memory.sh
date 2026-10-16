#!/usr/bin/env bash
# Issue #348: Microsoft.ML.Tokenizers 2.0.0 pulled Microsoft.Bcl.Memory 9.0.4
# (GHSA-73j8-2gch-69rq) into net10.0 builds, which is why
# benchmarks/csharp pinned Microsoft.Bcl.Memory directly. 2.0.1 no longer
# does, so the pin was dropped. Usage: tokenizers-bcl-memory.sh [VERSION]
set -euo pipefail
version=${1:-2.0.1}
project=$(mktemp -d)
cat > "$project/Probe.csproj" <<XML
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.ML.Tokenizers" Version="$version" />
    <PackageReference Include="Microsoft.ML.Tokenizers.Data.O200kBase" Version="$version" />
    <PackageReference Include="Microsoft.ML.Tokenizers.Data.Cl100kBase" Version="$version" />
  </ItemGroup>
</Project>
XML
dotnet restore "$project" -v q >/dev/null
dotnet list "$project" package --include-transitive | grep -i 'Bcl.Memory' || echo "Microsoft.Bcl.Memory: not in the graph"
dotnet list "$project" package --vulnerable --include-transitive | tail -n +3
