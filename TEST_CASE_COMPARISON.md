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
| Python     | 108 | 10 |
| JavaScript | 109 | 11 |
| Rust       | 110 | 11 |
| C#         | 111 | 12 |

---

## Api

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| empty link | [✅](python/tests/test_api.py:24) | [✅](js/tests/ApiTests.test.js:23) | [✅](rust/tests/api_tests.rs:20) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:29) |
| indented id syntax parsing | ❌ | ❌ | [✅](rust/tests/api_tests.rs:108) | ❌ |
| indented id syntax roundtrip | ❌ | [✅](js/tests/ApiTests.test.js:77) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:100) |
| is link | ❌ | ❌ | [✅](rust/tests/api_tests.rs:10) | ❌ |
| is link equivalent | [✅](python/tests/test_api.py:16) | [✅](js/tests/ApiTests.test.js:15) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:18) |
| is ref | ❌ | ❌ | [✅](rust/tests/api_tests.rs:3) | ❌ |
| is ref equivalent | [✅](python/tests/test_api.py:9) | [✅](js/tests/ApiTests.test.js:8) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:9) |
| link with source target | [✅](python/tests/test_api.py:42) | [✅](js/tests/ApiTests.test.js:39) | [✅](rust/tests/api_tests.rs:45) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:50) |
| link with source type target | [✅](python/tests/test_api.py:52) | [✅](js/tests/ApiTests.test.js:48) | [✅](rust/tests/api_tests.rs:60) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:62) |
| multiple indented id syntax parsing | ❌ | ❌ | [✅](rust/tests/api_tests.rs:127) | ❌ |
| multiple indented id syntax roundtrip | ❌ | [✅](js/tests/ApiTests.test.js:91) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:117) |
| quoted references | [✅](python/tests/test_api.py:74) | [✅](js/tests/ApiTests.test.js:68) | [✅](rust/tests/api_tests.rs:85) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:88) |
| quoted references parsing | ❌ | ❌ | [✅](rust/tests/api_tests.rs:94) | ❌ |
| simple link | [✅](python/tests/test_api.py:31) | [✅](js/tests/ApiTests.test.js:29) | [✅](rust/tests/api_tests.rs:30) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:37) |
| single line format | [✅](python/tests/test_api.py:62) | [✅](js/tests/ApiTests.test.js:57) | [✅](rust/tests/api_tests.rs:75) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:74) |

**Category totals:** Python: 8, JavaScript: 10, Rust: 11, C#: 10

## Edge Case Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| all features | [✅](python/tests/test_edge_case_parser.py:35) | [✅](js/tests/EdgeCaseParser.test.js:27) | [✅](rust/tests/edge_case_parser_tests.rs:30) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:37) |
| empty document | [✅](python/tests/test_edge_case_parser.py:89) | [✅](js/tests/EdgeCaseParser.test.js:76) | [✅](rust/tests/edge_case_parser_tests.rs:86) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:145) |
| empty link | [✅](python/tests/test_edge_case_parser.py:10) | [✅](js/tests/EdgeCaseParser.test.js:7) | [✅](rust/tests/edge_case_parser_tests.rs:3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:8) |
| empty link with empty self reference | [✅](python/tests/test_edge_case_parser.py:27) | [✅](js/tests/EdgeCaseParser.test.js:21) | [✅](rust/tests/edge_case_parser_tests.rs:22) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:28) |
| empty link with parentheses | [✅](python/tests/test_edge_case_parser.py:18) | [✅](js/tests/EdgeCaseParser.test.js:13) | [✅](rust/tests/edge_case_parser_tests.rs:11) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:17) |
| empty links | [✅](python/tests/test_edge_case_parser.py:105) | [✅](js/tests/EdgeCaseParser.test.js:90) | [✅](rust/tests/edge_case_parser_tests.rs:106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:163) |
| invalid input | [✅](python/tests/test_edge_case_parser.py:176) | [✅](js/tests/EdgeCaseParser.test.js:158) | [✅](rust/tests/edge_case_parser_tests.rs:189) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:179) |
| singlet links | [✅](python/tests/test_edge_case_parser.py:125) | [✅](js/tests/EdgeCaseParser.test.js:108) | [✅](rust/tests/edge_case_parser_tests.rs:122) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:89) |
| whitespace only | [✅](python/tests/test_edge_case_parser.py:97) | [✅](js/tests/EdgeCaseParser.test.js:83) | [✅](rust/tests/edge_case_parser_tests.rs:96) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:154) |

