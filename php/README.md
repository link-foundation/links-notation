# Links Notation Parser for PHP

PHP implementation of the Links Notation (lino) parser and formatter.

## Installation

### Composer

```bash
composer require link-foundation/links-notation
```

Or add the dependency to your `composer.json`:

```json
{
    "require": {
        "link-foundation/links-notation": "^0.19"
    }
}
```

### Local Development Setup

For contributors working on the source code:

```bash
cd php
composer install
```

## Test

Run tests:

```bash
composer run-script test
```

## Lint

Check the coding standard (PSR-12):

```bash
composer run-script lint
```

Fix what can be fixed automatically:

```bash
composer run-script lint:fix
```

## Usage

### Basic Parsing

```php
<?php

require __DIR__ . '/vendor/autoload.php';

use LinkFoundation\LinksNotation\Parser;

$parser = new Parser();

$input = <<<'LINO'
papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
all (love mama)
LINO;

foreach ($parser->parse($input) as $link) {
    echo $link, PHP_EOL;
}
```

### Working with Links

```php
use LinkFoundation\LinksNotation\Link;

$parent = new Link('parent', [new Link('child1'), new Link('child2')]);

echo $parent;                    // (parent: child1 child2)
echo $parent->id;                // parent
echo count($parent->values);     // 2
echo $parent->format(true);      // parent: child1 child2
```

### Formatting a Document

```php
use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;

$parser = new Parser();
$links = $parser->parse("papa lovesMama\nson lovesMama");

echo Formatter::formatLinks($links);        // (papa lovesMama)\n(son lovesMama)
echo Formatter::formatLinks($links, true);  // papa lovesMama\nson lovesMama
```

### Formatting Options

```php
use LinkFoundation\LinksNotation\FormatConfig;
use LinkFoundation\LinksNotation\Link;

$link = new Link('id', [new Link('1'), new Link('2'), new Link('3'), new Link('4')]);

$config = new FormatConfig(maxInlineRefs: 3, preferInline: false);

echo $link->format($config);
// id:
//   1
//   2
//   3
//   4
```

### Nested Structures

```php
use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;

$parser = new Parser();

$input = <<<'LINO'
parent
  child1
  child2
    grandchild
LINO;

echo Formatter::formatLinks($parser->parse($input));
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

```php
$input = <<<'LINO'
value (
  id "1"
  label "one"
)
LINO;

echo Formatter::formatLinks($parser->parse($input)); // (value ((id 1) (label one)))
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

```php
$document = "# the machines this deploys to\ndeploy: staging # only staging, for now\n";
echo Formatter::formatLinks((new Parser())->parse($document)); // (deploy: staging)

$plain = new Parser(10 * 1024 * 1024, 1000, false);
echo Formatter::formatLinks($plain->parse("# a b\n")); // (# a b)
```

### Multi-Quote Strings

Any number of identical quote characters (`'`, `"` or `` ` ``) opens a string,
and the same number closes it. Doubling the opening sequence inside the string
escapes it.

```lino
("simple" 'simple' `simple`)
(""text with " inside"")
(```const x = 1;```)
```

## API Reference

### Classes

#### `LinkFoundation\LinksNotation\Parser`

Main parser class for converting strings into links.

- `__construct(int $maxInputSize = 10485760, int $maxDepth = 1000, bool $comments = true)` - create a
  parser with optional limits, and with `#` comments on unless `$comments` is `false`
- `parse(string $input): Link[]` - parse a lino string and return the links
  - throws `InvalidArgumentException` when the input exceeds `$maxInputSize`
  - throws `LinkFoundation\LinksNotation\ParseException` when the input cannot be parsed

#### `LinkFoundation\LinksNotation\Link`

Represents a single link with an id and values.

- `__construct(?string $id = null, ?Link[] $values = null)` - create a link
- `public ?string $id` - link identifier
- `public Link[] $values` - child values/links
- `__toString(): string` - convert the link to its string form
- `format(bool|FormatConfig $lessParentheses = false, bool $isCompoundValue = false): string` - format the link
- `equals(mixed $other): bool` - structural equality with another link
- `simplify(): Link` - unwrap a link that only holds a single value
- `combine(Link $other): Link` - combine two links into a single one
- `getValuesString(): string` - format the values without the surrounding link
- `toLinkOrIdString(): string` - format as an id when the link is a bare reference
- `static escapeReference(?string $reference): string` - quote a reference when needed

#### `LinkFoundation\LinksNotation\Formatter`

- `static formatLinks(Link[] $links, bool|FormatConfig $lessParentheses = false): string` - format a document

#### `LinkFoundation\LinksNotation\FormatConfig`

Formatting options.

- `lessParentheses` - omit the outer parentheses (default `false`)
- `maxLineLength` - line length that triggers indentation (default `80`)
- `indentLongLines` - enable the line length rule (default `false`)
- `maxInlineRefs` - number of inline references that triggers indentation (default `null`)
- `groupConsecutive` - merge consecutive links with the same id (default `false`)
- `indentString` - string used for one indentation level (default two spaces)
- `preferInline` - keep links inline whenever possible (default `true`)
- `shouldIndentByLength(string $line): bool`
- `shouldIndentByRefCount(int $refCount): bool`

#### `LinkFoundation\LinksNotation\ParseException`

Exception thrown when parsing fails.

## Project Structure

- `src/Link.php` - link data structure
- `src/Formatter.php` - document formatting
- `src/FormatConfig.php` - formatting options
- `src/Parser.php` - parser implementation
- `src/ParseException.php` - parse exception
- `tests/` - PHPUnit test suite

## Requirements

- PHP 8.4 or higher
- `ext-mbstring`
- Composer 2

## Package Information

- Package: `link-foundation/links-notation`
- Namespace: `LinkFoundation\LinksNotation`
- License: Unlicense (see [LICENSE](../LICENSE))
