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
import { Parser, Link } from "npm:links-notation@^0.6.0";
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
result.forEach(link => {
    console.log(link.toString());
});
```

### Working with Links

```javascript
import { Link } from 'links-notation';

// Create links programmatically
const link = new Link('parent', [
    new Link('child1'),
    new Link('child2')
]);

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

## Project Structure

- `src/grammar.pegjs` - Peggy.js grammar definition
- `src/Link.js` - Link data structure
- `src/LinksGroup.js` - Links group container
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

## Package Information

- Package: `links-notation`
- Version: 0.1.0
- License: MIT