**Category totals:** Python: 9, JavaScript: 9, Rust: 9, C#: 9

## Format Config

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| format config basic | [✅](python/tests/test_format_config.py:9) | ❌ | ❌ | ❌ |
| format config custom indent | [✅](python/tests/test_format_config.py:82) | ❌ | ❌ | ❌ |
| format config less parentheses | [✅](python/tests/test_format_config.py:71) | ❌ | ❌ | ❌ |
| format with consecutive grouping | [✅](python/tests/test_format_config.py:51) | ❌ | ❌ | ❌ |
| format with line length limit | [✅](python/tests/test_format_config.py:17) | ❌ | ❌ | ❌ |
| format with max inline refs | [✅](python/tests/test_format_config.py:35) | ❌ | ❌ | ❌ |
| roundtrip with line length formatting | [✅](python/tests/test_format_config.py:97) | ❌ | ❌ | ❌ |
| should indent by length | [✅](python/tests/test_format_config.py:117) | ❌ | ❌ | ❌ |
| should indent by ref count | [✅](python/tests/test_format_config.py:128) | ❌ | ❌ | ❌ |

**Category totals:** Python: 9, JavaScript: 0, Rust: 0, C#: 0

## Indentation Consistency

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| leading spaces vs no leading spaces | [✅](python/tests/test_indentation_consistency.py:6) | ❌ | [✅](rust/tests/indentation_consistency_tests.rs:7) | ❌ |
| leading spaces vs no leading spaces should produce same result | ❌ | [✅](js/tests/IndentationConsistency.test.js:11) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:8) |
| simple two vs four spaces | ❌ | ❌ | [✅](rust/tests/indentation_consistency_tests.rs:57) | ❌ |
| simple two vs four spaces indentation | [✅](python/tests/test_indentation_consistency.py:90) | [✅](js/tests/IndentationConsistency.test.js:89) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:90) |
| three level nesting | ❌ | ❌ | [✅](rust/tests/indentation_consistency_tests.rs:82) | ❌ |
| three level nesting with different indentation | [✅](python/tests/test_indentation_consistency.py:111) | [✅](js/tests/IndentationConsistency.test.js:107) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:110) |
| two spaces vs four spaces indentation | [✅](python/tests/test_indentation_consistency.py:37) | [✅](js/tests/IndentationConsistency.test.js:39) | [✅](rust/tests/indentation_consistency_tests.rs:32) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:38) |

**Category totals:** Python: 4, JavaScript: 4, Rust: 4, C#: 4

