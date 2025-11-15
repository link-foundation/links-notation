# Comprehensive Test Case Comparison Across All Languages

This document provides a detailed comparison of test cases across Python, JavaScript, Rust, and C#.

## Legend

- ✅ Test exists in the language
- ❌ Test is missing in the language
- ⚠️ Test adapted/modified for language-specific behavior

---

## Summary Statistics

| Language   | Total Tests | Test Categories |
|------------|-------------|----------------|
| Python     | 96 | 9 |
| JavaScript | 107 | 11 |
| Rust       | 107 | 11 |
| C#         | 109 | 12 |

---

## Api

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| empty link | ✅ | ✅ | ✅ | ✅ |
| is link | ❌ | ❌ | ✅ | ❌ |
| is link equivalent | ✅ | ✅ | ❌ | ✅ |
| is ref | ❌ | ❌ | ✅ | ❌ |
| is ref equivalent | ✅ | ✅ | ❌ | ✅ |
| link with source target | ✅ | ✅ | ✅ | ✅ |
| link with source type target | ✅ | ✅ | ✅ | ✅ |
| quoted references | ✅ | ✅ | ✅ | ✅ |
| simple link | ✅ | ✅ | ✅ | ✅ |
| single line format | ✅ | ✅ | ✅ | ✅ |

**Category totals:** Python: 8, JavaScript: 8, Rust: 8, C#: 8

## Edge Case Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| all features | ✅ | ✅ | ✅ | ✅ |
| empty document | ✅ | ✅ | ✅ | ✅ |
| empty link | ✅ | ✅ | ✅ | ✅ |
| empty link with empty self reference | ✅ | ✅ | ✅ | ✅ |
| empty link with parentheses | ✅ | ✅ | ✅ | ✅ |
| empty links | ✅ | ✅ | ✅ | ✅ |
| invalid input | ✅ | ✅ | ✅ | ✅ |
| singlet links | ✅ | ✅ | ✅ | ✅ |
| whitespace only | ✅ | ✅ | ✅ | ✅ |

**Category totals:** Python: 9, JavaScript: 9, Rust: 9, C#: 9

## Indentation Consistency

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| leading spaces vs no leading spaces | ✅ | ❌ | ✅ | ❌ |
| leading spaces vs no leading spaces should produce same result | ❌ | ✅ | ❌ | ✅ |
| simple two vs four spaces | ❌ | ❌ | ✅ | ❌ |
| simple two vs four spaces indentation | ✅ | ✅ | ❌ | ✅ |
| three level nesting | ❌ | ❌ | ✅ | ❌ |
| three level nesting with different indentation | ✅ | ✅ | ❌ | ✅ |
| two spaces vs four spaces indentation | ✅ | ✅ | ✅ | ✅ |

**Category totals:** Python: 4, JavaScript: 4, Rust: 4, C#: 4

## Indented Id Syntax

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| basic indented  i d syntax   issue #21 | ❌ | ✅ | ❌ | ❌ |
| basic indented id syntax | ✅ | ❌ | ✅ | ✅ |
| empty indented  i d should work | ❌ | ✅ | ❌ | ❌ |
| empty indented id | ❌ | ❌ | ✅ | ✅ |
| empty indented id should work | ✅ | ❌ | ❌ | ❌ |
| equivalence comprehensive | ✅ | ❌ | ❌ | ❌ |
| equivalence test   comprehensive | ❌ | ✅ | ❌ | ❌ |
| equivalence test comprehensive | ❌ | ❌ | ✅ | ✅ |
| indented  i d syntax with multiple values | ❌ | ✅ | ❌ | ❌ |
| indented  i d syntax with numeric  i d | ❌ | ✅ | ❌ | ❌ |
| indented  i d syntax with quoted  i d | ❌ | ✅ | ❌ | ❌ |
| indented  i d syntax with single value | ❌ | ✅ | ❌ | ❌ |
| indented  i d with deeper nesting | ❌ | ✅ | ❌ | ❌ |
| indented id multiple values | ❌ | ❌ | ✅ | ❌ |
| indented id numeric | ❌ | ❌ | ✅ | ❌ |
| indented id single value | ❌ | ❌ | ✅ | ❌ |
| indented id syntax with multiple values | ✅ | ❌ | ❌ | ✅ |
| indented id syntax with numeric id | ✅ | ❌ | ❌ | ✅ |
| indented id syntax with quoted id | ✅ | ❌ | ❌ | ✅ |
| indented id syntax with single value | ✅ | ❌ | ❌ | ✅ |
| indented id with deeper nesting | ✅ | ❌ | ✅ | ✅ |
| indented id with quoted id | ❌ | ❌ | ✅ | ❌ |
| mixed indented and regular syntax | ✅ | ✅ | ✅ | ✅ |
| multiple indented  i d links | ❌ | ✅ | ❌ | ❌ |
| multiple indented id links | ✅ | ❌ | ✅ | ✅ |
| unsupported colon only syntax | ❌ | ❌ | ✅ | ❌ |
| unsupported colon only syntax should fail | ✅ | ✅ | ❌ | ✅ |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 11

