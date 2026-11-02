# Links Notation Parser for Java

Java implementation of the Links Notation parser.

## Installation

### Maven

Add the dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>io.github.link-foundation</groupId>
    <artifactId>links-notation</artifactId>
    <version>0.27.1</version>
</dependency>
```

### Gradle

Add the dependency to your `build.gradle`:

```groovy
implementation 'io.github.link-foundation:links-notation:0.27.1'
```

### Local Development Setup

For contributors working on the source code:

```bash
cd java
./mvnw install
```

## Build

Build the project:

```bash
./mvnw clean compile
# Check Google Java formatting with the current formatter CLI:
bash format.sh --check
```

## Test

Run tests:

```bash
./mvnw test
```

## Usage

### Basic Parsing

```java
import io.github.linkfoundation.linksnotation.Parser;
import io.github.linkfoundation.linksnotation.Link;

import java.util.List;

public class Example {
    public static void main(String[] args) throws Exception {
        // Create parser
        Parser parser = new Parser();

        // Parse Lino format string
        String input = """
            papa (lovesMama: loves mama)
            son lovesMama
            daughter lovesMama
            all (love mama)
            """;

        List<Link> result = parser.parse(input);

        // Access parsed structure
        for (Link link : result) {
            System.out.println(link.toString());
        }
    }
}
```

### Working with Links

```java
import io.github.linkfoundation.linksnotation.Link;

import java.util.Arrays;
import java.util.List;

// Create links programmatically
Link child1 = new Link("child1");
Link child2 = new Link("child2");
Link parent = new Link("parent", Arrays.asList(child1, child2));

System.out.println(parent.toString()); // (parent: child1 child2)

// Access link properties
System.out.println("ID: " + parent.getId());
System.out.println("Values: " + parent.getValues());
```

### Advanced Usage

```java
import io.github.linkfoundation.linksnotation.Parser;
import io.github.linkfoundation.linksnotation.Link;
import io.github.linkfoundation.linksnotation.LinksGroup;

// Handle nested structures
String input = """
    parent
      child1
      child2
        grandchild1
        grandchild2
    """;

Parser parser = new Parser();
List<Link> parsed = parser.parse(input);

// Work with groups
LinksGroup group = new LinksGroup(parsed);
System.out.println(group.format());
```

### Streaming Parsing

`StreamParser` accepts arbitrary chunks and calls a `Consumer<Link>` only for
complete top-level records. Disable collection for bounded-memory processing.

```java
StreamParser stream = new StreamParser()
    .collect(false)
    .onLink(System.out::println);
stream.write("profile:\n  name Ada\n");
stream.finish("next link");
```

`StreamParser.parseChunks(chunks)` supplies a lazy `Stream<Link>`. Position,
drain, reset, and maximum-buffer controls are available on the parser itself.

## Syntax Examples

### Doublets (2-tuple)

```lino
papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
all (love mama)
```

### Triplets (3-tuple)

```lino
papa has car
mama has house
(papa and mama) are happy
```

### N-tuples with References

```lino
(linksNotation: links notation)
(This is a linksNotation as well)
(linksNotation supports (unlimited number (of references) in each link))
```

### Indented Structure

```lino
parent
  child1
  child2
    grandchild1
    grandchild2
```

### Indented ID Syntax

```lino
3:
  papa
  loves
  mama
```

This is equivalent to:

```lino
(3: papa loves mama)
```

### Multi-line Groups

A parenthesized group opens a *nested context*: its body starts fresh at
indentation level zero and follows the same rules as the root document, so a
line break inside parentheses is structure rather than decoration.

```lino
value (
  id "1"
  label "one"
)
```

The document above parses to `(value ((id 1) (label one)))` - two children, each
a link of its own - rather than to one flat list in which the boundary between
`id` and `label` would be lost. A body that stays on a single line still
collapses to a single link, so `(a b c)` is unchanged.

```java
String input = """
    value (
      id "1"
      label "one"
    )
    """;

List<Link> links = new Parser().parse(input);
System.out.println(links.get(0).format(false)); // (value ((id 1) (label one)))
```

### Comments

A `#` hides the rest of the line it stands on, so a document can carry prose
about itself:

```lino
# the machines this deploys to
deploy: staging # only staging, for now
```

