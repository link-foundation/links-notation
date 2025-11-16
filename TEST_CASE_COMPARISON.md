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
| Python     | 132 | 11 |
| JavaScript | 136 | 12 |
| Rust       | 136 | 12 |
| C#         | 138 | 13 |

---

## Api

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| empty link | [✅](python/tests/test_api.py:40) | [✅](js/tests/ApiTests.test.js:38) | [✅](rust/tests/api_tests.rs:39) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:49) |
| indented id syntax parsing | [✅](python/tests/test_api.py:111) | [✅](js/tests/ApiTests.test.js:103) | [✅](rust/tests/api_tests.rs:127) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:134) |
| indented id syntax roundtrip | [✅](python/tests/test_api.py:126) | [✅](js/tests/ApiTests.test.js:120) | [✅](rust/tests/api_tests.rs:165) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:152) |
| is link | [✅](python/tests/test_api.py:17) | [✅](js/tests/ApiTests.test.js:15) | [✅](rust/tests/api_tests.rs:10) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:18) |
| is link equivalent | [✅](python/tests/test_api.py:32) | [✅](js/tests/ApiTests.test.js:30) | [✅](rust/tests/api_tests.rs:28) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:38) |
| is ref | [✅](python/tests/test_api.py:9) | [✅](js/tests/ApiTests.test.js:8) | [✅](rust/tests/api_tests.rs:3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:9) |
| is ref equivalent | [✅](python/tests/test_api.py:25) | [✅](js/tests/ApiTests.test.js:23) | [✅](rust/tests/api_tests.rs:20) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:29) |
| link with source target | [✅](python/tests/test_api.py:58) | [✅](js/tests/ApiTests.test.js:54) | [✅](rust/tests/api_tests.rs:64) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:70) |
| link with source type target | [✅](python/tests/test_api.py:68) | [✅](js/tests/ApiTests.test.js:63) | [✅](rust/tests/api_tests.rs:79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:82) |
| multiple indented id syntax parsing | [✅](python/tests/test_api.py:136) | [✅](js/tests/ApiTests.test.js:134) | [✅](rust/tests/api_tests.rs:146) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:169) |
| multiple indented id syntax roundtrip | [✅](python/tests/test_api.py:151) | [✅](js/tests/ApiTests.test.js:156) | [✅](rust/tests/api_tests.rs:190) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:187) |
| quoted references | [✅](python/tests/test_api.py:90) | [✅](js/tests/ApiTests.test.js:83) | [✅](rust/tests/api_tests.rs:104) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:108) |
| quoted references parsing | [✅](python/tests/test_api.py:100) | [✅](js/tests/ApiTests.test.js:92) | [✅](rust/tests/api_tests.rs:113) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:120) |
| simple link | [✅](python/tests/test_api.py:47) | [✅](js/tests/ApiTests.test.js:44) | [✅](rust/tests/api_tests.rs:49) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:57) |
| single line format | [✅](python/tests/test_api.py:78) | [✅](js/tests/ApiTests.test.js:72) | [✅](rust/tests/api_tests.rs:94) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:94) |

**Category totals:** Python: 15, JavaScript: 15, Rust: 15, C#: 15

## Edge Case Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| all features | [✅](python/tests/test_edge_case_parser.py:35) | [✅](js/tests/EdgeCaseParser.test.js:27) | [✅](rust/tests/edge_case_parser_tests.rs:30) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:37) |
| empty document | [✅](python/tests/test_edge_case_parser.py:89) | [✅](js/tests/EdgeCaseParser.test.js:76) | [✅](rust/tests/edge_case_parser_tests.rs:86) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:145) |
| empty link | [✅](python/tests/test_edge_case_parser.py:10) | [✅](js/tests/EdgeCaseParser.test.js:7) | [✅](rust/tests/edge_case_parser_tests.rs:3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:8) |
| empty links | [✅](python/tests/test_edge_case_parser.py:105) | [✅](js/tests/EdgeCaseParser.test.js:90) | [✅](rust/tests/edge_case_parser_tests.rs:106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:163) |
| empty link with empty self reference | [✅](python/tests/test_edge_case_parser.py:27) | [✅](js/tests/EdgeCaseParser.test.js:21) | [✅](rust/tests/edge_case_parser_tests.rs:22) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:28) |
| empty link with parentheses | [✅](python/tests/test_edge_case_parser.py:18) | [✅](js/tests/EdgeCaseParser.test.js:13) | [✅](rust/tests/edge_case_parser_tests.rs:11) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:17) |
| invalid input | [✅](python/tests/test_edge_case_parser.py:176) | [✅](js/tests/EdgeCaseParser.test.js:158) | [✅](rust/tests/edge_case_parser_tests.rs:189) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:179) |
| singlet links | [✅](python/tests/test_edge_case_parser.py:125) | [✅](js/tests/EdgeCaseParser.test.js:108) | [✅](rust/tests/edge_case_parser_tests.rs:122) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:89) |
| whitespace only | [✅](python/tests/test_edge_case_parser.py:97) | [✅](js/tests/EdgeCaseParser.test.js:83) | [✅](rust/tests/edge_case_parser_tests.rs:96) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:154) |

