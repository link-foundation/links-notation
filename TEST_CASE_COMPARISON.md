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
| Python     | 146 | 14 |
| JavaScript | 204 | 16 |
| Rust       | 283 | 18 |
| C#         | 196 | 17 |

---

## Api

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| empty link | [✅](python/tests/test_api.py#L39) | [✅](js/tests/ApiTests.test.js#L38) | [✅](rust/links-notation/tests/api_tests.rs#L39) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L49) |
| indented id syntax parsing | [✅](python/tests/test_api.py#L110) | [✅](js/tests/ApiTests.test.js#L103) | [✅](rust/links-notation/tests/api_tests.rs#L127) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L134) |
| indented id syntax roundtrip | [✅](python/tests/test_api.py#L125) | [✅](js/tests/ApiTests.test.js#L120) | [✅](rust/links-notation/tests/api_tests.rs#L165) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L152) |
| is link | [✅](python/tests/test_api.py#L16) | [✅](js/tests/ApiTests.test.js#L15) | [✅](rust/links-notation/tests/api_tests.rs#L10) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L18) |
| is link equivalent | [✅](python/tests/test_api.py#L31) | [✅](js/tests/ApiTests.test.js#L30) | [✅](rust/links-notation/tests/api_tests.rs#L28) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L38) |
| is ref | [✅](python/tests/test_api.py#L8) | [✅](js/tests/ApiTests.test.js#L8) | [✅](rust/links-notation/tests/api_tests.rs#L3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L9) |
| is ref equivalent | [✅](python/tests/test_api.py#L24) | [✅](js/tests/ApiTests.test.js#L23) | [✅](rust/links-notation/tests/api_tests.rs#L20) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L29) |
| link with source target | [✅](python/tests/test_api.py#L57) | [✅](js/tests/ApiTests.test.js#L54) | [✅](rust/links-notation/tests/api_tests.rs#L64) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L70) |
| link with source type target | [✅](python/tests/test_api.py#L67) | [✅](js/tests/ApiTests.test.js#L63) | [✅](rust/links-notation/tests/api_tests.rs#L79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L82) |
| multiple indented id syntax parsing | [✅](python/tests/test_api.py#L135) | [✅](js/tests/ApiTests.test.js#L134) | [✅](rust/links-notation/tests/api_tests.rs#L146) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L169) |
| multiple indented id syntax roundtrip | [✅](python/tests/test_api.py#L150) | [✅](js/tests/ApiTests.test.js#L156) | [✅](rust/links-notation/tests/api_tests.rs#L190) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L187) |
| quoted references | [✅](python/tests/test_api.py#L89) | [✅](js/tests/ApiTests.test.js#L83) | [✅](rust/links-notation/tests/api_tests.rs#L104) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L108) |
| quoted references parsing | [✅](python/tests/test_api.py#L99) | [✅](js/tests/ApiTests.test.js#L92) | [✅](rust/links-notation/tests/api_tests.rs#L113) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L120) |
| simple link | [✅](python/tests/test_api.py#L46) | [✅](js/tests/ApiTests.test.js#L44) | [✅](rust/links-notation/tests/api_tests.rs#L49) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L57) |
| single line format | [✅](python/tests/test_api.py#L77) | [✅](js/tests/ApiTests.test.js#L72) | [✅](rust/links-notation/tests/api_tests.rs#L94) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs#L94) |

**Category totals:** Python: 15, JavaScript: 15, Rust: 15, C#: 15

## Edge Case Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| all features | [✅](python/tests/test_edge_case_parser.py#L33) | [✅](js/tests/EdgeCaseParser.test.js#L27) | [✅](rust/links-notation/tests/edge_case_parser_tests.rs#L30) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs#L37) |
| empty document | [✅](python/tests/test_edge_case_parser.py#L87) | [✅](js/tests/EdgeCaseParser.test.js#L76) | [✅](rust/links-notation/tests/edge_case_parser_tests.rs#L86) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs#L145) |
| empty link | [✅](python/tests/test_edge_case_parser.py#L8) | [✅](js/tests/EdgeCaseParser.test.js#L7) | [✅](rust/links-notation/tests/edge_case_parser_tests.rs#L3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs#L8) |
| empty links | [✅](python/tests/test_edge_case_parser.py#L103) | [✅](js/tests/EdgeCaseParser.test.js#L90) | [✅](rust/links-notation/tests/edge_case_parser_tests.rs#L106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs#L163) |
| empty link with empty self reference | [✅](python/tests/test_edge_case_parser.py#L25) | [✅](js/tests/EdgeCaseParser.test.js#L21) | [✅](rust/links-notation/tests/edge_case_parser_tests.rs#L22) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs#L28) |
| empty link with parentheses | [✅](python/tests/test_edge_case_parser.py#L16) | [✅](js/tests/EdgeCaseParser.test.js#L13) | [✅](rust/links-notation/tests/edge_case_parser_tests.rs#L11) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs#L17) |
| invalid input | [✅](python/tests/test_edge_case_parser.py#L174) | [✅](js/tests/EdgeCaseParser.test.js#L158) | [✅](rust/links-notation/tests/edge_case_parser_tests.rs#L189) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs#L179) |
| singlet links | [✅](python/tests/test_edge_case_parser.py#L123) | [✅](js/tests/EdgeCaseParser.test.js#L108) | [✅](rust/links-notation/tests/edge_case_parser_tests.rs#L122) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs#L89) |
| whitespace only | [✅](python/tests/test_edge_case_parser.py#L95) | [✅](js/tests/EdgeCaseParser.test.js#L83) | [✅](rust/links-notation/tests/edge_case_parser_tests.rs#L96) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs#L154) |

**Category totals:** Python: 9, JavaScript: 9, Rust: 9, C#: 9

## Empty Reference

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| adjacent empty references stay separate | ❌ | [✅](js/tests/EmptyReference.test.js#L40) | [✅](rust/links-notation/tests/empty_reference_tests.rs#L49) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EmptyReferenceTests.cs#L59) |
| a single space still reads as a space | ❌ | ❌ | [✅](rust/links-notation/tests/empty_reference_tests.rs#L83) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EmptyReferenceTests.cs#L97) |
| bare delimiter pair is the empty reference | ❌ | [✅](js/tests/EmptyReference.test.js#L30) | [✅](rust/links-notation/tests/empty_reference_tests.rs#L37) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EmptyReferenceTests.cs#L45) |
| empty reference is valid as an id | ❌ | [✅](js/tests/EmptyReference.test.js#L56) | [✅](rust/links-notation/tests/empty_reference_tests.rs#L67) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EmptyReferenceTests.cs#L79) |
| empty reference is written as a delimiter pair | ❌ | [✅](js/tests/EmptyReference.test.js#L89) | [✅](rust/links-notation/tests/empty_reference_tests.rs#L105) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EmptyReferenceTests.cs#L122) |
| empty reference survives a round trip | ❌ | [✅](js/tests/EmptyReference.test.js#L74) | [✅](rust/links-notation/tests/empty_reference_tests.rs#L88) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EmptyReferenceTests.cs#L103) |
| every delimiter style yields the same empty reference | ❌ | [✅](js/tests/EmptyReference.test.js#L34) | [✅](rust/links-notation/tests/empty_reference_tests.rs#L42) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EmptyReferenceTests.cs#L51) |
| nested empty references parse | ❌ | [✅](js/tests/EmptyReference.test.js#L47) | [✅](rust/links-notation/tests/empty_reference_tests.rs#L57) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EmptyReferenceTests.cs#L68) |
| n quote delimited bodies are unchanged | ❌ | [✅](js/tests/EmptyReference.test.js#L61) | [✅](rust/links-notation/tests/empty_reference_tests.rs#L73) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EmptyReferenceTests.cs#L86) |
| single space still reads as a space | ❌ | [✅](js/tests/EmptyReference.test.js#L70) | ❌ | ❌ |

**Category totals:** Python: 0, JavaScript: 9, Rust: 9, C#: 9

## Format Config

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| format config basic | [✅](python/tests/test_format_config.py#L8) | [✅](js/tests/FormatConfig.test.js#L6) | [✅](rust/links-notation/tests/format_config_tests.rs#L4) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs#L7) |
| format config custom indent | [✅](python/tests/test_format_config.py#L70) | [✅](js/tests/FormatConfig.test.js#L90) | [✅](rust/links-notation/tests/format_config_tests.rs#L52) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs#L64) |
| format config less parentheses | [✅](python/tests/test_format_config.py#L59) | [✅](js/tests/FormatConfig.test.js#L80) | [✅](rust/links-notation/tests/format_config_tests.rs#L63) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs#L77) |
| format empty links with config | ❌ | ❌ | [✅](rust/links-notation/tests/format_config_tests.rs#L260) | ❌ |
| format links with consecutive grouping integration | ❌ | ❌ | [✅](rust/links-notation/tests/format_config_tests.rs#L173) | ❌ |
| format link with custom indent integration | ❌ | ❌ | [✅](rust/links-notation/tests/format_config_tests.rs#L203) | ❌ |
| format link with less parentheses integration | ❌ | ❌ | [✅](rust/links-notation/tests/format_config_tests.rs#L104) | ❌ |
| format link with line length limit integration | ❌ | ❌ | [✅](rust/links-notation/tests/format_config_tests.rs#L146) | ❌ |
| format link with max inline refs integration | ❌ | ❌ | [✅](rust/links-notation/tests/format_config_tests.rs#L119) | ❌ |
| format roundtrip with config integration | ❌ | ❌ | [✅](rust/links-notation/tests/format_config_tests.rs#L229) | ❌ |
| format single ref with config | ❌ | ❌ | [✅](rust/links-notation/tests/format_config_tests.rs#L268) | ❌ |
| format with consecutive grouping | [✅](python/tests/test_format_config.py#L43) | [✅](js/tests/FormatConfig.test.js#L61) | [✅](rust/links-notation/tests/format_config_tests.rs#L42) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs#L50) |
| format with line length limit | [✅](python/tests/test_format_config.py#L16) | [✅](js/tests/FormatConfig.test.js#L13) | [✅](rust/links-notation/tests/format_config_tests.rs#L12) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs#L16) |
| format with max inline refs | [✅](python/tests/test_format_config.py#L30) | [✅](js/tests/FormatConfig.test.js#L41) | [✅](rust/links-notation/tests/format_config_tests.rs#L28) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs#L34) |
| roundtrip with line length formatting | [✅](python/tests/test_format_config.py#L81) | [✅](js/tests/FormatConfig.test.js#L109) | [✅](rust/links-notation/tests/format_config_tests.rs#L70) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs#L88) |
| should indent by length | [✅](python/tests/test_format_config.py#L98) | [✅](js/tests/FormatConfig.test.js#L132) | [✅](rust/links-notation/tests/format_config_tests.rs#L82) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs#L102) |
| should indent by ref count | [✅](python/tests/test_format_config.py#L109) | [✅](js/tests/FormatConfig.test.js#L142) | [✅](rust/links-notation/tests/format_config_tests.rs#L93) | [✅](csharp/Link.Foundation.Links.Notation.Tests/FormatConfigTests.cs#L115) |

**Category totals:** Python: 9, JavaScript: 9, Rust: 17, C#: 9

## Indentation Consistency

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| leading spaces vs no leading spaces | [✅](python/tests/test_indentation_consistency.py#L6) | [✅](js/tests/IndentationConsistency.test.js#L11) | [✅](rust/links-notation/tests/indentation_consistency_tests.rs#L7) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs#L8) |
| simple two vs four spaces indentation | [✅](python/tests/test_indentation_consistency.py#L90) | [✅](js/tests/IndentationConsistency.test.js#L89) | [✅](rust/links-notation/tests/indentation_consistency_tests.rs#L63) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs#L90) |
| three level nesting with different indentation | [✅](python/tests/test_indentation_consistency.py#L111) | [✅](js/tests/IndentationConsistency.test.js#L107) | [✅](rust/links-notation/tests/indentation_consistency_tests.rs#L88) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs#L110) |
| two spaces vs four spaces indentation | [✅](python/tests/test_indentation_consistency.py#L37) | [✅](js/tests/IndentationConsistency.test.js#L39) | [✅](rust/links-notation/tests/indentation_consistency_tests.rs#L38) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs#L38) |

**Category totals:** Python: 4, JavaScript: 4, Rust: 4, C#: 4

## Indented Id Syntax

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| basic indented id syntax | [✅](python/tests/test_indented_id_syntax.py#L8) | [✅](js/tests/IndentedIdSyntax.test.js#L7) | [✅](rust/links-notation/tests/indented_id_syntax_tests.rs#L7) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs#L8) |
| empty indented id should work | [✅](python/tests/test_indented_id_syntax.py#L147) | [✅](js/tests/IndentedIdSyntax.test.js#L136) | [✅](rust/links-notation/tests/indented_id_syntax_tests.rs#L64) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs#L143) |
| equivalence test comprehensive | [✅](python/tests/test_indented_id_syntax.py#L160) | [✅](js/tests/IndentedIdSyntax.test.js#L148) | [✅](rust/links-notation/tests/indented_id_syntax_tests.rs#L120) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs#L160) |
| indented id syntax with multiple values | [✅](python/tests/test_indented_id_syntax.py#L43) | [✅](js/tests/IndentedIdSyntax.test.js#L40) | [✅](rust/links-notation/tests/indented_id_syntax_tests.rs#L38) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs#L45) |
| indented id syntax with numeric id | [✅](python/tests/test_indented_id_syntax.py#L59) | [✅](js/tests/IndentedIdSyntax.test.js#L55) | [✅](rust/links-notation/tests/indented_id_syntax_tests.rs#L47) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs#L63) |
| indented id syntax with quoted id | [✅](python/tests/test_indented_id_syntax.py#L72) | [✅](js/tests/IndentedIdSyntax.test.js#L67) | [✅](rust/links-notation/tests/indented_id_syntax_tests.rs#L74) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs#L78) |
| indented id syntax with single value | [✅](python/tests/test_indented_id_syntax.py#L28) | [✅](js/tests/IndentedIdSyntax.test.js#L26) | [✅](rust/links-notation/tests/indented_id_syntax_tests.rs#L29) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs#L28) |
| indented id with deeper nesting | [✅](python/tests/test_indented_id_syntax.py#L130) | [✅](js/tests/IndentedIdSyntax.test.js#L120) | [✅](rust/links-notation/tests/indented_id_syntax_tests.rs#L109) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs#L184) |
| mixed indented and regular syntax | [✅](python/tests/test_indented_id_syntax.py#L100) | [✅](js/tests/IndentedIdSyntax.test.js#L93) | [✅](rust/links-notation/tests/indented_id_syntax_tests.rs#L98) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs#L111) |
| multiple indented id links | [✅](python/tests/test_indented_id_syntax.py#L84) | [✅](js/tests/IndentedIdSyntax.test.js#L78) | [✅](rust/links-notation/tests/indented_id_syntax_tests.rs#L86) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs#L92) |
| unsupported colon only syntax should fail | [✅](python/tests/test_indented_id_syntax.py#L117) | [✅](js/tests/IndentedIdSyntax.test.js#L109) | [✅](rust/links-notation/tests/indented_id_syntax_tests.rs#L56) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs#L131) |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 11

## Link

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| link combine | [✅](python/tests/test_link.py#L62) | [✅](js/tests/Link.test.js#L52) | [✅](rust/links-notation/tests/link_tests.rs#L90) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs#L60) |
| link constructor with id and values | [✅](python/tests/test_link.py#L13) | [✅](js/tests/Link.test.js#L10) | [✅](rust/links-notation/tests/link_tests.rs#L17) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs#L17) |
| link constructor with id only | [✅](python/tests/test_link.py#L6) | [✅](js/tests/Link.test.js#L4) | [✅](rust/links-notation/tests/link_tests.rs#L3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs#L9) |
| link equals | [✅](python/tests/test_link.py#L73) | [✅](js/tests/Link.test.js#L62) | [✅](rust/links-notation/tests/link_tests.rs#L71) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs#L49) |
| link escape reference simple | [✅](python/tests/test_link.py#L40) | [✅](js/tests/Link.test.js#L33) | [✅](rust/links-notation/tests/link_tests.rs#L108) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs#L73) |
| link escape reference with special characters | [✅](python/tests/test_link.py#L45) | [✅](js/tests/Link.test.js#L37) | [✅](rust/links-notation/tests/link_tests.rs#L117) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs#L80) |
| link simplify | [✅](python/tests/test_link.py#L54) | [✅](js/tests/Link.test.js#L45) | [✅](rust/links-notation/tests/link_tests.rs#L128) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs#L91) |
| link tostring with id and values | [✅](python/tests/test_link.py#L34) | [✅](js/tests/Link.test.js#L28) | [✅](rust/links-notation/tests/link_tests.rs#L58) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs#L41) |
| link tostring with id only | [✅](python/tests/test_link.py#L22) | [✅](js/tests/Link.test.js#L18) | [✅](rust/links-notation/tests/link_tests.rs#L39) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs#L26) |
| link tostring with values only | [✅](python/tests/test_link.py#L28) | [✅](js/tests/Link.test.js#L23) | [✅](rust/links-notation/tests/link_tests.rs#L48) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs#L33) |

**Category totals:** Python: 10, JavaScript: 10, Rust: 10, C#: 10

## Links Group

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| links group append to links list test | [✅](python/tests/test_links_group.py#L102) | [✅](js/tests/LinksGroup.test.js#L58) | [✅](rust/links-notation/tests/links_group_tests.rs#L106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs#L50) |
| links group constructor | [✅](python/tests/test_links_group.py#L37) | [✅](js/tests/LinksGroup.test.js#L5) | [✅](rust/links-notation/tests/links_group_tests.rs#L3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs#L9) |
| links group constructor equivalent test | [✅](python/tests/test_links_group.py#L51) | [✅](js/tests/LinksGroup.test.js#L42) | [✅](rust/links-notation/tests/links_group_tests.rs#L21) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs#L85) |
| links group to list flattens structure | [✅](python/tests/test_links_group.py#L66) | [✅](js/tests/LinksGroup.test.js#L14) | [✅](rust/links-notation/tests/links_group_tests.rs#L46) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs#L24) |
| links group to string | [✅](python/tests/test_links_group.py#L89) | [✅](js/tests/LinksGroup.test.js#L31) | [✅](rust/links-notation/tests/links_group_tests.rs#L86) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs#L68) |

**Category totals:** Python: 5, JavaScript: 5, Rust: 5, C#: 5

## Macro

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| compile time validation | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L255) | ❌ |
| direct compile time validation | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L583) | ❌ |
| direct complex runtime equivalence | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L568) | ❌ |
| direct deeply nested | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L425) | ❌ |
| direct equivalence with id | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L553) | ❌ |
| direct equivalence with nested | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L546) | ❌ |
| direct equivalence with string literal | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L538) | ❌ |
| direct formatting works | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L576) | ❌ |
| direct link with id and values | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L318) | ❌ |
| direct multiple links | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L498) | ❌ |
| direct nested links | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L384) | ❌ |
| direct parenthesized link | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L355) | ❌ |
| direct runtime equivalence | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L560) | ❌ |
| direct simple reference | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L270) | ❌ |
| direct triplet | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L286) | ❌ |
| direct with numbers | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L470) | ❌ |
| empty input | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L200) | ❌ |
| formatting works | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L214) | ❌ |
| indented syntax | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L229) | ❌ |
| link with id and values | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L25) | ❌ |
| multiple lines | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L164) | ❌ |
| nested links | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L123) | ❌ |
| parenthesized link | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L94) | ❌ |
| quoted strings | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L175) | ❌ |
| runtime equivalence | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L221) | ❌ |
| simple reference | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L9) | ❌ |
| triplet | ❌ | ❌ | [✅](rust/links-notation/tests/macro_tests.rs#L62) | ❌ |

**Category totals:** Python: 0, JavaScript: 0, Rust: 27, C#: 0

## Mixed Indentation Modes

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| deeply nested mixed modes | [✅](python/tests/test_mixed_indentation_modes.py#L181) | [✅](js/tests/MixedIndentationModes.test.js#L173) | [✅](rust/links-notation/tests/mixed_indentation_modes_tests.rs#L171) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs#L198) |
| hero example alternative format | [✅](python/tests/test_mixed_indentation_modes.py#L36) | [✅](js/tests/MixedIndentationModes.test.js#L34) | [✅](rust/links-notation/tests/mixed_indentation_modes_tests.rs#L35) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs#L38) |
| hero example equivalence | [✅](python/tests/test_mixed_indentation_modes.py#L66) | [✅](js/tests/MixedIndentationModes.test.js#L63) | [✅](rust/links-notation/tests/mixed_indentation_modes_tests.rs#L63) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs#L70) |
| hero example mixed modes | [✅](python/tests/test_mixed_indentation_modes.py#L8) | [✅](js/tests/MixedIndentationModes.test.js#L7) | [✅](rust/links-notation/tests/mixed_indentation_modes_tests.rs#L7) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs#L8) |
| nested set and sequence contexts | [✅](python/tests/test_mixed_indentation_modes.py#L162) | [✅](js/tests/MixedIndentationModes.test.js#L155) | [✅](rust/links-notation/tests/mixed_indentation_modes_tests.rs#L154) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs#L177) |
| sequence context with colon | [✅](python/tests/test_mixed_indentation_modes.py#L122) | [✅](js/tests/MixedIndentationModes.test.js#L117) | [✅](rust/links-notation/tests/mixed_indentation_modes_tests.rs#L102) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs#L133) |
| sequence context with complex values | [✅](python/tests/test_mixed_indentation_modes.py#L140) | [✅](js/tests/MixedIndentationModes.test.js#L134) | [✅](rust/links-notation/tests/mixed_indentation_modes_tests.rs#L130) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs#L153) |
| set context without colon | [✅](python/tests/test_mixed_indentation_modes.py#L109) | [✅](js/tests/MixedIndentationModes.test.js#L105) | [✅](rust/links-notation/tests/mixed_indentation_modes_tests.rs#L86) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs#L118) |

**Category totals:** Python: 8, JavaScript: 8, Rust: 8, C#: 8

## Multi Quote Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| backtick as id in link | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L334) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L405) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L274) |
| backtick quoted multiline | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L39) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L74) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L38) |
| backtick quoted reference | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L23) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L56) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L22) |
| backtick quoted with escaped backtick | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L47) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L97) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L49) |
| backtick quoted with spaces | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L31) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L65) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L30) |
| code block like content | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L343) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L422) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L285) |
| double backtick quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L131) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L190) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L133) |
| double backtick quotes with backtick inside | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L139) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L199) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L141) |
| double backtick quotes with escape | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L147) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L208) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L149) |
| double double quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L83) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L136) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L85) |
| double double quotes with escape | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L99) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L154) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L101) |
| double double quotes with single quote inside | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L91) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L145) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L93) |
| double quote with escaped double quote | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L71) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L123) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L73) |
| double single quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L107) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L163) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L109) |
| double single quotes with escape | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L123) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L181) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L125) |
| double single quotes with single quote inside | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L115) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L172) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L117) |
| empty single quoted reference | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L386) | ❌ | ❌ |
| j s o n string with quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L373) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L440) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L301) |
| mixed quotes in link | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L323) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L386) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L261) |
| multiline in double double quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L408) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L459) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L321) |
| nested quotes in markdown | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L352) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L431) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L293) |
| quadruple backtick quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L267) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L333) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L221) |
| quadruple double quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L235) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L306) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L205) |
| quadruple double quotes with escape | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L251) | ❌ | ❌ |
| quadruple double quotes with triple quote inside | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L243) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L315) | ❌ |
| quadruple single quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L259) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L324) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L213) |
| quintuple backtick quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L311) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L373) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L249) |
| quintuple double quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L279) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L346) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L233) |
| quintuple double quotes with escape | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L295) | ❌ | ❌ |
| quintuple double quotes with quad quote inside | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L287) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L355) | ❌ |
| quintuple single quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L303) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L364) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L241) |
| single quote with escaped single quote | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L59) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L110) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L61) |
| s q l with quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L361) | ❌ | ❌ |
| triple backtick quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L207) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L275) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L193) |
| triple backtick quotes with double backtick inside | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L215) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L284) | ❌ |
| triple backtick quotes with escape | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L223) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L293) | ❌ |
| triple double quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L159) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L221) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L161) |
| triple double quotes with double quote inside | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L167) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L230) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L169) |
| triple double quotes with escape | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L175) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L239) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L177) |
| triple single quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L183) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L248) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L185) |
| triple single quotes with double quote inside | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L191) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L257) | ❌ |
| triple single quotes with escape | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L199) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L266) | ❌ |
| unlimited backticks8 | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L456) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L513) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L372) |
| unlimited quotes10 | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L429) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L482) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L345) |
| unlimited quotes6 | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L420) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L475) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L336) |
| unlimited quotes6 with inner quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L438) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L492) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L354) |
| unlimited single quotes7 | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L447) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L503) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L363) |
| whitespace preserved in quotes | ❌ | [✅](js/tests/MultiQuoteParser.test.js#L400) | [✅](rust/links-notation/tests/multi_quote_parser_tests.rs#L453) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultiQuoteParserTests.cs#L313) |

**Category totals:** Python: 0, JavaScript: 48, Rust: 44, C#: 38

## Multiline Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| complex structure | [✅](python/tests/test_multiline_parser.py#L74) | [✅](js/tests/MultilineParser.test.js#L56) | [✅](rust/links-notation/tests/multiline_parser_tests.rs#L127) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs#L71) |
| duplicate identifiers | [✅](python/tests/test_multiline_parser.py#L63) | [✅](js/tests/MultilineParser.test.js#L46) | [✅](rust/links-notation/tests/multiline_parser_tests.rs#L119) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs#L58) |
| indented children | [✅](python/tests/test_multiline_parser.py#L135) | [✅](js/tests/MultilineParser.test.js#L112) | [✅](rust/links-notation/tests/multiline_parser_tests.rs#L187) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs#L138) |
| mixed formats | [✅](python/tests/test_multiline_parser.py#L88) | [✅](js/tests/MultilineParser.test.js#L69) | [✅](rust/links-notation/tests/multiline_parser_tests.rs#L141) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs#L86) |
| multiline simple links | [✅](python/tests/test_multiline_parser.py#L119) | [✅](js/tests/MultilineParser.test.js#L97) | [✅](rust/links-notation/tests/multiline_parser_tests.rs#L172) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs#L120) |
| multiline with id | [✅](python/tests/test_multiline_parser.py#L103) | [✅](js/tests/MultilineParser.test.js#L83) | [✅](rust/links-notation/tests/multiline_parser_tests.rs#L164) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs#L102) |
| multiple top level elements | [✅](python/tests/test_multiline_parser.py#L111) | [✅](js/tests/MultilineParser.test.js#L90) | [✅](rust/links-notation/tests/multiline_parser_tests.rs#L156) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs#L111) |
| parse and stringify | [✅](python/tests/test_multiline_parser.py#L17) | [✅](js/tests/MultilineParser.test.js#L15) | [✅](rust/links-notation/tests/multiline_parser_tests.rs#L93) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs#L19) |
| parse and stringify test 2 | [✅](python/tests/test_multiline_parser.py#L34) | [✅](js/tests/MultilineParser.test.js#L25) | [✅](rust/links-notation/tests/multiline_parser_tests.rs#L102) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs#L32) |
| parse and stringify with less parentheses | [✅](python/tests/test_multiline_parser.py#L51) | [✅](js/tests/MultilineParser.test.js#L35) | [✅](rust/links-notation/tests/multiline_parser_tests.rs#L110) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs#L44) |
| two links | [✅](python/tests/test_multiline_parser.py#L8) | [✅](js/tests/MultilineParser.test.js#L7) | [✅](rust/links-notation/tests/multiline_parser_tests.rs#L85) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs#L8) |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 11

## Multiline Quoted String

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| multiline double quoted reference | [✅](python/tests/test_multiline_quoted_string.py#L8) | [✅](js/tests/MultilineQuotedString.test.js#L6) | [✅](rust/links-notation/tests/multiline_quoted_string_tests.rs#L3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs#L8) |
| multiline quoted as id | [✅](python/tests/test_multiline_quoted_string.py#L72) | [✅](js/tests/MultilineQuotedString.test.js#L67) | [✅](rust/links-notation/tests/multiline_quoted_string_tests.rs#L93) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs#L78) |
| simple multiline double quoted | [✅](python/tests/test_multiline_quoted_string.py#L40) | [✅](js/tests/MultilineQuotedString.test.js#L37) | [✅](rust/links-notation/tests/multiline_quoted_string_tests.rs#L53) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs#L42) |
| simple multiline single quoted | [✅](python/tests/test_multiline_quoted_string.py#L56) | [✅](js/tests/MultilineQuotedString.test.js#L52) | [✅](rust/links-notation/tests/multiline_quoted_string_tests.rs#L73) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs#L60) |

**Category totals:** Python: 4, JavaScript: 4, Rust: 4, C#: 4

## Nested Indentation

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| blank lines inside parentheses are skipped | ❌ | ❌ | [✅](rust/links-notation/tests/nested_indentation_tests.rs#L93) | ❌ |
| employee records keep their fields | [✅](python/tests/test_nested_indentation.py#L103) | [✅](js/tests/NestedIndentation.test.js#L100) | [✅](rust/links-notation/tests/nested_indentation_tests.rs#L98) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedIndentationTests.cs#L79) |
| parentheses keep record boundaries | [✅](python/tests/test_nested_indentation.py#L42) | [✅](js/tests/NestedIndentation.test.js#L37) | [✅](rust/links-notation/tests/nested_indentation_tests.rs#L37) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedIndentationTests.cs#L30) |
| parentheses keep several records separate | [✅](python/tests/test_nested_indentation.py#L62) | [✅](js/tests/NestedIndentation.test.js#L60) | [✅](rust/links-notation/tests/nested_indentation_tests.rs#L63) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedIndentationTests.cs#L48) |
| parentheses nest deeply | [✅](python/tests/test_nested_indentation.py#L71) | [✅](js/tests/NestedIndentation.test.js#L69) | [✅](rust/links-notation/tests/nested_indentation_tests.rs#L71) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedIndentationTests.cs#L56) |
| parentheses reproduce root indentation | [✅](python/tests/test_nested_indentation.py#L20) | [✅](js/tests/NestedIndentation.test.js#L14) | [✅](rust/links-notation/tests/nested_indentation_tests.rs#L25) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedIndentationTests.cs#L20) |
| parentheses with indented id syntax | [✅](python/tests/test_nested_indentation.py#L93) | [✅](js/tests/NestedIndentation.test.js#L90) | [✅](rust/links-notation/tests/nested_indentation_tests.rs#L88) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedIndentationTests.cs#L73) |
| single line parentheses are unchanged | [✅](python/tests/test_nested_indentation.py#L83) | [✅](js/tests/NestedIndentation.test.js#L81) | [✅](rust/links-notation/tests/nested_indentation_tests.rs#L79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedIndentationTests.cs#L62) |

**Category totals:** Python: 7, JavaScript: 7, Rust: 8, C#: 7

## Nested Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| complex indentation | [✅](python/tests/test_nested_parser.py#L137) | [✅](js/tests/NestedParser.test.js#L127) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L90) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L142) |
| deep nested structure roundtrip | [✅](python/tests/test_nested_parser.py#L192) | [✅](js/tests/NestedParser.test.js#L179) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L152) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L210) |
| indentation based children | [✅](python/tests/test_nested_parser.py#L127) | [✅](js/tests/NestedParser.test.js#L118) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L127) |
| indentation consistency | [✅](python/tests/test_nested_parser.py#L116) | [✅](js/tests/NestedParser.test.js#L108) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L68) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L115) |
| indentation parser | [✅](python/tests/test_nested_parser.py#L163) | [✅](js/tests/NestedParser.test.js#L151) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L122) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L176) |
| multiple nested links roundtrip | [✅](python/tests/test_nested_parser.py#L202) | [✅](js/tests/NestedParser.test.js#L188) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L164) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L222) |
| nested indentation parser | [✅](python/tests/test_nested_parser.py#L173) | [✅](js/tests/NestedParser.test.js#L162) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L131) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L187) |
| nested links | [✅](python/tests/test_nested_parser.py#L149) | [✅](js/tests/NestedParser.test.js#L138) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L105) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L160) |
| parse nested structure with indentation | [✅](python/tests/test_nested_parser.py#L99) | [✅](js/tests/NestedParser.test.js#L93) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L59) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L102) |
| significant whitespace | [✅](python/tests/test_nested_parser.py#L10) | [✅](js/tests/NestedParser.test.js#L7) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L4) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L9) |
| simple significant whitespace | [✅](python/tests/test_nested_parser.py#L74) | [✅](js/tests/NestedParser.test.js#L70) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L41) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L73) |
| three level nesting roundtrip | [✅](python/tests/test_nested_parser.py#L182) | [✅](js/tests/NestedParser.test.js#L170) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L140) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L198) |
| two spaces sized whitespace | [✅](python/tests/test_nested_parser.py#L87) | [✅](js/tests/NestedParser.test.js#L82) | [✅](rust/links-notation/tests/nested_parser_tests.rs#L50) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs#L88) |

**Category totals:** Python: 13, JavaScript: 13, Rust: 13, C#: 13

## Nested Self Reference

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| nested self referenced object in pair value | [✅](python/tests/test_nested_self_reference.py#L18) | [✅](js/tests/NestedSelfReference.test.js#L4) | [✅](rust/links-notation/tests/nested_self_reference_tests.rs#L4) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedSelfReferenceTests.cs#L8) |
| self reference as direct child works correctly | [✅](python/tests/test_nested_self_reference.py#L108) | [✅](js/tests/NestedSelfReference.test.js#L87) | [✅](rust/links-notation/tests/nested_self_reference_tests.rs#L173) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedSelfReferenceTests.cs#L98) |

**Category totals:** Python: 2, JavaScript: 2, Rust: 2, C#: 2

## Single Line Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| bug test 1 | [✅](python/tests/test_single_line_parser.py#L24) | [✅](js/tests/SingleLineParser.test.js#L21) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L83) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L28) |
| deeply nested | [✅](python/tests/test_single_line_parser.py#L212) | [✅](js/tests/SingleLineParser.test.js#L170) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L261) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L213) |
| hyphenated identifiers | [✅](python/tests/test_single_line_parser.py#L219) | [✅](js/tests/SingleLineParser.test.js#L176) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L268) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L179) |
| link with id | [✅](python/tests/test_single_line_parser.py#L298) | [✅](js/tests/SingleLineParser.test.js#L263) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L326) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L352) |
| link without id multiline | [✅](python/tests/test_single_line_parser.py#L280) | [✅](js/tests/SingleLineParser.test.js#L108) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L200) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L262) |
| link without id singleline | [✅](python/tests/test_single_line_parser.py#L289) | [✅](js/tests/SingleLineParser.test.js#L102) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L192) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L329) |
| multi line link with id | [✅](python/tests/test_single_line_parser.py#L110) | [✅](js/tests/SingleLineParser.test.js#L96) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L185) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L254) |
| multiline without id | [✅](python/tests/test_single_line_parser.py#L130) | [✅](js/tests/SingleLineParser.test.js#L231) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L388) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L238) |
| multiple words in quotes | [✅](python/tests/test_single_line_parser.py#L226) | [✅](js/tests/SingleLineParser.test.js#L182) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L275) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L190) |
| nested links | [✅](python/tests/test_single_line_parser.py#L194) | [✅](js/tests/SingleLineParser.test.js#L154) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L243) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L170) |
| parse multiline link | [✅](python/tests/test_single_line_parser.py#L72) | [✅](js/tests/SingleLineParser.test.js#L64) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L148) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L90) |
| parse quoted references | [✅](python/tests/test_single_line_parser.py#L81) | [✅](js/tests/SingleLineParser.test.js#L72) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L162) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L316) |
| parse quoted references values only | [✅](python/tests/test_single_line_parser.py#L168) | [✅](js/tests/SingleLineParser.test.js#L130) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L344) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L153) |
| parse reference with colon and values | [✅](python/tests/test_single_line_parser.py#L61) | [✅](js/tests/SingleLineParser.test.js#L54) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L134) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L75) |
| parse simple reference | [✅](python/tests/test_single_line_parser.py#L50) | [✅](js/tests/SingleLineParser.test.js#L44) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L120) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L59) |
| parse values only | [✅](python/tests/test_single_line_parser.py#L94) | [✅](js/tests/SingleLineParser.test.js#L84) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L170) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L103) |
| parse values only standalone colon | [✅](python/tests/test_single_line_parser.py#L94) | [✅](js/tests/SingleLineParser.test.js#L238) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L398) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L411) |
| quoted reference | [✅](python/tests/test_single_line_parser.py#L32) | [✅](js/tests/SingleLineParser.test.js#L271) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L291) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L364) |
| quoted reference parser | [✅](python/tests/test_single_line_parser.py#L252) | [✅](js/tests/SingleLineParser.test.js#L204) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L361) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L281) |
| quoted references | [✅](python/tests/test_single_line_parser.py#L32) | [✅](js/tests/SingleLineParser.test.js#L142) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L229) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L37) |
| quoted references with spaces | [✅](python/tests/test_single_line_parser.py#L41) | [✅](js/tests/SingleLineParser.test.js#L36) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L48) |
| quoted references with spaces in link | [✅](python/tests/test_single_line_parser.py#L180) | [✅](js/tests/SingleLineParser.test.js#L245) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L408) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L422) |
| quoted references with special chars | [✅](python/tests/test_single_line_parser.py#L339) | [✅](js/tests/SingleLineParser.test.js#L280) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L425) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L135) |
| simple ref | [✅](python/tests/test_single_line_parser.py#L235) | [✅](js/tests/SingleLineParser.test.js#L189) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L370) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L246) |
| simple reference | [✅](python/tests/test_single_line_parser.py#L242) | [✅](js/tests/SingleLineParser.test.js#L290) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L284) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L377) |
| simple reference parser | [✅](python/tests/test_single_line_parser.py#L242) | [✅](js/tests/SingleLineParser.test.js#L195) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L379) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L269) |
| single line link | [✅](python/tests/test_single_line_parser.py#L103) | [✅](js/tests/SingleLineParser.test.js#L296) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L336) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L387) |
| single line link with id | [✅](python/tests/test_single_line_parser.py#L103) | [✅](js/tests/SingleLineParser.test.js#L90) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L178) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L340) |
| single line with id | [✅](python/tests/test_single_line_parser.py#L331) | [✅](js/tests/SingleLineParser.test.js#L304) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L442) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L221) |
| single line without id | [✅](python/tests/test_single_line_parser.py#L117) | [✅](js/tests/SingleLineParser.test.js#L254) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L459) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L230) |
| single link | [✅](python/tests/test_single_line_parser.py#L8) | [✅](js/tests/SingleLineParser.test.js#L7) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L67) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L8) |
| single quoted references | [✅](python/tests/test_single_line_parser.py#L187) | [✅](js/tests/SingleLineParser.test.js#L148) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L236) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L144) |
| singlet link | [✅](python/tests/test_single_line_parser.py#L139) | [✅](js/tests/SingleLineParser.test.js#L114) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L208) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L112) |
| singlet link parser | [✅](python/tests/test_single_line_parser.py#L150) | [✅](js/tests/SingleLineParser.test.js#L213) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L306) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L293) |
| special characters in quotes | [✅](python/tests/test_single_line_parser.py#L201) | [✅](js/tests/SingleLineParser.test.js#L160) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L250) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L201) |
| triplet single link | [✅](python/tests/test_single_line_parser.py#L16) | [✅](js/tests/SingleLineParser.test.js#L14) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L75) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L18) |
| value link | [✅](python/tests/test_single_line_parser.py#L161) | [✅](js/tests/SingleLineParser.test.js#L124) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L222) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L126) |
| value link parser | [✅](python/tests/test_single_line_parser.py#L262) | [✅](js/tests/SingleLineParser.test.js#L223) | [✅](rust/links-notation/tests/single_line_parser_tests.rs#L317) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L306) |
| values only in parentheses test | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs#L399) |

**Category totals:** Python: 38, JavaScript: 38, Rust: 38, C#: 39

## Tuple

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| anonymous link from three lino | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L48) | ❌ |
| anonymous link from two lino | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L39) | ❌ |
| complex example matching csharp | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L66) | ❌ |
| empty string tuple | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L140) | ❌ |
| four lino anonymous link | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L105) | ❌ |
| lino anonymous static method | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L503) | ❌ |
| lino builder anonymous | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L418) | ❌ |
| lino builder basic | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L407) | ❌ |
| lino builder chaining | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L472) | ❌ |
| lino builder large link | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L458) | ❌ |
| lino builder linos batch | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L447) | ❌ |
| lino builder values batch | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L437) | ❌ |
| lino builder with lino | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L425) | ❌ |
| lino new arbitrary size | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L523) | ❌ |
| lino new static method | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L495) | ❌ |
| lino reference static method | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L515) | ❌ |
| named tuple to link test | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/TupleTests.cs#L33) |
| nested links with tuples | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L58) | ❌ |
| tuple 10 elements str | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L230) | ❌ |
| tuple 11 elements str | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L237) | ❌ |
| tuple 12 elements lino | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L260) | ❌ |
| tuple 12 elements str | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L247) | ❌ |
| tuple 3 elements | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L17) | ❌ |
| tuple 4 elements | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L24) | ❌ |
| tuple 5 elements lino | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L190) | ❌ |
| tuple 5 elements str | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L169) | ❌ |
| tuple 5 elements string | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L176) | ❌ |
| tuple 6 elements str | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L202) | ❌ |
| tuple 7 elements str | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L209) | ❌ |
| tuple 8 elements str | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L216) | ❌ |
| tuple 9 elements str | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L223) | ❌ |
| tuple collection format | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L116) | ❌ |
| tuple ergonomics | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L150) | ❌ |
| tuple id vec lino named link | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L357) | ❌ |
| tuple id vec string named link | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L349) | ❌ |
| tuple id vec str named link | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L341) | ❌ |
| tuple large with nested links | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L294) | ❌ |
| tuple large with str lino mixed | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L279) | ❌ |
| tuple to link test | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/TupleTests.cs#L11) |
| tuple to link basic | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L3) | ❌ |
| tuple to link with owned strings | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L10) | ❌ |
| tuple with lino values | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L31) | ❌ |
| tuple with mixed lino types | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L88) | ❌ |
| tuple with nested link values | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L97) | ❌ |
| tuple with special characters | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L129) | ❌ |
| vec large arbitrary size | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L366) | ❌ |
| vec lino to anonymous link | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L329) | ❌ |
| vec string to anonymous link | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L321) | ❌ |
| vec str to anonymous link | ❌ | ❌ | [✅](rust/links-notation/tests/tuple_tests.rs#L313) | ❌ |

**Category totals:** Python: 0, JavaScript: 0, Rust: 47, C#: 2

---

## Missing Tests Summary

### Python Missing Tests

**Empty Reference** (10 missing):
- adjacentemptyreferencesstayseparate
- asinglespacestillreadsasaspace
- baredelimiterpairistheemptyreference
- emptyreferenceisvalidasanid
- emptyreferenceiswrittenasadelimiterpair
- emptyreferencesurvivesaroundtrip
- everydelimiterstyleyieldsthesameemptyreference
- nestedemptyreferencesparse
- nquotedelimitedbodiesareunchanged
- singlespacestillreadsasaspace

**Format Config** (8 missing):
- formatemptylinkswithconfig
- formatlinkswithconsecutivegroupingintegration
- formatlinkwithcustomindentintegration
- formatlinkwithlessparenthesesintegration
- formatlinkwithlinelengthlimitintegration
- formatlinkwithmaxinlinerefsintegration
- formatroundtripwithconfigintegration
- formatsinglerefwithconfig

**Macro** (27 missing):
- compiletimevalidation
- directcompiletimevalidation
- directcomplexruntimeequivalence
- directdeeplynested
- directequivalencewithid
- directequivalencewithnested
- directequivalencewithstringliteral
- directformattingworks
- directlinkwithidandvalues
- directmultiplelinks
- directnestedlinks
- directparenthesizedlink
- directruntimeequivalence
- directsimplereference
- directtriplet
- directwithnumbers
- emptyinput
- formattingworks
- indentedsyntax
- linkwithidandvalues
- multiplelines
- nestedlinks
- parenthesizedlink
- quotedstrings
- runtimeequivalence
- simplereference
- triplet

**Multi Quote Parser** (48 missing):
- backtickasidinlink
- backtickquotedmultiline
- backtickquotedreference
- backtickquotedwithescapedbacktick
- backtickquotedwithspaces
- codeblocklikecontent
- doublebacktickquotes
- doublebacktickquoteswithbacktickinside
- doublebacktickquoteswithescape
- doubledoublequotes
- doubledoublequoteswithescape
- doubledoublequoteswithsinglequoteinside
- doublequotewithescapeddoublequote
- doublesinglequotes
- doublesinglequoteswithescape
- doublesinglequoteswithsinglequoteinside
- emptysinglequotedreference
- jsonstringwithquotes
- mixedquotesinlink
- multilineindoubledoublequotes
- nestedquotesinmarkdown
- quadruplebacktickquotes
- quadrupledoublequotes
- quadrupledoublequoteswithescape
- quadrupledoublequoteswithtriplequoteinside
- quadruplesinglequotes
- quintuplebacktickquotes
- quintupledoublequotes
- quintupledoublequoteswithescape
- quintupledoublequoteswithquadquoteinside
- quintuplesinglequotes
- singlequotewithescapedsinglequote
- sqlwithquotes
- triplebacktickquotes
- triplebacktickquoteswithdoublebacktickinside
- triplebacktickquoteswithescape
- tripledoublequotes
- tripledoublequoteswithdoublequoteinside
- tripledoublequoteswithescape
- triplesinglequotes
- triplesinglequoteswithdoublequoteinside
- triplesinglequoteswithescape
- unlimitedbackticks 8
- unlimitedquotes 10
- unlimitedquotes 6
- unlimitedquotes 6 withinnerquotes
- unlimitedsinglequotes 7
- whitespacepreservedinquotes

**Nested Indentation** (1 missing):
- blanklinesinsideparenthesesareskipped

**Single Line Parser** (1 missing):
- valuesonlyinparentheses

**Tuple** (49 missing):
- anonymouslinkfromthreelino
- anonymouslinkfromtwolino
- complexexamplematchingcsharp
- emptystringtuple
- fourlinoanonymouslink
- linoanonymousstaticmethod
- linobuilderanonymous
- linobuilderbasic
- linobuilderchaining
- linobuilderlargelink
- linobuilderlinosbatch
- linobuildervaluesbatch
- linobuilderwithlino
- linonewarbitrarysize
- linonewstaticmethod
- linoreferencestaticmethod
- namedtupletolink
- nestedlinkswithtuples
- tuple 10 elementsstr
- tuple 11 elementsstr
- tuple 12 elementslino
- tuple 12 elementsstr
- tuple 3 elements
- tuple 4 elements
- tuple 5 elementslino
- tuple 5 elementsstr
- tuple 5 elementsstring
- tuple 6 elementsstr
- tuple 7 elementsstr
- tuple 8 elementsstr
- tuple 9 elementsstr
- tuplecollectionformat
- tupleergonomics
- tupleidveclinonamedlink
- tupleidvecstringnamedlink
- tupleidvecstrnamedlink
- tuplelargewithnestedlinks
- tuplelargewithstrlinomixed
- tupletolink
- tupletolinkbasic
- tupletolinkwithownedstrings
- tuplewithlinovalues
- tuplewithmixedlinotypes
- tuplewithnestedlinkvalues
- tuplewithspecialcharacters
- veclargearbitrarysize
- veclinotoanonymouslink
- vecstringtoanonymouslink
- vecstrtoanonymouslink

**Total missing: 144 tests**

### JavaScript Missing Tests

**Empty Reference** (1 missing):
- asinglespacestillreadsasaspace

**Format Config** (8 missing):
- formatemptylinkswithconfig
- formatlinkswithconsecutivegroupingintegration
- formatlinkwithcustomindentintegration
- formatlinkwithlessparenthesesintegration
- formatlinkwithlinelengthlimitintegration
- formatlinkwithmaxinlinerefsintegration
- formatroundtripwithconfigintegration
- formatsinglerefwithconfig

**Macro** (27 missing):
- compiletimevalidation
- directcompiletimevalidation
- directcomplexruntimeequivalence
- directdeeplynested
- directequivalencewithid
- directequivalencewithnested
- directequivalencewithstringliteral
- directformattingworks
- directlinkwithidandvalues
- directmultiplelinks
- directnestedlinks
- directparenthesizedlink
- directruntimeequivalence
- directsimplereference
- directtriplet
- directwithnumbers
- emptyinput
- formattingworks
- indentedsyntax
- linkwithidandvalues
- multiplelines
- nestedlinks
- parenthesizedlink
- quotedstrings
- runtimeequivalence
- simplereference
- triplet

**Nested Indentation** (1 missing):
- blanklinesinsideparenthesesareskipped

**Single Line Parser** (1 missing):
- valuesonlyinparentheses

**Tuple** (49 missing):
- anonymouslinkfromthreelino
- anonymouslinkfromtwolino
- complexexamplematchingcsharp
- emptystringtuple
- fourlinoanonymouslink
- linoanonymousstaticmethod
- linobuilderanonymous
- linobuilderbasic
- linobuilderchaining
- linobuilderlargelink
- linobuilderlinosbatch
- linobuildervaluesbatch
- linobuilderwithlino
- linonewarbitrarysize
- linonewstaticmethod
- linoreferencestaticmethod
- namedtupletolink
- nestedlinkswithtuples
- tuple 10 elementsstr
- tuple 11 elementsstr
- tuple 12 elementslino
- tuple 12 elementsstr
- tuple 3 elements
- tuple 4 elements
- tuple 5 elementslino
- tuple 5 elementsstr
- tuple 5 elementsstring
- tuple 6 elementsstr
- tuple 7 elementsstr
- tuple 8 elementsstr
- tuple 9 elementsstr
- tuplecollectionformat
- tupleergonomics
- tupleidveclinonamedlink
- tupleidvecstringnamedlink
- tupleidvecstrnamedlink
- tuplelargewithnestedlinks
- tuplelargewithstrlinomixed
- tupletolink
- tupletolinkbasic
- tupletolinkwithownedstrings
- tuplewithlinovalues
- tuplewithmixedlinotypes
- tuplewithnestedlinkvalues
- tuplewithspecialcharacters
- veclargearbitrarysize
- veclinotoanonymouslink
- vecstringtoanonymouslink
- vecstrtoanonymouslink

**Total missing: 87 tests**

### Rust Missing Tests

**Empty Reference** (1 missing):
- singlespacestillreadsasaspace

**Multi Quote Parser** (4 missing):
- emptysinglequotedreference
- quadrupledoublequoteswithescape
- quintupledoublequoteswithescape
- sqlwithquotes

**Single Line Parser** (1 missing):
- valuesonlyinparentheses

**Tuple** (2 missing):
- namedtupletolink
- tupletolink

**Total missing: 8 tests**

### C# Missing Tests

**Empty Reference** (1 missing):
- singlespacestillreadsasaspace

**Format Config** (8 missing):
- formatemptylinkswithconfig
- formatlinkswithconsecutivegroupingintegration
- formatlinkwithcustomindentintegration
- formatlinkwithlessparenthesesintegration
- formatlinkwithlinelengthlimitintegration
- formatlinkwithmaxinlinerefsintegration
- formatroundtripwithconfigintegration
- formatsinglerefwithconfig

**Macro** (27 missing):
- compiletimevalidation
- directcompiletimevalidation
- directcomplexruntimeequivalence
- directdeeplynested
- directequivalencewithid
- directequivalencewithnested
- directequivalencewithstringliteral
- directformattingworks
- directlinkwithidandvalues
- directmultiplelinks
- directnestedlinks
- directparenthesizedlink
- directruntimeequivalence
- directsimplereference
- directtriplet
- directwithnumbers
- emptyinput
- formattingworks
- indentedsyntax
- linkwithidandvalues
- multiplelines
- nestedlinks
- parenthesizedlink
- quotedstrings
- runtimeequivalence
- simplereference
- triplet

**Multi Quote Parser** (10 missing):
- emptysinglequotedreference
- quadrupledoublequoteswithescape
- quadrupledoublequoteswithtriplequoteinside
- quintupledoublequoteswithescape
- quintupledoublequoteswithquadquoteinside
- sqlwithquotes
- triplebacktickquoteswithdoublebacktickinside
- triplebacktickquoteswithescape
- triplesinglequoteswithdoublequoteinside
- triplesinglequoteswithescape

**Nested Indentation** (1 missing):
- blanklinesinsideparenthesesareskipped

**Tuple** (47 missing):
- anonymouslinkfromthreelino
- anonymouslinkfromtwolino
- complexexamplematchingcsharp
- emptystringtuple
- fourlinoanonymouslink
- linoanonymousstaticmethod
- linobuilderanonymous
- linobuilderbasic
- linobuilderchaining
- linobuilderlargelink
- linobuilderlinosbatch
- linobuildervaluesbatch
- linobuilderwithlino
- linonewarbitrarysize
- linonewstaticmethod
- linoreferencestaticmethod
- nestedlinkswithtuples
- tuple 10 elementsstr
- tuple 11 elementsstr
- tuple 12 elementslino
- tuple 12 elementsstr
- tuple 3 elements
- tuple 4 elements
- tuple 5 elementslino
- tuple 5 elementsstr
- tuple 5 elementsstring
- tuple 6 elementsstr
- tuple 7 elementsstr
- tuple 8 elementsstr
- tuple 9 elementsstr
- tuplecollectionformat
- tupleergonomics
- tupleidveclinonamedlink
- tupleidvecstringnamedlink
- tupleidvecstrnamedlink
- tuplelargewithnestedlinks
- tuplelargewithstrlinomixed
- tupletolinkbasic
- tupletolinkwithownedstrings
- tuplewithlinovalues
- tuplewithmixedlinotypes
- tuplewithnestedlinkvalues
- tuplewithspecialcharacters
- veclargearbitrarysize
- veclinotoanonymouslink
- vecstringtoanonymouslink
- vecstrtoanonymouslink

**Total missing: 94 tests**

