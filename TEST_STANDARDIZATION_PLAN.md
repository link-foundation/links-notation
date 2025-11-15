# Test Name Standardization Plan

## Overview

This document outlines the plan to standardize test names across all 4 language implementations (Python, JavaScript, Rust, C#) to ensure equivalent test coverage and naming consistency.

## Current Status

### Test Counts
| Language   | Total Tests | Status |
|------------|-------------|--------|
| Python     | 96 (95 passing, 1 skipped) | ✅ All Pass |
| JavaScript | 107 | ✅ All Pass |
| Rust       | 107 | ✅ All Pass |
| C#         | 109 | ✅ All Pass |

### Key Issues Identified

1. **Inconsistent Naming Across Languages**
   - Same test scenario has different names in different languages
   - Example: `test_bug1` (Python) vs `BugTest1` (JS/C#) vs `bug_test_1` (Rust)

2. **Redundant Naming Patterns**
   - C# and JS have double "Test" prefixes/suffixes (e.g., `TestEmptyLinkTest`)
   - Inconsistent use of "Test" prefix

3. **Different Test Counts**
   - Some languages have language-specific tests (e.g., C# Tuple tests)
   - Some languages don't support certain features (e.g., Python doesn't support multiline quoted strings)

## Proposed Naming Standard

### Naming Convention

**Base Pattern**: `{DescriptiveName}Test`

- **Descriptive Name**: PascalCase description of what is being tested
- **Test Suffix**: Always end with "Test"
- **Language Adaptation**:
  - Python/Rust: Convert to `snake_case` with `test_` prefix (e.g., `test_bug_test_1`)
  - JavaScript/C#: Use PascalCase directly (e.g., `BugTest1`)

### Examples

| Scenario | Python | JavaScript | Rust | C# |
|----------|--------|------------|------|-------|
| Bug test 1 | `test_bug_test_1` | `BugTest1` | `test_bug_test_1` or `bug_test_1` | `BugTest1` |
| Empty link | `test_empty_link` | `EmptyLinkTest` | `test_empty_link` | `EmptyLinkTest` |
| Parse simple reference | `test_parse_simple_reference` | `ParseSimpleReferenceTest` | `test_parse_simple_reference` | `ParseSimpleReferenceTest` |
| Singlet link parser | `test_singlet_link_parser` | `SingletLinkParserTest` | `test_singlet_link_parser` | `SingletLinkParserTest` |

## Detailed Renaming Plan

### Phase 1: Critical Mismatches (High Priority)

These are tests that appear in multiple languages but have significantly different names:

#### single_line_parser Category

| Current Names | Standardized Name (snake_case) | Languages Affected |
|---------------|-------------------------------|-------------------|
| `test_bug1`, `BugTest1`, `bug_test_1` | `test_bug_test_1` / `BugTest1` | All 4 |
| `test_simple_ref`, `Test simple ref`, `simple_reference` | `test_simple_reference` / `SimpleReferenceTest` | All 4 |
| Various "singlet link" variants | `test_singlet_link` / `SingletLinkTest` | All 4 |
| Various "value link" variants | `test_value_link` / `ValueLinkTest` | All 4 |

#### nested_parser Category

| Current Names | Standardized Name | Languages Affected |
|---------------|-------------------|-------------------|
| `test_indentation`, `Test indentation (parser)`, `TestIndentationParserTest` | `test_indentation_parser` / `IndentationParserTest` | All 4 |
| Similar for `nested_indentation` | `test_nested_indentation_parser` / `NestedIndentationParserTest` | All 4 |

#### edge_case_parser Category

| Current Names | Standardized Name | Languages Affected |
|---------------|-------------------|-------------------|
| `test_all_features`, `TestAllFeaturesTest` | `test_all_features` / `AllFeaturesTest` | All 4 |
| `test_empty_document`, `TestEmptyDocumentTest` | `test_empty_document` / `EmptyDocumentTest` | All 4 |
| `test_whitespace_only`, `TestWhitespaceOnlyTest` | `test_whitespace_only` / `WhitespaceOnlyTest` | All 4 |

#### api Category

| Current Names | Standardized Name | Languages Affected |
|---------------|-------------------|-------------------|
| `test_is_ref_equivalent`, `test_is_ref equivalent`, `TestIsRefEquivalentTest` | `test_is_ref_equivalent` / `IsRefEquivalentTest` | All 4 |
| Similar for `is_link_equivalent` | `test_is_link_equivalent` / `IsLinkEquivalentTest` | All 4 |

### Phase 2: Language-Specific Cleanup (Medium Priority)

#### Python
- Rename `test_bug1` → `test_bug_test_1`
- Rename `test_simple_ref` → `test_simple_reference`
- Rename `test_indentation` → `test_indentation_parser`
- Rename `test_nested_indentation` → `test_nested_indentation_parser`
- Total: ~20-30 renames

#### JavaScript
- Remove redundant "Test" prefix: `TestAllFeaturesTest` → `AllFeaturesTest`
- Standardize description patterns: `Test complex structure` → `ComplexStructureTest`
- Total: ~40-50 renames

#### Rust
- Standardize test naming: `bug_test_1` → `test_bug_test_1` (or keep as `bug_test_1` based on Rust conventions)
- Remove redundant patterns: `test_all_features_test` → `test_all_features`
- Total: ~30-40 renames

#### C#
- Remove double "Test" suffix: `TestEmptyLinkTest` → `EmptyLinkTest`
- Standardize all API tests: `TestIsRefEquivalentTest` → `IsRefEquivalentTest`
- Total: ~50-60 renames

### Phase 3: Missing Tests (Low Priority)

Some tests exist in some languages but not others. Decision needed:

1. **Add missing tests** to achieve 100% parity?
2. **Document differences** as intentional (language-specific features)?
3. **Combination**: Add tests where possible, document exceptions

Examples of missing tests:
- **Python missing**: `LinksGroup` tests (not implemented in Python)
- **Python missing**: `MultilineQuotedString` tests (not supported in Python)
- **C# only**: `Tuple` tests (C#-specific feature)

## Implementation Steps

1. **Get Approval**: Confirm approach with maintainers
2. **Create Backup**: Commit current state before renaming
3. **Rename Python Tests**: Update test file and verify all pass
4. **Rename JavaScript Tests**: Update test file and verify all pass
5. **Rename Rust Tests**: Update test file and verify all pass
6. **Rename C# Tests**: Update test file and verify all pass
7. **Regenerate Comparison**: Run `scripts/create-test-case-comparison.mjs`
8. **Verify Results**: Ensure comparison shows improved parity
9. **Update Documentation**: Update PR description and TEST_COVERAGE_SUMMARY.md
10. **Commit Changes**: Commit all updates with clear message

## Risks and Mitigations

### Risk 1: Breaking Tests
- **Mitigation**: Run full test suite after each language update
- **Rollback Plan**: Git revert if issues arise

### Risk 2: Inconsistent Interpretation
- **Mitigation**: Document standardization rules clearly
- **Mitigation**: Get approval on naming convention first

### Risk 3: Large Scope
- **Mitigation**: Phase the work (critical mismatches first)
- **Mitigation**: Automate renames where possible

## Success Criteria

1. ✅ All tests in all languages pass
2. ✅ Same test scenario has same base name across languages (adapted to conventions)
3. ✅ TEST_CASE_COMPARISON.md shows clear test parity
4. ✅ No redundant "Test" prefixes/suffixes
5. ✅ Improved test count alignment where feasible

## Next Steps

1. **Awaiting approval** on standardization approach (see PR comment)
2. Once approved, proceed with Phase 1 renaming
3. Verify tests pass after each phase
4. Update documentation and commit

---

**Status**: Plan documented, awaiting feedback on approach before proceeding with renames.
**Last Updated**: 2025-11-14
