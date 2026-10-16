# Security advisories after the update

Every ecosystem's tree was audited after the update, with the tool that ecosystem provides. **No
advisory is open in any of them.** The raw output is in `../ci-logs/audit/`.

| Ecosystem | Tool | Trees | Result | Log |
| --- | --- | --- | --- | --- |
| npm | `npm audit` | `js`, `docs/website`, `docs/comparison`, `benchmarks/js`, `benchmarks/tools` | `found 0 vulnerabilities` in all five | `npm.log` |
| Cargo | `cargo audit` (RustSec, 1329 advisories loaded) | `rust/` (lockfile generated for the scan, 31 crates), `experiments/Cargo.lock` and the four experiment crates with their own lockfile | none (exit code 0 for every lockfile) | `cargo.log`, `../ci-logs/deps/rust-audit.log` |
| NuGet | `dotnet list package --vulnerable` and `--deprecated`, both with `--include-transitive` | `csharp` (library and tests), `benchmarks/csharp`, `examples/binary/csharp` | no vulnerable and no deprecated package | `dotnet.log`, `dotnet-transitive.log` |
| Composer | `composer audit` | `php`, `benchmarks/php` | `No security vulnerability advisories found` | `php-go-py.log` |
| Go | `govulncheck ./...` | `go`, `benchmarks/go` (re-run after `9a484e1`) | `No vulnerabilities found` | `php-go-py.log` |
| PyPI | `pip-audit` | `python` (with its extras), `benchmarks/python/requirements.txt`, `scripts/ci/requirements.txt`, `cpp/tools/requirements.txt` | `No known vulnerabilities found` | `php-go-py.log` |
| Maven | the [OSV API](https://osv.dev/docs/) for every resolved artifact (`experiments/issue-348/osv-maven.py`), plus the Maven distribution and wrapper `./mvnw` downloads | `java`, `benchmarks/java`: 13 artifacts, and `apache-maven` 3.10.0 and `maven-wrapper` 3.3.4 | no known vulnerability | `maven-osv.log` |
| GitHub Actions | `zizmor` 1.31.1 (`--min-severity medium`), as `security.yml` runs it | `.github/workflows/` | `No findings to report` | `../ci-logs/deps/zizmor.log` |

Notes:

- The root `composer.json` is the Packagist mirror of `php/` and has no lockfile, so
  `composer audit` has nothing to scan there ("No installed packages found"). Its packages are
  `php/`'s.
- Maven has no first-party audit command. The OSV query is what `osv-scanner` does for a
  `pom.xml`, applied to the tree that `dependency:list` resolves (commit `4fc42d6`).
- In CI, `security.yml` runs `npm audit` and, on pull requests, `dependency-review-action`.
  That action checks every manifest change against the GitHub Advisory Database, which covers
  all of the ecosystems above. `workflows.yml` runs zizmor. The other audits in this table were
  run once, locally, for this pull request. Advisories published later reach the repository
  through Dependabot alerts on the manifests `dependabot.yml` lists, which is now all of them.
