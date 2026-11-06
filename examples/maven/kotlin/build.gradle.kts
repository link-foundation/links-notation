plugins {
    kotlin("jvm") version "2.4.21"
    application
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("io.github.link-foundation:links-notation-kotlin:${property("notationVersion")}")
}

application {
    mainClass.set("ConsumerKt")
}
