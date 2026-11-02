# Upstream reports

`../upstream/URLS.txt` lists every report with the URL where it landed.

- The bodies of the template issues are in `../upstream/*.md`.
- The bodies of the third-party reports are in `../upstream/third-party/*.md`.
- Each report has a reproducible example, a workaround and a suggested code fix.

## Pipeline templates (issue requirement: "if the same issue is found in template report issue also in templates")

The matrix of defects (D1–D9) against templates is in `../templates/COMPARISON.md`. Only a defect
that a template has itself was reported there. For example, the java template has no audit at all.

| Defect | Template issues |
| --- | --- |
| D1: a job no hosted runner picked up is reported as a failure, with no automatic re-run | [cpp#19](https://github.com/link-foundation/cpp-ai-driven-development-pipeline-template/issues/19), [csharp#96](https://github.com/link-foundation/csharp-ai-driven-development-pipeline-template/issues/96), [go#14](https://github.com/link-foundation/go-ai-driven-development-pipeline-template/issues/14), [java#16](https://github.com/link-foundation/java-ai-driven-development-pipeline-template/issues/16), [js#280](https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/280), [rust#226](https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/226) |
| D7: the dependency freshness gate fails push and scheduled runs (best practice 17) | [go#13](https://github.com/link-foundation/go-ai-driven-development-pipeline-template/issues/13), [java#14](https://github.com/link-foundation/java-ai-driven-development-pipeline-template/issues/14), [php#20](https://github.com/link-foundation/php-ai-driven-development-pipeline-template/issues/20) |
| D8: the audit misses moderate advisories, or a lock is never audited | [js#279](https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/279) (`--audit-level=high`), [python#132](https://github.com/link-foundation/python-ai-driven-development-pipeline-template/issues/132) (the npm lock of its JS tooling is unaudited), [java#15](https://github.com/link-foundation/java-ai-driven-development-pipeline-template/issues/15) (no dependency audit) |

Each D7 issue cites links-notation's own fix, `0b8992a`.

## Third-party projects

| Problem | Report | State |
| --- | --- | --- |
| A4: Dependabot's Maven updater rewrites a `<configuration>` literal equal to the old plugin version | [dependabot/dependabot-core#16797](https://github.com/dependabot/dependabot-core/issues/16797) | Filed |
| A5: Dependabot aborts on a `yarn.lock` with no `package.json` (Kotlin/JS `kotlin-js-store`) | [dependabot/dependabot-core#16798](https://github.com/dependabot/dependabot-core/issues/16798) | Filed |
| W3: Gradle's "incompatible with Gradle 10" deprecation for a non-`Named` attribute type does not name the plugin that registered it | [gradle/gradle#39685](https://github.com/gradle/gradle/issues/39685) | Filed |
| W3: KGP 2.4.21 registers the plain enum `KotlinNativeBundleArtifactsTypes` as an attribute | KT-89265, fixed in Kotlin 2.5.0-Beta2 (commit `95e8bdcc84`) | Already fixed upstream. It needs a stable 2.5.0, which Dependabot will propose. |
| W2: ktlint-gradle cannot pass JVM flags to the ktlint worker, so JDK 25 prints `sun.misc.Unsafe` warnings | [JLLeitschuh/ktlint-gradle#944, comment](https://github.com/JLLeitschuh/ktlint-gradle/issues/944#issuecomment-6584621670) | It was an existing issue, so the reproduction and a patch for `BaseKtLintCheckTask.submitKtLintWork` went into a comment |
| W4: `actions/download-artifact@v8.0.2` prints `DEP0005 Buffer() is deprecated` | [actions/download-artifact#484](https://github.com/actions/download-artifact/issues/484) | Already reported, so it was not re-filed. v8.0.2 is the latest release. |
| A5: `rootPackageJson` stays up to date when only the yarn resolutions change, so `kotlinUpgradeYarnLock` keeps the old lock | Draft: `../upstream/third-party/youtrack-KT-rootPackageJson-ignores-resolutions.md` | **Blocked**: JetBrains/kotlin has GitHub issues disabled (`gh api repos/JetBrains/kotlin --jq .has_issues` → `false`), and YouTrack needs an account this automation does not have. A maintainer has to file it. The workaround, `./gradlew rootPackageJson --rerun kotlinUpgradeYarnLock`, is in `kotlin/build.gradle.kts` and in the error message of `scripts/ci/audit-yarn-lock.mjs`. |

## Not reported, because it is not an upstream defect

- **B1–B4** (credentials and tokens): this repository's configuration; see `REQUIREMENTS.md`,
  "Left for a maintainer".
- **W5**, the macOS capacity notice: GitHub's own status message. A6 handles its effect.