Both comments are gone by the time the document is read, leaving the single
link `(deploy: staging)`. A `#` only opens a comment where a reference could
begin, so a `#` inside a token (`issue#1047`) and a `#` inside a delimited
reference (`"#"`) stay ordinary characters.

A formatter keeps the same rule from the other side: a reference that begins
with a `#` is written quoted (`'#tag'`), so a document it writes reads back as
itself.

Comments are on by default, and a parser can be told to read `#` as an ordinary
character again, for documents written before comments existed:

```java
String document = "# the machines this deploys to\ndeploy: staging # only staging, for now\n";
System.out.println(new Parser().parse(document).get(0).format(false)); // (deploy: staging)

System.out.println(new Parser(false).parse("# a b\n").get(0).format(false)); // (# a b)
```

### How a Document Was Written (CST)

Parsing keeps how every ID was written. Quoting never changes a reference:
`1` and `'1'` are the same reference, so `equals`, `hashCode`, `toString` and
`format` stay as they were. Each parsed link also carries `getRawId()`, the ID
exactly as written, and `getQuote()`, the delimiter it was written between:

```java
Link link = new Parser().parse("(t 1 '1')").get(0);
Link bare = link.getValues().get(1);
Link quoted = link.getValues().get(2);
bare.equals(quoted); // true: the same reference
bare.getRawId(); // "1", and bare.getQuote() is null
quoted.getRawId(); // "'1'", and quoted.getQuote() is "'"
link.format(false); // (t 1 1)
```

`getRawId()` is `null` for links without an ID, links built in code, and links
made by indentation path combination. `new Parser(true, false)` (AST mode)
leaves it out. `StreamParser` keeps it.

`parseCst(input)` returns the lossless concrete syntax tree. Every character,
including comments, blank lines, indentation, quotes and line endings, belongs
to exactly one token, so the original text is always recovered:

```java
CstNode cst = new Parser().parseCst("(t 1 '1') # note\n");
cst.toString(); // "(t 1 '1') # note\n"
cst.toSExpression();
// (document (line (group open_paren:"(" (line reference:"t" ...)
//   close_paren:")") whitespace:" " comment:"# note" newline:"\n"))
```

A `document` node holds `line` nodes. A line holds its tokens up to and
including its line ending. A `group` node holds `(`, the lines inside it, and
`)`. Reference tokens carry `getValue()` (what the reference means) and
`getQuote()`. `parseCst` refuses what `parse` refuses, and also refuses
unbalanced parentheses (`(a`, `a)`), which `parse` reads leniently. See
[the issue 364 case study](../docs/case-studies/issue-364/README.md).

## API Reference

### Classes

#### `Parser`

Main parser class for converting strings to links.

- `Parser()` - Create a new parser with default options
- `Parser(int maxInputSize, int maxDepth)` - Create a parser with custom limits
- `Parser(boolean comments)` - Create a parser that reads `#` as an ordinary
  character when `comments` is `false`
- `Parser(int maxInputSize, int maxDepth, boolean comments)` - Create a parser with both
- `Parser(boolean comments, boolean syntax)` and
  `Parser(int maxInputSize, int maxDepth, boolean comments, boolean syntax)` - With
  `syntax` `false` (AST mode), parsed links leave `getRawId()` null
- `parse(String input)` - Parse a Lino string and return links
- `parseCst(String input)` - Read the lossless concrete syntax tree (`CstNode`)
- `isSyntaxEnabled()` - Whether parsed links record how their IDs were written
- `getMaxDepth()` - How deep links may nest
- `Parser.DEFAULT_MAX_DEPTH` - The default `maxDepth`, 64, the same in every
  implementation

`maxInputSize` is the largest document accepted, in characters (default:
`10 * 1024 * 1024`).

`maxDepth` is how deep links may nest (default: 64). Every parenthesized group
and every indentation level is one level, and the lines of a document start at
level 0, so with `maxDepth` 1 `(a)` is accepted while `((a))`, `(a (b))` and a
group on an indented line are refused. A document nested deeper is refused
with a `NestingTooDeepException` rather than recursed into until the stack
runs out.

#### `Link`

Represents a single link with ID and values.

