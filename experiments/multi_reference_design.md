# Multi-Reference Feature Design (Issue #184)

## Overview

This document outlines the design for supporting multi-references in Links Notation.

## Current Behavior

```
Input: (papa: loves mama)
Parsed: Link(id="papa", values=[Ref("loves"), Ref("mama")])
```

For multi-word references, quoting is required:
```
Input: ('some example': value)
Parsed: Link(id="some example", values=[Ref("value")])
```

## Proposed Behavior

### Multi-Reference Definition

When a colon appears after multiple space-separated words, those words form a multi-reference:

```
Input: (some example: some example is a link)
Parsed: Link(id=["some", "example"], values=[MultiRef(["some", "example"]), Ref("is"), Ref("a"), Ref("link")])
```

### Key Changes

1. **ID field becomes an array**:
   - Single-word: `id = ["papa"]`
   - Multi-word: `id = ["some", "example"]`

2. **Values remain an array** but can contain multi-references:
   - `values = [MultiRef(["some", "example"]), Ref("is"), ...]`

3. **Context-aware parsing**:
   - First pass: Identify all multi-reference definitions (IDs before colons)
   - Second pass: When parsing values, check if consecutive tokens form a known multi-reference

## Implementation Strategy

### Phase 1: Data Structure Changes
- Change `id` from `string | null` to `string[] | null`
- Add helper methods for multi-reference comparison

### Phase 2: Parser Changes
- Collect multi-reference definitions during parsing
- When parsing values, check for multi-reference matches

### Phase 3: Formatter Changes
- Format multi-word IDs without quotes (when possible)
- Preserve backward compatibility with quoted strings

## Backward Compatibility

- Quoted strings (`'some example'`) still work as single-token references
- Single-word IDs work the same way: `papa` -> `id = ["papa"]`
