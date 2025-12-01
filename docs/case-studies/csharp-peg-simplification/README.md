# Case Study: C# Pegasus PEG Parser Simplification Investigation

## Overview

This case study documents an extensive investigation into whether the C# Pegasus PEG parser can be simplified to use a universal parsing approach similar to JavaScript's Peggy.js implementation for N-quote string parsing.

**Related Issue**: [#142 - Support more quotes options](https://github.com/link-foundation/links-notation/issues/142)
**Related PR**: [#168 - Add support for backtick quotes and multi-quote strings](https://github.com/link-foundation/links-notation/pull/168)

## Problem Statement

The requirement is to support:
1. Three quote types: double quotes (`"`), single quotes (`'`), and backticks (`` ` ``)
2. Any number N of consecutive quotes to open/close strings (N = 1, 2, 3, ...)
3. Escaping via doubling: 2×N quotes inside become N quotes in output

**Goal**: Use a single universal parsing function for all quote types and all N values, as successfully implemented in JavaScript (Peggy.js).

## Timeline of Events

### 2025-12-01T15:20 - Initial Request
User asked if it's possible to support any number of quotes (not just 1-5) with PEG parsers.

### 2025-12-01T16:10 - First Discovery: PEG Greedy Problem
Investigation revealed that PEG.js greedy patterns like `$('"'+ content* '"'+)` don't correctly disambiguate multiple quoted strings. For example, parsing `"a" "b"` fails because the greedy `+` captures too much.

### 2025-12-01T17:27 - User Question: Variables/Backreferences in PEG
User asked about using variable patterns like regex `(?P<quotes>"+)(.*)(?P=quotes)`.

### 2025-12-01T17:50 - JavaScript Solution Found
Discovered technique using **global variables + semantic predicates** with `input` and `offset()` to implement universal N-quote parsing in Peggy.js. This technique is inspired by heredoc parsing patterns.

### 2025-12-01T18:01 - Simplification Request
User requested the same universal approach in all languages including C#.

### 2025-12-01T18:08 - First C# Attempt: `#parse{}` Expression
Attempted to use Pegasus's `#parse{}` syntax. Result: **PEG0011: Unterminated code section** error.

### 2025-12-01T18:16 - `<PegGrammar>` Tag Discovery
Found that removing `<PegGrammar Include="Parser.peg" />` from .csproj allows `#parse{}` to work, but creates other issues.

### 2025-12-01T18:22 - User Question: Universal C# Parsing
User explicitly asked if C# Pegasus can use universal parsing like JavaScript.

### 2025-12-01T18:28 - Capture-then-Validate Approach Tested
Attempted alternative approach: capture greedy pattern then validate procedurally.
- **Success**: Isolated quoted strings work correctly
- **Failure**: Multiple quoted strings on same line fail due to greedy capture

### 2025-12-01T18:43 - Final Conclusion
Confirmed that C# Pegasus cannot use the same universal approach as JavaScript due to fundamental PEG generator differences.

## Root Causes

### 1. `#parse{}` Expression Limitations

Pegasus has different code paths for `#parse{}` handling:
- When using `<PegGrammar Include="Parser.peg" />` in .csproj: **Does NOT support `#parse{}` properly**
- When auto-detecting .peg files: Supports `#parse{}` but creates other issues

**Error**: `PEG0011: Unterminated code section`

### 2. No Access to Input/Cursor in Semantic Predicates

JavaScript's Peggy.js provides:
```javascript
&{
  const pos = offset();
  const result = parseQuotedStringAt(input, pos, '"');
  // ...
}
```

Pegasus semantic predicates `&{ }` do NOT provide direct access to:
- `input` / `subject` (the full input string)
- `cursor` / `offset` (current parsing position)

### 3. PEG Greedy Operator Disambiguation Problem

PEG's `*` and `+` operators are **greedy** - they match as much as possible.

Pattern: `('"'+ content* '"'+)`

**Problem**:
```
Input: "first" "second"
Expected: Parse two separate strings "first" and "second"
Actual: Greedy pattern captures from first " to LAST ", including whitespace
```

The greedy nature prevents correct disambiguation when multiple quoted strings appear together.

### 4. Pegasus vs Peggy.js Architectural Differences

| Feature | Peggy.js (JavaScript) | Pegasus (C#) |
|---------|----------------------|--------------|
| Global variables in header | ✅ Yes | ✅ Yes (@members) |
| `input` access in predicates | ✅ Yes | ❌ No |
| `offset()` function | ✅ Yes | ❌ No |
| `#parse{}` expressions | N/A | ⚠️ Partial support |
| Dynamic consumption patterns | ✅ Yes | ❌ No |

## Solutions Attempted

See the `solutions/` subdirectory for detailed experiments:

1. **`#parse{}` Expression Approach** - Failed due to PEG0011 error
2. **Capture-then-Validate Approach** - Works for isolated strings, fails for disambiguation
3. **Semantic Predicates with State** - Cannot access input/cursor directly
4. **Hybrid Approach** (Current) - Explicit PEG rules for 1-5 quotes + procedural for 6+

## Conclusion

**C# Pegasus cannot use the exact same universal approach as JavaScript** due to fundamental differences in how the parser generators work.

### Recommended Approach: Minimized Hybrid

After further investigation, we found that the number of explicit PEG rules can be **minimized to just N=1 and N=2**, with procedural parsing handling N>=3.

#### Why N=1 Explicit Rules Are Required
Multiple single-quoted strings on the same line (e.g., `"a" "b"`) require explicit PEG rules for proper disambiguation. Without explicit rules, greedy PEG operators capture too much.

#### Why N=2 Explicit Rules Are Required
Escape sequences in N=2 strings (e.g., `""text with """" escaped""`) cannot be correctly captured by generic patterns because the content pattern cannot distinguish between escape sequences and closing quotes without knowing N.

#### Why N>=3 Can Use Procedural Parsing
For N>=3, the content pattern `'"'+ &[^"]` (quote sequences followed by non-quote) works because:
- The raw capture is permissive enough to capture escape sequences
- The procedural validator correctly identifies the exact N from the captured string
- The lookahead `&('"""' / "'''" / '```')` ensures we only try the procedural path for 3+ quotes

### Grammar Size Comparison

| Approach | Grammar Lines | Reduction |
|----------|---------------|-----------|
| Original (explicit 1-5, procedural 6+) | 188 | baseline |
| **Optimized (explicit 1-2, procedural 3+)** | 155 | **17.5% smaller** |

### Current Implementation

The optimized C# implementation uses:

1. **Explicit PEG rules for N=1** (3 quote types × 2 rules = 6 rules)
   - Required for disambiguation of multiple strings on same line

2. **Explicit PEG rules for N=2** (3 quote types × 2 rules = 6 rules)
   - Required for proper escape sequence handling

3. **Procedural `ParseMultiQuoteString()` method for N>=3**
   - Handles unlimited quote counts (3, 4, 5, ... 100, ... any N)
   - Uses the same universal parsing algorithm

### Code Comparison

**JavaScript (Peggy.js) - Universal for all N:**
```javascript
doubleQuotedUniversal = &'"' &{
  const pos = offset();
  const result = parseQuotedStringAt(input, pos, '"');
  if (result) {
    parsedValue = result.value;
    parsedLength = result.length;
    return true;
  }
  return false;
} chars:consumeDouble { return parsedValue; }
```

**C# (Pegasus) - Optimized hybrid approach:**
```
// Order: high quotes (3+) first, then double quotes (2), then single quotes (1), then simple
reference <string> = highQuotedReference / doubleQuotedReference / singleQuotedReference / simpleReference

// N=1: Explicit PEG rules for disambiguation
singleQuotedReference <string> = singleDoubleQuote / singleSingleQuote / singleBacktickQuote
singleDoubleQuote <string> = '"' r:singleDoubleContent* '"' { string.Join("", r) }
singleDoubleContent <string> = '""' { "\"" } / c:[^"] { c.ToString() }

// N=2: Explicit PEG rules for escape handling
doubleQuotedReference <string> = doubleDoubleQuote / doubleSingleQuote / doubleBacktickQuote
doubleDoubleQuote <string> = '""' r:doubleDoubleContent* '""' { string.Join("", r) }
doubleDoubleContent <string> = '""""' { "\"\"" } / !'""' c:. { c.ToString() }

// N>=3: Procedural parsing for unlimited quotes
highQuotedReference <string> = &('"""' / "'''" / '```') raw:highQuoteCapture { raw }
highQuoteCapture <string> = raw:highQuoteDoubleRaw &{ ParseMultiQuoteString(raw, '"') } { _multiQuoteValue }
```

## Files in This Case Study

```
docs/case-studies/csharp-peg-simplification/
├── README.md                    # This file
├── timeline.md                  # Detailed timeline with timestamps
├── root-causes.md              # Deep dive into each root cause
├── solutions/                   # Experimental solutions
│   ├── 01-parse-expression/    # #parse{} approach
│   ├── 02-capture-validate/    # Capture-then-validate approach
│   ├── 03-semantic-predicates/ # Semantic predicates approach
│   └── 04-other-approaches/    # Other attempted solutions
└── experiments/                 # Standalone experiment files
```

## References

- [Peggy.js Documentation](https://peggyjs.org/documentation.html)
- [Pegasus GitHub Repository](https://github.com/otac0n/Pegasus)
- [Pegasus Syntax Guide](https://github.com/otac0n/Pegasus/wiki/Syntax-Guide)
- [Stack Overflow: Heredocs with PEG.js](https://stackoverflow.com/questions/69566480/implement-heredocs-with-trim-indent-using-peg-js)