## Indented Id Syntax

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| basic indented  i d syntax   issue #21 | ❌ | [✅](js/tests/IndentedIdSyntax.test.js:7) | ❌ | ❌ |
| basic indented id syntax | [✅](python/tests/test_indented_id_syntax.py:10) | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:7) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:8) |
| empty indented  i d should work | ❌ | [✅](js/tests/IndentedIdSyntax.test.js:136) | ❌ | ❌ |
| empty indented id | ❌ | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:61) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:143) |
| empty indented id should work | [✅](python/tests/test_indented_id_syntax.py:149) | ❌ | ❌ | ❌ |
| equivalence comprehensive | [✅](python/tests/test_indented_id_syntax.py:162) | ❌ | ❌ | ❌ |
| equivalence test   comprehensive | ❌ | [✅](js/tests/IndentedIdSyntax.test.js:148) | ❌ | ❌ |
| equivalence test comprehensive | ❌ | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:117) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:159) |
| indented  i d syntax with multiple values | ❌ | [✅](js/tests/IndentedIdSyntax.test.js:40) | ❌ | ❌ |
| indented  i d syntax with numeric  i d | ❌ | [✅](js/tests/IndentedIdSyntax.test.js:55) | ❌ | ❌ |
| indented  i d syntax with quoted  i d | ❌ | [✅](js/tests/IndentedIdSyntax.test.js:67) | ❌ | ❌ |
| indented  i d syntax with single value | ❌ | [✅](js/tests/IndentedIdSyntax.test.js:26) | ❌ | ❌ |
| indented  i d with deeper nesting | ❌ | [✅](js/tests/IndentedIdSyntax.test.js:120) | ❌ | ❌ |
| indented id multiple values | ❌ | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:35) | ❌ |
| indented id numeric | ❌ | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:44) | ❌ |
| indented id single value | ❌ | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:26) | ❌ |
| indented id syntax with multiple values | [✅](python/tests/test_indented_id_syntax.py:45) | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:45) |
| indented id syntax with numeric id | [✅](python/tests/test_indented_id_syntax.py:61) | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:63) |
| indented id syntax with quoted id | [✅](python/tests/test_indented_id_syntax.py:74) | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:78) |
| indented id syntax with single value | [✅](python/tests/test_indented_id_syntax.py:30) | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:28) |
| indented id with deeper nesting | [✅](python/tests/test_indented_id_syntax.py:132) | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:183) |
| indented id with quoted id | ❌ | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:71) | ❌ |
| mixed indented and regular syntax | [✅](python/tests/test_indented_id_syntax.py:102) | [✅](js/tests/IndentedIdSyntax.test.js:93) | [✅](rust/tests/indented_id_syntax_tests.rs:95) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:111) |
| multiple indented  i d links | ❌ | [✅](js/tests/IndentedIdSyntax.test.js:78) | ❌ | ❌ |
| multiple indented id links | [✅](python/tests/test_indented_id_syntax.py:86) | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:83) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:92) |
| unsupported colon only syntax | ❌ | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:53) | ❌ |
| unsupported colon only syntax should fail | [✅](python/tests/test_indented_id_syntax.py:119) | [✅](js/tests/IndentedIdSyntax.test.js:109) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:131) |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 11

## Link

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| link combine | [✅](python/tests/test_link.py:62) | [✅](js/tests/Link.test.js:52) | [✅](rust/tests/link_tests.rs:89) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:60) |
| link constructor with id and values | [✅](python/tests/test_link.py:13) | [✅](js/tests/Link.test.js:10) | [✅](rust/tests/link_tests.rs:17) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:17) |
| link constructor with id only | [✅](python/tests/test_link.py:6) | [✅](js/tests/Link.test.js:4) | [✅](rust/tests/link_tests.rs:3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:9) |
| link equals | [✅](python/tests/test_link.py:73) | [✅](js/tests/Link.test.js:62) | [✅](rust/tests/link_tests.rs:70) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:49) |
| link escape reference for simple reference | ❌ | [✅](js/tests/Link.test.js:33) | ❌ | ❌ |
| link escape reference simple | [✅](python/tests/test_link.py:40) | ❌ | [✅](rust/tests/link_tests.rs:107) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:73) |
| link escape reference special chars | [✅](python/tests/test_link.py:45) | ❌ | ❌ | ❌ |
| link escape reference with special characters | ❌ | [✅](js/tests/Link.test.js:37) | [✅](rust/tests/link_tests.rs:116) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:80) |
| link simplify | [✅](python/tests/test_link.py:54) | [✅](js/tests/Link.test.js:45) | [✅](rust/tests/link_tests.rs:127) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:91) |
| link to string with id and values | ❌ | [✅](js/tests/Link.test.js:28) | [✅](rust/tests/link_tests.rs:57) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:41) |
| link to string with id only | ❌ | [✅](js/tests/Link.test.js:18) | [✅](rust/tests/link_tests.rs:35) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:26) |
| link to string with values only | ❌ | [✅](js/tests/Link.test.js:23) | [✅](rust/tests/link_tests.rs:44) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:33) |
| link tostring with id and values | [✅](python/tests/test_link.py:34) | ❌ | ❌ | ❌ |
| link tostring with id only | [✅](python/tests/test_link.py:22) | ❌ | ❌ | ❌ |
| link tostring with values only | [✅](python/tests/test_link.py:28) | ❌ | ❌ | ❌ |