**Category totals:** Python: 9, JavaScript: 9, Rust: 9, C#: 9

## Format Config

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| format config basic | [✅](python/tests/test_format_config.py:9) | [✅](js/tests/FormatConfig.test.js:6) | [✅](rust/tests/format_config_tests.rs:3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs:7) |
| format config custom indent | [✅](python/tests/test_format_config.py:82) | [✅](js/tests/FormatConfig.test.js:77) | [✅](rust/tests/format_config_tests.rs:53) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs:64) |
| format config less parentheses | [✅](python/tests/test_format_config.py:71) | [✅](js/tests/FormatConfig.test.js:67) | [✅](rust/tests/format_config_tests.rs:64) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs:77) |
| format with consecutive grouping | [✅](python/tests/test_format_config.py:51) | [✅](js/tests/FormatConfig.test.js:48) | [✅](rust/tests/format_config_tests.rs:41) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs:50) |
| format with line length limit | [✅](python/tests/test_format_config.py:17) | [✅](js/tests/FormatConfig.test.js:13) | [✅](rust/tests/format_config_tests.rs:11) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs:16) |
| format with max inline refs | [✅](python/tests/test_format_config.py:35) | [✅](js/tests/FormatConfig.test.js:33) | [✅](rust/tests/format_config_tests.rs:27) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs:34) |
| roundtrip with line length formatting | [✅](python/tests/test_format_config.py:97) | [✅](js/tests/FormatConfig.test.js:91) | [✅](rust/tests/format_config_tests.rs:73) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs:88) |
| should indent by length | [✅](python/tests/test_format_config.py:117) | [✅](js/tests/FormatConfig.test.js:110) | [✅](rust/tests/format_config_tests.rs:85) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs:102) |
| should indent by ref count | [✅](python/tests/test_format_config.py:128) | [✅](js/tests/FormatConfig.test.js:120) | [✅](rust/tests/format_config_tests.rs:96) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs:115) |

**Category totals:** Python: 9, JavaScript: 9, Rust: 9, C#: 9

## Indentation Consistency

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| leading spaces vs no leading spaces | [✅](python/tests/test_indentation_consistency.py:6) | [✅](js/tests/IndentationConsistency.test.js:11) | [✅](rust/tests/indentation_consistency_tests.rs:7) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:8) |
| simple two vs four spaces indentation | [✅](python/tests/test_indentation_consistency.py:90) | [✅](js/tests/IndentationConsistency.test.js:89) | [✅](rust/tests/indentation_consistency_tests.rs:57) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:90) |
| three level nesting with different indentation | [✅](python/tests/test_indentation_consistency.py:111) | [✅](js/tests/IndentationConsistency.test.js:107) | [✅](rust/tests/indentation_consistency_tests.rs:82) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:110) |
| two spaces vs four spaces indentation | [✅](python/tests/test_indentation_consistency.py:37) | [✅](js/tests/IndentationConsistency.test.js:39) | [✅](rust/tests/indentation_consistency_tests.rs:32) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:38) |

**Category totals:** Python: 4, JavaScript: 4, Rust: 4, C#: 4

