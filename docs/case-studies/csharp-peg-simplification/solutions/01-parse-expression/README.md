# Solution 1: `#parse{}` Expression Approach

## Concept

Use Pegasus's `#parse{}` expression to implement a fully procedural parser that handles all N-quote strings with a single rule.

## How It Should Work

The `#parse{}` expression in Pegasus allows returning a custom `ParseResult`:

```csharp
rule <string> = #parse{
    // Access cursor position
    var pos = startCursor.Location;

    // Access input string
    var input = subject;  // or some accessor

    // Perform custom parsing
    var result = CustomParse(input, pos);

    if (result != null) {
        // Return success with new cursor position
        return new ParseResult<string>(ref startCursor, result.EndCursor, result.Value);
    }
    return null;  // Parse failure
}
```

## Implementation Attempted

### Grammar (test_parse_expression.peg)

```
@namespace CSharpPegTest
@classname UniversalParser
@using System.Linq

@members
{
    private string _parsedValue;
    private int _parsedLength;

    private bool ParseQuotedStringAt(string input, int startPos, char quoteChar)
    {
        if (startPos >= input.Length || input[startPos] != quoteChar)
            return false;

        // Count opening quotes
        int quoteCount = 0;
        int pos = startPos;
        while (pos < input.Length && input[pos] == quoteChar)
        {
            quoteCount++;
            pos++;
        }

        string closeSeq = new string(quoteChar, quoteCount);
        string escapeSeq = new string(quoteChar, quoteCount * 2);
        var content = new System.Text.StringBuilder();

        while (pos < input.Length)
        {
            // Check for escape sequence (2*N quotes)
            if (pos + escapeSeq.Length <= input.Length &&
                input.Substring(pos, escapeSeq.Length) == escapeSeq)
            {
                content.Append(closeSeq);
                pos += escapeSeq.Length;
                continue;
            }

            // Check for closing sequence
            if (pos + quoteCount <= input.Length &&
                input.Substring(pos, quoteCount) == closeSeq)
            {
                int afterClose = pos + quoteCount;
                if (afterClose >= input.Length || input[afterClose] != quoteChar)
                {
                    _parsedValue = content.ToString();
                    _parsedLength = afterClose - startPos;
                    return true;
                }
            }

            content.Append(input[pos]);
            pos++;
        }
        return false;
    }
}

document <string> = q:quoted { q }

// Universal quoted string - handles any N quotes
quoted <string> = doubleQuoted / singleQuoted / backtickQuoted

doubleQuoted <string> = #parse{
    if (ParseQuotedStringAt(subject, startCursor.Location, '"'))
    {
        return new Pegasus.Common.ParseResult<string>(
            ref startCursor,
            startCursor.Advance(_parsedLength),
            _parsedValue
        );
    }
    return null;
}

singleQuoted <string> = #parse{
    if (ParseQuotedStringAt(subject, startCursor.Location, '\''))
    {
        return new Pegasus.Common.ParseResult<string>(
            ref startCursor,
            startCursor.Advance(_parsedLength),
            _parsedValue
        );
    }
    return null;
}

backtickQuoted <string> = #parse{
    if (ParseQuotedStringAt(subject, startCursor.Location, '`'))
    {
        return new Pegasus.Common.ParseResult<string>(
            ref startCursor,
            startCursor.Advance(_parsedLength),
            _parsedValue
        );
    }
    return null;
}
```

### Project File (test_parse_expression.csproj)

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <OutputType>Exe</OutputType>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Pegasus" Version="4.1.0" />
    <PegGrammar Include="test_parse_expression.peg" />
  </ItemGroup>
</Project>
```

## Result

### Build Error

```
$ dotnet build
error PEG0011: Unterminated code section.
```

### Analysis

When using `<PegGrammar Include="..." />` in the project file, Pegasus uses the MSBuild task `CompilePegGrammar` which has different parsing logic that doesn't properly handle multi-line `#parse{}` blocks.

### Attempted Workarounds

#### 1. Single-Line Format

```
doubleQuoted <string> = #parse{ if (ParseQuotedStringAt(subject, startCursor.Location, '"')) { return new Pegasus.Common.ParseResult<string>(ref startCursor, startCursor.Advance(_parsedLength), _parsedValue); } return null; }
```

**Result**: Same error - `PEG0011: Unterminated code section`

#### 2. Remove `<PegGrammar>` Tag

Removing the explicit tag and letting Pegasus auto-detect:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <OutputType>Exe</OutputType>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Pegasus" Version="4.1.0" />
    <!-- No PegGrammar tag -->
  </ItemGroup>
</Project>
```

**Result**: `#parse{}` works, but:
- Generated class naming issues
- Namespace conflicts
- Build integration unreliable

## Conclusion

**Status**: ❌ FAILED

The `#parse{}` expression approach cannot be used reliably in production code due to the MSBuild task incompatibility.

## Potential Future Solution

If Pegasus were to fix the `CompilePegGrammar` task to properly parse `#parse{}` blocks, this approach would be ideal. A GitHub issue could be filed for this.
