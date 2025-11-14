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
| C#         | 6 | 2 |

---

## Api

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| empty link | ✅ | ✅ | ✅ | ❌ |
| is link | ❌ | ❌ | ✅ | ❌ |
| is link equivalent | ✅ | ✅ | ❌ | ❌ |
| is ref | ❌ | ❌ | ✅ | ❌ |
| is ref equivalent | ✅ | ✅ | ❌ | ❌ |
| link with source target | ✅ | ✅ | ✅ | ❌ |
| link with source type target | ✅ | ✅ | ✅ | ❌ |
| quoted references | ✅ | ✅ | ✅ | ❌ |
| simple link | ✅ | ✅ | ✅ | ❌ |
| single line format | ✅ | ✅ | ✅ | ❌ |

**Category totals:** Python: 8, JavaScript: 8, Rust: 8, C#: 0

## Edge Case Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| all features | ✅ | ❌ | ❌ | ❌ |
| all features test | ❌ | ❌ | ✅ | ❌ |
| empty document | ✅ | ❌ | ❌ | ❌ |
| empty document test | ❌ | ❌ | ✅ | ❌ |
| empty link | ✅ | ❌ | ❌ | ❌ |
| empty link test | ❌ | ❌ | ✅ | ❌ |
| empty link with empty self reference | ✅ | ❌ | ❌ | ❌ |
| empty link with empty self reference test | ❌ | ❌ | ✅ | ❌ |
| empty link with parentheses | ✅ | ❌ | ❌ | ❌ |
| empty link with parentheses test | ❌ | ❌ | ✅ | ❌ |
| empty links | ✅ | ❌ | ❌ | ❌ |
| empty links test | ❌ | ❌ | ✅ | ❌ |
| emptylinktest | ❌ | ✅ | ❌ | ❌ |
| emptylinkwithemptyselfreferencetest | ❌ | ✅ | ❌ | ❌ |
| emptylinkwithparenthesestest | ❌ | ✅ | ❌ | ❌ |
| invalid input | ✅ | ❌ | ✅ | ❌ |
| singlet links | ✅ | ❌ | ✅ | ❌ |
| testallfeaturestest | ❌ | ✅ | ❌ | ❌ |
| testemptydocumenttest | ❌ | ✅ | ❌ | ❌ |
| testemptylinkstest | ❌ | ✅ | ❌ | ❌ |
| testinvalidinputtest | ❌ | ✅ | ❌ | ❌ |
| testsingletlinkstest | ❌ | ✅ | ❌ | ❌ |
| testwhitespaceonlytest | ❌ | ✅ | ❌ | ❌ |
| whitespace only | ✅ | ❌ | ❌ | ❌ |
| whitespace only test | ❌ | ❌ | ✅ | ❌ |

**Category totals:** Python: 9, JavaScript: 9, Rust: 9, C#: 0

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
| basic indented id syntax | ✅ | ❌ | ❌ | ❌ |
| basic indented id syntax   issue #21 | ❌ | ✅ | ❌ | ❌ |
| basic indented id syntax test | ❌ | ❌ | ✅ | ❌ |
| empty indented id should work | ✅ | ✅ | ❌ | ❌ |
| empty indented id test | ❌ | ❌ | ✅ | ❌ |
| equivalence comprehensive | ✅ | ❌ | ❌ | ❌ |
| equivalence   comprehensive | ❌ | ✅ | ❌ | ❌ |
| equivalence comprehensive | ❌ | ❌ | ✅ | ❌ |
| indented id multiple values test | ❌ | ❌ | ✅ | ❌ |
| indented id numeric test | ❌ | ❌ | ✅ | ❌ |
| indented id single value test | ❌ | ❌ | ✅ | ❌ |
| indented id syntax with multiple values | ✅ | ✅ | ❌ | ❌ |
| indented id syntax with numeric id | ✅ | ✅ | ❌ | ❌ |
| indented id syntax with quoted id | ✅ | ✅ | ❌ | ❌ |
| indented id syntax with single value | ✅ | ✅ | ❌ | ❌ |
| indented id with deeper nesting | ✅ | ✅ | ❌ | ❌ |
| indented id with deeper nesting test | ❌ | ❌ | ✅ | ❌ |
| indented id with quoted id test | ❌ | ❌ | ✅ | ❌ |
| mixed indented and regular syntax | ✅ | ✅ | ❌ | ❌ |
| mixed indented and regular syntax test | ❌ | ❌ | ✅ | ❌ |
| multiple indented id links | ✅ | ✅ | ❌ | ❌ |
| multiple indented id links test | ❌ | ❌ | ✅ | ❌ |
| unsupported colon only syntax should fail | ✅ | ✅ | ❌ | ❌ |
| unsupported colon only syntax test | ❌ | ❌ | ✅ | ❌ |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 0

