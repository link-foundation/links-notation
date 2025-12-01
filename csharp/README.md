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

## API Reference

### Classes

- **Parser\<TLinkAddress\>**: Main parser class for converting strings to links
- **Link\<TLinkAddress\>**: Represents a single link with ID and values
- **LinksGroup\<TLinkAddress\>**: Container for grouping related links

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

- .NET 8.0
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
