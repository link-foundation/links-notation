# Comprehensive Test Name Standardization Plan

**Generated:** 2025-11-16

## Standardization Rules

**Convention:**
- **Python:** `test_{descriptive_name}` (snake_case)
- **JavaScript:** `{DescriptiveName}Test` (PascalCase + Test suffix)
- **Rust:** `{descriptive_name}_test` (snake_case + _test suffix)
- **C#:** `{DescriptiveName}Test` (PascalCase + Test suffix)

**Key Principle:** The descriptive name should be IDENTICAL across languages (just adapted to naming convention)

---

## Critical Naming Issues to Fix

### Issue 1: "toString" vs "to_string" Inconsistency

**Problem:** Python uses `tostring`, others use `to_string`

| Test | Python (Current) | Should Be | JS/Rust/C# Standard |
|------|------------------|-----------|---------------------|
| Link toString with ID only | `test_link_tostring_with_id_only` | `test_link_to_string_with_id_only` | `Link{To/to_}StringWithIdOnly` ✅ |
| Link toString with values only | `test_link_tostring_with_values_only` | `test_link_to_string_with_values_only` | Correct |
| Link toString with ID and values | `test_link_tostring_with_id_and_values` | `test_link_to_string_with_id_and_values` | Correct |

**Action:** Rename 3 Python tests: `tostring` → `to_string`

### Issue 2: Bug Test Naming

**Problem:** Inconsistent naming across languages

| Language | Current | Proposed Standard |
|----------|---------|-------------------|
| Python | `test_bug1` | `test_bug_test_1` |
| JavaScript | `BugTest1` | ✅ Correct |
| Rust | `bug_test_1` | ✅ Correct |
| C# | `BugTest1` | ✅ Correct |

**Action:** Rename 1 Python test: `test_bug1` → `test_bug_test_1`

### Issue 3: Indented ID Syntax - "ID" vs " I D" spacing

**Problem:** JavaScript has test names with spaces in "I D" due to conversion issues

Examples in JavaScript that need fixing:
- `"Basic indented  I D syntax   issue #21"` → Should be `"BasicIndentedIdSyntaxTest"`
- `"empty indented  I D should work"` → Should be `"EmptyIndentedIdTest"`
- `"indented  I D syntax with multiple values"` → Should be `"IndentedIdSyntaxWithMultipleValuesTest"`
- etc.

**Root Cause:** "ID" → "I D" when converting PascalCase to spaces

**Action:** Rename ~11 JavaScript tests in IndentedIdSyntax category

### Issue 4: "(parser)" Suffix Inconsistency

**Problem:** Some languages add "(parser)" to test names, others don't

Examples:
- JS: `"quoted reference (parser)"` vs Python: `test_quoted_reference_parser` ✅
- JS: `"simple reference (parser)"` vs Python: `test_simple_reference_parser` ✅
- JS: `"singlet link (parser)"` vs Python: `test_singlet_link_parser` ✅
- JS: `"value link (parser)"` vs Python: `test_value_link_parser` ✅

**Action:** Rename 4 JavaScript tests: Remove parentheses, use camelCase

### Issue 5: "escape reference" vs "escapeReference"

**Problem:** Naming inconsistency

| Language | Current | Proposed |
|----------|---------|----------|
| Python | `test_link_escape_reference_simple` | ✅ Correct |
| Python | `test_link_escape_reference_special_chars` | ✅ Correct |
| JavaScript | `Link escape reference for simple reference` | `LinkEscapeReferenceSimpleTest` |
| JavaScript | `Link escape reference with special characters` | `LinkEscapeReferenceWithSpecialCharactersTest` |

**Action:** Rename 2 JavaScript tests

---

## Detailed Rename Plan by Language

### Python Renames (4 total)

**File:** `python/tests/test_single_line_parser.py`
1. `test_bug1` → `test_bug_test_1`

**File:** `python/tests/test_link.py`
1. `test_link_tostring_with_id_only` → `test_link_to_string_with_id_only`
2. `test_link_tostring_with_values_only` → `test_link_to_string_with_values_only`
3. `test_link_tostring_with_id_and_values` → `test_link_to_string_with_id_and_values`

