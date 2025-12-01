# Root Causes Analysis: C# Pegasus Universal Parsing Limitations

This document provides a deep analysis of each root cause preventing universal N-quote parsing in C# Pegasus.

## Root Cause 1: `#parse{}` Expression Build System Incompatibility

### Description

Pegasus's `#parse{}` expression allows custom procedural parsing, but it has limited support when integrated with .NET's build system.

### Technical Details

**What `#parse{}` should do**:
```csharp
// #parse{} allows returning a custom ParseResult
rule <string> = #parse{
    // Custom parsing logic here
    return new ParseResult<string>(ref startCursor, endCursor, value);
}
```

**The problem**:

When using `<PegGrammar Include="Parser.peg" />` in the .csproj file:
```xml
<ItemGroup>
    <PegGrammar Include="Parser.peg" />
</ItemGroup>
```

Pegasus uses the `CompilePegGrammar` MSBuild task which has a different code path that doesn't properly parse `#parse{}` blocks.

**Error produced**:
```
error PEG0011: Unterminated code section.
```

**Workaround attempted**:
Removing the explicit `<PegGrammar>` tag allows Pegasus to auto-detect .peg files through a different mechanism that DOES support `#parse{}`.

**Why the workaround doesn't work**:
- Auto-detection creates issues with generated class naming
- Namespace conflicts occur
- Build integration becomes unreliable

### Evidence

```bash
# With <PegGrammar Include="Parser.peg" />
$ dotnet build Link.Foundation.Links.Notation.csproj
Parser.peg(106,41): error PEG0011: Unterminated code section.

# Without <PegGrammar> tag (auto-detect)
$ dotnet build Link.Foundation.Links.Notation.csproj
Build succeeded. (But generated class has issues)
```

### Impact

Cannot use procedural parsing via `#parse{}` in production-ready code.

---

## Root Cause 2: No Input/Cursor Access in Semantic Predicates

### Description

Pegasus semantic predicates `&{ }` do not provide access to the input string or current cursor position, unlike JavaScript's Peggy.js.

### Technical Details

**JavaScript (Peggy.js) - Works**:
```javascript
doubleQuotedUniversal = &'"' &{
  const pos = offset();           // ← Get current position
  const result = parseQuotedStringAt(input, pos, '"');  // ← Access input
  if (result) {
    parsedValue = result.value;
    parsedLength = result.length;
    return true;
  }
  return false;
}
```

**C# (Pegasus) - Does NOT Work**:
```csharp
// This is what we WANT to write:
doubleQuotedUniversal <string> = &'"' &{
  var pos = cursor.Location;      // ← Error: 'cursor' not available
  var result = ParseAt(subject, pos, '"');  // ← Error: 'subject' not available
  return result != null;
}
```

**What's actually available in Pegasus `&{ }` predicates**:

The predicate is compiled as:
```csharp
new Func<Cursor, bool>(state =>
    /* your predicate code, only 'state' (Cursor) is available */
)
```

Inside this lambda:
- `state` is the `Cursor` struct
- `state.Location` gives the integer position
- `this.subject` is NOT accessible (parser instance scope)
- No way to get the input string

### Attempted Solutions

**Attempt 1**: Use `Cursor` type directly
```csharp
&{ ParseAtCursor(Cursor, Subject, '"') } // Error: 'Cursor' is a type
```

**Attempt 2**: Use `state` parameter
```csharp
&{ ParseAt(state.Subject, state.Location, '"') } // Error: Cursor doesn't have Subject
```

**Attempt 3**: Store in @members and access
```csharp
@members {
    private string _subject;  // But how to populate it?
}
```

### Evidence from Generated Code

In `Parser.peg.g.cs`:
```csharp
private IParseResult<string> doubleQuote1(ref Cursor cursor)
{
    // The 'cursor' parameter is local to this method
    // 'this.subject' IS available here (instance field)
    // But inside &{ } predicates, only lambda 'state' parameter available

    var r0 = this.CHECK(ref cursor, state =>
        /* Only 'state' is available here, not 'this.subject' */
    );
}
```

### Impact

Cannot implement procedural parsing logic that needs to look ahead in the input string.

---

## Root Cause 3: PEG Greedy Operator Disambiguation Problem

### Description

PEG's `*` and `+` operators are greedy by nature, matching as much input as possible. This prevents correct parsing when multiple quoted strings appear in sequence.

### Technical Details

**The pattern**:
```
doubleQuoteCaptureRaw <string> = "" ('"'+ quoteContent* '"'+)
quoteContent = [^"] / '"'+ &[^"]
```

**How PEG greedy matching works**:
1. `'"'+` matches one or more quotes → takes as many as possible
2. `quoteContent*` matches any content → takes as much as possible
3. `'"'+` matches closing quotes → takes as many as possible

**Problem scenario**:
```
Input: "first" "second"
        ^              ^
        |              +-- Last " in input
        +-- First " in input
```