**Category totals:** Python: 10, JavaScript: 10, Rust: 10, C#: 10

## Links Group

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| links group append to links list | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs:50) |
| links group constructor | ❌ | [✅](js/tests/LinksGroup.test.js:5) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs:9) |
| links group constructor equivalent | ❌ | ❌ | [✅](rust/tests/links_group_tests.rs:3) | ❌ |
| links group to list flattens structure | ❌ | [✅](js/tests/LinksGroup.test.js:14) | [✅](rust/tests/links_group_tests.rs:25) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs:24) |
| links group to string | ❌ | [✅](js/tests/LinksGroup.test.js:31) | [✅](rust/tests/links_group_tests.rs:61) | ❌ |

**Category totals:** Python: 0, JavaScript: 3, Rust: 3, C#: 3

## Mixed Indentation Modes

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| deeply nested mixed modes | [✅](python/tests/test_mixed_indentation_modes.py:67) | [✅](js/tests/MixedIndentationModes.test.js:173) | [✅](rust/tests/mixed_indentation_modes_tests.rs:106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:198) |
| hero example   alternative format   issue #105 | ❌ | [✅](js/tests/MixedIndentationModes.test.js:34) | ❌ | ❌ |
| hero example   equivalence test   issue #105 | ❌ | [✅](js/tests/MixedIndentationModes.test.js:63) | ❌ | ❌ |
| hero example   mixed modes   issue #105 | ❌ | [✅](js/tests/MixedIndentationModes.test.js:7) | ❌ | ❌ |
| hero example alternative format | ❌ | ❌ | [✅](rust/tests/mixed_indentation_modes_tests.rs:22) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:38) |
| hero example equivalence | ❌ | ❌ | [✅](rust/tests/mixed_indentation_modes_tests.rs:37) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:70) |
| hero example mixed modes | ❌ | ❌ | [✅](rust/tests/mixed_indentation_modes_tests.rs:7) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:8) |
| nested set and sequence contexts | [✅](python/tests/test_mixed_indentation_modes.py:48) | [✅](js/tests/MixedIndentationModes.test.js:155) | [✅](rust/tests/mixed_indentation_modes_tests.rs:93) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:177) |
| sequence/list context with colon | ❌ | [✅](js/tests/MixedIndentationModes.test.js:117) | ❌ | ❌ |
| sequence context with colon | [✅](python/tests/test_mixed_indentation_modes.py:30) | ❌ | [✅](rust/tests/mixed_indentation_modes_tests.rs:64) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:133) |
| sequence context with complex values | ❌ | [✅](js/tests/MixedIndentationModes.test.js:134) | [✅](rust/tests/mixed_indentation_modes_tests.rs:79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:153) |
| set/object context without colon | ❌ | [✅](js/tests/MixedIndentationModes.test.js:105) | ❌ | ❌ |
| set context without colon | [✅](python/tests/test_mixed_indentation_modes.py:17) | ❌ | [✅](rust/tests/mixed_indentation_modes_tests.rs:52) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:118) |

**Category totals:** Python: 4, JavaScript: 8, Rust: 8, C#: 8

