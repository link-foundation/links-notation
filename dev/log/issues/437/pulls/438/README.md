# Issue #437 / PR #438 — update all dependencies

## Requirements → implementation → evidence

| Requirement | Implementation | Evidence |
|---|---|---|
| Apply open Dependabot PRs #425–#430, #432–#436 | All 11 branches merged; lock conflicts regenerated with `npm install --package-lock-only` | `git log` merge commits |
| Fix why they could not merge | Maven Central HTTP 429: resolver retry in `java/.mvn/maven.config`, `curl --retry` in maven-floor, 429 retry in `scripts/release-audit.mjs`. `uv.lock needs to be updated` (#432/#433): uv projects moved from the `pip` to the `uv` Dependabot ecosystem; `check-dependabot.py` now enforces it | `research/ci/*-excerpt.log`; `experiments/issue-339/release-audit.test.mjs`; `experiments/issue-437/test_dependabot_uv.py` |
| Every direct dependency at latest | `check-dependencies.py --update` | `research/check-dependencies-before.log` / `-after.log` (all OK) |
| Transitive lockfile entries | `experiments/issue-437/refresh-locks.sh` (npm, bun, uv, composer, cargo, go) | committed locks |
| Toolchains | PHP 8.6.0, Bun 1.4.5 in CI | workflows |
| Per-ecosystem pinned vs latest tables | `experiments/issue-437/dependency-tables.py` | `research/dependency-tables.md` |
| Security advisories | npm audit (10 locks), composer audit, pip-audit, yarn-lock audit, OSV batch (Cargo, Go, NuGet) | `research/osv-scan.log`: 119 packages, 0 advisories |
| Dependabot covers every manifest | `.github/dependabot.yml` + `check-dependabot.py` | script output |
| Release prep | version 0.31.9 across all 10 languages, `changelog.d/437.deps.md` | `node scripts/version-consistency.mjs` |

## Left behind (with reasons)

- isort 10.0.0b3 — pre-release only.
- Rust MSRV 1.87 and Go directive 1.26 — library minimums for consumers, not dev pins.
- Node 27 — alpha; 26.13.1 is latest stable.
- NuGet `packages.lock.json` — need .NET SDK 11 (not available locally); regenerated/verified by CI.
- `links-notation ^0.31.8` inside the lino-objects-codec registry package — upstream package content.
- Archived `dev/log`, experiments, case studies — intentionally frozen snapshots (except Dependabot-covered templates, which were updated).

## Existing tools considered

npm-check-updates, cargo-edit (`cargo upgrade`), dotnet-outdated, Renovate. The repository
already has `scripts/ci/check-dependencies.py` which covers all ten ecosystems from one
registry snapshot, so no new tool was added; Dependabot remains the update bot.

## Upstream

dependabot-core: related issues #13912, #15786, #15490 cover uv lock handling. The
#432/#433 failure was this repository's configuration (uv projects under `pip`), not a
Dependabot bug, so no new upstream report was filed.
