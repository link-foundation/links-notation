# Links Notation Parser for Kotlin Multiplatform

A Kotlin Multiplatform implementation of the Links Notation parser: a
hand-written recursive-descent port of the JavaScript reference grammar, with
no runtime dependencies. It reads every document the JavaScript parser reads to
the same links, and refuses every document it refuses at the same line and
column.

Targets: JVM (Java 11+), Android, `iosArm64`, `iosSimulatorArm64`, `iosX64`,
JavaScript (Node.js) and WebAssembly (`wasmJs`).

## Installation

### Gradle (Kotlin DSL)

```kotlin
dependencies {
    implementation("io.github.link-foundation:links-notation-kotlin:0.29.0")
}
```

In a multiplatform project, add it to `commonMain`; Gradle picks the artifact
for each target (`links-notation-kotlin-jvm`, `-js`, `-iosarm64`, ...).

### Local Development Setup

```bash
cd kotlin
./gradlew build
```

The Android target is configured only when an Android SDK is found
(`ANDROID_HOME` or `sdk.dir` in `local.properties`), and the iOS targets build
only on macOS.

## Test

```bash
./gradlew jvmTest jsNodeTest wasmJsNodeTest   # any host
./gradlew iosSimulatorArm64Test               # macOS
./gradlew testAndroidHostTest                 # with an Android SDK
./gradlew ktlintCheck                         # formatting
bash test-summary.sh                          # tests per target
```

The shared fixtures in [`../parity`](../parity) and
[`../docs/protocol`](../docs/protocol) are compiled into every test binary by
the `generateParityCases` task, so the native targets, which cannot read files,
check the same cases as the JVM.

## Usage

### Basic Parsing

```kotlin
import io.github.linkfoundation.linksnotation.Parser
import io.github.linkfoundation.linksnotation.formatLinks

val links = Parser().parse(
    """
    papa (lovesMama: loves mama)
    son lovesMama
    daughter lovesMama
    all (love mama)
    """.trimIndent(),
)

links[0].format()                       // (papa (lovesMama: loves mama))
links[0].format(lessParentheses = true) // papa (lovesMama: loves mama)
formatLinks(links)                      // all four links, a line each
```

### Working with Links

`Link` is a data class: equal IDs and values make equal links.

```kotlin
val parent = Link("parent", listOf(Link("child1"), Link("child2")))
parent.format()                      // (parent: child1 child2)
Link("a").combine(Link("b")).format() // (a b)
escapeReference("has space")         // 'has space'
```

### Formatting Options

```kotlin
val link = Link("id", listOf(Link("value1"), Link("value2"), Link("value3")))
link.format(FormatOptions(maxInlineRefs = 2, preferInline = false))
// id:
//   value1
//   value2
//   value3
```

`FormatOptions` also has `lessParentheses`, `maxLineLength`,
`indentLongLines`, `groupConsecutive` and `indentString`; `FormatConfig` is
the same class under its JavaScript name.

### Limits and Errors

```kotlin
val parser = Parser(ParserOptions(maxDepth = 1, maxInputSize = null))
parser.parse("(a)")   // accepted
parser.parse("((a))") // ParseException.DepthExceeded: limit 1, line 1, column 2
```

`ParserOptions` has `maxDepth` (default 64, the same in every
implementation), `maxInputSize` (`null`: 10 MiB, in UTF-16 code units),
`comments` (whether `#` starts a comment) and `syntax` (whether links record
how their IDs were written). `ParseException` is sealed:

- `ParseException.Syntax` - the document is not Links Notation; `line`,
  `column`, `offset`, `lineText`, `snippet` and `found` say where;
- `ParseException.DepthExceeded` - a `Syntax` error for links nested deeper
  than `limit`;
- `ParseException.InputTooLarge` - the document is longer than `limit`; it is
  not read.

### How a Document Was Written (CST)

```kotlin
val link = Parser().parse("(t 1 '1')").single()
val bare = link.values[1]
val quoted = link.values[2]
bare == quoted // true: the same reference
bare.rawId     // "1", and bare.quote is null
quoted.rawId   // "'1'", and quoted.quote is "'"
link.format()  // (t 1 1)

val cst = Parser().parseCst("(t 1 '1') # note\n")
cst.toString()      // "(t 1 '1') # note\n"
cst.toSExpression() // (document (line (group open_paren:"(" ...
```

`ParserOptions(syntax = false)` (AST mode) leaves `rawId` null.

### Streaming

`StreamParser` accepts arbitrary chunks and publishes a top-level record as
soon as the next one begins:

```kotlin
val stream = StreamParser(collect = false).onLink { println(it.format()) }
stream.write("profile:\n  name Ada\n") // nothing yet: more children may follow
stream.end("next link")                // (profile: (name Ada)), then (next link)

StreamParser.parse(listOf("a b\n", "c d")) // a lazy Sequence<Link>
```

`position()`, `drain()`, `reset()` and `maxBufferSize` are available on the
stream, and `onError`/`onEnd` register further listeners.

### Groups and Indented Documents

```kotlin
val group = Parser().parseGroups("parent\n  child1\n  child2").single()
group.children.size // 2
group.toString()    // ((parent)) ((child1)) ((child2))

val document = parseIndentedDocument("fruits\n  apple\n  pear\n")
// {fruits=[apple, pear]}
formatIndentedDocument(document) // "fruits\n  apple\n  pear\n"
```

### Binary Codec

```kotlin
val codec = BinaryLinoCodec()
val bytes = codec.encodeText("(papa loves mama)")
codec.decodeText(bytes) // papa loves mama
```

`BinaryLinoOptions` selects Hybrid external references, arity ranges and
packed widths; `DecodeLimits` bounds what is decoded. `LinksPacket`,
`PacketReader` and `formatBinaryReference` are the lower layers. The format
is specified in [`../docs/protocol`](../docs/protocol).

## Differences from the JavaScript API

The behaviour is the same; the shapes follow Kotlin conventions:

- Errors are `ParseException.Syntax`, `ParseException.DepthExceeded`,
  `ParseException.InputTooLarge` and `StreamParseException`, which carry the
  position as properties. Invalid arguments throw `IllegalArgumentException`
  and misuse throws `IllegalStateException`, with the JavaScript messages.
- The binary layer uses `ULong` references, `ByteArray` packets and the sealed
  `PacketReference` (`Address`, `External`).
- `FormatConfig` is a `typealias` of `FormatOptions`.
- `parseIndentedDocument` returns `Map<String, List<String>>`: a parent with
  one child has a list of one where JavaScript gives the child's text.
- `StreamParser` has no `parseAsync`; `onLink`, `onError` and `onEnd` take
  Kotlin functions, and `StreamParser.parse` returns a lazy `Sequence`.
- `LinksGroup` children are `LinksGroup`s; `escapeReference`,
  `unescapeReference` and `referenceQuote` are top-level functions.
- Links are compared with `==`.

## Package Information

- Package: `io.github.linkfoundation.linksnotation`
- Maven coordinates: `io.github.link-foundation:links-notation-kotlin`
- License: Unlicense
