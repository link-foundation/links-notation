Current stable-consumer evidence from link-foundation/links-notation#406, using ktlint 1.8.0, ktlint-gradle 14.2.0, KGP 2.4.21 and Gradle 9.9.1:

The native formatter graph still selects `ch.qos.logback:logback-core:1.3.16`. An OSV exact-coordinate query reports GHSA-jhq6-gfmj-v8fx, GHSA-p47f-322f-whfh and GHSA-qqpg-mvqg-649v. This is the stable 1.x graph; I understand the existing explanation about the 1.x Java compatibility promise and the fix on the 2.x line.

Minimal reproduction in a Gradle project with ktlint-gradle 14.2.0:

```kotlin
ktlint { version.set("1.8.0") }
```

Run `./gradlew dependencies --configuration ktlint` and query OSV's Maven ecosystem for `ch.qos.logback:logback-core` version `1.3.16`.

For consumers whose Java baseline permits it, our local workaround explicitly upgrades both Logback artifacts:

```kotlin
configurations.matching { it.name.startsWith("ktlint") }.configureEach {
    resolutionStrategy.eachDependency {
        if (requested.group == "ch.qos.logback") useVersion("1.6.6")
    }
}
```

Our full reviewed formatter graph also refreshes its other runtime minima. `ktlintFormat`, `ktlintCheck` and `jvmTest` pass on JDK 25, and the resulting exact Maven/Gradle graph has zero OSV findings. We keep the embedded compiler/daemon/script-runtime at 2.2.21: substituting 2.4.21 independently reproduces the initialization error already tracked in #3403. The tested upgrade and raw advisory/graph evidence are preserved in that PR's `dev/log/issues/405/pulls/406` folder.

A next stable release with the updated Logback graph would remove the consumer override; this comment records the tested workaround without proposing to change 1.x's supported Java baseline.