### JavaScript Renames (~20 total)

**File:** `js/tests/IndentedIdSyntax.test.js`
1. `"Basic indented  I D syntax   issue #21"` → `"BasicIndentedIdSyntaxTest"`
2. `"empty indented  I D should work"` → `"EmptyIndentedIdTest"`
3. `"indented  I D syntax with multiple values"` → `"IndentedIdSyntaxWithMultipleValuesTest"`
4. `"indented  I D syntax with numeric  I D"` → `"IndentedIdSyntaxWithNumericIdTest"`
5. `"indented  I D syntax with quoted  I D"` → `"IndentedIdSyntaxWithQuotedIdTest"`
6. `"indented  I D syntax with single value"` → `"IndentedIdSyntaxWithSingleValueTest"`
7. `"indented  I D with deeper nesting"` → `"IndentedIdWithDeeperNestingTest"`
8. `"multiple indented  I D links"` → `"MultipleIndentedIdLinksTest"`
9. `"equivalence test   comprehensive"` → `"EquivalenceTestComprehensiveTest"`

**File:** `js/tests/SingleLineParser.test.js`
1. `"quoted reference (parser)"` → `"QuotedReferenceParserTest"`
2. `"simple reference (parser)"` → `"SimpleReferenceParserTest"`
3. `"singlet link (parser)"` → `"SingletLinkParserTest"`
4. `"value link (parser)"` → `"ValueLinkParserTest"`

**File:** `js/tests/Link.test.js`
1. `"Link toString with id only"` → `"LinkToStringWithIdOnlyTest"`
2. `"Link toString with values only"` → `"LinkToStringWithValuesOnlyTest"`
3. `"Link toString with id and values"` → `"LinkToStringWithIdAndValuesTest"`
4. `"Link escape reference for simple reference"` → `"LinkEscapeReferenceSimpleTest"`
5. `"Link escape reference with special characters"` → `"LinkEscapeReferenceWithSpecialCharactersTest"`

**File:** `js/tests/MixedIndentationModes.test.js`
1. `"hero example   alternative format   issue #105"` → `"HeroExampleAlternativeFormatTest"`
2. `"hero example   equivalence test   issue #105"` → `"HeroExampleEquivalenceTest"`
3. `"hero example   mixed modes   issue #105"` → `"HeroExampleMixedModesTest"`

### Rust Renames (Minimal - mostly correct)

Most Rust tests follow the `{name}_test` convention correctly.

**Potential improvement:**
- `bug_test_1` is already correct ✅

### C# Renames (Minimal - mostly correct)

Most C# tests follow the `{Name}Test` convention correctly.

---

## Execution Plan

1. ✅ Create backup branch
2. ✅ Rename Python tests (4 renames)
3. ✅ Run Python tests to verify
4. ✅ Rename JavaScript tests (~20 renames)
5. ✅ Run JavaScript tests to verify
6. ✅ Commit changes
7. ✅ Regenerate TEST_CASE_COMPARISON.md
8. ✅ Verify significant reduction in "❌ missing" marks

---

## Expected Impact

**Before Standardization:**
- ~70-74 "missing" tests per language
- Most are false negatives due to naming

**After Standardization:**
- ~10-15 truly missing tests per language
- Clear visibility into real gaps:
  - Python: Missing LinksGroup (3 tests), Multiline Quoted (4 tests)
  - Others: Missing Format Config (9 tests)
  - C#: Has exclusive Tuple support (2 tests)

---

## Implementation Priority

**High Priority (Do First):**
1. Python `tostring` → `to_string` (3 renames) - Affects 3 tests showing as "missing"
2. JavaScript Indented ID syntax (9 renames) - Affects 9 tests showing as "missing"
3. JavaScript "(parser)" tests (4 renames) - Affects 4 tests showing as "missing"

**Medium Priority:**
4. JavaScript Link tests (5 renames)
5. Python bug test (1 rename)

**Low Priority:**
6. JavaScript MixedIndentationModes (3 renames)

**Total:** ~25 renames to eliminate most false negatives
