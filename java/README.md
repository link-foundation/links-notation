# Links Notation Parser for Java

Java implementation of the Links Notation parser.

## Installation

### Maven

Add the dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>io.github.link-foundation</groupId>
    <artifactId>links-notation</artifactId>
    <version>0.1.0</version>
</dependency>
```

### Gradle

Add the dependency to your `build.gradle`:

```groovy
implementation 'io.github.link-foundation:links-notation:0.1.0'
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

## API Reference

### Classes

#### `Parser`

Main parser class for converting strings to links.

- `Parser()` - Create a new parser with default options
- `Parser(int maxInputSize, int maxDepth)` - Create a parser with custom limits
- `parse(String input)` - Parse a Lino string and return links

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

## Project Structure

- `src/main/java/io/github/linkfoundation/linksnotation/Link.java` - Link data structure
- `src/main/java/io/github/linkfoundation/linksnotation/LinksGroup.java` - Links group container
- `src/main/java/io/github/linkfoundation/linksnotation/Parser.java` - Parser implementation
- `src/main/java/io/github/linkfoundation/linksnotation/ParseException.java` - Parse exception
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

- Java 11 or higher
- Maven 3.6+

## Package Information

- Group ID: `io.github.link-foundation`
- Artifact ID: `links-notation`
- Version: 0.1.0
- License: Unlicense