## Indented Id Syntax

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| basic indented id syntax | [✅](python/tests/test_indented_id_syntax.py:10) | [✅](js/tests/IndentedIdSyntax.test.js:7) | [✅](rust/tests/indented_id_syntax_tests.rs:7) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:8) |
| empty indented id should work | [✅](python/tests/test_indented_id_syntax.py:149) | [✅](js/tests/IndentedIdSyntax.test.js:136) | [✅](rust/tests/indented_id_syntax_tests.rs:61) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:143) |
| equivalence test comprehensive | [✅](python/tests/test_indented_id_syntax.py:162) | [✅](js/tests/IndentedIdSyntax.test.js:148) | [✅](rust/tests/indented_id_syntax_tests.rs:117) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:159) |
| indented id syntax with multiple values | [✅](python/tests/test_indented_id_syntax.py:45) | [✅](js/tests/IndentedIdSyntax.test.js:40) | [✅](rust/tests/indented_id_syntax_tests.rs:35) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:45) |
| indented id syntax with numeric id | [✅](python/tests/test_indented_id_syntax.py:61) | [✅](js/tests/IndentedIdSyntax.test.js:55) | [✅](rust/tests/indented_id_syntax_tests.rs:44) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:63) |
| indented id syntax with quoted id | [✅](python/tests/test_indented_id_syntax.py:74) | [✅](js/tests/IndentedIdSyntax.test.js:67) | [✅](rust/tests/indented_id_syntax_tests.rs:71) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:78) |
| indented id syntax with single value | [✅](python/tests/test_indented_id_syntax.py:30) | [✅](js/tests/IndentedIdSyntax.test.js:26) | [✅](rust/tests/indented_id_syntax_tests.rs:26) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:28) |
| indented id with deeper nesting | [✅](python/tests/test_indented_id_syntax.py:132) | [✅](js/tests/IndentedIdSyntax.test.js:120) | [✅](rust/tests/indented_id_syntax_tests.rs:106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:183) |
| mixed indented and regular syntax | [✅](python/tests/test_indented_id_syntax.py:102) | [✅](js/tests/IndentedIdSyntax.test.js:93) | [✅](rust/tests/indented_id_syntax_tests.rs:95) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:111) |
| multiple indented id links | [✅](python/tests/test_indented_id_syntax.py:86) | [✅](js/tests/IndentedIdSyntax.test.js:78) | [✅](rust/tests/indented_id_syntax_tests.rs:83) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:92) |
| unsupported colon only syntax should fail | [✅](python/tests/test_indented_id_syntax.py:119) | [✅](js/tests/IndentedIdSyntax.test.js:109) | [✅](rust/tests/indented_id_syntax_tests.rs:53) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:131) |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 11

## Link

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| link combine | [✅](python/tests/test_link.py:62) | [✅](js/tests/Link.test.js:52) | [✅](rust/tests/link_tests.rs:89) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:60) |
| link constructor with id and values | [✅](python/tests/test_link.py:13) | [✅](js/tests/Link.test.js:10) | [✅](rust/tests/link_tests.rs:17) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:17) |
| link constructor with id only | [✅](python/tests/test_link.py:6) | [✅](js/tests/Link.test.js:4) | [✅](rust/tests/link_tests.rs:3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:9) |
| link equals | [✅](python/tests/test_link.py:73) | [✅](js/tests/Link.test.js:62) | [✅](rust/tests/link_tests.rs:70) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:49) |
| link escape reference simple | [✅](python/tests/test_link.py:40) | [✅](js/tests/Link.test.js:33) | [✅](rust/tests/link_tests.rs:107) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:73) |
| link escape reference with special characters | [✅](python/tests/test_link.py:45) | [✅](js/tests/Link.test.js:37) | [✅](rust/tests/link_tests.rs:116) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:80) |
| link simplify | [✅](python/tests/test_link.py:54) | [✅](js/tests/Link.test.js:45) | [✅](rust/tests/link_tests.rs:127) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:91) |
| link tostring with id and values | [✅](python/tests/test_link.py:34) | [✅](js/tests/Link.test.js:28) | [✅](rust/tests/link_tests.rs:57) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:41) |
| link tostring with id only | [✅](python/tests/test_link.py:22) | [✅](js/tests/Link.test.js:18) | [✅](rust/tests/link_tests.rs:35) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:26) |
| link tostring with values only | [✅](python/tests/test_link.py:28) | [✅](js/tests/Link.test.js:23) | [✅](rust/tests/link_tests.rs:44) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:33) |