## Multiline Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| complex structure | [✅](python/tests/test_multiline_parser.py:75) | [✅](js/tests/MultilineParser.test.js:56) | [✅](rust/tests/multiline_parser_tests.rs:112) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:71) |
| duplicate identifiers | [✅](python/tests/test_multiline_parser.py:64) | [✅](js/tests/MultilineParser.test.js:46) | [✅](rust/tests/multiline_parser_tests.rs:104) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:58) |
| indented children | [✅](python/tests/test_multiline_parser.py:136) | [✅](js/tests/MultilineParser.test.js:112) | [✅](rust/tests/multiline_parser_tests.rs:172) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:138) |
| mixed formats | [✅](python/tests/test_multiline_parser.py:89) | [✅](js/tests/MultilineParser.test.js:69) | [✅](rust/tests/multiline_parser_tests.rs:126) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:86) |
| multiline simple links | [✅](python/tests/test_multiline_parser.py:120) | [✅](js/tests/MultilineParser.test.js:97) | [✅](rust/tests/multiline_parser_tests.rs:157) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:120) |
| multiline with id | [✅](python/tests/test_multiline_parser.py:104) | [✅](js/tests/MultilineParser.test.js:83) | [✅](rust/tests/multiline_parser_tests.rs:149) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:102) |
| multiple top level elements | [✅](python/tests/test_multiline_parser.py:112) | [✅](js/tests/MultilineParser.test.js:90) | [✅](rust/tests/multiline_parser_tests.rs:141) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:111) |
| parse and stringify | [✅](python/tests/test_multiline_parser.py:18) | [✅](js/tests/MultilineParser.test.js:15) | [✅](rust/tests/multiline_parser_tests.rs:80) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:19) |
| parse and stringify 2 | [✅](python/tests/test_multiline_parser.py:35) | ❌ | ❌ | ❌ |
| parse and stringify test2 | ❌ | [✅](js/tests/MultilineParser.test.js:25) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:32) |
| parse and stringify test 2 | ❌ | ❌ | [✅](rust/tests/multiline_parser_tests.rs:88) | ❌ |
| parse and stringify with less parentheses | [✅](python/tests/test_multiline_parser.py:52) | [✅](js/tests/MultilineParser.test.js:35) | [✅](rust/tests/multiline_parser_tests.rs:96) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:44) |
| two links | [✅](python/tests/test_multiline_parser.py:9) | [✅](js/tests/MultilineParser.test.js:7) | [✅](rust/tests/multiline_parser_tests.rs:72) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:8) |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 11

## Multiline Quoted String

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| multiline double quoted reference | ❌ | [✅](js/tests/MultilineQuotedString.test.js:6) | [✅](rust/tests/multiline_quoted_string_tests.rs:3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:8) |
| multiline quoted as id | ❌ | [✅](js/tests/MultilineQuotedString.test.js:65) | [✅](rust/tests/multiline_quoted_string_tests.rs:83) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:76) |
| simple multiline double quoted | ❌ | [✅](js/tests/MultilineQuotedString.test.js:35) | [✅](rust/tests/multiline_quoted_string_tests.rs:43) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:40) |
| simple multiline single quoted | ❌ | [✅](js/tests/MultilineQuotedString.test.js:50) | [✅](rust/tests/multiline_quoted_string_tests.rs:63) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:58) |

**Category totals:** Python: 0, JavaScript: 4, Rust: 4, C#: 4

