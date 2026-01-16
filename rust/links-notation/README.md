# Links Notation Parser for Rust

Rust implementation of the Links Notation parser using nom parser combinator
library.

## Installation

Add this to your `Cargo.toml`:

```toml
[dependencies]
links-notation = { path = "." }  # For local development
# Or from a registry:
# links-notation = "0.9.0"
```

### From Source

Clone the repository and build:

```bash
git clone https://github.com/link-foundation/links-notation.git
cd links-notation/rust
cargo build
```

## Build

Build the project:

```bash
cargo build
```

Build with optimizations:

```bash
cargo build --release
```

## Test

Run tests:

```bash
cargo test
```

Run tests with output:

```bash
cargo test -- --nocapture
```

## Usage

### Using the `lino!` Macro (Recommended)

The `lino!` macro provides compile-time validation and a convenient way to work with Links Notation. It supports two syntax options:

#### Direct Syntax (Recommended for Simple Cases)

Write Links Notation directly without quotes for a cleaner, more native feel:

```rust
use links_notation::lino;

fn main() {
    // Direct syntax - no quotes needed!
    let result = lino!(papa (lovesMama: loves mama));

    // Simple triplets
    let triplet = lino!(papa has car);

    // Nested links with IDs
    let nested = lino!((outer: (inner: value)));

    // Multiple links
    let multi = lino!((a x) (b y));

    println!("Parsed: {}", result);
}
```

#### String Literal Syntax (For Complex Cases)

Use string literals when you need special characters, newlines, or quoted strings:

```rust
use links_notation::lino;

fn main() {
    // String literal for content with newlines
    let multiline = lino!("papa has car\nmama has house");

    // String literal for quoted identifiers with spaces
    let quoted = lino!(r#"("quoted id": "quoted value")"#);

    // Indented syntax requires string literal
    let indented = lino!(r#"3:
  papa
  loves
  mama"#);

    println!("Parsed: {}", multiline);
}
```

#### Benefits

The `lino!` macro:
- **Direct syntax**: Write Links Notation natively without quotes
- **Compile-time validation**: Syntax errors are caught at compile time
- **Clear error messages**: Descriptive errors for invalid syntax
- **Type-safe**: Returns fully typed `LiNo<String>` structures
- **Zero overhead**: Validation happens at compile time

#### When to Use Each Syntax

| Use Case | Syntax |
|----------|--------|
| Simple identifiers | `lino!(papa has car)` |
| Nested links | `lino!(papa (loves mama))` |
| Links with IDs | `lino!((myId: value))` |
| Multiline content | `lino!("line1\nline2")` |
| Quoted strings with spaces | `lino!(r#"("my id": "my value")"#)` |
| Indented syntax | `lino!(r#"id:\n  child"#)` |

### Basic Runtime Parsing

For dynamic content, use the runtime parser:

```rust
use links_notation::{parse_lino, LiNo};

fn main() {
    // Parse Links Notation format string
    let input = r#"papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
all (love mama)"#;

    match parse_lino(input) {
        Ok(parsed) => {
            println!("Parsed: {}", parsed);

            // Access the structure
            if let LiNo::Link { values, .. } = parsed {
                for link in values {
                    println!("Link: {}", link);
                }
            }
        }
        Err(e) => eprintln!("Parse error: {}", e),
    }
}
```

### Working with Links

```rust
use links_notation::LiNo;

// Create links programmatically
let reference = LiNo::Ref("some_value".to_string());
let link = LiNo::Link {
    id: Some("parent".to_string()),
    values: vec![
        LiNo::Ref("child1".to_string()),
        LiNo::Ref("child2".to_string()),
    ],
};

// Check link types
if link.is_link() {
    println!("This is a link");
}
if reference.is_ref() {
    println!("This is a reference");
}
```

### Formatting Output

```rust
use links_notation::parse_lino;

let input = "(parent: child1 child2)";
let parsed = parse_lino(input).unwrap();

// Regular formatting (parenthesized)
println!("Regular: {}", parsed);

// Alternate formatting (line-based)
println!("Alternate: {:#}", parsed);
```

### Handling Different Input Formats

```rust
use links_notation::parse_lino;

// Single line format
let single_line = "id: value1 value2";
let parsed = parse_lino(single_line)?;

// Parenthesized format
let parenthesized = "(id: value1 value2)";
let parsed = parse_lino(parenthesized)?;

// Multi-line with indentation
let indented = r#"parent
  child1
  child2"#;
let parsed = parse_lino(indented)?;

// Quoted identifiers and values
let quoted = r#"("quoted id": "value with spaces")"#;
let parsed = parse_lino(quoted)?;
```

## Tuple Conversion

The library supports ergonomic conversion from Rust tuples to Links Notation, similar to C#'s tuple conversion feature. This allows you to create links using native Rust tuple syntax.

