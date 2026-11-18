# Upstream findings

| Dependency | Current result and remedy | Report |
| --- | --- | --- |
| glob-parent 7.0.0 | Exact minimatch 10.2.6 pin selects a package in GHSA-g3hv-75wg-m249. Override only that edge to 11.0.9 in both artifact transports. The report includes a native audit reproduction and a manifest change to test. | [gulpjs/glob-parent#92](https://github.com/gulpjs/glob-parent/issues/92) |
| vcpkg benchmark port | Upstream updated the port to 1.10.0. Verified the new baseline resolves it without an override and posted the exact baseline to the existing report. | [microsoft/vcpkg#55056](https://github.com/microsoft/vcpkg/issues/55056#issuecomment-6987998196), [port update](https://github.com/microsoft/vcpkg/pull/55086) |
| Scriv | 1.8.2 replaces exact Click and markdown-it-py pins with compatible lower bounds. Native Python template locks now resolve the current versions. | [nedbat/scriv#208](https://github.com/nedbat/scriv/issues/208) |
| Kotlin Gradle plugin 2.4.21 | Keep explicit rootPackageJson regeneration for changed Yarn resolutions. The existing finite reproduction isolates Gradle task input invalidation. The related YouTrack issue concerns dependencies among shared npm projects. A new attempt to create the report through `POST /api/issues` returned HTTP 403. The Kotlin GitHub repository has its issue tracker disabled. | [Existing reproduction and proposed patch](../../../../408/pulls/409/upstream/kotlin-root-package-inputs.md), [related YouTrack issue](https://youtrack.jetbrains.com/issue/KT-89427) |
| Kotlin JVM target on JDK 27 | The stable 2.4.21 compiler supports JVM targets through 26. Set the example's Java and Kotlin targets to JVM 11, matching the published library, while running on JDK 27. The upstream report tracks target 27 support in the pre-release compiler. | [KT-87767](https://youtrack.jetbrains.com/issue/KT-87767), [target validation](https://kotlinlang.org/docs/gradle-configure-project.html#check-for-jvm-target-compatibility-of-related-compile-tasks) |
| Kotlin Embedded Compiler and Gradle | The stable toolchain still warns about an attribute enum that does not implement Named. The lint tool still uses a deprecated Unsafe API. Neither warning came from a new release in this PR. | [KT-89265](https://youtrack.jetbrains.com/issue/KT-89265), [ktlint-gradle#944](https://github.com/JLLeitschuh/ktlint-gradle/issues/944) |
| Composer 2.11.2 | Platform-only root manifest and empty lock are validated separately. Composer reports no installed packages with the locked audit command. The native reproduction and suggestion are already upstream. | [composer/composer#13274](https://github.com/composer/composer/issues/13274) |

The [previous report ledger](../../../../408/pulls/409/upstream/README.md)
records the maintained workarounds for Kotlin Web test helpers, Actions toolkit,
ktlint, VSTest, Dependabot, and artifact and pages actions. The current Kotlin,
artifact and dependency configuration checks exercise those paths.
