# Native JVM dependency graphs

Collected 2026-11-13 UTC from Maven dependency:tree and Gradle's native ResolutionResult. These artifacts had no committed before lock; direct before requirements are in dependency-tables.md. Gradle's formatter configuration is a private upstream tool runtime, not application API. Registry evidence is registry-jvm-transitive.json.

| Native graph | Artifact | Selected | Latest stable | Parent / decision |
| --- | --- | --- | --- | --- |
| gradle-resolved.json | ch.qos.logback:logback-classic | 1.6.6 | 1.6.6 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | ch.qos.logback:logback-core | 1.6.6 | 1.6.6 | ch.qos.logback:logback-classic:1.6.6; Current registry release |
| gradle-resolved.json | com.github.ajalt.clikt:clikt | 5.1.0 | 5.1.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.github.ajalt.clikt:clikt-jvm | 5.1.0 | 5.1.0 | com.github.ajalt.clikt:clikt:5.1.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli | 1.8.0 | 1.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-baseline | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-baseline | 1.8.0 | 1.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-baseline | 1.8.0 | 1.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-checkstyle | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-baseline:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-plain:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-checkstyle:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-json:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-format:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-html:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-plain-summary:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-sarif:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-baseline:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-core | 1.8.0 | 1.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-format | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-html | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-json | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-plain | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-plain-summary | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-reporter-sarif | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-ruleset-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-ruleset-standard:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-ruleset-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-ruleset-standard:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-cli-ruleset-core | 1.8.0 | 1.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-logger | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-logger | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-baseline:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-logger | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-logger | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-rule-engine:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-logger | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-ruleset-standard:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-logger | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-baseline:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-logger | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-logger | 1.8.0 | 1.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-logger | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-ruleset-standard:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-logger | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-logger | 1.8.0 | 1.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-rule-engine | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-rule-engine-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-baseline:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-rule-engine-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-rule-engine:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-rule-engine-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-ruleset-core:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-rule-engine-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-ruleset-standard:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-rule-engine-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-baseline:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-rule-engine-core | 1.8.0 | 1.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-rule-engine-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli-ruleset-core:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-rule-engine-core | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-ruleset-standard:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-rule-engine-core | 1.8.0 | 1.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-ruleset-standard | 1.8.0 | 1.8.0 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-ruleset-standard | 1.8.0 | 1.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | com.pinterest.ktlint:ktlint-ruleset-standard | 1.8.0 | 1.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-logger:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-reporter-core:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-reporter-baseline:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-reporter-plain:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-rule-engine:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-ruleset-standard:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-ruleset-core:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-reporter-checkstyle:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-reporter-json:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-reporter-format:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-reporter-html:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-reporter-plain-summary:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-reporter-sarif:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-logger:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-reporter-core:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-reporter-baseline:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-logger:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-ruleset-standard:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-cli-ruleset-core:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations | 0.23.2 | 0.23.2 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations-jvm | 0.23.2 | 0.23.2 | dev.drewhamilton.poko:poko-annotations:0.23.2; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations-jvm | 0.23.2 | 0.23.2 | dev.drewhamilton.poko:poko-annotations:0.23.2; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations-jvm | 0.23.2 | 0.23.2 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations-jvm | 0.23.2 | 0.23.2 | dev.drewhamilton.poko:poko-annotations:0.23.2; Current registry release |
| gradle-resolved.json | dev.drewhamilton.poko:poko-annotations-jvm | 0.23.2 | 0.23.2 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.detekt.sarif4k:sarif4k | 0.8.0 | 0.8.0 | com.pinterest.ktlint:ktlint-cli-reporter-sarif:1.8.0; Current registry release |
| gradle-resolved.json | io.github.detekt.sarif4k:sarif4k | 0.8.0 | 0.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.detekt.sarif4k:sarif4k | 0.8.0 | 0.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.detekt.sarif4k:sarif4k | 0.8.0 | 0.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.detekt.sarif4k:sarif4k-jvm | 0.8.0 | 0.8.0 | io.github.detekt.sarif4k:sarif4k:0.8.0; Current registry release |
| gradle-resolved.json | io.github.detekt.sarif4k:sarif4k-jvm | 0.8.0 | 0.8.0 | io.github.detekt.sarif4k:sarif4k:0.8.0; Current registry release |
| gradle-resolved.json | io.github.detekt.sarif4k:sarif4k-jvm | 0.8.0 | 0.8.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging | 8.0.7 | 8.0.7 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging | 8.0.7 | 8.0.7 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging | 8.0.7 | 8.0.7 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging | 8.0.7 | 8.0.7 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging | 8.0.7 | 8.0.7 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging-jvm | 8.0.7 | 8.0.7 | com.pinterest.ktlint:ktlint-logger:1.8.0; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging-jvm | 8.0.7 | 8.0.7 | io.github.oshai:kotlin-logging:8.0.7; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging-jvm | 8.0.7 | 8.0.7 | com.pinterest.ktlint:ktlint-logger:1.8.0; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging-jvm | 8.0.7 | 8.0.7 | io.github.oshai:kotlin-logging:8.0.7; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging-jvm | 8.0.7 | 8.0.7 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging-jvm | 8.0.7 | 8.0.7 | io.github.oshai:kotlin-logging:8.0.7; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging-jvm | 8.0.7 | 8.0.7 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging-jvm | 8.0.7 | 8.0.7 | com.pinterest.ktlint:ktlint-logger:1.8.0; Current registry release |
| gradle-resolved.json | io.github.oshai:kotlin-logging-jvm | 8.0.7 | 8.0.7 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | junit:junit | 4.13.2 | 4.13.2 | org.jetbrains.kotlin:kotlin-test-junit:2.4.21; Current registry release |
| gradle-resolved.json | org.ec4j.core:ec4j-core | 1.2.0 | 1.2.0 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | org.ec4j.core:ec4j-core | 1.2.0 | 1.2.0 | com.pinterest.ktlint:ktlint-rule-engine:1.8.0; Current registry release |
| gradle-resolved.json | org.ec4j.core:ec4j-core | 1.2.0 | 1.2.0 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | org.ec4j.core:ec4j-core | 1.2.0 | 1.2.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.ec4j.core:ec4j-core | 1.2.0 | 1.2.0 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | org.ec4j.core:ec4j-core | 1.2.0 | 1.2.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.hamcrest:hamcrest | 3.0 | 3.0 | org.hamcrest:hamcrest-core:3.0; Current registry release |
| gradle-resolved.json | org.hamcrest:hamcrest-core | 3.0 | 3.0 | junit:junit:4.13.2; Current registry release |
| gradle-resolved.json | org.hamcrest:hamcrest-core | 3.0 | 3.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-compiler-embeddable | 2.2.21 | 2.4.21 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-compiler-embeddable | 2.2.21 | 2.4.21 | com.pinterest.ktlint:ktlint-rule-engine:1.8.0; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-compiler-embeddable | 2.2.21 | 2.4.21 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-compiler-embeddable | 2.2.21 | 2.4.21 | root project 'links-notation'; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-compiler-embeddable | 2.2.21 | 2.4.21 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-compiler-embeddable | 2.2.21 | 2.4.21 | root project 'links-notation'; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-daemon-embeddable | 2.2.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-daemon-embeddable | 2.2.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-daemon-embeddable | 2.2.21 | 2.4.21 | root project 'links-notation'; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-daemon-embeddable | 2.2.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-daemon-embeddable | 2.2.21 | 2.4.21 | root project 'links-notation'; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-reflect | 2.4.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-reflect | 2.4.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-reflect | 2.4.21 | 2.4.21 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-reflect | 2.4.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-reflect | 2.4.21 | 2.4.21 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-script-runtime | 2.2.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-script-runtime | 2.2.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-script-runtime | 2.2.21 | 2.4.21 | root project 'links-notation'; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-script-runtime | 2.2.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-script-runtime | 2.2.21 | 2.4.21 | root project 'links-notation'; ktlint 1.8.0 embedded compiler API; replacing these modules with 2.4.21 reproduces 'Extensions storage is not registered'. Upstream ktlint/ktlint#3403 confirms incompatibility; ci-logs/issue405-ktlint-upgrade-trace.log records the experiment |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-test:2.4.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-logger:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-reporter-core:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-reporter-baseline:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-reporter-plain:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-rule-engine:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-ruleset-core:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-ruleset-standard:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-reporter-checkstyle:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-reporter-json:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-reporter-format:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-reporter-html:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-reporter-plain-summary:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-reporter-sarif:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | dev.drewhamilton.poko:poko-annotations-jvm:0.23.2; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | io.github.oshai:kotlin-logging-jvm:8.0.7; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-logger:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-reporter-core:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-reporter-baseline:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | io.github.oshai:kotlin-logging-jvm:8.0.7; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | io.github.detekt.sarif4k:sarif4k-jvm:0.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | org.jetbrains.kotlinx:kotlinx-io-bytestring-jvm:0.9.3; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | org.jetbrains.kotlinx:kotlinx-io-core-jvm:0.9.3; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | org.jetbrains.kotlinx:kotlinx-serialization-core-jvm:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | org.jetbrains.kotlinx:kotlinx-serialization-json-io-jvm:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | org.jetbrains.kotlinx:kotlinx-serialization-json-jvm:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | dev.drewhamilton.poko:poko-annotations-jvm:0.23.2; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | io.github.oshai:kotlin-logging-jvm:8.0.7; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-logger:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-rule-engine-core:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-cli-ruleset-core:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | com.pinterest.ktlint:ktlint-ruleset-standard:1.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-stdlib | 2.4.21 | 2.4.21 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-test | 2.4.21 | 2.4.21 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-test | 2.4.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-test-junit:2.4.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-test | 2.4.21 | 2.4.21 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlin:kotlin-test-junit | 2.4.21 | 2.4.21 | org.jetbrains.kotlin:kotlin-test:2.4.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm | 1.11.0 | 1.11.0 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm | 1.11.0 | 1.11.0 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm | 1.11.0 | 1.11.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm | 1.11.0 | 1.11.0 | org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.21; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm | 1.11.0 | 1.11.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-io-bytestring | 0.9.3 | 0.9.3 | org.jetbrains.kotlinx:kotlinx-io-core-jvm:0.9.3; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-io-bytestring-jvm | 0.9.3 | 0.9.3 | org.jetbrains.kotlinx:kotlinx-io-bytestring:0.9.3; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-io-core | 0.9.3 | 0.9.3 | io.github.detekt.sarif4k:sarif4k-jvm:0.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-io-core | 0.9.3 | 0.9.3 | org.jetbrains.kotlinx:kotlinx-serialization-json-io-jvm:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-io-core-jvm | 0.9.3 | 0.9.3 | org.jetbrains.kotlinx:kotlinx-io-core:0.9.3; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-bom | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-json-jvm:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-bom | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-core-jvm:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-bom | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-json-io-jvm:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-core | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-bom:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-core | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-json-io-jvm:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-core | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-json-jvm:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-core-jvm | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-core:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-core-jvm | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-bom:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-json | 1.13.0 | 1.13.0 | io.github.detekt.sarif4k:sarif4k-jvm:0.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-json | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-bom:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-json | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-json-io-jvm:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-json-io | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-bom:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-json-io | 1.13.0 | 1.13.0 | io.github.detekt.sarif4k:sarif4k-jvm:0.8.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-json-io-jvm | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-json-io:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-json-io-jvm | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-bom:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-json-jvm | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-json:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains.kotlinx:kotlinx-serialization-json-jvm | 1.13.0 | 1.13.0 | org.jetbrains.kotlinx:kotlinx-serialization-bom:1.13.0; Current registry release |
| gradle-resolved.json | org.jetbrains:annotations | 26.1.0 | 26.1.0 | org.jetbrains.kotlin:kotlin-stdlib:2.4.21; Current registry release |
| gradle-resolved.json | org.jetbrains:annotations | 26.1.0 | 26.1.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains:annotations | 26.1.0 | 26.1.0 | org.jetbrains.kotlin:kotlin-stdlib:2.4.21; Current registry release |
| gradle-resolved.json | org.jetbrains:annotations | 26.1.0 | 26.1.0 | org.jetbrains.kotlin:kotlin-stdlib:2.4.21; Current registry release |
| gradle-resolved.json | org.jetbrains:annotations | 26.1.0 | 26.1.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains:annotations | 26.1.0 | 26.1.0 | org.jetbrains.kotlin:kotlin-stdlib:2.4.21; Current registry release |
| gradle-resolved.json | org.jetbrains:annotations | 26.1.0 | 26.1.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.jetbrains:annotations | 26.1.0 | 26.1.0 | org.jetbrains.kotlin:kotlin-stdlib:2.4.21; Current registry release |
| gradle-resolved.json | org.jetbrains:annotations | 26.1.0 | 26.1.0 | root project 'links-notation'; Current registry release |
| gradle-resolved.json | org.slf4j:slf4j-api | 2.0.20 | 2.0.20 | ch.qos.logback:logback-classic:1.6.6; Current registry release |
| maven-benchmarks-graph.json | com.google.code.gson:gson | 2.15.0 | 2.15.0 | io.github.link-foundation:links-notation-benchmark@0.1.0; Current registry release |
| maven-benchmarks-graph.json | com.google.errorprone:error_prone_annotations | 2.52.0 | 2.52.0 | com.google.code.gson:gson@2.15.0; Current registry release |
| maven-benchmarks-graph.json | com.knuddels:jtokkit | 1.1.0 | 1.1.0 | io.github.link-foundation:links-notation-benchmark@0.1.0; Current registry release |
| maven-java-graph.json | org.apiguardian:apiguardian-api | 1.1.2 | 1.1.2 | org.junit.jupiter:junit-jupiter-api@6.1.3; Current registry release |
| maven-java-graph.json | org.jspecify:jspecify | 1.0.1 | 1.0.1 | org.junit.jupiter:junit-jupiter-api@6.1.3; Current registry release |
| maven-java-graph.json | org.junit.jupiter:junit-jupiter | 6.1.3 | 6.1.3 | io.github.link-foundation:links-notation@0.31.4; Current registry release |
| maven-java-graph.json | org.junit.jupiter:junit-jupiter-api | 6.1.3 | 6.1.3 | org.junit.jupiter:junit-jupiter@6.1.3; Current registry release |
| maven-java-graph.json | org.junit.jupiter:junit-jupiter-engine | 6.1.3 | 6.1.3 | org.junit.jupiter:junit-jupiter@6.1.3; Current registry release |
| maven-java-graph.json | org.junit.jupiter:junit-jupiter-params | 6.1.3 | 6.1.3 | org.junit.jupiter:junit-jupiter@6.1.3; Current registry release |
| maven-java-graph.json | org.junit.platform:junit-platform-commons | 6.1.3 | 6.1.3 | org.junit.jupiter:junit-jupiter-api@6.1.3; Current registry release |
| maven-java-graph.json | org.junit.platform:junit-platform-engine | 6.1.3 | 6.1.3 | org.junit.jupiter:junit-jupiter-engine@6.1.3; Current registry release |
| maven-java-graph.json | org.opentest4j:opentest4j | 1.3.0 | 1.3.0 | org.junit.jupiter:junit-jupiter-api@6.1.3; Current registry release |
