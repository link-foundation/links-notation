# Lino Protocol Parser for JavaScript

JavaScript implementation of the Links Notation parser using Bun and
Peggy.js parser generator.

## Installation

### Installing from npm

Install the package using your preferred package manager:

#### Using npm (Node.js)

```bash
npm install links-notation
```

#### Using Bun

```bash
bun add links-notation
```

#### Using Deno

```typescript
import { Parser, Link } from 'npm:links-notation@^0.6.0';
```

### Local Development Setup

For contributors working on the source code:

#### Using Bun (recommended)

```bash
cd js
bun install
```

#### Using npm

```bash
cd js
npm install
```

## Build

Compile the Peggy.js grammar:

```bash
bun run build:grammar
```

Build the project:

```bash
bun run build
```

## Test

Run tests:

```bash
bun test
```

Watch mode:

```bash
bun test --watch
```

## Usage

### TypeScript Support

This package includes TypeScript type definitions for improved developer experience with IntelliSense, autocomplete, and compile-time type checking.

```typescript
import { Parser, Link, FormatOptions } from 'links-notation';

// TypeScript provides full type checking and autocomplete
const parser = new Parser({
  maxInputSize: 10 * 1024 * 1024,
  maxDepth: 1000,
});

const links: Link[] = parser.parse('(source: type target)');
```

### Basic Parsing

```javascript
import { Parser, Link } from 'links-notation';

// Create parser
const parser = new Parser();

// Parse Lino format string
const input = `papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
all (love mama)`;

const result = parser.parse(input);
console.log(result);

// Access parsed structure
result.forEach((link) => {
  console.log(link.toString());
});
```

### Working with Links

```javascript
import { Link } from 'links-notation';

// Create links programmatically
const link = new Link('parent', [new Link('child1'), new Link('child2')]);

console.log(link.toString()); // (parent: child1 child2)

// Access link properties
console.log('ID:', link.id);
console.log('Values:', link.values);
```

### Advanced Usage

```javascript
// Handle nested structures
const input = `parent
  child1
  child2
    grandchild1
    grandchild2`;

const parsed = await parser.parse(input);

// Work with groups
import { LinksGroup } from 'links-notation';
const group = new LinksGroup(parsed);
console.log(group.format());
```

### TypeScript Usage Examples

```typescript
import {
  Parser,
  Link,
  FormatOptions,
  FormatConfig,
  formatLinks,
} from 'links-notation';

// Create parser with options
const parser = new Parser({
  maxInputSize: 5 * 1024 * 1024,
  maxDepth: 500,
});

// Parse with full type safety
const links: Link[] = parser.parse('(id: value1 value2)');

// Create links programmatically
const link = new Link('parent', [new Link('child1'), new Link('child2')]);

// Use formatting options
const formatOptions = new FormatOptions({
  lessParentheses: true,
  maxLineLength: 80,
  indentLongLines: true,
  maxInlineRefs: 3,
  groupConsecutive: false,
});

// Format with type-checked options
const formatted: string = link.format(formatOptions);

// Format multiple links
const output: string = formatLinks(links, formatOptions);
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

### Multi-line Groups

A parenthesized group opens a _nested context_: its body starts fresh at
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

```javascript
import { Parser, formatLinks } from 'links-notation';

const links = new Parser().parse(`value (
  id "1"
  label "one"
)`);

console.log(formatLinks(links)); // (value ((id 1) (label one)))
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

```javascript
import { Parser, formatLinks } from 'links-notation';

const document =
  '# the machines this deploys to\ndeploy: staging # only staging, for now\n';
console.log(formatLinks(new Parser().parse(document))); // (deploy: staging)

const plain = new Parser({ comments: false });
console.log(formatLinks(plain.parse('# a b\n'))); // (# a b)
```

## API Reference

### Classes

#### `Parser`

Main parser class for converting strings to links.

- `constructor(options)` - Create a parser; `options.comments` set to `false`
  reads `#` as an ordinary character instead of the start of a comment
- `initialize()` - Initialize the parser (async)
- `parse(input)` - Parse a Lino string and return links

#### `Link`

Represents a single link with ID and values.

- `constructor(id, values = [])` - Create a new link
- `toString()` - Convert link to string format
- `id` - Link identifier
- `values` - Array of child values/links

#### `LinksGroup`

Container for grouping related links.

- `constructor(links)` - Create a new group
- `format()` - Format the group as a string

#### `ParseError`

Thrown by `parse(input)` when the document does not parse. The message says
where the document stopped making sense and quotes the offending line:

```js
import { Parser, ParseError } from 'links-notation';

try {
  new Parser().parse('ci_gate x\nstage: rust: nextest\n');
} catch (error) {
  console.error(error.message);
  if (error instanceof ParseError) {
    console.error(`${error.line}:${error.column} (offset ${error.offset})`);
  }
}
```

```text
Syntax error at line 2, column 12: Expected "(", [ \t], [\r\n], or [^ \t\n\r(:)] but ":" found.
2 | stage: rust: nextest
  |            ^
```

- `offset` - Offset of the offending position from the start of the document
- `line`, `column` - Where the document stopped parsing, counted from 1
- `found` - The character found instead, or `null` at the end of the document
- `lineText` - The offending line, as written
- `snippet` - The offending line with a caret under the offending column
- `location` - The position as the generated parser reports it
- `cause` - The error the generated parser threw

## Project Structure

- `src/grammar.pegjs` - Peggy.js grammar definition
- `src/Link.js` - Link data structure
- `src/LinksGroup.js` - Links group container
- `src/ParseError.js` - Parse error with the position of the defect
- `src/Parser.js` - Parser wrapper
- `src/index.js` - Main entry point
- `tests/` - Test files

## Maintenance

### Linting

Run ESLint to check for code style issues:

```bash
bun run lint
```

Auto-fix linting issues:

```bash
bun run lint:fix
```

### Pre-commit Hooks

This project uses pre-commit hooks that automatically run ESLint before commits.
To set up pre-commit hooks locally:

```bash
# From repository root
pip install pre-commit
pre-commit install
```

## Dependencies

- Peggy.js (5.0.6) - Parser generator
- Bun runtime (development)

## Maintenance

### Code Formatting

This project uses [Prettier](https://prettier.io/) for code formatting.

#### Format all files

```bash
npx prettier --write .
```

#### Check formatting (without modifying files)

```bash
npx prettier --check .
```

These checks are also enforced in CI. Pull requests with formatting issues will
fail the format check.

## Package Information

- Package: `links-notation`
- License: Unlicense (see [LICENSE](../LICENSE))