### Basic Usage

```rust
use links_notation::LiNo;

// Convert a 2-tuple to a link
let link: LiNo<String> = ("papa", "mama").into();
println!("{}", link); // (papa: mama)

// Convert a 3-tuple to a link
let link: LiNo<String> = ("papa", "loves", "mama").into();
println!("{}", link); // (papa: loves mama)

// Convert a 4-tuple to a link
let link: LiNo<String> = ("id", "val1", "val2", "val3").into();
println!("{}", link); // (id: val1 val2 val3)
```

### Mixed Tuple Types

You can also mix strings and `LiNo` values in tuples:

```rust
use links_notation::LiNo;

// Mix string and LiNo
let child = LiNo::Ref("child".to_string());
let link: LiNo<String> = ("parent", child).into();
println!("{}", link); // (parent: child)

// Create anonymous links from multiple LiNo values
let a = LiNo::Ref("a".to_string());
let b = LiNo::Ref("b".to_string());
let link: LiNo<String> = (a, b).into();
println!("{}", link); // (a b)
```

### Complex Nested Structures

Tuples can be nested to create complex link structures:

```rust
use links_notation::{format_links, LiNo};

// Create nested links using tuples
let loves_mama: LiNo<String> = ("lovesMama", "loves", "mama").into();
let papa: LiNo<String> = ("papa", loves_mama).into();
let son: LiNo<String> = ("son", "lovesMama").into();
let daughter: LiNo<String> = ("daughter", "lovesMama").into();

let links = vec![papa, son, daughter];
let result = format_links(&links);
println!("{}", result);
// Output:
// (papa: (lovesMama: loves mama))
// (son: lovesMama)
// (daughter: lovesMama)
```

### Supported Tuple Conversions

The following tuple conversions are supported:

- `(&str, &str)` → Link with ID and one value
- `(String, String)` → Link with ID and one value
- `(&str, LiNo<String>)` → Link with ID and LiNo value
- `(LiNo<String>, LiNo<String>)` → Anonymous link with two values
- `(&str, &str, &str)` → Link with ID and two values
- `(String, String, String)` → Link with ID and two values
- `(&str, LiNo<String>, LiNo<String>)` → Link with ID and two LiNo values
- `(LiNo<String>, LiNo<String>, LiNo<String>)` → Anonymous link with three values
- `(&str, &str, &str, &str)` → Link with ID and three values
- `(String, String, String, String)` → Link with ID and three values
- `(&str, LiNo<String>, LiNo<String>, LiNo<String>)` → Link with ID and three LiNo values
- `(LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)` → Anonymous link with four values

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

### Enums

#### `LiNo<T>`

Represents either a Link or a Reference:

- `Link { id: Option<T>, values: Vec<Self> }` - A link with optional ID and
  child values
- `Ref(T)` - A reference to another link

### Methods

#### Methods for `LiNo<T>`

- `is_ref() -> bool` - Returns true if this is a reference
- `is_link() -> bool` - Returns true if this is a link

### Functions

#### `parse_lino(document: &str) -> Result<LiNo<String>, String>`

Parses a Links Notation document string and returns the parsed structure or an error.

### Formatting

The `Display` trait is implemented for `LiNo<T>` where `T: ToString`:

- Regular format: `format!("{}", lino)` - Parenthesized output
- Alternate format: `format!("{:#}", lino)` - Line-based output

## Maintenance

### Linting and Formatting

Check code formatting:

```bash
cargo fmt --all -- --check
```

Auto-fix formatting:

```bash
cargo fmt --all
```

Run Clippy linter:

```bash
cargo clippy --all-targets --all-features -- -D warnings
```

### Pre-commit Hooks

This project uses pre-commit hooks that automatically run `cargo fmt` and
`cargo check` before commits. To set up pre-commit hooks locally:

```bash
# From repository root
pip install pre-commit
pre-commit install
```

## Dependencies

- nom (8.0) - Parser combinator library

## Error Handling

The parser returns descriptive error messages for:

- Empty or whitespace-only input
- Malformed syntax
- Unclosed parentheses
- Invalid characters

```rust
match parse_lino("(invalid") {
    Ok(parsed) => println!("Parsed: {}", parsed),
    Err(error) => eprintln!("Error: {}", error),
}
```

## Maintenance

### Code Formatting

This project uses [rustfmt](https://github.com/rust-lang/rustfmt) for code
formatting and [clippy](https://github.com/rust-lang/rust-clippy) for linting.

#### Format all files

```bash
cargo fmt
```

#### Check formatting (without modifying files)

```bash
cargo fmt --check
```

#### Run linter

```bash
cargo clippy
```

These checks are also enforced in CI. Pull requests with formatting issues will
fail the format check.