## Link

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| link combine | ✅ | ✅ | ✅ | ✅ |
| link constructor with id and values | ✅ | ✅ | ✅ | ✅ |
| link constructor with id only | ✅ | ✅ | ✅ | ✅ |
| link equals | ✅ | ✅ | ✅ | ✅ |
| link escape reference for simple reference | ❌ | ✅ | ❌ | ❌ |
| link escape reference simple | ✅ | ❌ | ✅ | ✅ |
| link escape reference special chars | ✅ | ❌ | ❌ | ❌ |
| link escape reference with special characters | ❌ | ✅ | ✅ | ✅ |
| link simplify | ✅ | ✅ | ✅ | ✅ |
| link to string with id and values | ❌ | ✅ | ✅ | ✅ |
| link to string with id only | ❌ | ✅ | ✅ | ✅ |
| link to string with values only | ❌ | ✅ | ✅ | ✅ |
| link tostring with id and values | ✅ | ❌ | ❌ | ❌ |
| link tostring with id only | ✅ | ❌ | ❌ | ❌ |
| link tostring with values only | ✅ | ❌ | ❌ | ❌ |

**Category totals:** Python: 10, JavaScript: 10, Rust: 10, C#: 10

## Links Group

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| links group append to links list | ❌ | ❌ | ❌ | ✅ |
| links group constructor | ❌ | ✅ | ❌ | ✅ |
| links group constructor equivalent | ❌ | ❌ | ✅ | ❌ |
| links group to list flattens structure | ❌ | ✅ | ✅ | ✅ |
| links group to string | ❌ | ✅ | ✅ | ❌ |

**Category totals:** Python: 0, JavaScript: 3, Rust: 3, C#: 3

## Mixed Indentation Modes

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| deeply nested mixed modes | ✅ | ✅ | ✅ | ✅ |
| hero example   alternative format   issue #105 | ❌ | ✅ | ❌ | ❌ |
| hero example   equivalence test   issue #105 | ❌ | ✅ | ❌ | ❌ |
| hero example   mixed modes   issue #105 | ❌ | ✅ | ❌ | ❌ |
| hero example alternative format | ❌ | ❌ | ✅ | ✅ |
| hero example equivalence | ❌ | ❌ | ✅ | ✅ |
| hero example mixed modes | ❌ | ❌ | ✅ | ✅ |
| nested set and sequence contexts | ✅ | ✅ | ✅ | ✅ |
| sequence/list context with colon | ❌ | ✅ | ❌ | ❌ |
| sequence context with colon | ✅ | ❌ | ✅ | ✅ |
| sequence context with complex values | ❌ | ✅ | ✅ | ✅ |
| set/object context without colon | ❌ | ✅ | ❌ | ❌ |
| set context without colon | ✅ | ❌ | ✅ | ✅ |

**Category totals:** Python: 4, JavaScript: 8, Rust: 8, C#: 8

## Multiline Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| complex structure | ✅ | ✅ | ✅ | ✅ |
| duplicate identifiers | ✅ | ✅ | ✅ | ✅ |
| indented children | ✅ | ✅ | ✅ | ✅ |
| mixed formats | ✅ | ✅ | ✅ | ✅ |
| multiline simple links | ✅ | ✅ | ✅ | ✅ |
| multiline with id | ✅ | ✅ | ✅ | ✅ |
| multiple top level elements | ✅ | ✅ | ✅ | ✅ |
| parse and stringify | ✅ | ✅ | ✅ | ✅ |
| parse and stringify 2 | ✅ | ❌ | ❌ | ❌ |
| parse and stringify test2 | ❌ | ✅ | ❌ | ✅ |
| parse and stringify test 2 | ❌ | ❌ | ✅ | ❌ |
| parse and stringify with less parentheses | ✅ | ✅ | ✅ | ✅ |
| two links | ✅ | ✅ | ✅ | ✅ |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 11