The greedy `'"'+` at the start matches the first `"`.
The greedy `quoteContent*` matches everything until...
The greedy `'"'+` at the end matches the LAST `"` in the input.

**Result**:
- Expected: Two strings `"first"` and `"second"`
- Actual: One string `"first" "second"` (includes the space and second string)

### Why This Is Fundamental to PEG

PEG (Parsing Expression Grammar) uses **ordered choice** with **greedy quantifiers**:
- `*` matches zero or more, as many as possible
- `+` matches one or more, as many as possible
- No built-in backtracking for disambiguation

This is different from regex where you can use:
- Non-greedy quantifiers: `*?`, `+?`
- Backreferences: `(?P<quotes>"+)(?P=quotes)`

### Impact

Cannot create a single universal pattern that correctly parses multiple quoted strings in sequence.

### Why JavaScript Solution Works

JavaScript's solution avoids this by:
1. Peeking at input procedurally (not using PEG pattern)
2. Using a **semantic predicate** to determine exact boundaries
3. Using a **consume pattern** that matches exactly N characters

```javascript
doubleQuotedUniversal = &'"' &{
  // Procedural parsing determines EXACT boundaries
  const result = parseQuotedStringAt(input, pos, '"');
  parsedLength = result.length;  // Store exact length
  return true;
} chars:consumeDouble { return parsedValue; }

// Consume pattern matches exactly parsedLength characters
consumeDouble = c:. cs:consumeDoubleMore* { ... }
consumeDoubleMore = &{ return parsedLength > 1 && (parsedLength--, true); } c:.
```

---

## Root Cause 4: Pegasus vs Peggy.js Architectural Differences

### Description

The two PEG parser generators have fundamentally different architectures that affect what's possible in grammars.

### Comparison Table

| Feature | Peggy.js (JavaScript) | Pegasus (C#) | Impact |
|---------|----------------------|--------------|--------|
| Grammar header | Global scope | `@members` class scope | ✓ Equivalent |
| Global variables | ✓ Accessible everywhere | ✓ Via `@members` | ✓ Equivalent |
| `input` access | ✓ Built-in global | ❌ Not available | **Critical** |
| `offset()` function | ✓ Built-in function | ❌ Not available | **Critical** |
| Semantic predicates | Full JavaScript scope | Limited lambda scope | **Critical** |
| `#parse{}` | N/A | ⚠️ Limited support | **Blocking** |
| Dynamic consumption | ✓ Via semantic predicates | ❌ Cannot implement | **Critical** |

### Detailed Architectural Differences

**1. Execution Context**

Peggy.js:
- Grammar runs in JavaScript's dynamic scope
- All variables and functions are accessible
- `input` and `offset()` are injected globals

Pegasus:
- Grammar compiles to C# class methods
- Each rule is a separate method
- Predicates are lambdas with limited scope

**2. Code Blocks**

Peggy.js:
```javascript
{
  // Initialization block - runs once
  let globalVar = null;
}

rule = &{
  // Full access to globalVar, input, offset(), etc.
  return true;
}
```

Pegasus:
```csharp
@members {
    // Class members
    private string _field;
}

rule = &{
    // Lambda scope - only 'state' parameter available
    // Cannot access _field or subject
    return true;
}
```

**3. Parse Result Control**

Peggy.js:
- Can control parsing via semantic predicates
- Can "consume" exact number of characters dynamically

Pegasus:
- `#parse{}` allows custom results but has build issues
- No way to dynamically consume exact characters

### Evidence

From Pegasus source code analysis:
```csharp
// Semantic predicate compilation in Pegasus
var predicate = new Func<Cursor, bool>(state =>
    /* user code here - 'state' is only parameter */
);
```

From Peggy.js documentation:
```javascript
// Available in all code blocks:
// - input: the full input string
// - offset(): current position
// - range(): start and end positions
// - location(): line and column info
```

### Impact

The architectural differences mean techniques that work in Peggy.js fundamentally cannot be translated to Pegasus.

---

## Summary

| Root Cause | Severity | Workaround Available |
|------------|----------|---------------------|
| `#parse{}` build incompatibility | High | No viable workaround |
| No input/cursor in predicates | Critical | No workaround |
| Greedy operator disambiguation | High | Explicit rules per level |
| Architecture differences | Fundamental | Cannot be addressed |

## Recommendation

Given these fundamental limitations, the **hybrid approach** is the only viable solution:

1. **Explicit PEG rules** for common cases (1-5 quotes)
   - Provides correct disambiguation
   - Works within Pegasus's constraints

2. **Procedural helper method** for unlimited quotes (6+)
   - Uses same universal algorithm
   - Invoked via capture-then-validate pattern

This approach:
- Achieves the functional requirement (unlimited N quotes)
- Works reliably with Pegasus
- Uses the same core parsing logic as JavaScript
- Just requires more wrapper code in the grammar