## Link

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| link combine | ✅ | ✅ | ❌ | ❌ |
| link combine test | ❌ | ❌ | ✅ | ❌ |
| link constructor with id and values | ✅ | ✅ | ❌ | ❌ |
| link constructor with id and values test | ❌ | ❌ | ✅ | ❌ |
| link constructor with id only | ✅ | ✅ | ❌ | ❌ |
| link constructor with id only test | ❌ | ❌ | ✅ | ❌ |
| link equals | ✅ | ✅ | ❌ | ❌ |
| link equals test | ❌ | ❌ | ✅ | ❌ |
| link escape reference simple | ✅ | ❌ | ❌ | ❌ |
| link escape reference simple test | ❌ | ❌ | ✅ | ❌ |
| link escape reference special chars | ✅ | ❌ | ❌ | ❌ |
| link escape reference with special characters test | ❌ | ❌ | ✅ | ❌ |
| link escapereference for simple reference | ❌ | ✅ | ❌ | ❌ |
| link escapereference with special characters | ❌ | ✅ | ❌ | ❌ |
| link simplify | ✅ | ✅ | ❌ | ❌ |
| link simplify test | ❌ | ❌ | ✅ | ❌ |
| link to string with id and values test | ❌ | ❌ | ✅ | ❌ |
| link to string with id only test | ❌ | ❌ | ✅ | ❌ |
| link to string with values only test | ❌ | ❌ | ✅ | ❌ |
| link tostring with id and values | ✅ | ✅ | ❌ | ❌ |
| link tostring with id only | ✅ | ✅ | ❌ | ❌ |
| link tostring with values only | ✅ | ✅ | ❌ | ❌ |

**Category totals:** Python: 10, JavaScript: 10, Rust: 10, C#: 0

## Links Group

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| links group constructor equivalent test | ❌ | ❌ | ✅ | ❌ |
| links group to list flattens structure test | ❌ | ❌ | ✅ | ❌ |
| links group to string test | ❌ | ❌ | ✅ | ❌ |
| linksgroup constructor | ❌ | ✅ | ❌ | ❌ |
| linksgroup tolist flattens structure | ❌ | ✅ | ❌ | ❌ |
| linksgroup tostring | ❌ | ✅ | ❌ | ❌ |

**Category totals:** Python: 0, JavaScript: 3, Rust: 3, C#: 0

## Mixed Indentation Modes

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| deeply nested mixed modes | ✅ | ✅ | ❌ | ❌ |
| deeply nested mixed modes test | ❌ | ❌ | ✅ | ❌ |
| hero example   alternative format   issue #105 | ❌ | ✅ | ❌ | ❌ |
| hero example   equivalence   issue #105 | ❌ | ✅ | ❌ | ❌ |
| hero example   mixed modes   issue #105 | ❌ | ✅ | ❌ | ❌ |
| hero example alternative format test | ❌ | ❌ | ✅ | ❌ |
| hero example equivalence test | ❌ | ❌ | ✅ | ❌ |
| hero example mixed modes test | ❌ | ❌ | ✅ | ❌ |
| nested set and sequence contexts | ✅ | ✅ | ❌ | ❌ |
| nested set and sequence contexts test | ❌ | ❌ | ✅ | ❌ |
| sequence/list context with colon | ❌ | ✅ | ❌ | ❌ |
| sequence context with colon | ✅ | ❌ | ❌ | ❌ |
| sequence context with colon test | ❌ | ❌ | ✅ | ❌ |
| sequence context with complex values | ❌ | ✅ | ❌ | ❌ |
| sequence context with complex values test | ❌ | ❌ | ✅ | ❌ |
| set/object context without colon | ❌ | ✅ | ❌ | ❌ |
| set context without colon | ✅ | ❌ | ❌ | ❌ |
| set context without colon test | ❌ | ❌ | ✅ | ❌ |