## Multiline Quoted String

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| multiline double quoted reference | ❌ | ✅ | ✅ | ✅ |
| multiline quoted as id | ❌ | ✅ | ✅ | ✅ |
| simple multiline double quoted | ❌ | ✅ | ✅ | ✅ |
| simple multiline single quoted | ❌ | ✅ | ✅ | ✅ |

**Category totals:** Python: 0, JavaScript: 4, Rust: 4, C#: 4

## Nested Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| complex indentation | ✅ | ✅ | ✅ | ✅ |
| indentation | ✅ | ❌ | ✅ | ❌ |
| indentation based children | ✅ | ✅ | ✅ | ✅ |
| indentation consistency | ✅ | ✅ | ✅ | ✅ |
| indentation parser | ❌ | ✅ | ❌ | ✅ |
| nested indentation | ✅ | ❌ | ✅ | ❌ |
| nested indentation parser | ❌ | ✅ | ❌ | ✅ |
| nested links | ✅ | ✅ | ✅ | ✅ |
| parse nested structure with indentation | ✅ | ✅ | ✅ | ✅ |
| significant whitespace | ✅ | ✅ | ✅ | ✅ |
| simple significant whitespace | ✅ | ✅ | ✅ | ✅ |
| two spaces sized whitespace | ✅ | ✅ | ✅ | ✅ |

**Category totals:** Python: 10, JavaScript: 10, Rust: 10, C#: 10

## Single Line Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| bug1 | ✅ | ❌ | ❌ | ❌ |
| bug test1 | ❌ | ✅ | ❌ | ✅ |
| bug test 1 | ❌ | ❌ | ✅ | ❌ |
| deeply nested | ✅ | ✅ | ✅ | ✅ |
| hyphenated identifiers | ✅ | ✅ | ✅ | ✅ |
| link with id | ❌ | ❌ | ✅ | ❌ |
| link without id (multi line) | ❌ | ✅ | ❌ | ❌ |
| link without id (single line) | ❌ | ✅ | ❌ | ❌ |
| link without id multi line | ❌ | ❌ | ✅ | ✅ |
| link without id multiline colon | ✅ | ❌ | ❌ | ❌ |
| link without id single line | ✅ | ❌ | ✅ | ❌ |
| multi line link with id | ✅ | ✅ | ✅ | ✅ |
| multiline without id | ❌ | ❌ | ❌ | ✅ |
| multiple words in quotes | ✅ | ✅ | ✅ | ✅ |
| nested links | ✅ | ✅ | ✅ | ❌ |
| nested links single line | ❌ | ❌ | ❌ | ✅ |
| parse multiline link | ✅ | ✅ | ✅ | ✅ |
| parse quoted references | ✅ | ✅ | ✅ | ❌ |
| parse quoted references values only | ✅ | ✅ | ❌ | ✅ |
| parse reference with colon and values | ✅ | ✅ | ✅ | ✅ |
| parse simple reference | ✅ | ✅ | ✅ | ✅ |
| parse values only | ❌ | ✅ | ✅ | ✅ |
| parse values only standalone colon | ✅ | ❌ | ❌ | ❌ |
| quoted reference | ❌ | ❌ | ✅ | ❌ |
| quoted reference (parser) | ❌ | ✅ | ❌ | ❌ |
| quoted reference parser | ✅ | ❌ | ❌ | ✅ |
| quoted references | ✅ | ✅ | ✅ | ✅ |
| quoted references with spaces | ✅ | ✅ | ✅ | ✅ |
| quoted references with spaces in link | ✅ | ❌ | ❌ | ❌ |
| quoted references with special chars | ❌ | ❌ | ❌ | ✅ |
| simple ref | ✅ | ✅ | ❌ | ✅ |
| simple reference | ❌ | ❌ | ✅ | ❌ |
| simple reference (parser) | ❌ | ✅ | ❌ | ❌ |
| simple reference parser | ✅ | ❌ | ❌ | ✅ |
| single line link | ❌ | ❌ | ✅ | ❌ |
| single line link with id | ✅ | ✅ | ✅ | ❌ |
| single line with id | ❌ | ❌ | ❌ | ✅ |
| single line without id | ❌ | ❌ | ❌ | ✅ |
| single link | ✅ | ✅ | ✅ | ✅ |
| single quoted references | ✅ | ✅ | ✅ | ✅ |
| singlet link | ✅ | ✅ | ✅ | ✅ |
| singlet link (parser) | ❌ | ✅ | ❌ | ❌ |
| singlet link parser | ✅ | ❌ | ✅ | ✅ |
| special characters in quotes | ✅ | ✅ | ✅ | ✅ |
| triplet single link | ✅ | ✅ | ✅ | ✅ |
| value link | ✅ | ✅ | ✅ | ✅ |
| value link (parser) | ❌ | ✅ | ❌ | ❌ |
| value link parser | ✅ | ❌ | ✅ | ✅ |