## Nested Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| complex indentation | [✅](python/tests/test_nested_parser.py:137) | [✅](js/tests/NestedParser.test.js:127) | [✅](rust/tests/nested_parser_tests.rs:89) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:142) |
| deep nested structure roundtrip | [✅](python/tests/test_nested_parser.py:195) | ❌ | ❌ | ❌ |
| indentation | [✅](python/tests/test_nested_parser.py:116) | ❌ | [✅](rust/tests/nested_parser_tests.rs:121) | ❌ |
| indentation based children | [✅](python/tests/test_nested_parser.py:127) | [✅](js/tests/NestedParser.test.js:118) | [✅](rust/tests/nested_parser_tests.rs:79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:127) |
| indentation consistency | [✅](python/tests/test_nested_parser.py:116) | [✅](js/tests/NestedParser.test.js:108) | [✅](rust/tests/nested_parser_tests.rs:68) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:115) |
| indentation parser | ❌ | [✅](js/tests/NestedParser.test.js:151) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:176) |
| multiple nested links roundtrip | [✅](python/tests/test_nested_parser.py:205) | ❌ | ❌ | ❌ |
| nested indentation | [✅](python/tests/test_nested_parser.py:176) | ❌ | [✅](rust/tests/nested_parser_tests.rs:130) | ❌ |
| nested indentation parser | ❌ | [✅](js/tests/NestedParser.test.js:160) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:187) |
| nested links | [✅](python/tests/test_nested_parser.py:149) | [✅](js/tests/NestedParser.test.js:138) | [✅](rust/tests/nested_parser_tests.rs:104) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:160) |
| parse nested structure with indentation | [✅](python/tests/test_nested_parser.py:99) | [✅](js/tests/NestedParser.test.js:93) | [✅](rust/tests/nested_parser_tests.rs:59) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:102) |
| significant whitespace | [✅](python/tests/test_nested_parser.py:10) | [✅](js/tests/NestedParser.test.js:7) | [✅](rust/tests/nested_parser_tests.rs:4) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:9) |
| simple significant whitespace | [✅](python/tests/test_nested_parser.py:74) | [✅](js/tests/NestedParser.test.js:70) | [✅](rust/tests/nested_parser_tests.rs:41) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:73) |
| three level nesting roundtrip | [✅](python/tests/test_nested_parser.py:185) | ❌ | ❌ | ❌ |
| two spaces sized whitespace | [✅](python/tests/test_nested_parser.py:87) | [✅](js/tests/NestedParser.test.js:82) | [✅](rust/tests/nested_parser_tests.rs:50) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:88) |

**Category totals:** Python: 13, JavaScript: 10, Rust: 10, C#: 10

