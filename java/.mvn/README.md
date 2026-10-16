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
