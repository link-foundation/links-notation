# Solution 3: Semantic Predicates with Input Access

## Concept

Use semantic predicates `&{ }` to access the input string and cursor position directly, similar to how JavaScript's Peggy.js implements universal parsing.

## JavaScript Reference (What We Want to Achieve)

In Peggy.js, this works perfectly:

```javascript
doubleQuotedUniversal = &'"' &{
  const pos = offset();                              // Get current position
  const result = parseQuotedStringAt(input, pos, '"'); // Access input string
  if (result) {
    parsedValue = result.value;
    parsedLength = result.length;
    return true;
  }
  return false;
} chars:consumeDouble { return parsedValue; }
```

Key Peggy.js features used:
- `input` - built-in variable containing the full input string
- `offset()` - built-in function returning current parse position
- Both accessible in any code block including semantic predicates

## Attempted C# Implementation

### Grammar (test_semantic_predicates.peg)

```
@namespace CSharpPegTest
@classname SemanticPredicateParser
@using System.Linq

@members
{
    private string _parsedValue;
    private int _parsedLength;

    private bool ParseQuotedStringAt(string input, int startPos, char quoteChar)
    {
        // Same universal parsing logic
        // ... (implementation)
    }
}

// ATTEMPTED: Access cursor and subject in semantic predicate
// This is what we WANT to write:
doubleQuoted <string> = &'"' &{
    // Try to access cursor position and input string
    var pos = cursor.Location;  // ← Does cursor exist here?
    var input = subject;        // ← Does subject exist here?
    return ParseQuotedStringAt(input, pos, '"');
} chars:consume { _parsedValue }
```

## Investigation Results

### Attempt 1: Using `Cursor` and `Subject` Directly

```csharp
&{ ParseQuotedStringAt(Subject, Cursor.Location, '"') }
```

**Error**:
```
error CS0119: 'Cursor' is a type, which is not valid in the given context
error CS0103: The name 'Subject' does not exist in the current context
```

### Attempt 2: Using `state` Parameter

Looking at Pegasus-generated code, semantic predicates become:
```csharp
new Func<Cursor, bool>(state => /* predicate code */)
```

So we tried:
```csharp
&{ ParseQuotedStringAt(state.Subject, state.Location, '"') }
```

**Error**:
```
error CS1061: 'Cursor' does not contain a definition for 'Subject'
```

The `Cursor` struct only has `Location` (position index), not access to the input string.

### Attempt 3: Store Input in `@members`

```csharp
@members
{
    private string _inputString;

    public void SetInput(string input)
    {
        _inputString = input;
    }
}

// Then in predicate:
&{ ParseQuotedStringAt(_inputString, state.Location, '"') }
```

**Problem**: The parser doesn't expose a way to call `SetInput` before parsing. The `Parse()` method receives the input string but doesn't pass it to custom members.

### Attempt 4: Access `this.subject` in Predicate

```csharp
&{ ParseQuotedStringAt(this.subject, state.Location, '"') }
```

**Error**:
```
error CS0026: Keyword 'this' is not valid in a static property, static method, or static field initializer
```

The predicate lambda doesn't have access to `this` because it's compiled as a delegate.

## Analysis of Pegasus Architecture

### How Pegasus Compiles Semantic Predicates

```csharp
// Generated code structure
private IParseResult<T> SomeRule(ref Cursor cursor)
{
    // ...
    var predicateResult = this.CHECK(ref cursor, state =>
        // Your predicate code here
        // 'state' is the only parameter available
        // No access to: this, subject, cursor (the ref parameter)
    );
    // ...
}
```

The predicate code is wrapped in a lambda expression where:
- `state` (type `Cursor`) is the only parameter
- `this` is not accessible (lambda context)
- Instance fields like `this.subject` are not accessible
- The `subject` field exists in the parser class but not in the lambda scope

### Why JavaScript Works But C# Doesn't

**JavaScript (Peggy.js)**:
- Code runs in same scope as parser
- `input` and `offset()` are injected as "magic" globals
- No compilation to lambdas

**C# (Pegasus)**:
- Code is compiled to strongly-typed C#
- Predicates become lambda delegates
- Lambda scope is isolated from parser instance

## Workaround: Post-Capture Validation

Since we can't access input in predicates, we use a workaround:

1. **Capture** text using a PEG pattern
2. **Pass captured text** to predicate for validation

```
doubleQuoted <string> = raw:capturePattern &{ ValidateCaptured(raw, '"') } { _parsedValue }
```

This is exactly what Solution 2 (Capture-then-Validate) does, with its inherent disambiguation limitations.

## Conclusion

**Status**: ❌ FAILED

Pegasus semantic predicates `&{ }` do not provide access to:
- The input string (`subject`)
- The parser instance (`this`)

Only the cursor position is available via the `state` parameter, which is insufficient for implementing universal quote parsing.

## Comparison Table

| Feature | Peggy.js | Pegasus |
|---------|----------|---------|
| `input` access in `&{ }` | ✓ Yes | ❌ No |
| `offset()` / position | ✓ Yes | ✓ Via `state.Location` |
| Full input string | ✓ Yes | ❌ Not accessible |
| Instance members | ✓ Via scope | ❌ Lambda isolation |

## Potential Future Solution

A Pegasus enhancement could provide:
```csharp
// Hypothetical improved predicate syntax
&{ (state, subject) => ParseQuotedStringAt(subject, state.Location, '"') }
```

Or a special syntax to access the subject:
```
&{ ParseQuotedStringAt(@subject, state.Location, '"') }
```

This would require changes to the Pegasus code generator.