**Category totals:** Python: 29, JavaScript: 28, Rust: 28, C#: 29

## Tuple

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| named tuple to link | ❌ | ❌ | ❌ | ✅ |
| tuple to link | ❌ | ❌ | ❌ | ✅ |

**Category totals:** Python: 0, JavaScript: 0, Rust: 0, C#: 2

---

## Missing Tests Summary

### Python Missing Tests

**Api** (2 missing):
- is link
- is ref

**Indentation Consistency** (3 missing):
- leading spaces vs no leading spaces should produce same result
- simple two vs four spaces
- three level nesting

**Indented Id Syntax** (16 missing):
- basic indented  i d syntax   issue #21
- empty indented  i d should work
- empty indented id
- equivalence test   comprehensive
- equivalence test comprehensive
- indented  i d syntax with multiple values
- indented  i d syntax with numeric  i d
- indented  i d syntax with quoted  i d
- indented  i d syntax with single value
- indented  i d with deeper nesting
- indented id multiple values
- indented id numeric
- indented id single value
- indented id with quoted id
- multiple indented  i d links
- unsupported colon only syntax

**Link** (5 missing):
- link escape reference for simple reference
- link escape reference with special characters
- link to string with id and values
- link to string with id only
- link to string with values only

**Links Group** (5 missing):
- links group append to links list
- links group constructor
- links group constructor equivalent
- links group to list flattens structure
- links group to string

**Mixed Indentation Modes** (9 missing):
- hero example   alternative format   issue #105
- hero example   equivalence test   issue #105
- hero example   mixed modes   issue #105
- hero example alternative format
- hero example equivalence
- hero example mixed modes
- sequence/list context with colon
- sequence context with complex values
- set/object context without colon

**Multiline Parser** (2 missing):
- parse and stringify test2
- parse and stringify test 2

**Multiline Quoted String** (4 missing):
- multiline double quoted reference
- multiline quoted as id
- simple multiline double quoted
- simple multiline single quoted

**Nested Parser** (2 missing):
- indentation parser
- nested indentation parser

**Single Line Parser** (19 missing):
- bug test1
- bug test 1
- link with id
- link without id (multi line)
- link without id (single line)
- link without id multi line
- multiline without id
- nested links single line
- parse values only
- quoted reference
- quoted reference (parser)
- quoted references with special chars
- simple reference
- simple reference (parser)
- single line link
- single line with id
- single line without id
- singlet link (parser)
- value link (parser)

**Tuple** (2 missing):
- named tuple to link
- tuple to link

**Total missing: 69 tests**

### JavaScript Missing Tests

**Api** (2 missing):
- is link
- is ref

**Indentation Consistency** (3 missing):
- leading spaces vs no leading spaces
- simple two vs four spaces
- three level nesting

**Indented Id Syntax** (16 missing):
- basic indented id syntax
- empty indented id
- empty indented id should work
- equivalence comprehensive
- equivalence test comprehensive
- indented id multiple values
- indented id numeric
- indented id single value
- indented id syntax with multiple values
- indented id syntax with numeric id
- indented id syntax with quoted id
- indented id syntax with single value
- indented id with deeper nesting
- indented id with quoted id
- multiple indented id links
- unsupported colon only syntax

**Link** (5 missing):
- link escape reference simple
- link escape reference special chars
- link tostring with id and values
- link tostring with id only
- link tostring with values only

**Links Group** (2 missing):
- links group append to links list
- links group constructor equivalent

**Mixed Indentation Modes** (5 missing):
- hero example alternative format
- hero example equivalence
- hero example mixed modes
- sequence context with colon
- set context without colon

**Multiline Parser** (2 missing):
- parse and stringify 2
- parse and stringify test 2