**Category totals:** Python: 4, JavaScript: 8, Rust: 8, C#: 0

## Multiline Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| complex structure | ✅ | ✅ | ✅ | ❌ |
| duplicate identifiers | ✅ | ❌ | ❌ | ❌ |
| duplicate identifiers test | ❌ | ❌ | ✅ | ❌ |
| duplicateidentifierstest | ❌ | ✅ | ❌ | ❌ |
| indented children | ✅ | ✅ | ✅ | ❌ |
| mixed formats | ✅ | ✅ | ✅ | ❌ |
| multiline simple links | ✅ | ✅ | ✅ | ❌ |
| multiline with id | ✅ | ✅ | ✅ | ❌ |
| multiple top level elements | ✅ | ✅ | ✅ | ❌ |
| parse and stringify | ✅ | ❌ | ❌ | ❌ |
| parse and stringify 2 | ✅ | ❌ | ❌ | ❌ |
| parse and stringify test | ❌ | ❌ | ✅ | ❌ |
| parse and stringify 2 | ❌ | ❌ | ✅ | ❌ |
| parse and stringify with less parentheses | ✅ | ❌ | ❌ | ❌ |
| parse and stringify with less parentheses test | ❌ | ❌ | ✅ | ❌ |
| parseandstringifytest | ❌ | ✅ | ❌ | ❌ |
| parseandstringifytest2 | ❌ | ✅ | ❌ | ❌ |
| parseandstringifywithlessparenthesestest | ❌ | ✅ | ❌ | ❌ |
| two links | ✅ | ❌ | ❌ | ❌ |
| two links test | ❌ | ❌ | ✅ | ❌ |
| twolinkstest | ❌ | ✅ | ❌ | ❌ |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 0

## Multiline Quoted String

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| multiline double quoted reference | ❌ | ❌ | ✅ | ❌ |
| multiline quoted as id | ❌ | ❌ | ✅ | ❌ |
| simple multiline double quoted | ❌ | ❌ | ✅ | ❌ |
| simple multiline single quoted | ❌ | ❌ | ✅ | ❌ |
| testmultilinedoublequotedreference | ❌ | ✅ | ❌ | ❌ |
| testmultilinequotedasid | ❌ | ✅ | ❌ | ❌ |
| testsimplemultilinedoublequoted | ❌ | ✅ | ❌ | ❌ |
| testsimplemultilinesinglequoted | ❌ | ✅ | ❌ | ❌ |

**Category totals:** Python: 0, JavaScript: 4, Rust: 4, C#: 0

## Nested Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| complex indentation | ✅ | ✅ | ✅ | ❌ |
| indentation | ✅ | ❌ | ✅ | ❌ |
| indentation (parser) | ❌ | ✅ | ❌ | ❌ |
| indentation based children | ✅ | ✅ | ✅ | ❌ |
| indentation consistency | ✅ | ✅ | ✅ | ❌ |
| nested indentation | ✅ | ❌ | ✅ | ❌ |
| nested indentation (parser) | ❌ | ✅ | ❌ | ❌ |
| nested links | ✅ | ✅ | ✅ | ❌ |
| parse nested structure with indentation | ✅ | ✅ | ✅ | ❌ |
| significant whitespace | ✅ | ❌ | ❌ | ❌ |
| significant whitespace test | ❌ | ❌ | ✅ | ❌ |
| significantwhitespacetest | ❌ | ✅ | ❌ | ❌ |
| simple significant whitespace | ✅ | ❌ | ❌ | ❌ |
| simple significant whitespace test | ❌ | ❌ | ✅ | ❌ |
| simplesignificantwhitespacetest | ❌ | ✅ | ❌ | ❌ |
| two spaces sized whitespace | ✅ | ❌ | ❌ | ❌ |
| two spaces sized whitespace test | ❌ | ❌ | ✅ | ❌ |
| twospacessizedwhitespacetest | ❌ | ✅ | ❌ | ❌ |

