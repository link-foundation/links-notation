# Dependency upstream report ledger — 2026-11-14

Existing reports were searched and read before considering new reports. Report
bodies and current snapshots are in `../research/upstream-*.json`; each linked
report includes the applicable reproduction/proposal. Unchanged existing
reports are linked rather than receiving duplicate comments.

| Dependency / current version | Report and finding | Necessary local workaround / suggested upstream change |
| --- | --- | --- |
| Composer 2.11.2 | [composer/composer#13274](https://github.com/composer/composer/issues/13274), newly filed with native platform-only manifest repro | Validate an empty lock separately; filter platform requirements in the audit missing-install check and add the proposed regression. Full report: [composer-platform-audit.md](composer-platform-audit.md). |
| KGP 2.4.21 / Gradle 9.9.1 | **Unfiled — HTTP 403**, [complete report](kotlin-root-package-inputs.md), [submission response](youtrack-submission.json) | Force `rootPackageJson` before lock upgrades; upstream should model Yarn resolutions as an `@Input` map. Fresh three-run finite probe reproduces old/old/new output. GitHub issues disabled; YouTrack requires unavailable authentication. This part of R18 is unfinished. |
| Kotlin web helpers / Mocha 12 | [Kotlin/kotlin-web-helpers#19](https://github.com/Kotlin/kotlin-web-helpers/issues/19) | Keep narrow Base reporter adapter; helper must construct the current Mocha class rather than invoke it as a function. |
| GitHub toolkit / minimatch 11 | [actions/toolkit#2564](https://github.com/actions/toolkit/issues/2564#issuecomment-6865793053) | Keep native fs.glob transport adapter until toolkit supports the current matcher API; report contains fixture and migration proposal. |
| Scriv 1.8.1 | [nedbat/scriv#208](https://github.com/nedbat/scriv/issues/208) | Preserve exact Click/markdown-it-py constraints accepted by the native resolver; broaden compatible upstream ranges after testing. |
| ktlint 1.8.0 / embedded Kotlin 2.2.21 | [ktlint/ktlint#3403](https://github.com/ktlint/ktlint/issues/3403) | Keep formatter compiler runtime separate from application Kotlin 2.4.21; forcing compiler modules reproduces unregistered extension storage. Issue comments confirm the stable incompatibility; pre-release fixes are not claimed stable. |
| ktlint / Logback | [ktlint/ktlint#3230](https://github.com/ktlint/ktlint/issues/3230) | Existing security migration retained; current resolved Logback 1.6.6 has no OSV finding. |
| ktlint-gradle | [JLLeitschuh/ktlint-gradle#944](https://github.com/JLLeitschuh/ktlint-gradle/issues/944) | Existing embedded-compiler Unsafe warning has no stable upstream replacement; do not hide it by weakening checks. |
| KGP 2.4.21 / Gradle 9 | [gradle/gradle#39685](https://github.com/gradle/gradle/issues/39685), redirected to [KT-89265](https://youtrack.jetbrains.com/issue/KT-89265) | Current stable KGP uses the deprecated named enum API; fix is upstream, not a reason to disable tests or select an unstable compiler. |
| vcpkg latest baseline / benchmark 1.9.5 | [microsoft/vcpkg#55056](https://github.com/microsoft/vcpkg/issues/55056) | Keep registry-supported version while the port catches upstream benchmark 1.10.0; baseline itself is updated to latest. |
| VSTest / historical runner diagnostic | [microsoft/vstest#16652](https://github.com/microsoft/vstest/issues/16652) | Keep writable VSTEST_ARTIFACTS_BASE_DIRECTORY; upstream identifies protected temp directory ownership. |
| Dependabot Gradle metadata | [dependabot/dependabot-core#16797](https://github.com/dependabot/dependabot-core/issues/16797) | Native Gradle resolution and registry freshness cover nested formatter version properties until the upstream updater handles them. |
| Dependabot Yarn without manifest | [dependabot/dependabot-core#16798](https://github.com/dependabot/dependabot-core/issues/16798) | Keep native KGP lock regeneration and Yarn bulk audit; do not invent an unsupported ecosystem entry. |
| Artifact SDK internal APIs | [actions/download-artifact#484](https://github.com/actions/download-artifact/issues/484) | Existing upstream Buffer deprecation report; latest available action retained. |
| Pages action internal APIs | [actions/deploy-pages#413](https://github.com/actions/deploy-pages/issues/413) | Existing upstream punycode deprecation report; latest action retained. |

Historical template-specific reports and code proposals remain preserved in
`dev/log/issues/377/pulls/378/upstream/URLS.txt` at the repository root. Those
workarounds remain necessary in executable template copies; this refresh does
not claim unrelated duplicated application logic belongs in dependencies.
