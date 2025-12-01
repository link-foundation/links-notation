# Timeline of C# PEG Parser Simplification Investigation

This document provides a detailed chronological account of the investigation into simplifying the C# Pegasus PEG parser.

## Context

- **Issue**: #142 - Support more quotes options
- **Date**: December 1, 2025
- **Duration**: ~3.5 hours of investigation

## Detailed Timeline

### 15:20 UTC - Initial Unlimited Quotes Request

**User request**: "We should support any number of quotes in a series, not only 1-5, but any number of N. Is it possible to do with PEG and other parsers?"

**Status**: Investigation begins

---

### 15:41-15:46 UTC - First Implementation Attempt

**Action**: Implemented explicit PEG rules for quote levels 1-5 across all languages.

**Result**: Tests pass but user requests simpler, more universal approach.

---

### 16:10 UTC - Discovery of PEG Greedy Problem

**Finding**: PEG.js greedy patterns don't correctly disambiguate multiple quoted strings.

**Example**:
```
Input: "a" "b"
Pattern: $('"'+ content* '"'+)
Expected: ["a", "b"] (two separate strings)
Actual: Fails - greedy + captures from first " to last "
```

**Comment posted to PR**:
> Issue: PEG.js greedy patterns like `$('"'+ content* '"'+)` don't correctly disambiguate multiple quoted strings separated by whitespace.
>
> Solution: Keep explicit PEG rules for 1-5 quotes (which provide proper disambiguation) while using the procedural parser function for 6+ quotes (unlimited support).

---

### 17:27 UTC - User Questions About Variables/Backreferences

**User request**: "Can we use some kind of variable? So if we start with `"` we match `"` at the end... Like we have in regular expressions: `(?P<quotes>"+)(.*)(?P=quotes)`"

**Question**: Can this be done in PEG parsers?

---

### 17:38-17:50 UTC - JavaScript Universal Solution Discovered

**Research findings**:
1. Standard PEG does **not** support backreferences like regex
2. PEG parsers are deterministic and don't backtrack the same way

**Solution discovered**: Global variables + semantic predicates

The technique uses:
1. **Global variables** to store parsed result
2. **`input` and `offset()`** to peek at input directly
3. **Procedural parsing function** for the actual logic
4. **Consume pattern** to advance parser position

**Implementation**: Successfully simplified JavaScript grammar from ~256 lines to ~208 lines (-19%).

**Comment posted to PR**:
> Inspired by heredoc parsing patterns, I implemented a universal approach using:
> - Global variable to store parsed result
> - `input` and `offset()` to peek at the input string directly in a semantic predicate
> - Procedural parsing function that counts opening quotes, parses content, handles escaping

---

### 18:01 UTC - User Requests Universal Approach for All Languages

**User request**: "So I still see a lot of code changes in grammars, can we do simple universal logic in all languages like you did in [JavaScript]?"

---

### 18:02-18:08 UTC - First C# Attempt with `#parse{}` Expression

**Approach**: Attempted to use Pegasus's `#parse{}` syntax for universal parsing.

**Code attempted**:
```
doubleQuotedUniversal <string> = #parse{
    if (ParseQuotedStringAt(state.Subject, state.Location, '"')) {
        return new Pegasus.Common.ParseResult<string>(ref state, state.Advance(_parsedLength), _parsedValue);
    }
    return null;
}
```

**Build command**:
```bash
cd /tmp/gh-issue-solver-1764612152720/csharp && dotnet build Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj
```

**Result**: Build error
```
/tmp/gh-issue-solver-1764612152720/csharp/Link.Foundation.Links.Notation/Parser.peg(106,41):
error PEG0011: Unterminated code section.
```

---

### 18:08-18:10 UTC - Single-Line Format Attempt

**Hypothesis**: Maybe Pegasus doesn't handle newlines in `#parse{}` blocks.

**Code attempted** (single line):
```
doubleQuotedUniversal <string> = #parse{ if (ParseQuotedStringAt(state.Subject, state.Location, '"')) { return new Pegasus.Common.ParseResult<string>(ref state, state.Advance(_parsedLength), _parsedValue); } return null; }
```

**Result**: Same error - `PEG0011: Unterminated code section`

---

### 18:10-18:15 UTC - Investigation of `<PegGrammar>` Tag

**Discovery**: The `<PegGrammar Include="Parser.peg" />` tag in .csproj triggers a different code path in Pegasus.

**Experiment**:
1. Removed explicit `<PegGrammar>` tag
2. Let Pegasus auto-detect .peg files
3. `#parse{}` syntax works!