**Category totals:** Python: 10, JavaScript: 10, Rust: 10, C#: 0

## Single Line Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| bug1 | ✅ | ❌ | ❌ | ❌ |
| bug 1 | ❌ | ❌ | ✅ | ❌ |
| bugtest1 | ❌ | ✅ | ❌ | ❌ |
| deeply nested | ✅ | ✅ | ✅ | ❌ |
| hyphenated identifiers | ✅ | ✅ | ✅ | ❌ |
| link with id | ❌ | ❌ | ✅ | ❌ |
| link without id (multi line) | ❌ | ✅ | ❌ | ❌ |
| link without id (single line) | ❌ | ✅ | ❌ | ❌ |
| link without id multi line | ❌ | ❌ | ✅ | ❌ |
| link without id multiline colon | ✅ | ❌ | ❌ | ❌ |
| link without id single line | ✅ | ❌ | ✅ | ❌ |
| multi line link with id | ✅ | ✅ | ✅ | ❌ |
| multiple words in quotes | ✅ | ✅ | ✅ | ❌ |
| nested links | ✅ | ✅ | ✅ | ❌ |
| parse multiline link | ✅ | ✅ | ✅ | ❌ |
| parse quoted references | ✅ | ✅ | ✅ | ❌ |
| parse quoted references values only | ✅ | ❌ | ❌ | ❌ |
| parse reference with colon and values | ✅ | ✅ | ✅ | ❌ |
| parse simple reference | ✅ | ✅ | ✅ | ❌ |
| parse values only | ❌ | ✅ | ✅ | ❌ |
| parse values only standalone colon | ✅ | ❌ | ❌ | ❌ |
| parsequotedreferencesvaluesonly | ❌ | ✅ | ❌ | ❌ |
| quoted reference | ❌ | ❌ | ✅ | ❌ |
| quoted reference (parser) | ❌ | ✅ | ❌ | ❌ |
| quoted reference parser | ✅ | ❌ | ❌ | ❌ |
| quoted references | ✅ | ✅ | ✅ | ❌ |
| quoted references test | ❌ | ❌ | ✅ | ❌ |
| quoted references with spaces | ✅ | ❌ | ❌ | ❌ |
| quoted references with spaces in link | ✅ | ❌ | ❌ | ❌ |
| quoted references with spaces test | ❌ | ❌ | ✅ | ❌ |
| quotedreferencestest | ❌ | ✅ | ❌ | ❌ |
| quotedreferenceswithspacestest | ❌ | ✅ | ❌ | ❌ |
| simple ref | ✅ | ✅ | ❌ | ❌ |
| simple reference | ❌ | ❌ | ✅ | ❌ |
| simple reference (parser) | ❌ | ✅ | ❌ | ❌ |
| simple reference parser | ✅ | ❌ | ❌ | ❌ |
| single line link | ❌ | ❌ | ✅ | ❌ |
| single line link with id | ✅ | ✅ | ✅ | ❌ |
| single link | ✅ | ❌ | ❌ | ❌ |
| single link test | ❌ | ❌ | ✅ | ❌ |
| single quoted references | ✅ | ✅ | ✅ | ❌ |
| singlelinktest | ❌ | ✅ | ❌ | ❌ |
| singlet link | ✅ | ✅ | ✅ | ❌ |
| singlet link (parser) | ❌ | ✅ | ❌ | ❌ |
| singlet link parser | ✅ | ❌ | ✅ | ❌ |
| special characters in quotes | ✅ | ✅ | ✅ | ❌ |
| triplet single link | ✅ | ❌ | ❌ | ❌ |
| triplet single link test | ❌ | ❌ | ✅ | ❌ |
| tripletsinglelinktest | ❌ | ✅ | ❌ | ❌ |
| value link | ✅ | ✅ | ✅ | ❌ |
| value link (parser) | ❌ | ✅ | ❌ | ❌ |
| value link parser | ✅ | ❌ | ✅ | ❌ |

