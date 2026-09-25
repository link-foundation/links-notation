# Links Notation Parser for Java

Java implementation of the Links Notation parser.

## Installation

### Maven

Add the dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>io.github.link-foundation</groupId>
    <artifactId>links-notation</artifactId>
    <version>0.21.1</version>
</dependency>
```

### Gradle

Add the dependency to your `build.gradle`:

```groovy
implementation 'io.github.link-foundation:links-notation:0.21.1'
```

### Local Development Setup

For contributors working on the source code:

```bash
cd java
mvn install
```

## Build

Build the project:

```bash
mvn clean compile
```

## Test

Run tests:

```bash
mvn test
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

## API Reference

### Classes

#### `Parser`

Main parser class for converting strings to links.

- `Parser()` - Create a new parser with default options
- `Parser(int maxInputSize, int maxDepth)` - Create a parser with custom limits
- `Parser(boolean comments)` - Create a parser that reads `#` as an ordinary
  character when `comments` is `false`
- `Parser(int maxInputSize, int maxDepth, boolean comments)` - Create a parser with both
- `parse(String input)` - Parse a Lino string and return links
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
- `src/main/java/io/github/linkfoundation/linksnotation/ParseException.java` - Parse exception
- `src/main/java/io/github/linkfoundation/linksnotation/NestingTooDeepException.java` - Nesting
  too deep exception
- `src/test/java/` - Test files

## Maintenance

### Code Formatting

This project uses Google Java Format via Spotless:

```bash
mvn spotless:apply
```

Check formatting:

```bash
mvn spotless:check
```

## Requirements

- Java 21 or higher
- Maven 3.6+

## Package Information

- Group ID: `io.github.link-foundation`
- Artifact ID: `links-notation`
- License: Unlicense (see [LICENSE](../LICENSE))
