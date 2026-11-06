plugins {
    kotlin("jvm") version "2.4.21"
    application
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