**Category totals:** Python: 29, JavaScript: 29, Rust: 29, C#: 0

## Tuple

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| named tuple to link test | ❌ | ❌ | ❌ | ✅ |
| tuple to link test | ❌ | ❌ | ❌ | ✅ |

**Category totals:** Python: 0, JavaScript: 0, Rust: 0, C#: 2

---

## Missing Tests Summary

### Python Missing Tests

**Api** (2 missing):
- is link
- is ref

**Edge Case Parser** (16 missing):
- all features test
- empty document test
- empty link test
- empty link with empty self reference test
- empty link with parentheses test
- empty links test
- emptylinktest
- emptylinkwithemptyselfreferencetest
- emptylinkwithparenthesestest
- testallfeaturestest
- testemptydocumenttest
- testemptylinkstest
- testinvalidinputtest
- testsingletlinkstest
- testwhitespaceonlytest
- whitespace only test

**Indentation Consistency** (3 missing):
- leading spaces vs no leading spaces should produce same result
- simple two vs four spaces
- three level nesting

**Indented Id Syntax** (13 missing):
- basic indented id syntax   issue #21
- basic indented id syntax test
- empty indented id test
- equivalence   comprehensive
- equivalence comprehensive
- indented id multiple values test
- indented id numeric test
- indented id single value test
- indented id with deeper nesting test
- indented id with quoted id test
- mixed indented and regular syntax test
- multiple indented id links test
- unsupported colon only syntax test

**Link** (12 missing):
- link combine test
- link constructor with id and values test
- link constructor with id only test
- link equals test
- link escape reference simple test
- link escape reference with special characters test
- link escapereference for simple reference
- link escapereference with special characters
- link simplify test
- link to string with id and values test
- link to string with id only test
- link to string with values only test

**Links Group** (6 missing):
- links group constructor equivalent test
- links group to list flattens structure test
- links group to string test
- linksgroup constructor
- linksgroup tolist flattens structure
- linksgroup tostring

**Mixed Indentation Modes** (14 missing):
- deeply nested mixed modes test
- hero example   alternative format   issue #105
- hero example   equivalence   issue #105
- hero example   mixed modes   issue #105
- hero example alternative format test
- hero example equivalence test
- hero example mixed modes test
- nested set and sequence contexts test
- sequence/list context with colon
- sequence context with colon test
- sequence context with complex values
- sequence context with complex values test
- set/object context without colon
- set context without colon test

**Multiline Parser** (10 missing):
- duplicate identifiers test
- duplicateidentifierstest
- parse and stringify test
- parse and stringify 2
- parse and stringify with less parentheses test
- parseandstringifytest
- parseandstringifytest2
- parseandstringifywithlessparenthesestest
- two links test
- twolinkstest

**Multiline Quoted String** (8 missing):
- multiline double quoted reference
- multiline quoted as id
- simple multiline double quoted
- simple multiline single quoted
- testmultilinedoublequotedreference
- testmultilinequotedasid
- testsimplemultilinedoublequoted
- testsimplemultilinesinglequoted

**Nested Parser** (8 missing):
- indentation (parser)
- nested indentation (parser)
- significant whitespace test
- significantwhitespacetest
- simple significant whitespace test
- simplesignificantwhitespacetest
- two spaces sized whitespace test
- twospacessizedwhitespacetest

