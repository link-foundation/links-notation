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

Run `python3 experiments/issue-405/root-package-inputs.py` from this repository.
The finite probe creates a temporary KGP 2.4.21 project and invokes only
`rootPackageJson`, with one Gradle worker, a 384 MiB heap and 256 MiB metaspace.
There is no Kotlin compilation or Node package installation.

1. Generate with resolution `^11.0.7` and `--rerun`.
2. Change only the resolution property to `^11.0.8`, then run normally.
3. Repeat the second command with `--rerun`.

All three native commands succeeded. The generated resolutions were respectively
`>=11.0.7 <12.0.0`, `>=11.0.7 <12.0.0`, and `>=11.0.8 <12.0.0`.
The second log explicitly reports `rootPackageJson UP-TO-DATE`.
The probe initially compared caret strings with KGP's canonical ranges; that
assertion was corrected against the recorded JSON without repeating the builds.
The three command logs, JSON and corrected assertion check are preserved in
`../research/additional-checks.tar.gz`.

Current primary sources are preserved as `../research/RootPackageJsonTask.kt.txt`
and `../research/NodeJsEnvironmentTask.kt.txt`. The root task has an output and
TaskAction; its inherited package-manager environment is marked `@Internal`.
This source inspection supports the independently reproduced missing-input
finding.

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
