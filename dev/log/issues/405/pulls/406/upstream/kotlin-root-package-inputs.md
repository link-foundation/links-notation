# KGP rootPackageJson does not invalidate changed Yarn resolutions

Status: **unfiled; external authentication blocker**. JetBrains/kotlin has
GitHub issues disabled, and this session has no authenticated YouTrack account.
Anonymous searches are saved as `../research/youtrack-*.json`. KT-70902 concerns
partial lock updates and KT-67924 concerns version overwrites; neither was
presented as an exact match for this task-input bug.

Target: https://youtrack.jetbrains.com/issues/KT

Environment: Kotlin Gradle plugin 2.4.21, Gradle 9.9.1, Node 26,
Kotlin JS/Wasm, Yarn Classic 1.22.22. The same issue was recorded with Gradle
9.8.2 in PR 378.

Reproduction:

1. Run `./gradlew kotlinUpgradeYarnLock` for a JS project and retain its generated
   `build/js/package.json` and `kotlin-js-store/yarn.lock`.
2. Change only `YarnRootExtension.resolution("minimatch", "^11.0.8")`.
3. Run `./gradlew kotlinUpgradeYarnLock` again.

Expected: the generated root package JSON and resulting Yarn lock include the
new resolution. Actual: `rootPackageJson` is UP-TO-DATE and the lock can retain
the previous resolution without an error. The native resolver is reading a
stale generated manifest.

Local workaround: rerun rootPackageJson explicitly before native Yarn lock
upgrades, as documented beside the project's Yarn resolutions. Keep that
explicit regeneration step until the upstream task models this input. During
this update the generated native lock was reviewed and audited before storing it.

Suggested upstream change: expose the resolutions as an `@Input`
`MapProperty<String, String>` on the package JSON task, connected to
`YarnRootExtension.resolutions`, so Gradle invalidates it when that map changes.
Keep a regression that mutates only one resolution between two invocations.