**Single Line Parser** (23 missing):
- bug 1
- bugtest1
- link with id
- link without id (multi line)
- link without id (single line)
- link without id multi line
- parse values only
- parsequotedreferencesvaluesonly
- quoted reference
- quoted reference (parser)
- quoted references test
- quoted references with spaces test
- quotedreferencestest
- quotedreferenceswithspacestest
- simple reference
- simple reference (parser)
- single line link
- single link test
- singlelinktest
- singlet link (parser)
- triplet single link test
- tripletsinglelinktest
- value link (parser)

**Tuple** (2 missing):
- named tuple to link test
- tuple to link test

**Total missing: 117 tests**

### JavaScript Missing Tests

**Api** (2 missing):
- is link
- is ref

**Edge Case Parser** (16 missing):
- all features
- all features test
- empty document
- empty document test
- empty link
- empty link test
- empty link with empty self reference
- empty link with empty self reference test
- empty link with parentheses
- empty link with parentheses test
- empty links
- empty links test
- invalid input
- singlet links
- whitespace only
- whitespace only test

**Indentation Consistency** (3 missing):
- leading spaces vs no leading spaces
- simple two vs four spaces
- three level nesting

**Indented Id Syntax** (13 missing):
- basic indented id syntax
- basic indented id syntax test
- empty indented id test
- equivalence comprehensive
- equivalence comprehensive
- indented id multiple values test
- indented id numeric test
- indented id single value test
- indented id with deeper nesting test
- indented id with quoted id test
- mixed indented and regular syntax test
- multiple indented id links test
- unsupported colon only syntax test

**Link** (12 missing):
- link combine test
- link constructor with id and values test
- link constructor with id only test
- link equals test
- link escape reference simple
- link escape reference simple test
- link escape reference special chars
- link escape reference with special characters test
- link simplify test
- link to string with id and values test
- link to string with id only test
- link to string with values only test

**Links Group** (3 missing):
- links group constructor equivalent test
- links group to list flattens structure test
- links group to string test

**Mixed Indentation Modes** (10 missing):
- deeply nested mixed modes test
- hero example alternative format test
- hero example equivalence test
- hero example mixed modes test
- nested set and sequence contexts test
- sequence context with colon
- sequence context with colon test
- sequence context with complex values test
- set context without colon
- set context without colon test

**Multiline Parser** (10 missing):
- duplicate identifiers
- duplicate identifiers test
- parse and stringify
- parse and stringify 2
- parse and stringify test
- parse and stringify 2
- parse and stringify with less parentheses
- parse and stringify with less parentheses test
- two links
- two links test

**Multiline Quoted String** (4 missing):
- multiline double quoted reference
- multiline quoted as id
- simple multiline double quoted
- simple multiline single quoted

**Nested Parser** (8 missing):
- indentation
- nested indentation
- significant whitespace
- significant whitespace test
- simple significant whitespace
- simple significant whitespace test
- two spaces sized whitespace
- two spaces sized whitespace test

**Single Line Parser** (23 missing):
- bug1
- bug 1
- link with id
- link without id multi line
- link without id multiline colon
- link without id single line
- parse quoted references values only
- parse values only standalone colon
- quoted reference
- quoted reference parser
- quoted references test
- quoted references with spaces
- quoted references with spaces in link
- quoted references with spaces test
- simple reference
- simple reference parser
- single line link
- single link
- single link test
- singlet link parser
- triplet single link
- triplet single link test
- value link parser

**Tuple** (2 missing):
- named tuple to link test
- tuple to link test

**Total missing: 106 tests**

### Rust Missing Tests

**Api** (2 missing):
- is link equivalent
- is ref equivalent

**Edge Case Parser** (16 missing):
- all features
- empty document
- empty link
- empty link with empty self reference
- empty link with parentheses
- empty links
- emptylinktest
- emptylinkwithemptyselfreferencetest
- emptylinkwithparenthesestest
- testallfeaturestest
- testemptydocumenttest
- testemptylinkstest
- testinvalidinputtest
- testsingletlinkstest
- testwhitespaceonlytest
- whitespace only

**Indentation Consistency** (3 missing):
- leading spaces vs no leading spaces should produce same result
- simple two vs four spaces indentation
- three level nesting with different indentation

