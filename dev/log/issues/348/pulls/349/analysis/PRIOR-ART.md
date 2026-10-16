# Existing tools for this problem, and how each was used

The issue names a per-ecosystem command for each language. This table lists those commands and
the other tools that solve part of "keep every dependency current". **Used** means the tool did
real work in this pull request.

| Problem | Tool | Used | How, or why not |
| --- | --- | --- | --- |
| Find newer releases, every ecosystem | `scripts/ci/check-dependencies.py` (this repository, issue #325) | yes | It already queried npm, crates.io, PyPI, NuGet, Packagist, Maven Central, the Go proxy and GitHub releases, and it failed CI on any lag. It now also reads pre-commit `additional_dependencies`, the CMake FetchContent archive (with re-hash) and the Maven Wrapper (with re-hash) |
| Before/after table per ecosystem | `experiments/issue-348/inventory.py`, `changes.py` | yes | These reuse the gate's registry clients for every declared dependency, including the archived experiments the gate skips |
| npm | `npm-check-updates -u`, `npm update`, `npm install` | `npm` | The issue suggests `npm-check-updates`. The gate already lists every direct range behind `latest`, and its `--update` mode rewrites them, so `ncu` would have duplicated it. `npm update` and `npm install` regenerated every lockfile (`../ci-logs/deps/npm-update.log`). `npm-locks.log` then checks every installed entry, direct and transitive, against the registry |
| Cargo | `cargo upgrade --incompatible` (cargo-edit), `cargo update`, `cargo fix --edition` | yes | `cargo fix --edition` moved every crate to edition 2024. `cargo update --dry-run` confirms nothing is left |
| PyPI | `pip index versions`, `pip-audit` | yes | No lockfile. The floors were raised by hand, and the gate checks every pin. `uv` and `pip-tools` would add a lockfile, but the package is a library, and pinning its users' tree is not its job |
| NuGet | `dotnet list package --outdated --include-transitive`, `dotnet-outdated` | `dotnet list` | The SDK's own command does what `dotnet-outdated` does for this tree. `--vulnerable` and `--deprecated` are the audit |
| Composer | `composer update --with-all-dependencies`, `composer outdated` | yes | `../ci-logs/deps/php-update.log`, `outdated-after.log` |
| Maven | `versions-maven-plugin` | yes | `display-dependency-updates`, `display-plugin-updates`, `display-property-updates` before and after (`java-versions.log`, `java-versions-after.log`) |
| Maven itself | [Maven Wrapper](https://maven.apache.org/tools/wrapper/) | yes, new | It pins and verifies the build tool. It replaces "whatever the runner ships" |
| Maven floor | [`maven-enforcer-plugin` `requireMavenVersion`](https://maven.apache.org/enforcer/enforcer-rules/requireMavenVersion.html) | yes, new | It replaces the README's "Maven 3.6+" with a rule Maven enforces |
| Go | `go get -u ./...`, `go mod tidy`, `go list -m -u all`, `go fix` | yes | `go fix`'s modernizers are the "use the new features" step for Go 1.26 |
| GitHub Actions | the gate's `uses:` check, `actionlint`, `zizmor` | yes | Every action is pinned to its newest release tag |
| pre-commit | `pre-commit autoupdate` | yes | Every hook `rev` was already current (`pre-commit-autoupdate.log`) |
| Toolchain end-of-life dates | [endoflife.date API](https://endoflife.date/docs/api/) | yes | `data/toolchains/eol-*.json` |
| Advisories | `npm audit`, `cargo audit`, `pip-audit`, `composer audit`, `govulncheck`, `dotnet list package --vulnerable`, [OSV API](https://osv.dev/docs/) | yes | [`AUDITS.md`](AUDITS.md). [osv-scanner](https://google.github.io/osv-scanner/) would cover all of these in one tool. The ecosystem tools were used because CI and contributors already have them |
| Ongoing updates | Dependabot | yes | Kept, and extended to every manifest (see [`DEFECTS.md`](DEFECTS.md) D4). A CI guard keeps it complete |
| Ongoing updates | [Renovate](https://docs.renovatebot.com/) | no | Renovate covers two things Dependabot does not here: the [Maven Wrapper](https://docs.renovatebot.com/modules/manager/maven-wrapper/), and npm `additional_dependencies` of [pre-commit hooks](https://docs.renovatebot.com/modules/manager/pre-commit/). Like Dependabot, it has no CMake FetchContent manager and would need a [regex manager](https://docs.renovatebot.com/modules/manager/regex/). Running two bots doubles every update, and replacing Dependabot is an organisation decision outside this issue. The freshness gate already fails CI on those two gaps, so no update is missed |

## Gaps that stay in this repository's own code

These are the places where no upstream tool reads a pin. Each is checked by
`scripts/ci/check-dependencies.py`, so a newer release fails CI rather than going unnoticed:

1. `cpp/CMakeLists.txt` FetchContent URL and SHA-256. Neither bot has a CMake manager.
2. `java/.mvn/wrapper/maven-wrapper.properties`. Dependabot's support (dependabot-core#14812) is
   merged but behind a rollout flag.
3. The npm `additional_dependencies` of the pre-commit `eslint` hook.
4. The `CMAKE_FLOOR` (`cpp.yml`) and `MAVEN_FLOOR` (`java.yml`) archives. These pins are old on
   purpose, so they are not tracked: each is the floor a manifest declares. If a floor changes,
   so does its pin.
