// Minimal reproduction for the Gradle 9.8 deprecation "Using the enum type
// KotlinNativeBundleArtifactsTypes as an attribute value type" (issue #377).
// Run: kotlin/gradlew -p experiments/issue-377/kgp-named-enum --warning-mode all help
pluginManagement { repositories { gradlePluginPortal(); mavenCentral() } }
dependencyResolutionManagement { repositories { mavenCentral() } }
rootProject.name = "kgp-named-enum"
