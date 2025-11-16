# Test Equivalence Analysis

This document shows tests that test the SAME functionality but have DIFFERENT names.

Analysis Date: 2025-11-16T16:46:13.628Z

---

## Summary

- Found 11 test cases implemented across multiple languages
- These tests verify the same functionality despite different naming

---

## Equivalent Tests by Source String

Tests grouped by the actual input they test (source string):

### ✅ Tests in All 4 Languages (3)

**Source:** `(address: source target)`

| Language | Test Name |
|----------|----------|
| Python | test_single_link |
| JavaScript | SingleLinkTest |
| Rust | single_link_test |
| C# | SingleLinkTest |

**Source:** `(papa has car)`

| Language | Test Name |
|----------|----------|
| Python | test_triplet_single_link |
| JavaScript | TripletSingleLinkTest |
| Rust | triplet_single_link_test |
| C# | TripletSingleLinkTest |

**Source:** `(ignore conan-center-index repository)`

| Language | Test Name |
|----------|----------|
| Python | test_bug1 |
| JavaScript | BugTest1 |
| Rust | bug_test_1 |
| C# | BugTest1 |


### ⚠️ Tests Missing in Some Languages (8)

**Source:** `(first: x y)
(second: a b)`

| Language | Test Name | Status |
|----------|-----------|--------|
| Python | ❌ Missing | ❌ |
| JavaScript | TwoLinksTest | ✅ |
| Rust | ❌ Missing | ❌ |
| C# | TwoLinksTest | ✅ |

**Source:** `(papa (lovesMama: loves mama))
(son lovesMama)
(daughter lovesMama)
(all (love mama))`

| Language | Test Name | Status |
|----------|-----------|--------|
| Python | ❌ Missing | ❌ |
| JavaScript | ParseAndStringifyTest | ✅ |
| Rust | ❌ Missing | ❌ |
| C# | ParseAndStringifyTest, TupleToLinkTest | ✅ |

**Source:** `father (lovesMom: loves mom)
son lovesMom
daughter lovesMom
all (love mom)`

| Language | Test Name | Status |
|----------|-----------|--------|
| Python | ❌ Missing | ❌ |
| JavaScript | ParseAndStringifyTest2 | ✅ |
| Rust | ❌ Missing | ❌ |
| C# | ParseAndStringifyTest2 | ✅ |

**Source:** `lovesMama: loves mama
papa lovesMama
son lovesMama
daughter lovesMama
all (love mama)`

| Language | Test Name | Status |
|----------|-----------|--------|
| Python | ❌ Missing | ❌ |
| JavaScript | ParseAndStringifyWithLessParenthesesTest | ✅ |
| Rust | ❌ Missing | ❌ |
| C# | ParseAndStringifyWithLessParenthesesTest | ✅ |

**Source:** `(a: a b)
(a: b c)`

| Language | Test Name | Status |
|----------|-----------|--------|
| Python | ❌ Missing | ❌ |
| JavaScript | DuplicateIdentifiersTest | ✅ |
| Rust | ❌ Missing | ❌ |
| C# | DuplicateIdentifiersTest | ✅ |

**Source:** `
users
    user1
        id
            43
        name
            first
                John
            last
                Williams
        location
            New York
        age
            23
    user2
        id
            56
        name
            first
                Igor
            middle
                Petrovich
            last
                Ivanov
        location
            Moscow
        age
            20`

| Language | Test Name | Status |
|----------|-----------|--------|
| Python | ❌ Missing | ❌ |
| JavaScript | SignificantWhitespaceTest | ✅ |
| Rust | significant_whitespace_test | ✅ |
| C# | SignificantWhitespaceTest | ✅ |

**Source:** `a
    b
    c`

| Language | Test Name | Status |
|----------|-----------|--------|
| Python | ❌ Missing | ❌ |
| JavaScript | SimpleSignificantWhitespaceTest | ✅ |
| Rust | ❌ Missing | ❌ |
| C# | SimpleSignificantWhitespaceTest | ✅ |

**Source:** `
users
  user1`

| Language | Test Name | Status |
|----------|-----------|--------|
| Python | ❌ Missing | ❌ |
| JavaScript | TwoSpacesSizedWhitespaceTest | ✅ |
| Rust | ❌ Missing | ❌ |
| C# | TwoSpacesSizedWhitespaceTest | ✅ |