**Category totals:** Python: 10, JavaScript: 10, Rust: 10, C#: 10

## Links Group

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| links group append to links list test | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs:50) |
| links group constructor | ❌ | [✅](js/tests/LinksGroup.test.js:5) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs:9) |
| links group constructor equivalent test | ❌ | ❌ | [✅](rust/tests/links_group_tests.rs:3) | ❌ |
| links group to list flattens structure | ❌ | [✅](js/tests/LinksGroup.test.js:14) | [✅](rust/tests/links_group_tests.rs:25) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs:24) |
| links group to string | ❌ | [✅](js/tests/LinksGroup.test.js:31) | [✅](rust/tests/links_group_tests.rs:61) | ❌ |

**Category totals:** Python: 0, JavaScript: 3, Rust: 3, C#: 3

## Mixed Indentation Modes

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| deeply nested mixed modes | [✅](python/tests/test_mixed_indentation_modes.py:182) | [✅](js/tests/MixedIndentationModes.test.js:173) | [✅](rust/tests/mixed_indentation_modes_tests.rs:106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:198) |
| hero example alternative format | [✅](python/tests/test_mixed_indentation_modes.py:37) | [✅](js/tests/MixedIndentationModes.test.js:34) | [✅](rust/tests/mixed_indentation_modes_tests.rs:22) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:38) |
| hero example equivalence | [✅](python/tests/test_mixed_indentation_modes.py:67) | [✅](js/tests/MixedIndentationModes.test.js:63) | [✅](rust/tests/mixed_indentation_modes_tests.rs:37) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:70) |
| hero example mixed modes | [✅](python/tests/test_mixed_indentation_modes.py:9) | [✅](js/tests/MixedIndentationModes.test.js:7) | [✅](rust/tests/mixed_indentation_modes_tests.rs:7) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:8) |
| nested set and sequence contexts | [✅](python/tests/test_mixed_indentation_modes.py:163) | [✅](js/tests/MixedIndentationModes.test.js:155) | [✅](rust/tests/mixed_indentation_modes_tests.rs:93) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:177) |
| sequence context with colon | [✅](python/tests/test_mixed_indentation_modes.py:123) | [✅](js/tests/MixedIndentationModes.test.js:117) | [✅](rust/tests/mixed_indentation_modes_tests.rs:64) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:133) |
| sequence context with complex values | [✅](python/tests/test_mixed_indentation_modes.py:141) | [✅](js/tests/MixedIndentationModes.test.js:134) | [✅](rust/tests/mixed_indentation_modes_tests.rs:79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:153) |
| set context without colon | [✅](python/tests/test_mixed_indentation_modes.py:110) | [✅](js/tests/MixedIndentationModes.test.js:105) | [✅](rust/tests/mixed_indentation_modes_tests.rs:52) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:118) |

**Category totals:** Python: 8, JavaScript: 8, Rust: 8, C#: 8

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
| parse and stringify test 2 | [✅](python/tests/test_multiline_parser.py:35) | [✅](js/tests/MultilineParser.test.js:25) | [✅](rust/tests/multiline_parser_tests.rs:88) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:32) |
| parse and stringify with less parentheses | [✅](python/tests/test_multiline_parser.py:52) | [✅](js/tests/MultilineParser.test.js:35) | [✅](rust/tests/multiline_parser_tests.rs:96) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:44) |
| two links | [✅](python/tests/test_multiline_parser.py:9) | [✅](js/tests/MultilineParser.test.js:7) | [✅](rust/tests/multiline_parser_tests.rs:72) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:8) |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 11

## Multiline Quoted String

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| multiline double quoted reference | [✅](python/tests/test_multiline_quoted_string.py:8) | [✅](js/tests/MultilineQuotedString.test.js:6) | [✅](rust/tests/multiline_quoted_string_tests.rs:3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:8) |
| multiline quoted as id | [✅](python/tests/test_multiline_quoted_string.py:70) | [✅](js/tests/MultilineQuotedString.test.js:65) | [✅](rust/tests/multiline_quoted_string_tests.rs:83) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:76) |
| simple multiline double quoted | [✅](python/tests/test_multiline_quoted_string.py:38) | [✅](js/tests/MultilineQuotedString.test.js:35) | [✅](rust/tests/multiline_quoted_string_tests.rs:43) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:40) |
| simple multiline single quoted | [✅](python/tests/test_multiline_quoted_string.py:54) | [✅](js/tests/MultilineQuotedString.test.js:50) | [✅](rust/tests/multiline_quoted_string_tests.rs:63) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:58) |

