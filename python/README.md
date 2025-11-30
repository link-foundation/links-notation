# Links Notation Parser for Python

[![PyPI version](https://img.shields.io/pypi/v/links-notation.svg)](https://pypi.org/project/links-notation/)
[![Python versions](https://img.shields.io/pypi/pyversions/links-notation.svg)](https://pypi.org/project/links-notation/)
[![License](https://img.shields.io/badge/license-Unlicense-blue.svg)](../LICENSE)

Python implementation of the Links Notation parser.

## Installation

```bash
pip install links-notation
```

## Quick Start

```python
from links_notation import Parser

parser = Parser()
links = parser.parse("papa (lovesMama: loves mama)")

# Access parsed links
for link in links:
    print(link)
```

## Usage

### Basic Parsing

```python
from links_notation import Parser, format_links

parser = Parser()

# Parse simple links
links = parser.parse("(papa: loves mama)")
print(links[0].id)  # 'papa'
print(len(links[0].values))  # 2

# Format links back to string
output = format_links(links)
print(output)  # (papa: loves mama)
```

### Working with Link Objects

```python
from links_notation import Link

# Create links programmatically
link = Link('parent', [Link('child1'), Link('child2')])
print(str(link))  # (parent: child1 child2)

# Access link properties
print(link.id)  # 'parent'
print(link.values[0].id)  # 'child1'

# Combine links
combined = link.combine(Link('another'))
print(str(combined))  # ((parent: child1 child2) another)
```

### Indented Syntax

```python
parser = Parser()

# Parse indented notation
text = """3:
  papa
  loves
  mama"""

links = parser.parse(text)
# Produces: (3: papa loves mama)
```

## API Reference

### Parser

The main parser class for Links Notation.

- `parse(input_text: str) -> List[Link]`: Parse Links Notation text into Link objects

### Link

Represents a link in Links Notation.

- `__init__(id: Optional[str] = None, values: Optional[List[Link]] = None)`
- `format(less_parentheses: bool = False) -> str`: Format as string
- `simplify() -> Link`: Simplify link structure
- `combine(other: Link) -> Link`: Combine with another link

### format_links

Format a list of links into Links Notation.

- `format_links(links: List[Link], less_parentheses: bool = False) -> str`

## Examples

### Doublets (2-tuple)

```python
parser = Parser()
text = """
papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
"""
links = parser.parse(text)
```

### Triplets (3-tuple)

```python
text = """
papa has car
mama has house
(papa and mama) are happy
"""
links = parser.parse(text)
```

### Quoted References

```python
# References with special characters need quotes
text = '("has space": "value with: colon")'
links = parser.parse(text)
```

## Development

### Running Tests

```bash
# Install development dependencies
pip install pytest

# Run tests
pytest
```

### Building

```bash
pip install build
python -m build
```

## Maintenance

### Linting and Formatting

Install linting tools:

```bash
pip install ".[lint]"
# Or install all dev dependencies
pip install ".[dev]"
```

Check code formatting with Black:

```bash
black --check --diff .
```

Auto-fix formatting:

```bash
black .
```

Check import sorting with isort:

```bash
isort --check-only --diff .
```

Auto-fix import sorting:

```bash
isort .
```

Run flake8 linter:

```bash
flake8 --max-line-length=120
```

### Pre-commit Hooks

This project uses pre-commit hooks that automatically run Black, isort, and
flake8 before commits. To set up pre-commit hooks locally:

```bash
# From repository root
pip install pre-commit
pre-commit install
```

## License

This project is released into the public domain under the [Unlicense](../LICENSE).

## Links

- [Main Repository](https://github.com/link-foundation/links-notation)
- [PyPI Package](https://pypi.org/project/links-notation/)
- [Documentation](https://link-foundation.github.io/links-notation/)
