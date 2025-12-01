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

### Recommended Approach: Hybrid

The current C# implementation uses a **hybrid approach** that achieves the same functionality:

1. **Explicit PEG rules for quote levels 1-5** (most common cases)
   - Required for Pegasus to correctly disambiguate multiple quoted strings
   - Provides proper PEG parsing semantics

2. **Procedural `ParseHighQuoteString()` method for levels 6+**
   - Handles unlimited quote counts
   - Uses the same universal parsing algorithm

The core parsing logic is universal and simple - it's just wrapped in PEG rules that provide correct disambiguation semantics.

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

**C# (Pegasus) - Hybrid approach:**
```
// Explicit rules for 1-5 quotes
singleQuotedReference <string> = doubleQuote1 / singleQuote1 / backtickQuote1
doubleQuote1 <string> = '"' r:doubleQuote1Content* '"' { string.Join("", r) }
// ... (similar for levels 2-5)

// Procedural for 6+ quotes
highQuotedReference <string> = &('""""""' / "''''''" / '``````') raw:highQuoteCapture { raw }
highQuoteCapture <string> = raw:highQuoteDoubleRaw &{ ParseHighQuoteString(raw, '"') } { _highQuoteValue }
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