- `Link()` - Create an empty link
- `Link(String id)` - Create a link with an ID
- `Link(String id, List<Link> values)` - Create a link with ID and values
- `getId()` - Get link identifier
- `getValues()` - Get array of child values/links
- `toString()` - Convert link to string format
- `format(boolean lessParentheses)` - Format with optional parentheses reduction
- `equals(Object other)` - Check equality with another Link
- `static formatLinks(List<Link> links)` - Format a list of links
- `getRawId()` / `setRawId(String rawId)` - The ID exactly as the parsed document
  wrote it, or `null`; ignored by `equals`, `hashCode`, `toString` and `format`
- `getQuote()` - `'`, `"` or `` ` `` when `getRawId()` is quoted, otherwise `null`
- `static referenceQuote(String raw)` - The delimiter of one complete quoted
  reference as written, otherwise `null`

#### `CstNode` and `CstKind`

One node or token of the concrete syntax tree returned by `parseCst`.

- `getKind()` - A `CstKind`: `DOCUMENT`, `LINE`, `GROUP`, `WHITESPACE`, `NEWLINE`,
  `COMMENT`, `OPEN_PAREN`, `CLOSE_PAREN`, `COLON` or `REFERENCE`; its
  `toString()` is the shared S-expression name (`open_paren`, ...)
- `getChildren()` - The children of a node; empty for a token
- `getText()` / `toString()` - The exact text it was read from
- `getValue()`, `getQuote()` - A reference token's decoded value and delimiter
- `isToken()`, `tokens()` - Whether it is a token, and every token in order
- `toSExpression()` - The tree as `(kind child ...)` with tokens as `kind:"text"`

#### `LinksGroup`

Container for grouping related links.

- `LinksGroup()` - Create an empty group
- `LinksGroup(List<Link> links)` - Create a group with links
- `add(Link link)` - Add a link to the group
- `getLinks()` - Get the list of links
- `size()` - Get number of links
- `isEmpty()` - Check if group is empty
- `format()` - Format the group as a string

#### `ParseException`

Exception thrown when parsing fails.

#### `NestingTooDeepException`

A `ParseException` thrown when a document nests links deeper than `maxDepth`.
It points at the group or the line that is one level too deep:

```text
Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3
1 | ((((a))))
  |    ^
```

- `getMaxDepth()` - The deepest nesting the parser accepts
- `getLine()`, `getColumn()` - Where the offending group or line starts,
  counted from 1
- `getOffset()` - The same position as a character offset from the start of
  the document
- `getLineText()` - The offending line, as written
- `getSummary()` - The first line of the message, without `Nesting too deep at`
- `getSnippet()` - The offending line with a caret under the offending column

`StreamParser` reports the same error as a `StreamParseException` whose cause
is the `NestingTooDeepException` and whose line, column and offset are counted
from the start of the stream.

## Project Structure

- `src/main/java/io/github/linkfoundation/linksnotation/Link.java` - Link data structure
- `src/main/java/io/github/linkfoundation/linksnotation/LinksGroup.java` - Links group container
- `src/main/java/io/github/linkfoundation/linksnotation/Parser.java` - Parser implementation
- `src/main/java/io/github/linkfoundation/linksnotation/CstNode.java`, `CstKind.java`,
  `CstBuilder.java` - Lossless concrete syntax tree
- `src/main/java/io/github/linkfoundation/linksnotation/ParseException.java` - Parse exception
- `src/main/java/io/github/linkfoundation/linksnotation/NestingTooDeepException.java` - Nesting
  too deep exception
- `src/test/java/` - Test files

## Maintenance

### Code Formatting

This project runs the latest Google Java Format CLI. Spotless separately checks
whitespace. Its current adapter calls an API removed in formatter 1.37.0.

```bash
bash format.sh --write
```

Check formatting:

```bash
bash format.sh --check
./mvnw spotless:check
```

## Requirements

- Java 21 or higher
- Maven 3.6.3 or newer, the oldest the build plugins accept (`pom.xml` enforces it and CI
  builds with it). `./mvnw` downloads the
  Maven this repository builds with (3.10.0, pinned in `.mvn/wrapper/maven-wrapper.properties`)

## Package Information

- Group ID: `io.github.link-foundation`
- Artifact ID: `links-notation`
- License: Unlicense (see [LICENSE](../LICENSE))

Exact Unicode identifiers and values round-trip with the [reference literal contract](../docs/protocol/reference-literals.md)
introduced in 0.24.0, including mixed quotes, empty strings, controls and multiline text.