## Single Line Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| bug1 | [✅](python/tests/test_single_line_parser.py:25) | ❌ | ❌ | ❌ |
| bug test1 | ❌ | [✅](js/tests/SingleLineParser.test.js:21) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:28) |
| bug test 1 | ❌ | ❌ | [✅](rust/tests/single_line_parser_tests.rs:79) | ❌ |
| deeply nested | [✅](python/tests/test_single_line_parser.py:213) | [✅](js/tests/SingleLineParser.test.js:170) | [✅](rust/tests/single_line_parser_tests.rs:257) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:213) |
| hyphenated identifiers | [✅](python/tests/test_single_line_parser.py:220) | [✅](js/tests/SingleLineParser.test.js:176) | [✅](rust/tests/single_line_parser_tests.rs:264) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:179) |
| link with id | ❌ | ❌ | [✅](rust/tests/single_line_parser_tests.rs:310) | ❌ |
| link without id (multi line) | ❌ | [✅](js/tests/SingleLineParser.test.js:108) | ❌ | ❌ |
| link without id (single line) | ❌ | [✅](js/tests/SingleLineParser.test.js:102) | ❌ | ❌ |
| link without id multi line | ❌ | ❌ | [✅](rust/tests/single_line_parser_tests.rs:196) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:262) |
| link without id multiline colon | [✅](python/tests/test_single_line_parser.py:131) | ❌ | ❌ | ❌ |
| link without id single line | [✅](python/tests/test_single_line_parser.py:118) | ❌ | [✅](rust/tests/single_line_parser_tests.rs:188) | ❌ |
| multi line link with id | [✅](python/tests/test_single_line_parser.py:111) | [✅](js/tests/SingleLineParser.test.js:96) | [✅](rust/tests/single_line_parser_tests.rs:181) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:254) |
| multiline without id | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:238) |
| multiple words in quotes | [✅](python/tests/test_single_line_parser.py:227) | [✅](js/tests/SingleLineParser.test.js:182) | [✅](rust/tests/single_line_parser_tests.rs:271) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:190) |
| nested links | [✅](python/tests/test_single_line_parser.py:195) | [✅](js/tests/SingleLineParser.test.js:154) | [✅](rust/tests/single_line_parser_tests.rs:239) | ❌ |
| nested links single line | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:170) |
| parse multiline link | [✅](python/tests/test_single_line_parser.py:73) | [✅](js/tests/SingleLineParser.test.js:64) | [✅](rust/tests/single_line_parser_tests.rs:144) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:90) |
| parse quoted references | [✅](python/tests/test_single_line_parser.py:82) | [✅](js/tests/SingleLineParser.test.js:72) | [✅](rust/tests/single_line_parser_tests.rs:158) | ❌ |
| parse quoted references values only | [✅](python/tests/test_single_line_parser.py:169) | [✅](js/tests/SingleLineParser.test.js:130) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:153) |
| parse reference with colon and values | [✅](python/tests/test_single_line_parser.py:62) | [✅](js/tests/SingleLineParser.test.js:54) | [✅](rust/tests/single_line_parser_tests.rs:130) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:75) |
| parse simple reference | [✅](python/tests/test_single_line_parser.py:51) | [✅](js/tests/SingleLineParser.test.js:44) | [✅](rust/tests/single_line_parser_tests.rs:116) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:59) |
| parse values only | ❌ | [✅](js/tests/SingleLineParser.test.js:84) | [✅](rust/tests/single_line_parser_tests.rs:166) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:103) |
| parse values only standalone colon | [✅](python/tests/test_single_line_parser.py:95) | ❌ | ❌ | ❌ |
| quoted reference | ❌ | ❌ | [✅](rust/tests/single_line_parser_tests.rs:287) | ❌ |
| quoted reference (parser) | ❌ | [✅](js/tests/SingleLineParser.test.js:204) | ❌ | ❌ |
| quoted reference parser | [✅](python/tests/test_single_line_parser.py:253) | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:281) |
| quoted references | [✅](python/tests/test_single_line_parser.py:33) | [✅](js/tests/SingleLineParser.test.js:142) | [✅](rust/tests/single_line_parser_tests.rs:225) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:37) |
| quoted references with spaces | [✅](python/tests/test_single_line_parser.py:42) | [✅](js/tests/SingleLineParser.test.js:36) | [✅](rust/tests/single_line_parser_tests.rs:102) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:48) |
| quoted references with spaces in link | [✅](python/tests/test_single_line_parser.py:181) | ❌ | ❌ | ❌ |
| quoted references with special chars | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:135) |
| simple ref | [✅](python/tests/test_single_line_parser.py:236) | [✅](js/tests/SingleLineParser.test.js:189) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:246) |
| simple reference | ❌ | ❌ | [✅](rust/tests/single_line_parser_tests.rs:280) | ❌ |
| simple reference (parser) | ❌ | [✅](js/tests/SingleLineParser.test.js:195) | ❌ | ❌ |
| simple reference parser | [✅](python/tests/test_single_line_parser.py:243) | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:269) |
| single line link | ❌ | ❌ | [✅](rust/tests/single_line_parser_tests.rs:318) | ❌ |
| single line link with id | [✅](python/tests/test_single_line_parser.py:104) | [✅](js/tests/SingleLineParser.test.js:90) | [✅](rust/tests/single_line_parser_tests.rs:174) | ❌ |
| single line with id | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:221) |
| single line without id | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:230) |
| single link | [✅](python/tests/test_single_line_parser.py:9) | [✅](js/tests/SingleLineParser.test.js:7) | [✅](rust/tests/single_line_parser_tests.rs:63) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:8) |
| single quoted references | [✅](python/tests/test_single_line_parser.py:188) | [✅](js/tests/SingleLineParser.test.js:148) | [✅](rust/tests/single_line_parser_tests.rs:232) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:144) |
| singlet link | [✅](python/tests/test_single_line_parser.py:140) | [✅](js/tests/SingleLineParser.test.js:114) | [✅](rust/tests/single_line_parser_tests.rs:204) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:112) |
| singlet link (parser) | ❌ | [✅](js/tests/SingleLineParser.test.js:213) | ❌ | ❌ |
| singlet link parser | [✅](python/tests/test_single_line_parser.py:151) | ❌ | [✅](rust/tests/single_line_parser_tests.rs:294) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:293) |
| special characters in quotes | [✅](python/tests/test_single_line_parser.py:202) | [✅](js/tests/SingleLineParser.test.js:160) | [✅](rust/tests/single_line_parser_tests.rs:246) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:201) |
| triplet single link | [✅](python/tests/test_single_line_parser.py:17) | [✅](js/tests/SingleLineParser.test.js:14) | [✅](rust/tests/single_line_parser_tests.rs:71) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:18) |
| value link | [✅](python/tests/test_single_line_parser.py:162) | [✅](js/tests/SingleLineParser.test.js:124) | [✅](rust/tests/single_line_parser_tests.rs:218) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:126) |
| value link (parser) | ❌ | [✅](js/tests/SingleLineParser.test.js:223) | ❌ | ❌ |
| value link parser | [✅](python/tests/test_single_line_parser.py:263) | ❌ | [✅](rust/tests/single_line_parser_tests.rs:303) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:306) |