**Indented Id Syntax** (13 missing):
- basic indented id syntax
- basic indented id syntax   issue #21
- empty indented id should work
- equivalence comprehensive
- equivalence   comprehensive
- indented id syntax with multiple values
- indented id syntax with numeric id
- indented id syntax with quoted id
- indented id syntax with single value
- indented id with deeper nesting
- mixed indented and regular syntax
- multiple indented id links
- unsupported colon only syntax should fail

**Link** (12 missing):
- link combine
- link constructor with id and values
- link constructor with id only
- link equals
- link escape reference simple
- link escape reference special chars
- link escapereference for simple reference
- link escapereference with special characters
- link simplify
- link tostring with id and values
- link tostring with id only
- link tostring with values only

**Links Group** (3 missing):
- linksgroup constructor
- linksgroup tolist flattens structure
- linksgroup tostring

**Mixed Indentation Modes** (10 missing):
- deeply nested mixed modes
- hero example   alternative format   issue #105
- hero example   equivalence   issue #105
- hero example   mixed modes   issue #105
- nested set and sequence contexts
- sequence/list context with colon
- sequence context with colon
- sequence context with complex values
- set/object context without colon
- set context without colon

**Multiline Parser** (10 missing):
- duplicate identifiers
- duplicateidentifierstest
- parse and stringify
- parse and stringify 2
- parse and stringify with less parentheses
- parseandstringifytest
- parseandstringifytest2
- parseandstringifywithlessparenthesestest
- two links
- twolinkstest

**Multiline Quoted String** (4 missing):
- testmultilinedoublequotedreference
- testmultilinequotedasid
- testsimplemultilinedoublequoted
- testsimplemultilinesinglequoted

**Nested Parser** (8 missing):
- indentation (parser)
- nested indentation (parser)
- significant whitespace
- significantwhitespacetest
- simple significant whitespace
- simplesignificantwhitespacetest
- two spaces sized whitespace
- twospacessizedwhitespacetest

**Single Line Parser** (23 missing):
- bug1
- bugtest1
- link without id (multi line)
- link without id (single line)
- link without id multiline colon
- parse quoted references values only
- parse values only standalone colon
- parsequotedreferencesvaluesonly
- quoted reference (parser)
- quoted reference parser
- quoted references with spaces
- quoted references with spaces in link
- quotedreferencestest
- quotedreferenceswithspacestest
- simple ref
- simple reference (parser)
- simple reference parser
- single link
- singlelinktest
- singlet link (parser)
- triplet single link
- tripletsinglelinktest
- value link (parser)

**Tuple** (2 missing):
- named tuple to link test
- tuple to link test

**Total missing: 106 tests**

### C# Missing Tests

**Api** (10 missing):
- empty link
- is link
- is link equivalent
- is ref
- is ref equivalent
- link with source target
- link with source type target
- quoted references
- simple link
- single line format

**Edge Case Parser** (25 missing):
- all features
- all features test
- empty document
- empty document test
- empty link
- empty link test
- empty link with empty self reference
- empty link with empty self reference test
- empty link with parentheses
- empty link with parentheses test
- empty links
- empty links test
- emptylinktest
- emptylinkwithemptyselfreferencetest
- emptylinkwithparenthesestest
- invalid input
- singlet links
- testallfeaturestest
- testemptydocumenttest
- testemptylinkstest
- testinvalidinputtest
- testsingletlinkstest
- testwhitespaceonlytest
- whitespace only
- whitespace only test

**Indentation Consistency** (3 missing):
- leading spaces vs no leading spaces
- simple two vs four spaces
- three level nesting

**Indented Id Syntax** (24 missing):
- basic indented id syntax
- basic indented id syntax   issue #21
- basic indented id syntax test
- empty indented id should work
- empty indented id test
- equivalence comprehensive
- equivalence   comprehensive
- equivalence comprehensive
- indented id multiple values test
- indented id numeric test
- indented id single value test
- indented id syntax with multiple values
- indented id syntax with numeric id
- indented id syntax with quoted id
- indented id syntax with single value
- indented id with deeper nesting
- indented id with deeper nesting test
- indented id with quoted id test
- mixed indented and regular syntax
- mixed indented and regular syntax test
- multiple indented id links
- multiple indented id links test
- unsupported colon only syntax should fail
- unsupported colon only syntax test

