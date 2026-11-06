# Public Maven consumers

Run from the repository root with a JDK and an already published version:

```sh
bash scripts/ci/maven-consumer.sh java 0.31.0
bash scripts/ci/maven-consumer.sh kotlin 0.31.0
```

Java compiles against the exact public JAR. Kotlin resolves the root
multiplatform coordinate using Gradle's JVM variant selection. Neither consumer
uses local library sources or Maven Local. Temporary dependency caches and
compiled output live outside the examples. A passing JVM consumer does not
claim runtime execution on Android, iOS, JS or Wasm; the shared Maven verifier
checks the public metadata, hashes and signatures for every platform.