**Category totals:** Python: 4, JavaScript: 4, Rust: 4, C#: 4

## Nested Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| complex indentation | [✅](python/tests/test_nested_parser.py:137) | [✅](js/tests/NestedParser.test.js:127) | [✅](rust/tests/nested_parser_tests.rs:89) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:142) |
| deep nested structure roundtrip | [✅](python/tests/test_nested_parser.py:195) | [✅](js/tests/NestedParser.test.js:177) | [✅](rust/tests/nested_parser_tests.rs:151) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:210) |
| indentation based children | [✅](python/tests/test_nested_parser.py:127) | [✅](js/tests/NestedParser.test.js:118) | [✅](rust/tests/nested_parser_tests.rs:79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:127) |
| indentation consistency | [✅](python/tests/test_nested_parser.py:116) | [✅](js/tests/NestedParser.test.js:108) | [✅](rust/tests/nested_parser_tests.rs:68) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:115) |
| indentation parser | [✅](python/tests/test_nested_parser.py:163) | [✅](js/tests/NestedParser.test.js:151) | [✅](rust/tests/nested_parser_tests.rs:121) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:176) |
| multiple nested links roundtrip | [✅](python/tests/test_nested_parser.py:205) | [✅](js/tests/NestedParser.test.js:186) | [✅](rust/tests/nested_parser_tests.rs:163) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:222) |
| nested indentation parser | [✅](python/tests/test_nested_parser.py:176) | [✅](js/tests/NestedParser.test.js:160) | [✅](rust/tests/nested_parser_tests.rs:130) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:187) |
| nested links | [✅](python/tests/test_nested_parser.py:149) | [✅](js/tests/NestedParser.test.js:138) | [✅](rust/tests/nested_parser_tests.rs:104) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:160) |
| parse nested structure with indentation | [✅](python/tests/test_nested_parser.py:99) | [✅](js/tests/NestedParser.test.js:93) | [✅](rust/tests/nested_parser_tests.rs:59) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:102) |
| significant whitespace | [✅](python/tests/test_nested_parser.py:10) | [✅](js/tests/NestedParser.test.js:7) | [✅](rust/tests/nested_parser_tests.rs:4) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:9) |
| simple significant whitespace | [✅](python/tests/test_nested_parser.py:74) | [✅](js/tests/NestedParser.test.js:70) | [✅](rust/tests/nested_parser_tests.rs:41) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:73) |
| three level nesting roundtrip | [✅](python/tests/test_nested_parser.py:185) | [✅](js/tests/NestedParser.test.js:168) | [✅](rust/tests/nested_parser_tests.rs:139) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:198) |
| two spaces sized whitespace | [✅](python/tests/test_nested_parser.py:87) | [✅](js/tests/NestedParser.test.js:82) | [✅](rust/tests/nested_parser_tests.rs:50) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:88) |

**Category totals:** Python: 13, JavaScript: 13, Rust: 13, C#: 13

