# KGP: `rootPackageJson` stays UP-TO-DATE when only `YarnRootExtension.resolution(...)` changes, so `kotlinUpgradeYarnLock` keeps the old lock

Target: https://youtrack.jetbrains.com/issues/KT (Kotlin Gradle plugin, JS/Wasm subsystem).
Not filed: JetBrains/kotlin has GitHub issues disabled (`gh api repos/JetBrains/kotlin --jq .has_issues` → `false`), and YouTrack needs a JetBrains account that this automation does not have. **Blocked: a maintainer has to file this draft.**

## Environment

Kotlin Gradle plugin 2.4.21 (`kotlin("multiplatform")`), Gradle 9.8.2, `js { nodejs(); browser() }` target, yarn lock in `kotlin-js-store/yarn.lock`.

## Steps to reproduce

1. In a Kotlin Multiplatform project with a `js()` target, run `./gradlew kotlinUpgradeYarnLock` and commit `kotlin-js-store/yarn.lock`.
2. Add a resolution for a transitive dependency of the test toolchain, for example:

   ```kotlin
   plugins.withType<org.jetbrains.kotlin.gradle.targets.js.yarn.YarnPlugin> {
       the<org.jetbrains.kotlin.gradle.targets.js.yarn.YarnRootExtension>().apply {
           resolution("minimatch", "^11.0.4")
       }
   }
   ```
3. Run `./gradlew kotlinUpgradeYarnLock`, with or without `--no-configuration-cache`.

## Expected

`build/js/package.json` gets `"resolutions": {"minimatch": "^11.0.4"}`, and the upgraded `kotlin-js-store/yarn.lock` locks minimatch 11.x.

## Actual

`:rootPackageJson` is reported UP-TO-DATE, `build/js/package.json` keeps the old (or no) `resolutions`, and `kotlin-js-store/yarn.lock` is unchanged. Nothing tells the user that the resolution was ignored.

Seen in https://github.com/link-foundation/links-notation/pull/378 while raising diff, glob and minimatch past GHSA-73rr-hh4g-fpgx, GHSA-3g3m-2fjr-6pw4 and GHSA-g3hv-75wg-m249.

## Workaround

```
./gradlew rootPackageJson --rerun kotlinUpgradeYarnLock
```

## Suggested fix

Declare the resolutions as an input of the root package.json task, e.g. `@get:Input val resolutions: MapProperty<String, String>` fed from `YarnRootExtension.resolutions`, or make them part of the existing input of the root package.json task, so that changing a resolution invalidates `rootPackageJson` and everything downstream.
