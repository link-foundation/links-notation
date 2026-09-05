# Links Notation Parser for C&#35;

C&#35; implementation of the Links Notation parser using Pegasus parser
generator and Platform.Collections.

## Installation

### Package Manager

```text
Install-Package Link.Foundation.Links.Notation
```

### .NET CLI

```bash
dotnet add package Link.Foundation.Links.Notation
```

### PackageReference

```xml
<PackageReference Include="Link.Foundation.Links.Notation" Version="0.9.0" />
```

## Build from Source

Clone the repository and build:

```bash
git clone https://github.com/link-foundation/links-notation.git
cd links-notation/csharp
dotnet build Link.Foundation.Links.Notation.sln
```

## Test

Run tests:

```bash
dotnet test
```

## Usage

### Basic Parsing

```csharp
using Link.Foundation.Links.Notation;

// Create parser
var parser = new Parser();

// Parse Links Notation format string
string input = @"papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
all (love mama)";

var links = parser.Parse(input);

// Access parsed links
foreach (var link in links)
{
    Console.WriteLine(link.ToString());
}
```

### Converting Back to String

```csharp
using Link.Foundation.Links.Notation;

// Format links back to string
string formatted = links.Format();
Console.WriteLine(formatted);
```

### Working with Links

```csharp
// Create link programmatically
var link = new Link<string>("id", new[] { "value1", "value2" });

// Access link properties
Console.WriteLine($"ID: {link.Id}");
foreach (var value in link.Values)
{
    Console.WriteLine($"Value: {value}");
}
```

### Advanced Usage with Generic Types

```csharp
// Using numeric link addresses
var parser = new Parser<ulong>();
var numericLinks = parser.Parse("(1: 2 3)");

// Working with custom address types
var customParser = new Parser<Guid>();
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

```csharp
var links = new Parser().Parse(@"value (
  id ""1""
  label ""one""
)");

Console.WriteLine(links[0]); // (value ((id 1) (label one)))
```

## API Reference

### Classes

- **Parser\<TLinkAddress\>**: Main parser class for converting strings to links
- **Link\<TLinkAddress\>**: Represents a single link with ID and values
- **LinksGroup\<TLinkAddress\>**: Container for grouping related links
- **ParseException**: Thrown when a document does not parse

### Error Handling

`Parse` throws a `ParseException` whose message says where the document stopped
making sense and quotes the offending line with a caret under it:

```csharp
try
{
    new Parser().Parse("# ok line\n# break: two\nci_gate x\n");
}
catch (ParseException error)
{
    Console.Error.WriteLine(error.Message);
    Console.Error.WriteLine($"{error.Line}:{error.Column} (offset {error.Offset})");
}
```

```text
Syntax error at line 2, column 8: unexpected ":"
2 | # break: two
  |        ^
```

`ParseException` derives from `FormatException`, so callers that already catch
`FormatException` keep working, and carries `Offset`, `Line`, `Column`, `Found`,
`LineText`, `Summary` and `Snippet` for callers that report errors themselves.

### Extension Methods

- **IListExtensions.Format()**: Converts list of links back to string format
- **ILinksGroupListExtensions**: Additional operations for link groups

## Maintenance

### Linting and Formatting

Check code formatting:

```bash
dotnet format --verify-no-changes --verbosity diagnostic
```

Auto-fix formatting:

```bash
dotnet format
```

### Pre-commit Hooks

This project uses pre-commit hooks. To set up pre-commit hooks locally:

```bash
# From repository root
pip install pre-commit
pre-commit install
```

Note: C# formatting checks are integrated into the CI pipeline using
`dotnet format`.

## Dependencies

- .NET 10.0
- Microsoft.CSharp (4.7.0)
- Pegasus (4.1.0)
- Platform.Collections (0.3.2)

## Maintenance

### Code Formatting

This project uses [dotnet format](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format)
for code formatting.

#### Format all files

```bash
dotnet format
```

#### Check formatting (without modifying files)

```bash
dotnet format --verify-no-changes
```

These checks are also enforced in CI. Pull requests with formatting issues will
fail the format check.

## Documentation

For complete API documentation, visit:
[Link.Foundation.Links.Notation Documentation](https://link-foundation.github.io/links-notation/csharp/api/Link.Foundation.Links.Notation.html)
