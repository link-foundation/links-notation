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

### Streaming Parser

For processing large messages efficiently without loading everything into memory:

```javascript
import { StreamParser, ParseError } from 'links-notation';

const parser = new StreamParser();

// Register event handlers
parser.on('link', (link) => {
  // Process each link as it's parsed
  console.log('Parsed:', link.toString());
});

parser.on('error', (error) => {
  // Handle parse errors with location info
  console.error(`Error at line ${error.line}, col ${error.column}: ${error.message}`);
});

// Feed data incrementally
parser.write('papa (lovesMama: loves mama)\n');
parser.write('son lovesMama\n');

// Finish parsing and get all links
const links = parser.end();
```

The streaming parser supports:
- **Memory efficiency**: Process large messages without loading everything into memory
- **Low latency**: Start processing before the full message is received
- **Detailed error reporting**: Errors include line and column information
- **Event-based API**: Receive links as they are parsed

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

## API Reference

### Classes

#### `Parser`

Main parser class for converting strings to links.

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

#### `StreamParser`

Streaming parser for incremental processing.

- `constructor(options = {})` - Create a new streaming parser
  - `options.maxInputSize` - Maximum input size in bytes (default: 10MB)
  - `options.maxDepth` - Maximum nesting depth (default: 1000)
- `on(event, handler)` - Register an event handler ('link', 'error', 'end')
- `off(event, handler)` - Remove an event handler
- `write(chunk)` - Write a chunk of data to the parser
- `end()` - Signal end of input and get all parsed links
- `reset()` - Reset the parser for reuse
- `getLinks()` - Get all links parsed so far
- `getPosition()` - Get current parser position (line, column, offset)
- `isEnded()` - Check if parser has ended

#### `ParseError`

Error class with location information.

- `message` - Error message
- `line` - Line number (1-based)
- `column` - Column number (1-based)
- `offset` - Byte offset in the input

## Project Structure

- `src/grammar.pegjs` - Peggy.js grammar definition
- `src/Link.js` - Link data structure
- `src/LinksGroup.js` - Links group container
- `src/Parser.js` - Parser wrapper
- `src/StreamParser.js` - Streaming parser for large messages
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
- Version: 0.1.0
- License: MIT
