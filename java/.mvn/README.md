# `java/.mvn`

`jvm.config` gives the Maven JVM the `jdk.compiler` exports that
[google-java-format](https://github.com/google/google-java-format) needs, because Spotless runs the
formatter in-process and the formatter reads `javac`'s internal AST classes.

Without these flags an older JDK prints

```
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by com.google.googlejavaformat.java.JavacTokens$CommentSavingTokenizer
```

on every `mvn spotless:check` / `spotless:apply`, and JDK 16+ turns the same access into a hard
`IllegalAccessError`.