**Nested Parser** (2 missing):
- indentation
- nested indentation

**Single Line Parser** (20 missing):
- bug1
- bug test 1
- link with id
- link without id multi line
- link without id multiline colon
- link without id single line
- multiline without id
- nested links single line
- parse values only standalone colon
- quoted reference
- quoted reference parser
- quoted references with spaces in link
- quoted references with special chars
- simple reference
- simple reference parser
- single line link
- single line with id
- single line without id
- singlet link parser
- value link parser

**Tuple** (2 missing):
- named tuple to link
- tuple to link

**Total missing: 59 tests**

### Rust Missing Tests

**Api** (2 missing):
- is link equivalent
- is ref equivalent

**Indentation Consistency** (3 missing):
- leading spaces vs no leading spaces should produce same result
- simple two vs four spaces indentation
- three level nesting with different indentation

**Indented Id Syntax** (16 missing):
- basic indented  i d syntax   issue #21
- empty indented  i d should work
- empty indented id should work
- equivalence comprehensive
- equivalence test   comprehensive
- indented  i d syntax with multiple values
- indented  i d syntax with numeric  i d
- indented  i d syntax with quoted  i d
- indented  i d syntax with single value
- indented  i d with deeper nesting
- indented id syntax with multiple values
- indented id syntax with numeric id
- indented id syntax with quoted id
- indented id syntax with single value
- multiple indented  i d links
- unsupported colon only syntax should fail

**Link** (5 missing):
- link escape reference for simple reference
- link escape reference special chars
- link tostring with id and values
- link tostring with id only
- link tostring with values only

**Links Group** (2 missing):
- links group append to links list
- links group constructor

**Mixed Indentation Modes** (5 missing):
- hero example   alternative format   issue #105
- hero example   equivalence test   issue #105
- hero example   mixed modes   issue #105
- sequence/list context with colon
- set/object context without colon

**Multiline Parser** (2 missing):
- parse and stringify 2
- parse and stringify test2

**Nested Parser** (2 missing):
- indentation parser
- nested indentation parser

**Single Line Parser** (20 missing):
- bug1
- bug test1
- link without id (multi line)
- link without id (single line)
- link without id multiline colon
- multiline without id
- nested links single line
- parse quoted references values only
- parse values only standalone colon
- quoted reference (parser)
- quoted reference parser
- quoted references with spaces in link
- quoted references with special chars
- simple ref
- simple reference (parser)
- simple reference parser
- single line with id
- single line without id
- singlet link (parser)
- value link (parser)

**Tuple** (2 missing):
- named tuple to link
- tuple to link

**Total missing: 59 tests**

### C# Missing Tests

**Api** (2 missing):
- is link
- is ref

**Indentation Consistency** (3 missing):
- leading spaces vs no leading spaces
- simple two vs four spaces
- three level nesting

**Indented Id Syntax** (16 missing):
- basic indented  i d syntax   issue #21
- empty indented  i d should work
- empty indented id should work
- equivalence comprehensive
- equivalence test   comprehensive
- indented  i d syntax with multiple values
- indented  i d syntax with numeric  i d
- indented  i d syntax with quoted  i d
- indented  i d syntax with single value
- indented  i d with deeper nesting
- indented id multiple values
- indented id numeric
- indented id single value
- indented id with quoted id
- multiple indented  i d links
- unsupported colon only syntax

**Link** (5 missing):
- link escape reference for simple reference
- link escape reference special chars
- link tostring with id and values
- link tostring with id only
- link tostring with values only

**Links Group** (2 missing):
- links group constructor equivalent
- links group to string

**Mixed Indentation Modes** (5 missing):
- hero example   alternative format   issue #105
- hero example   equivalence test   issue #105
- hero example   mixed modes   issue #105
- sequence/list context with colon
- set/object context without colon

**Multiline Parser** (2 missing):
- parse and stringify 2
- parse and stringify test 2

**Nested Parser** (2 missing):
- indentation
- nested indentation

**Single Line Parser** (19 missing):
- bug1
- bug test 1
- link with id
- link without id (multi line)
- link without id (single line)
- link without id multiline colon
- link without id single line
- nested links
- parse quoted references
- parse values only standalone colon
- quoted reference
- quoted reference (parser)
- quoted references with spaces in link
- simple reference
- simple reference (parser)
- single line link
- single line link with id
- singlet link (parser)
- value link (parser)

**Total missing: 56 tests**

