# Toolchains, base images and embedded tools

Versions were checked against the linked upstream sources on 2026-11-18 UTC. The exact registry result for each package declaration is in [dependency tables](dependency-tables.md). Compatibility lanes remain distinct from the primary toolchain used by each port.

| Tool or image | Before | After | Current upstream | Decision and source |
| --- | --- | --- | --- | --- |
| Node.js | 26.13.1 | 26.13.1 | 26.13.1 | Current Node distribution, including Kotlin JS and Wasm. [Node index](https://nodejs.org/dist/index.json) |
| Bun | 1.4.4 | 1.4.4 | 1.4.4 | Current CI build and lock resolver. [Bun releases](https://github.com/oven-sh/bun/releases) |
| npm | 12.2.2 | 12.2.3 | 12.2.3 | Aligned explicit installer selections and regenerated npm locks. [Registry](https://registry.npmjs.org/npm/latest) |
| Yarn Classic | 1.22.22 | 1.22.22 | 1.22.22 | Current Classic release used by the Kotlin plugin's lock format. Modern Yarn uses a different project model. [Yarn Classic registry](https://registry.npmjs.org/yarn/latest) |
| Rust | stable | stable, verified 1.100.0 | 1.100.0 | Published minimum and feature checks remain in CI. [Stable distribution](https://static.rust-lang.org/dist/channel-rust-stable.toml) |
| Cargo audit | 0.23.0 | 0.23.0 | 0.23.0 | Current native tool. [RustSec releases](https://github.com/rustsec/rustsec/releases/tag/cargo-audit/v0.23.0) |
| Python | 3.15.2 | 3.15.2 | 3.15.2 | CI also tests supported 3.11 compatibility. [Python release files](https://www.python.org/ftp/python/) |
| uv | 0.13.8 | 0.13.9 | 0.13.9 | Refreshed universal and hashed locks. [PyPI](https://pypi.org/project/uv/0.13.9/) |
| PHP | 8.5.12 | 8.5.12 | 8.5.12 | CI also tests the package's published 8.4 minimum. [PHP release index](https://www.php.net/releases/index.php?json&version=8&max=1) |
| Composer | v2 | v2, verified 2.11.2 | 2.11.2 | Existing setup action tracks the current Composer 2 release. [Composer versions](https://getcomposer.org/versions) |
| Temurin | 27.0.1, runner cache preferred | 27.0.1 with current platform build resolved by setup-java | Linux x64 27.0.1.1+4, macOS arm64 27.0.1.0.2+1 | The vendor serves different respins on Linux and macOS. Active workflows keep one version across platforms and let setup-java resolve its latest build, including JDK 21 and 25 compatibility lanes. The Kotlin consumer was verified on the Linux build. [Linux release](https://api.adoptium.net/v3/assets/latest/27/hotspot?architecture=x64&image_type=jdk&os=linux), [macOS release](https://api.adoptium.net/v3/assets/latest/27/hotspot?architecture=aarch64&image_type=jdk&os=mac), [setup-java matching](https://github.com/actions/setup-java/blob/v6.3.0/src/distributions/temurin/installer.ts#L83-L101) |
| Maven distribution | 3.10.0 | 3.10.1 | 3.10.1 | Native wrapper, checksum and Maven verify. [Maven Central](https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.10.1/) |
| Maven Wrapper | 3.3.4 | 3.3.4 | 3.3.4 | Native wrapper JAR release. [Maven metadata](https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/maven-metadata.xml) |
| Gradle | 9.9.1 | 9.9.1 | 9.9.1 | Current wrapper and JVM/JS checks. [Gradle API](https://services.gradle.org/versions/current) |
| .NET SDK | 11.0.100 | 11.0.100 | 11.0.100 | Net10 public library, net11 test toolchain. [Release metadata](https://dotnetcli.blob.core.windows.net/dotnet/release-metadata/releases-index.json) |
| DocFX | 2.81.0 | 2.81.0 | 2.81.0 | Shared project tool manifest. [NuGet](https://api.nuget.org/v3-flatcontainer/docfx/index.json) |
| Swift | 6.4.2 | 6.4.2 | 6.4.2 | Linux and Apple use the active compiler with a separate 5.9 floor job. [Swift releases](https://www.swift.org/api/v1/install/releases.json) |
| Go | 1.27.4 | 1.27.4 | 1.27.4 | Current Go tool, supported module language 1.26. [Go downloads](https://go.dev/dl/?mode=json) |
| CMake | runner default | runner default, local 4.4.5 verification | 4.4.5 | Compatibility lane explicitly pins last CMake 3.16 patch. [Kitware release](https://github.com/Kitware/CMake/releases/tag/v4.4.5) |
| clang-format | 23.1.5 | 23.1.5 | 23.1.5 | Compiler-independent formatting pin. [PyPI](https://pypi.org/project/clang-format/23.1.5/) |
| vcpkg baseline | 4702e381dbbd9b54d3f7e1eb565cd8981c1814cd | 2ebb714221ad4e482e596d64c129f63fbbfb3fd5 | 2ebb714221ad4e482e596d64c129f63fbbfb3fd5 | Resolves benchmark 1.10.0 and gtest 1.18.0. [Registry baseline](https://github.com/microsoft/vcpkg/blob/2ebb714221ad4e482e596d64c129f63fbbfb3fd5/versions/baseline.json) |
| Gitpod workspace-dotnet | 2026-02-12-23-06-03 | 2026-02-12-23-06-03 | same | Both Dockerfiles use digest 253772ffe6d042a39b7802e3101ace08b6b21914e8116d9bf6d9f84332b78e11. [Docker Hub tags](https://hub.docker.com/v2/repositories/gitpod/workspace-dotnet/tags) |
| Swift Linux image | 6.4.2-noble | 6.4.2-noble | 6.4.2-noble | Active digest 23d9b28ad97fb1cf1999edc3a0cb265ee915ed42299a9344e7173d5a6d2b05f4. [Docker Hub tag](https://hub.docker.com/v2/repositories/library/swift/tags/6.4.2-noble) |
| Playwright image | v1.65.1-noble | v1.65.1-noble | v1.65.1-noble | Matches the Playwright package in template workflows. Digest-pinned copies preserve their pinning policy. [Playwright release](https://github.com/microsoft/playwright/releases/tag/v1.65.1) |

GitHub hosts the job runner images behind labels such as `ubuntu-26.04` and `macos-26`. Their OS packages follow image updates automatically. Explicit compatibility constraints on published packages are tested across versions, including Rust, Python, PHP, Java, Swift, Go, C# and CMake.
