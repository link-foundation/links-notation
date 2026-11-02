plugins {
    // 2.4.21 is the latest stable KGP; KT-89265 makes the enum Named in 2.5.0.
    kotlin("multiplatform") version "2.4.21"
}

kotlin {
    jvm()
    iosArm64()
    iosX64()
}