## Single Line Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| bug test 1 | [✅](python/tests/test_single_line_parser.py:25) | [✅](js/tests/SingleLineParser.test.js:21) | [✅](rust/tests/single_line_parser_tests.rs:79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:28) |
| deeply nested | [✅](python/tests/test_single_line_parser.py:213) | [✅](js/tests/SingleLineParser.test.js:170) | [✅](rust/tests/single_line_parser_tests.rs:257) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:213) |
| hyphenated identifiers | [✅](python/tests/test_single_line_parser.py:220) | [✅](js/tests/SingleLineParser.test.js:176) | [✅](rust/tests/single_line_parser_tests.rs:264) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:179) |
| link with id | [✅](python/tests/test_single_line_parser.py:299) | [✅](js/tests/SingleLineParser.test.js:263) | [✅](rust/tests/single_line_parser_tests.rs:310) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:352) |
| link without id multiline | [✅](python/tests/test_single_line_parser.py:281) | [✅](js/tests/SingleLineParser.test.js:108) | [✅](rust/tests/single_line_parser_tests.rs:196) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:262) |
| link without id singleline | [✅](python/tests/test_single_line_parser.py:290) | [✅](js/tests/SingleLineParser.test.js:102) | [✅](rust/tests/single_line_parser_tests.rs:188) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:329) |
| multi line link with id | [✅](python/tests/test_single_line_parser.py:111) | [✅](js/tests/SingleLineParser.test.js:96) | [✅](rust/tests/single_line_parser_tests.rs:181) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:254) |
| multiline without id | [✅](python/tests/test_single_line_parser.py:131) | [✅](js/tests/SingleLineParser.test.js:231) | [✅](rust/tests/single_line_parser_tests.rs:370) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:238) |
| multiple words in quotes | [✅](python/tests/test_single_line_parser.py:227) | [✅](js/tests/SingleLineParser.test.js:182) | [✅](rust/tests/single_line_parser_tests.rs:271) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:190) |
| nested links | [✅](python/tests/test_single_line_parser.py:195) | [✅](js/tests/SingleLineParser.test.js:154) | [✅](rust/tests/single_line_parser_tests.rs:239) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:170) |
| parse multiline link | [✅](python/tests/test_single_line_parser.py:73) | [✅](js/tests/SingleLineParser.test.js:64) | [✅](rust/tests/single_line_parser_tests.rs:144) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:90) |
| parse quoted references | [✅](python/tests/test_single_line_parser.py:82) | [✅](js/tests/SingleLineParser.test.js:72) | [✅](rust/tests/single_line_parser_tests.rs:158) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:316) |
| parse quoted references values only | [✅](python/tests/test_single_line_parser.py:169) | [✅](js/tests/SingleLineParser.test.js:130) | [✅](rust/tests/single_line_parser_tests.rs:326) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:153) |
| parse reference with colon and values | [✅](python/tests/test_single_line_parser.py:62) | [✅](js/tests/SingleLineParser.test.js:54) | [✅](rust/tests/single_line_parser_tests.rs:130) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:75) |
| parse simple reference | [✅](python/tests/test_single_line_parser.py:51) | [✅](js/tests/SingleLineParser.test.js:44) | [✅](rust/tests/single_line_parser_tests.rs:116) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:59) |
| parse values only | [✅](python/tests/test_single_line_parser.py:95) | [✅](js/tests/SingleLineParser.test.js:84) | [✅](rust/tests/single_line_parser_tests.rs:166) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:103) |
| parse values only standalone colon | [✅](python/tests/test_single_line_parser.py:95) | [✅](js/tests/SingleLineParser.test.js:238) | [✅](rust/tests/single_line_parser_tests.rs:380) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:411) |
| quoted reference | [✅](python/tests/test_single_line_parser.py:33) | [✅](js/tests/SingleLineParser.test.js:271) | [✅](rust/tests/single_line_parser_tests.rs:287) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:364) |
| quoted reference parser | [✅](python/tests/test_single_line_parser.py:253) | [✅](js/tests/SingleLineParser.test.js:204) | [✅](rust/tests/single_line_parser_tests.rs:343) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:281) |
| quoted references | [✅](python/tests/test_single_line_parser.py:33) | [✅](js/tests/SingleLineParser.test.js:142) | [✅](rust/tests/single_line_parser_tests.rs:225) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:37) |
| quoted references with spaces | [✅](python/tests/test_single_line_parser.py:42) | [✅](js/tests/SingleLineParser.test.js:36) | [✅](rust/tests/single_line_parser_tests.rs:102) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:48) |
| quoted references with spaces in link | [✅](python/tests/test_single_line_parser.py:181) | [✅](js/tests/SingleLineParser.test.js:245) | [✅](rust/tests/single_line_parser_tests.rs:390) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:422) |
| quoted references with special chars | [✅](python/tests/test_single_line_parser.py:340) | [✅](js/tests/SingleLineParser.test.js:280) | [✅](rust/tests/single_line_parser_tests.rs:407) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:135) |
| simple ref | [✅](python/tests/test_single_line_parser.py:236) | [✅](js/tests/SingleLineParser.test.js:189) | [✅](rust/tests/single_line_parser_tests.rs:352) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:246) |
| simple reference | [✅](python/tests/test_single_line_parser.py:243) | [✅](js/tests/SingleLineParser.test.js:290) | [✅](rust/tests/single_line_parser_tests.rs:280) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:377) |
| simple reference parser | [✅](python/tests/test_single_line_parser.py:243) | [✅](js/tests/SingleLineParser.test.js:195) | [✅](rust/tests/single_line_parser_tests.rs:361) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:269) |
| single line link | [✅](python/tests/test_single_line_parser.py:104) | [✅](js/tests/SingleLineParser.test.js:296) | [✅](rust/tests/single_line_parser_tests.rs:318) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:387) |
| single line link with id | [✅](python/tests/test_single_line_parser.py:104) | [✅](js/tests/SingleLineParser.test.js:90) | [✅](rust/tests/single_line_parser_tests.rs:174) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:340) |
| single line with id | [✅](python/tests/test_single_line_parser.py:332) | [✅](js/tests/SingleLineParser.test.js:304) | [✅](rust/tests/single_line_parser_tests.rs:424) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:221) |
| single line without id | [✅](python/tests/test_single_line_parser.py:118) | [✅](js/tests/SingleLineParser.test.js:254) | [✅](rust/tests/single_line_parser_tests.rs:441) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:399) |
| single link | [✅](python/tests/test_single_line_parser.py:9) | [✅](js/tests/SingleLineParser.test.js:7) | [✅](rust/tests/single_line_parser_tests.rs:63) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:8) |
| single quoted references | [✅](python/tests/test_single_line_parser.py:188) | [✅](js/tests/SingleLineParser.test.js:148) | [✅](rust/tests/single_line_parser_tests.rs:232) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:144) |
| singlet link | [✅](python/tests/test_single_line_parser.py:140) | [✅](js/tests/SingleLineParser.test.js:114) | [✅](rust/tests/single_line_parser_tests.rs:204) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:112) |
| singlet link parser | [✅](python/tests/test_single_line_parser.py:151) | [✅](js/tests/SingleLineParser.test.js:213) | [✅](rust/tests/single_line_parser_tests.rs:294) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:293) |
| special characters in quotes | [✅](python/tests/test_single_line_parser.py:202) | [✅](js/tests/SingleLineParser.test.js:160) | [✅](rust/tests/single_line_parser_tests.rs:246) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:201) |
| triplet single link | [✅](python/tests/test_single_line_parser.py:17) | [✅](js/tests/SingleLineParser.test.js:14) | [✅](rust/tests/single_line_parser_tests.rs:71) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:18) |
| value link | [✅](python/tests/test_single_line_parser.py:162) | [✅](js/tests/SingleLineParser.test.js:124) | [✅](rust/tests/single_line_parser_tests.rs:218) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:126) |
| value link parser | [✅](python/tests/test_single_line_parser.py:263) | [✅](js/tests/SingleLineParser.test.js:223) | [✅](rust/tests/single_line_parser_tests.rs:303) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:306) |

