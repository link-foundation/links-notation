### Current Behavior

On Gradle 9.8.2, a Kotlin Multiplatform build with native targets on **KGP 2.4.21**, the latest stable KGP, prints:

```
Using the enum type KotlinNativeBundleArtifactsTypes as an attribute value type has been deprecated. This will fail with an error in Gradle 10. This enum does not implement Named. All Enums used as Attribute values should implement Named. This enum type is used by the Kotlin Gradle Plugin 2.0.x line. Upgrade to KGP 2.1.0 or later, in which the plugin no longer uses a plain enum for this attribute. Consult the upgrading guide for further information: https://docs.gradle.org/9.8.2/userguide/upgrading_version_9.html#kgp_native_bundle_attribute_enum
```

The advice is wrong. The build already uses KGP 2.4.21, and that release still declares `KotlinNativeBundleArtifactFormat$KotlinNativeBundleArtifactsTypes` as a plain enum. `javap` on `kotlin-gradle-plugin-2.4.21-gradle96.jar` shows `extends java.lang.Enum<...>` and no `Named`. The enum was made `Named` only in JetBrains/kotlin@95e8bdcc84 ("[Gradle] Make KotlinNativeBundleArtifactsTypes conform Named", KT-89265, 2026-09-10). The `v2.5.0-Beta2` tag contains that commit; `v2.4.21` does not. The [upgrading guide section](https://docs.gradle.org/9.8.2/userguide/upgrading_version_9.html#kgp_native_bundle_attribute_enum) and the Javadoc of `AttributeTypeValidator.isKGPSpecialCase` make the same claim: "KGP 2.1.0+ no longer uses this enum".

Stack trace (`-Dorg.gradle.deprecation.trace=true`, KGP 2.4.21):

```
at org.jetbrains.kotlin.gradle.targets.native.toolchain.KotlinNativeBundleArtifactFormat.<clinit>(KotlinNativeBundleArtifactFormat.kt:25)
at org.jetbrains.kotlin.gradle.targets.native.internal.CommonizerTasksKt.getCommonizeNativeDistributionTask(CommonizerTasks.kt:187)
at org.jetbrains.kotlin.gradle.targets.native.internal.CommonizerTasksKt.commonizedNativeDistributionKlibsOrNull(CommonizerTasks.kt:170)
at org.jetbrains.kotlin.gradle.targets.native.internal.SetupKotlinNativePlatformDependenciesAndStdlibKt.getNativeDistributionDependencies(SetupKotlinNativePlatformDependenciesAndStdlib.kt:107)
```

### Expected Behavior

The message and the upgrading guide name the first KGP release that is unaffected, KGP 2.5.0. Until that release is stable, they should say that no stable KGP avoids the warning, so users do not chase an upgrade that does not help.

### Context (optional)

Found in the CI of https://github.com/link-foundation/links-notation (issue https://github.com/link-foundation/links-notation/issues/377). Every Kotlin job ends with "Deprecated Gradle features were used in this build, making it incompatible with Gradle 10", and this is the only deprecation behind it.

**Workaround:** none on stable KGP; the warning can only be left in place. KGP 2.5.0-Beta2 has no warning: the same reproducer with `version "2.5.0-Beta2"` prints no deprecation.

**Suggested fix:** in `AttributeTypeValidator` (the Javadoc of `KGP_NATIVE_BUNDLE_ENUM_FQN` and `isKGPSpecialCase`), in the deprecation message, and in `upgrading_version_9.adoc#kgp_native_bundle_attribute_enum`, replace "the Kotlin Gradle Plugin 2.0.x line … upgrade to KGP 2.1.0 or later" with "Kotlin Gradle Plugin versions before 2.5.0 (KT-89265) … upgrade to KGP 2.5.0 or later". The smoke tests in `KotlinMultiplatformPluginSmokeTest` could expect this deprecation for every KGP version below 2.5.0 on builds with native targets.

### Self-contained Reproducer Project

`settings.gradle.kts`:

```kotlin
pluginManagement { repositories { gradlePluginPortal(); mavenCentral() } }
dependencyResolutionManagement { repositories { mavenCentral() } }
rootProject.name = "kgp-named-enum"
```

`build.gradle.kts`:

```kotlin
plugins {
    kotlin("multiplatform") version "2.4.21"
}

kotlin {
    jvm()
    iosArm64()
    iosX64()
}
```

Run `gradle --no-configuration-cache --warning-mode all help` with Gradle 9.8.2. This works on Linux too, because only configuration runs.

### Gradle version

9.8.2

### Your Environment (optional)

Linux x86_64, Temurin 25, KGP 2.4.21.
