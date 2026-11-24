# `java/.mvn`

`jvm.config` gives the Maven JVM the `jdk.compiler` exports that
[google-java-format](https://github.com/google/google-java-format) needs, because Spotless runs the
formatter in-process and the formatter reads `javac`'s internal AST classes.

Without these flags an older JDK prints

```
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by com.google.googlejavaformat.java.JavacTokens$CommentSavingTokenizer
```

on every `./mvnw spotless:check` / `spotless:apply`, and JDK 16+ turns the same access into a hard
`IllegalAccessError`.

`wrapper/maven-wrapper.properties` pins the Maven that `../mvnw` and `../mvnw.cmd` download and run
(the [Maven Wrapper](https://maven.apache.org/tools/wrapper/), `only-script` type), with the
SHA-256 the wrapper checks the download against. `scripts/ci/check-dependencies.py` fails CI once a
newer Maven or wrapper is released.

`maven.config` widens Maven Resolver's HTTP retry budget. Maven Central answers bursts of CI
downloads with HTTP 429 (Too Many Requests); with the default three retries 5 s apart, every Java job
of the Dependabot pull requests in [#437](https://github.com/link-foundation/links-notation/issues/437)
failed to resolve a plugin. Six retries at 10 s, 20 s, … 60 s ride out the limit while a persistent
outage still fails within a few minutes. The keys are documented in the
[Maven Resolver configuration](https://maven.apache.org/resolver/configuration.html).