**Category totals:** Python: 38, JavaScript: 38, Rust: 38, C#: 38

## Tuple

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| named tuple to link test | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/TupleTests.cs:33) |
| tuple to link test | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/TupleTests.cs:11) |

**Category totals:** Python: 0, JavaScript: 0, Rust: 0, C#: 2

---

## Missing Tests Summary

### Python Missing Tests

**Links Group** (5 missing):
- linksgroupappendtolinkslist
- linksgroupconstructor
- linksgroupconstructorequivalent
- linksgrouptolistflattensstructure
- linksgrouptostring

**Tuple** (2 missing):
- namedtupletolink
- tupletolink

**Total missing: 7 tests**

### JavaScript Missing Tests

**Links Group** (2 missing):
- linksgroupappendtolinkslist
- linksgroupconstructorequivalent

**Tuple** (2 missing):
- namedtupletolink
- tupletolink

**Total missing: 4 tests**

### Rust Missing Tests

**Links Group** (2 missing):
- linksgroupappendtolinkslist
- linksgroupconstructor

**Tuple** (2 missing):
- namedtupletolink
- tupletolink

**Total missing: 4 tests**

### C# Missing Tests

**Links Group** (2 missing):
- linksgroupconstructorequivalent
- linksgrouptostring

**Total missing: 2 tests**

