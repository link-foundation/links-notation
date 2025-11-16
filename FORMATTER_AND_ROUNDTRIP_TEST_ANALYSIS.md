# Formatter Configuration and Round-Trip Test Analysis

## Executive Summary

This document provides a comprehensive analysis of:
1. Round-trip test coverage across all language implementations (C#, JavaScript, Rust, Python)
2. Current formatter configuration options
3. Missing formatter features requested for implementation
4. Recommendations and implementation plan

**Date:** 2025-11-16

---

## 1. Round-Trip Test Coverage Analysis

### Overview

Round-trip tests verify that parsing and formatting are inverse operations:
```
const parsed = parse(original);
const formatted = format(parsed);
assert.equal(formatted, original);
```

### Current Coverage by Language

| Language   | Round-Trip Tests | % of Total | Status |
|------------|------------------|------------|--------|
| **C#**     | 23 tests        | 30.7%      | ✅ Best coverage |
| **JavaScript** | 20 tests    | 26.7%      | ✅ Good coverage |
| **Rust**   | 17 tests        | 22.7%      | ⚠️ Missing quoted refs |
| **Python** | 15 tests        | 20.0%      | ⚠️ Fewest tests |

### Detailed Test Files

#### JavaScript (20 tests in 4 files):
1. `js/tests/ApiTests.test.js` - 2 tests
   - test_link_with_source_target
   - test_link_with_source_type_target

2. `js/tests/MultilineParser.test.js` - 6 tests
   - test_parse_and_stringify_multiline
   - test_less_parentheses_mode
   - test_parse_and_stringify_duplicate_identifiers
   - test_complex_structure
   - test_mixed_format_consistency
   - test_parse_and_stringify_complex

3. `js/tests/SingleLineParser.test.js` - 7 tests
   - test_link_without_values
   - test_link_with_id_and_values
   - test_link_with_quoted_id
   - test_link_with_multiple_values
   - test_empty_id_with_values
   - test_link_without_id_single_line
   - test_singlet_link_parser

4. `js/tests/NestedParser.test.js` - 4 tests
   - test_significant_whitespace
   - test_single_level_indentation
   - test_two_level_indentation
   - test_three_level_indentation

#### C# (23 tests in 5 files):
1. `csharp/.../SingleLineParserTests.cs` - 8 tests
2. `csharp/.../MultilineParserTests.cs` - 6 tests
3. `csharp/.../ApiTests.cs` - 2 tests
4. `csharp/.../NestedParserTests.cs` - 4 tests
5. `csharp/.../IndentationConsistencyTests.cs` - 3 tests

#### Python (15 tests in 4 files):
1. `python/tests/test_multiline_parser.py` - 4 tests
2. `python/tests/test_single_line_parser.py` - 6 tests
3. `python/tests/test_indentation_consistency.py` - 4 tests
4. `python/tests/test_indented_id_syntax.py` - 1 test

#### Rust (17 tests in 4 files):
1. `rust/tests/multiline_parser_tests.rs` - 5 tests
2. `rust/tests/single_line_parser_tests.rs` - 3 tests
3. `rust/tests/nested_parser_tests.rs` - 5 tests
4. `rust/tests/indentation_consistency_tests.rs` - 4 tests

### Coverage Gaps Identified

| Feature | JS | C# | Python | Rust |
|---------|----|----|--------|------|
| **Single-line links** | ✅ | ✅ | ✅ | ✅ |
| **Multi-line links** | ✅ | ✅ | ✅ | ✅ |
| **Quoted references** | ✅ | ✅ | ✅ | ❌ **Missing** |
| **Less parentheses mode** | ✅ | ✅ | ✅ | ✅ |
| **Indentation consistency** | ✅ | ✅ | ✅ | ✅ |
| **Indented ID syntax** | ❌ | ❌ | ✅ | ❌ **Missing** |
| **Nested structures (deep)** | ✅ | ✅ | ❌ **Missing** | ✅ |
| **Complex nested structures** | ✅ | ✅ | ⚠️ Partial | ✅ |

**Critical Gaps:**
1. **Rust**: Missing round-trip tests for quoted references (e.g., `('id': 'value')`)
2. **JavaScript, C#, Rust**: Missing indented ID syntax round-trip tests (only Python has them)
3. **Python**: Missing deep nested structure round-trip tests

---

## 2. Formatter Configuration Options

### Current Implementation Status

| Feature | Python | JavaScript | C# | Rust |
|---------|--------|------------|-----|------|
| **Less Parentheses** | ✅ `less_parentheses: bool` | ✅ `lessParentheses: bool` | ✅ `lessParentheses: bool` | ⚠️ Via `{:#}` format |
| **Line Length Limit** | ❌ | ❌ | ❌ | ❌ |
| **Auto-Indent (>3 refs)** | ❌ | ❌ | ❌ | ❌ |
| **Auto-Indent (>80 chars)** | ❌ | ❌ | ❌ | ❌ |
| **Group Consecutive Links** | ❌ | ⚠️ `LinksGroup` class only | ⚠️ `LinksGroup` struct only | ⚠️ Via flattening |
| **Inline vs Indented** | ❌ | ❌ | ❌ | ⚠️ Via `{}` vs `{:#}` |

### Current Parameters

#### Python (`python/links_notation/formatter.py`)
```python
def format_links(links: List[Link], less_parentheses: bool = False) -> str
def Link.format(less_parentheses: bool = False, is_compound_value: bool = False) -> str
```

#### JavaScript (`js/src/Link.js`)
```javascript
formatLinks(links, lessParentheses = false) -> string
Link.format(lessParentheses = false, isCompoundValue = false) -> string
```

#### C# (`csharp/Link.Foundation.Links.Notation/Link.cs`)
```csharp
IList<Link>.Format() -> string
IList<Link>.Format(lessParentheses: bool) -> string
Link<T>.ToString() -> string
```

#### Rust (`rust/src/lib.rs`)
```rust
format_links(links: &[LiNo<String>]) -> String
// Uses Display trait: {} for standard, {:#} for alternate
```

### Examples of Current Behavior

#### Less Parentheses Mode
```python
# Input
input = "id: value1 value2"

# With less_parentheses=False (default)
output = "(id: value1 value2)"

# With less_parentheses=True
output = "id: value1 value2"
```

---

## 3. Missing Formatter Features

Based on the user's requirements, the following features need to be implemented:

### 3.1 Line Length-Based Formatting

**Requirement:** Format links as indented when the line length exceeds a threshold (e.g., 80 characters).

**Example:**
```
# Input (87 characters, exceeds 80)
sequence: reference1 reference2 reference3 reference4 reference5 reference6 reference7

# Output (auto-indented)
sequence:
  reference1
  reference2
  reference3
  reference4
  reference5
  reference6
  reference7
```

**Proposed Configuration:**
```python
# Python
format_links(links, max_line_length: int = 80, indent_long_lines: bool = True)

# JavaScript
formatLinks(links, { maxLineLength: 80, indentLongLines: true })

# C#
Format(maxLineLength: 80, indentLongLines: true)

# Rust
format_links_with_config(links, FormatConfig { max_line_length: 80, indent_long_lines: true })
```

### 3.2 Reference Count-Based Formatting

**Requirement:** Automatically indent when a link has more than N references (e.g., >3).

**Example:**
```
# Input (4 references, exceeds threshold of 3)
sequence: 1 2 3 4

# Output (auto-indented)
sequence:
  1
  2
  3
  4
```

**Proposed Configuration:**
```python
# Python
format_links(links, max_inline_refs: int = 3)

# JavaScript
formatLinks(links, { maxInlineRefs: 3 })

# C#
Format(maxInlineRefs: 3)

# Rust
FormatConfig { max_inline_refs: 3 }
```

### 3.3 Grouping Consecutive Links

**Requirement:** Group consecutive links with the same reference into a single parent.

**Example:**
```
# Input
SetA a
SetA b
SetA c

# Output (with grouping enabled)
SetA
  a
  b
  c
```

**Proposed Configuration:**
```python
# Python
format_links(links, group_consecutive: bool = True)

# JavaScript
formatLinks(links, { groupConsecutive: true })

# C#
Format(groupConsecutive: true)

# Rust
FormatConfig { group_consecutive: true }
```

**Note:** JavaScript, C#, and Rust already have `LinksGroup` concept, but it's not automatically applied during formatting.

### 3.4 Comprehensive Format Configuration Object

**Proposed unified configuration across all languages:**

```python
# Python
class FormatConfig:
    less_parentheses: bool = False
    max_line_length: int = 80
    indent_long_lines: bool = False
    max_inline_refs: int = None  # None = unlimited
    group_consecutive: bool = False
    indent_string: str = "  "  # Two spaces
    prefer_inline: bool = True  # Prefer inline when under thresholds
```

```javascript
// JavaScript
interface FormatOptions {
  lessParentheses?: boolean;
  maxLineLength?: number;
  indentLongLines?: boolean;
  maxInlineRefs?: number | null;
  groupConsecutive?: boolean;
  indentString?: string;
  preferInline?: boolean;
}
```

```csharp
// C#
public class FormatOptions
{
    public bool LessParentheses { get; set; } = false;
    public int MaxLineLength { get; set; } = 80;
    public bool IndentLongLines { get; set; } = false;
    public int? MaxInlineRefs { get; set; } = null;
    public bool GroupConsecutive { get; set; } = false;
    public string IndentString { get; set; } = "  ";
    public bool PreferInline { get; set; } = true;
}
```

```rust
// Rust
pub struct FormatConfig {
    pub less_parentheses: bool,
    pub max_line_length: usize,
    pub indent_long_lines: bool,
    pub max_inline_refs: Option<usize>,
    pub group_consecutive: bool,
    pub indent_string: String,
    pub prefer_inline: bool,
}
```

---

## 4. Implementation Recommendations

### Priority 1: Add Missing Round-Trip Tests (High Priority)

#### Rust - Add Quoted References Tests
**Location:** `rust/tests/api_tests.rs`
```rust
#[test]
fn test_quoted_references_roundtrip() {
    let input = r#"("quoted id": "value with spaces")"#;
    let parsed = parse_lino(input).expect("Failed to parse");
    let output = format!("{:#}", parsed);
    assert_eq!(input, output);
}
```

#### JavaScript, C#, Rust - Add Indented ID Syntax Tests
**Pattern to add:** Parse and format indented ID syntax, verify round-trip.

Example test pattern:
```javascript
test('indented_id_syntax_roundtrip', () => {
  const input = `id:
  value1
  value2`;
  const parsed = parser.parse(input);
  const output = formatLinks(parsed);
  expect(output).toBe(input);
});
```

#### Python - Add Deep Nested Structure Tests
**Location:** `python/tests/test_nested_parser.py`

Add tests for 3+ level nesting with round-trip verification.

### Priority 2: Implement Format Configuration (Medium Priority)

#### Phase 1: Add Configuration Classes/Structs
1. Create `FormatConfig` / `FormatOptions` in each language
2. Update `format_links()` / `formatLinks()` to accept config
3. Maintain backward compatibility with existing boolean parameter

#### Phase 2: Implement Line Length-Based Formatting
1. Add logic to measure formatted line length
2. Trigger indentation when threshold exceeded
3. Add tests for various line lengths

#### Phase 3: Implement Reference Count-Based Formatting
1. Add logic to count references in a link
2. Trigger indentation when count exceeds threshold
3. Add tests for various reference counts

#### Phase 4: Implement Consecutive Link Grouping
1. Add logic to detect consecutive links with same ID
2. Group them under parent link with indented children
3. Leverage existing `LinksGroup` in JS/C#/Rust, implement in Python

### Priority 3: Standardize Test Naming (Low Priority)

Ensure all test names follow consistent patterns across languages:
- `test_feature_name` (Python, Rust)
- `testFeatureName` (JavaScript)
- `FeatureNameTest` (C#)

---

## 5. Test Case Consistency Matrix

### Feature Coverage Comparison

Based on TEST_COVERAGE_SUMMARY.md and round-trip analysis:

| Test Category | Python | JavaScript | Rust | C# |
|---------------|--------|------------|------|-----|
| api | ✅ 8 (2 RT) | ✅ 8 (2 RT) | ✅ 8 (2 RT) | ✅ 8 (2 RT) |
| edge_case_parser | ✅ 9 | ✅ 9 | ✅ 9 | ✅ 9 |
| indentation_consistency | ✅ 4 (4 RT) | ✅ 4 | ✅ 4 (4 RT) | ✅ 4 (3 RT) |
| indented_id_syntax | ⚠️ 11 (1 RT) | ✅ 11 (0 RT) | ✅ 11 (0 RT) | ✅ 11 (0 RT) |
| link | ✅ 10 | ✅ 10 | ✅ 10 | ✅ 10 |
| links_group | ❌ N/A | ✅ 3 | ✅ 3 | ✅ 3 |
| mixed_indentation_modes | ⚠️ 4 | ✅ 8 | ✅ 8 | ✅ 8 |
| multiline_parser | ⚠️ 11 (4 RT) | ✅ 11 (6 RT) | ✅ 11 (5 RT) | ✅ 11 (6 RT) |
| multiline_quoted_string | ❌ N/A | ✅ 4 | ✅ 4 | ✅ 4 |
| nested_parser | ⚠️ 10 (0 RT) | ✅ 10 (4 RT) | ✅ 10 (5 RT) | ✅ 10 (4 RT) |
| single_line_parser | ✅ 29 (6 RT) | ✅ 29 (7 RT) | ✅ 29 (3 RT) | ✅ 29 (8 RT) |
| tuple | ❌ N/A | ❌ N/A | ❌ N/A | ✅ 2 |

**Legend:**
- RT = Round-trip tests
- ✅ = Full coverage
- ⚠️ = Partial coverage
- ❌ = Not implemented

### Key Observations:

1. **Round-trip test distribution is uneven:**
   - Single-line parser: Well covered across all languages
   - Multiline parser: Good coverage (4-6 tests per language)
   - Nested parser: Missing in Python (0 RT tests)
   - Indented ID syntax: Only Python has 1 RT test

2. **Python has feature limitations:**
   - No `links_group` implementation
   - No `multiline_quoted_string` support
   - Reduced `mixed_indentation_modes` coverage

3. **C# has unique features:**
   - Tuple support (not in other languages)
   - Slightly better single-line round-trip coverage

---

## 6. Action Plan

### Immediate Actions (This PR)

1. ✅ **Document current state** (this file)
2. ⬜ **Add missing round-trip tests:**
   - Rust: Quoted references (1 test)
   - JS/C#/Rust: Indented ID syntax (3-5 tests each)
   - Python: Deep nested structures (2-3 tests)

### Short-term Actions (Next PR)

1. ⬜ **Implement FormatConfig/FormatOptions** in all languages
2. ⬜ **Implement line length-based formatting** (max_line_length, indent_long_lines)
3. ⬜ **Add tests for new formatting options**

### Medium-term Actions (Future PRs)

1. ⬜ **Implement reference count-based formatting** (max_inline_refs)
2. ⬜ **Implement consecutive link grouping** (group_consecutive)
3. ⬜ **Add comprehensive formatter configuration tests**
4. ⬜ **Update documentation with formatter options**

### Long-term Actions

1. ⬜ **Standardize test names across all languages**
2. ⬜ **Add formatter performance benchmarks**
3. ⬜ **Consider adding formatter presets** (compact, readable, verbose)

---

## 7. Conclusion

### Summary of Findings:

1. **Round-trip test coverage exists but is inconsistent:**
   - Total: 75 round-trip tests across all languages
   - Distribution: C# (23) > JS (20) > Rust (17) > Python (15)
   - Gaps identified and documented above

2. **Formatter configuration is minimal:**
   - Only `lessParentheses` / `less_parentheses` implemented
   - No automatic formatting based on line length or reference count
   - No automatic grouping of consecutive links

3. **All requested features are viable:**
   - Line length-based formatting
   - Reference count-based formatting
   - Consecutive link grouping
   - All can be implemented with backward compatibility

### Recommendations:

1. **Prioritize round-trip test additions** to ensure format consistency
2. **Implement FormatConfig/FormatOptions** in all languages with same parameters
3. **Add features incrementally** (line length → ref count → grouping)
4. **Maintain backward compatibility** by making all new options opt-in
5. **Document formatter options thoroughly** with examples

---

**Next Steps:** Proceed with implementing missing round-trip tests and creating PR for review.