**Link** (22 missing):
- link combine
- link combine test
- link constructor with id and values
- link constructor with id and values test
- link constructor with id only
- link constructor with id only test
- link equals
- link equals test
- link escape reference simple
- link escape reference simple test
- link escape reference special chars
- link escape reference with special characters test
- link escapereference for simple reference
- link escapereference with special characters
- link simplify
- link simplify test
- link to string with id and values test
- link to string with id only test
- link to string with values only test
- link tostring with id and values
- link tostring with id only
- link tostring with values only

**Links Group** (6 missing):
- links group constructor equivalent test
- links group to list flattens structure test
- links group to string test
- linksgroup constructor
- linksgroup tolist flattens structure
- linksgroup tostring

**Mixed Indentation Modes** (18 missing):
- deeply nested mixed modes
- deeply nested mixed modes test
- hero example   alternative format   issue #105
- hero example   equivalence   issue #105
- hero example   mixed modes   issue #105
- hero example alternative format test
- hero example equivalence test
- hero example mixed modes test
- nested set and sequence contexts
- nested set and sequence contexts test
- sequence/list context with colon
- sequence context with colon
- sequence context with colon test
- sequence context with complex values
- sequence context with complex values test
- set/object context without colon
- set context without colon
- set context without colon test

**Multiline Parser** (21 missing):
- complex structure
- duplicate identifiers
- duplicate identifiers test
- duplicateidentifierstest
- indented children
- mixed formats
- multiline simple links
- multiline with id
- multiple top level elements
- parse and stringify
- parse and stringify 2
- parse and stringify test
- parse and stringify 2
- parse and stringify with less parentheses
- parse and stringify with less parentheses test
- parseandstringifytest
- parseandstringifytest2
- parseandstringifywithlessparenthesestest
- two links
- two links test
- twolinkstest

**Multiline Quoted String** (8 missing):
- multiline double quoted reference
- multiline quoted as id
- simple multiline double quoted
- simple multiline single quoted
- testmultilinedoublequotedreference
- testmultilinequotedasid
- testsimplemultilinedoublequoted
- testsimplemultilinesinglequoted

**Nested Parser** (18 missing):
- complex indentation
- indentation
- indentation (parser)
- indentation based children
- indentation consistency
- nested indentation
- nested indentation (parser)
- nested links
- parse nested structure with indentation
- significant whitespace
- significant whitespace test
- significantwhitespacetest
- simple significant whitespace
- simple significant whitespace test
- simplesignificantwhitespacetest
- two spaces sized whitespace
- two spaces sized whitespace test
- twospacessizedwhitespacetest

**Single Line Parser** (52 missing):
- bug1
- bug 1
- bugtest1
- deeply nested
- hyphenated identifiers
- link with id
- link without id (multi line)
- link without id (single line)
- link without id multi line
- link without id multiline colon
- link without id single line
- multi line link with id
- multiple words in quotes
- nested links
- parse multiline link
- parse quoted references
- parse quoted references values only
- parse reference with colon and values
- parse simple reference
- parse values only
- parse values only standalone colon
- parsequotedreferencesvaluesonly
- quoted reference
- quoted reference (parser)
- quoted reference parser
- quoted references
- quoted references test
- quoted references with spaces
- quoted references with spaces in link
- quoted references with spaces test
- quotedreferencestest
- quotedreferenceswithspacestest
- simple ref
- simple reference
- simple reference (parser)
- simple reference parser
- single line link
- single line link with id
- single link
- single link test
- single quoted references
- singlelinktest
- singlet link
- singlet link (parser)
- singlet link parser
- special characters in quotes
- triplet single link
- triplet single link test
- tripletsinglelinktest
- value link
- value link (parser)
- value link parser

**Total missing: 207 tests**