**Category totals:** Python: 29, JavaScript: 28, Rust: 28, C#: 29

## Tuple

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| named tuple to link | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/TupleTests.cs:33) |
| tuple to link | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/TupleTests.cs:11) |

**Category totals:** Python: 0, JavaScript: 0, Rust: 0, C#: 2

---

## Missing Tests Summary

### Python Missing Tests

**Api** (7 missing):
- indented id syntax parsing
- indented id syntax roundtrip
- is link
- is ref
- multiple indented id syntax parsing
- multiple indented id syntax roundtrip
- quoted references parsing

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

**Total missing: 74 tests**

### JavaScript Missing Tests

**Api** (5 missing):
- indented id syntax parsing
- is link
- is ref
- multiple indented id syntax parsing
- quoted references parsing

**Format Config** (9 missing):
- format config basic
- format config custom indent
- format config less parentheses
- format with consecutive grouping
- format with line length limit
- format with max inline refs
- roundtrip with line length formatting
- should indent by length
- should indent by ref count

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

**Nested Parser** (5 missing):
- deep nested structure roundtrip
- indentation
- multiple nested links roundtrip
- nested indentation
- three level nesting roundtrip

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

**Total missing: 74 tests**

### Rust Missing Tests

**Api** (4 missing):
- indented id syntax roundtrip
- is link equivalent
- is ref equivalent
- multiple indented id syntax roundtrip

**Format Config** (9 missing):
- format config basic
- format config custom indent
- format config less parentheses
- format with consecutive grouping
- format with line length limit
- format with max inline refs
- roundtrip with line length formatting
- should indent by length
- should indent by ref count

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

**Nested Parser** (5 missing):
- deep nested structure roundtrip
- indentation parser
- multiple nested links roundtrip
- nested indentation parser
- three level nesting roundtrip

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

**Total missing: 73 tests**

### C# Missing Tests

**Api** (5 missing):
- indented id syntax parsing
- is link
- is ref
- multiple indented id syntax parsing
- quoted references parsing

**Format Config** (9 missing):
- format config basic
- format config custom indent
- format config less parentheses
- format with consecutive grouping
- format with line length limit
- format with max inline refs
- roundtrip with line length formatting
- should indent by length
- should indent by ref count

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

**Nested Parser** (5 missing):
- deep nested structure roundtrip
- indentation
- multiple nested links roundtrip
- nested indentation
- three level nesting roundtrip

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

**Total missing: 71 tests**