**New problem**: Auto-detection creates issues with generated parser class naming and namespace.

**Conclusion**: Using `<PegGrammar>` tag is required for proper project integration, but it doesn't support `#parse{}`.

---

### 18:16 UTC - Investigation Summary Posted to PR

**Comment posted**:
> ### The Issue
> When the project uses `<PegGrammar Include="Parser.peg" />` in the .csproj file, Pegasus uses a different code path that **does not support** the `#parse{}` syntax properly. The error `PEG0011: Unterminated code section` occurs.
>
> Interestingly, when removing the explicit `<PegGrammar>` tag (letting Pegasus auto-detect .peg files), the `#parse{}` syntax works. However, this creates other issues with the generated parser class.

---

### 18:22 UTC - User Asks Directly About Universal C# Parsing

**User request**: "Can we for example use universal parsing like we do have in JavaScript PEG.js also in C# Pegasus? So it using the same function for all number of quotes (1+)."

---

### 18:23-18:28 UTC - Capture-then-Validate Approach

**New approach**: Capture a greedy PEG pattern, then validate procedurally.

**Grammar**:
```
quoted <string> = raw:doubleQuoteCaptureRaw &{ TryParseQuoteAtStart(raw, '"') } { _parsedValue }
doubleQuoteCaptureRaw <string> = "" ('"'+ quoteContent* '"'+)
quoteContent = [^"] / '"'+ &[^"]
```

**Test results for isolated strings** (SUCCESS):
```
"hello" → hello ✓
""world"" → world ✓
"""foo""" → foo ✓
'text with '' escaped' → text with ' escaped ✓
`text with `` escaped` → text with ` escaped ✓
```

**Test for multiple strings** (FAILURE):
```
Input: "first" "second"
Expected: 2 separate strings
Actual: Greedy pattern captures from first " to last " → ONE string
```

---

### 18:28-18:36 UTC - Semantic Predicates Investigation

**Attempted**: Access `Cursor` and `Subject` in semantic predicates like JavaScript.

**Code attempted**:
```
doubleQuoted <string> = &'"' &{
    if (ParseAtCursor(Cursor, Subject, '"')) { return true; }
    return false;
} chars:consume { _parsedValue }
```

**Result**: Compilation error
```
'Cursor' is a type, which is not valid in the given context
```

**Finding**: Pegasus does NOT provide direct access to cursor/input in `&{ }` predicates.

In Pegasus, semantic predicates receive only the `state` parameter which is a `Cursor` struct, but:
- `state.Subject` is not accessible (it's the full input string, accessed differently)
- `state.Location` gives position, but no direct subject access in predicates

---

### 18:36-18:43 UTC - Investigation of Pegasus Generated Code

**Action**: Analyzed generated `Parser.peg.g.cs` to understand internal structure.

**Findings**:
```csharp
// Semantic predicates are compiled as:
new Func<Cursor, bool>(state => /* predicate code */)

// The 'state' parameter is the Cursor, but Subject is accessed via:
// this.subject (in the generated parser class context)
// NOT available inside the lambda expression
```

---

### 18:43 UTC - Final Conclusion

**Posted comprehensive investigation summary to PR**:

> ## Investigation: Can C# Pegasus Use Universal Parsing Like JavaScript?
>
> **No, C# Pegasus cannot use the exact same universal approach as JavaScript** due to fundamental differences in how the parser generators work.
>
> ### What JavaScript Does
> JavaScript (Peggy.js) uses a clean universal approach with semantic predicates accessing `input` and `offset()` directly.
>
> ### What I Tried for C# Pegasus
> 1. **`#parse{}` expression** → PEG0011 error with `<PegGrammar>` tag
> 2. **Capture-then-validate** → Works for isolated strings, fails for disambiguation
> 3. **Access cursor/input in predicates** → Not supported
>
> ### Recommendation
> The hybrid approach (explicit rules for 1-5 + procedural for 6+) is the best solution given Pegasus's constraints.

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total investigation time | ~3.5 hours |
| Approaches attempted | 4 |
| Successful for isolated strings | 1 (capture-then-validate) |
| Successful for full use case | 0 |
| Build errors encountered | 3+ |
| Root causes identified | 4 |

## Key Timestamps

| Time (UTC) | Event |
|------------|-------|
| 15:20 | Investigation begins |
| 16:10 | PEG greedy problem discovered |
| 17:50 | JavaScript solution found |
| 18:08 | First C# `#parse{}` attempt fails |
| 18:28 | Capture-then-validate partial success |
| 18:43 | Final conclusion: Universal approach not possible |
