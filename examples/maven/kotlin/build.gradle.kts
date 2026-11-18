import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("jvm") version "2.4.21"
    application
}

// Use the library's bytecode level with the JDK that runs the build.
val notationJvmTarget = JvmTarget.JVM_11

java {
    sourceCompatibility = JavaVersion.toVersion(notationJvmTarget.target)
    targetCompatibility = sourceCompatibility
}

kotlin {
    compilerOptions {
        jvmTarget.set(notationJvmTarget)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("io.github.link-foundation.kotlin:links-notation:${property("notationVersion")}")
}

application {
    mainClass.set("ConsumerKt")
}
