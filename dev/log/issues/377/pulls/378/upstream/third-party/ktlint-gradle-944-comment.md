The warnings are still there with ktlint-gradle 14.2.0, ktlint 1.8.0 (kotlin-compiler-embeddable 2.2.21), Gradle 9 and Temurin 25. We hit them in CI in https://github.com/link-foundation/links-notation/issues/377.

**How to reproduce.** Run `./gradlew --no-daemon --console=plain ktlintCheck --rerun-tasks` on JDK 25 in any project that applies `org.jlleitschuh.gradle.ktlint` 14.2.0. Each forked worker prints the four `WARNING: sun.misc.Unsafe::objectFieldOffset ... org.jetbrains.kotlin.com.intellij.util.containers.Unsafe` lines. We got 5 sets, 20 lines in total.

**Why the build cannot work around it.** `org.gradle.jvmargs` only reaches the daemon. `BaseKtLintCheckTask.submitKtLintWork` builds the worker's `forkOptions` itself and does not expose them. `JAVA_TOOL_OPTIONS` would work, but it reaches every JVM and prints its own `Picked up JAVA_TOOL_OPTIONS` line.

**A suggested fix** in `submitKtLintWork`. It avoids `JavaVersion.VERSION_24`, which needs Gradle 7.6, so the plugin keeps its Gradle 7.4 floor:

```kotlin
forkOptions {
    maxHeapSize = workerMaxHeapSize.get()
    if (JavaVersion.current() >= JavaVersion.VERSION_16) {
        jvmArgs("--add-opens", "java.base/java.lang=ALL-UNNAMED")
    }
    // JEP 471: the flag exists from JDK 23 on; older JVMs refuse to start with it.
    val feature = System.getProperty("java.specification.version").substringAfter("1.").toInt()
    if (feature >= 23) {
        jvmArgs("--sun-misc-unsafe-memory-access=allow")
    }
}
```

A `workerJvmArgs: ListProperty<String>` on the extension, appended to these `forkOptions`, would also let builds handle the next JDK warning of this kind themselves.
