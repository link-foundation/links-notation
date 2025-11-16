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
| empty | [✅](python/tests/test_api.py:24) | [✅](js/tests/ApiTests.test.js:23) | [✅](rust/tests/api_tests.rs:20) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:29) |
| indentedidparsing | ❌ | ❌ | [✅](rust/tests/api_tests.rs:108) | ❌ |
| indentedidroundtrip | ❌ | [✅](js/tests/ApiTests.test.js:77) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:100) |
| is | ❌ | ❌ | [✅](rust/tests/api_tests.rs:10) | ❌ |
| isequivalent | [✅](python/tests/test_api.py:16) | [✅](js/tests/ApiTests.test.js:15) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:18) |
| isref | ❌ | ❌ | [✅](rust/tests/api_tests.rs:3) | ❌ |
| isrefequivalent | [✅](python/tests/test_api.py:9) | [✅](js/tests/ApiTests.test.js:8) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:9) |
| multipleindentedidparsing | ❌ | ❌ | [✅](rust/tests/api_tests.rs:127) | ❌ |
| multipleindentedidroundtrip | ❌ | [✅](js/tests/ApiTests.test.js:91) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:117) |
| quotedreferences | [✅](python/tests/test_api.py:74) | [✅](js/tests/ApiTests.test.js:68) | [✅](rust/tests/api_tests.rs:85) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:88) |
| quotedreferencesparsing | ❌ | ❌ | [✅](rust/tests/api_tests.rs:94) | ❌ |
| simple | [✅](python/tests/test_api.py:31) | [✅](js/tests/ApiTests.test.js:29) | [✅](rust/tests/api_tests.rs:30) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:37) |
| singlelineformat | [✅](python/tests/test_api.py:62) | [✅](js/tests/ApiTests.test.js:57) | [✅](rust/tests/api_tests.rs:75) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:74) |
| withsourcetarget | [✅](python/tests/test_api.py:42) | [✅](js/tests/ApiTests.test.js:39) | [✅](rust/tests/api_tests.rs:45) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:50) |
| withsourcetypetarget | [✅](python/tests/test_api.py:52) | [✅](js/tests/ApiTests.test.js:48) | [✅](rust/tests/api_tests.rs:60) | [✅](csharp/Link.Foundation.Links.Notation.Tests/ApiTests.cs:62) |

**Category totals:** Python: 8, JavaScript: 10, Rust: 11, C#: 10

## Edge Case Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| allfeatures | [✅](python/tests/test_edge_case_parser.py:35) | [✅](js/tests/EdgeCaseParser.test.js:27) | [✅](rust/tests/edge_case_parser_tests.rs:30) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:37) |
| empty | [✅](python/tests/test_edge_case_parser.py:10) | [✅](js/tests/EdgeCaseParser.test.js:7) | [✅](rust/tests/edge_case_parser_tests.rs:3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:8) |
| emptydocument | [✅](python/tests/test_edge_case_parser.py:89) | [✅](js/tests/EdgeCaseParser.test.js:76) | [✅](rust/tests/edge_case_parser_tests.rs:86) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:145) |
| emptys | [✅](python/tests/test_edge_case_parser.py:105) | [✅](js/tests/EdgeCaseParser.test.js:90) | [✅](rust/tests/edge_case_parser_tests.rs:106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:163) |
| emptywithemptyselfreference | [✅](python/tests/test_edge_case_parser.py:27) | [✅](js/tests/EdgeCaseParser.test.js:21) | [✅](rust/tests/edge_case_parser_tests.rs:22) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:28) |
| emptywithparentheses | [✅](python/tests/test_edge_case_parser.py:18) | [✅](js/tests/EdgeCaseParser.test.js:13) | [✅](rust/tests/edge_case_parser_tests.rs:11) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:17) |
| invalidinput | [✅](python/tests/test_edge_case_parser.py:176) | [✅](js/tests/EdgeCaseParser.test.js:158) | [✅](rust/tests/edge_case_parser_tests.rs:189) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:179) |
| singlets | [✅](python/tests/test_edge_case_parser.py:125) | [✅](js/tests/EdgeCaseParser.test.js:108) | [✅](rust/tests/edge_case_parser_tests.rs:122) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:89) |
| whitespaceonly | [✅](python/tests/test_edge_case_parser.py:97) | [✅](js/tests/EdgeCaseParser.test.js:83) | [✅](rust/tests/edge_case_parser_tests.rs:96) | [✅](csharp/Link.Foundation.Links.Notation.Tests/EdgeCaseParserTests.cs:154) |

**Category totals:** Python: 9, JavaScript: 9, Rust: 9, C#: 9

## Format Config

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| formatconfigbasic | [✅](python/tests/test_format_config.py:9) | ❌ | ❌ | ❌ |
| formatconfigcustomindent | [✅](python/tests/test_format_config.py:82) | ❌ | ❌ | ❌ |
| formatconfiglessparentheses | [✅](python/tests/test_format_config.py:71) | ❌ | ❌ | ❌ |
| formatwithconsecutivegrouping | [✅](python/tests/test_format_config.py:51) | ❌ | ❌ | ❌ |
| formatwithlinelengthlimit | [✅](python/tests/test_format_config.py:17) | ❌ | ❌ | ❌ |
| formatwithmaxinlinerefs | [✅](python/tests/test_format_config.py:35) | ❌ | ❌ | ❌ |
| indentbylength | [✅](python/tests/test_format_config.py:117) | ❌ | ❌ | ❌ |
| indentbyrefcount | [✅](python/tests/test_format_config.py:128) | ❌ | ❌ | ❌ |
| roundtripwithlinelengthformatting | [✅](python/tests/test_format_config.py:97) | ❌ | ❌ | ❌ |

**Category totals:** Python: 9, JavaScript: 0, Rust: 0, C#: 0

## Indentation Consistency

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| leadingspacesvsnoleadingspaces | [✅](python/tests/test_indentation_consistency.py:6) | ❌ | [✅](rust/tests/indentation_consistency_tests.rs:7) | ❌ |
| leadingspacesvsnoleadingspacesproducesameresult | ❌ | [✅](js/tests/IndentationConsistency.test.js:11) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:8) |
| simpletwovsfourspaces | ❌ | ❌ | [✅](rust/tests/indentation_consistency_tests.rs:57) | ❌ |
| simpletwovsfourspacesindentation | [✅](python/tests/test_indentation_consistency.py:90) | [✅](js/tests/IndentationConsistency.test.js:89) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:90) |
| threelevelnesting | ❌ | ❌ | [✅](rust/tests/indentation_consistency_tests.rs:82) | ❌ |
| threelevelnestingwithdifferentindentation | [✅](python/tests/test_indentation_consistency.py:111) | [✅](js/tests/IndentationConsistency.test.js:107) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:110) |
| twospacesvsfourspacesindentation | [✅](python/tests/test_indentation_consistency.py:37) | [✅](js/tests/IndentationConsistency.test.js:39) | [✅](rust/tests/indentation_consistency_tests.rs:32) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentationConsistencyTests.cs:38) |

**Category totals:** Python: 4, JavaScript: 4, Rust: 4, C#: 4

## Indented Id Syntax

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| basicindentedid | [✅](python/tests/test_indented_id_syntax.py:10) | [✅](js/tests/IndentedIdSyntax.test.js:7) | [✅](rust/tests/indented_id_syntax_tests.rs:7) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:8) |
| emptyindentedid | [✅](python/tests/test_indented_id_syntax.py:149) | [✅](js/tests/IndentedIdSyntax.test.js:136) | [✅](rust/tests/indented_id_syntax_tests.rs:61) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:143) |
| equivalencetestcomprehensive | [✅](python/tests/test_indented_id_syntax.py:162) | [✅](js/tests/IndentedIdSyntax.test.js:148) | [✅](rust/tests/indented_id_syntax_tests.rs:117) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:159) |
| indentedidmultiplevalues | ❌ | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:35) | ❌ |
| indentedidsinglevalue | ❌ | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:26) | ❌ |
| indentedidwithdeepernesting | [✅](python/tests/test_indented_id_syntax.py:132) | [✅](js/tests/IndentedIdSyntax.test.js:120) | [✅](rust/tests/indented_id_syntax_tests.rs:106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:183) |
| indentedidwithmultiplevalues | [✅](python/tests/test_indented_id_syntax.py:45) | [✅](js/tests/IndentedIdSyntax.test.js:40) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:45) |
| indentedidwithnumericid | [✅](python/tests/test_indented_id_syntax.py:61) | [✅](js/tests/IndentedIdSyntax.test.js:55) | [✅](rust/tests/indented_id_syntax_tests.rs:44) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:63) |
| indentedidwithquotedid | [✅](python/tests/test_indented_id_syntax.py:74) | [✅](js/tests/IndentedIdSyntax.test.js:67) | [✅](rust/tests/indented_id_syntax_tests.rs:71) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:78) |
| indentedidwithsinglevalue | [✅](python/tests/test_indented_id_syntax.py:30) | [✅](js/tests/IndentedIdSyntax.test.js:26) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:28) |
| mixedindentedandregular | [✅](python/tests/test_indented_id_syntax.py:102) | [✅](js/tests/IndentedIdSyntax.test.js:93) | [✅](rust/tests/indented_id_syntax_tests.rs:95) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:111) |
| multipleindentedids | [✅](python/tests/test_indented_id_syntax.py:86) | [✅](js/tests/IndentedIdSyntax.test.js:78) | [✅](rust/tests/indented_id_syntax_tests.rs:83) | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:92) |
| unsupportedcolononly | ❌ | ❌ | [✅](rust/tests/indented_id_syntax_tests.rs:53) | ❌ |
| unsupportedcolononlyfail | [✅](python/tests/test_indented_id_syntax.py:119) | [✅](js/tests/IndentedIdSyntax.test.js:109) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/IndentedIdSyntaxTests.cs:131) |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 11

## Link

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| combine | [✅](python/tests/test_link.py:62) | [✅](js/tests/Link.test.js:52) | [✅](rust/tests/link_tests.rs:89) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:60) |
| constructorwithidandvalues | [✅](python/tests/test_link.py:13) | [✅](js/tests/Link.test.js:10) | [✅](rust/tests/link_tests.rs:17) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:17) |
| constructorwithidonly | [✅](python/tests/test_link.py:6) | [✅](js/tests/Link.test.js:4) | [✅](rust/tests/link_tests.rs:3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:9) |
| equals | [✅](python/tests/test_link.py:73) | [✅](js/tests/Link.test.js:62) | [✅](rust/tests/link_tests.rs:70) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:49) |
| escapereferenceforsimplereference | ❌ | [✅](js/tests/Link.test.js:33) | ❌ | ❌ |
| escapereferencesimple | [✅](python/tests/test_link.py:40) | ❌ | [✅](rust/tests/link_tests.rs:107) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:73) |
| escapereferencespecialchars | [✅](python/tests/test_link.py:45) | ❌ | ❌ | ❌ |
| escapereferencewithspecialcharacters | ❌ | [✅](js/tests/Link.test.js:37) | [✅](rust/tests/link_tests.rs:116) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:80) |
| simplify | [✅](python/tests/test_link.py:54) | [✅](js/tests/Link.test.js:45) | [✅](rust/tests/link_tests.rs:127) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:91) |
| tostringwithidandvalues | [✅](python/tests/test_link.py:34) | [✅](js/tests/Link.test.js:28) | [✅](rust/tests/link_tests.rs:57) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:41) |
| tostringwithidonly | [✅](python/tests/test_link.py:22) | [✅](js/tests/Link.test.js:18) | [✅](rust/tests/link_tests.rs:35) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:26) |
| tostringwithvaluesonly | [✅](python/tests/test_link.py:28) | [✅](js/tests/Link.test.js:23) | [✅](rust/tests/link_tests.rs:44) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinkTests.cs:33) |

**Category totals:** Python: 10, JavaScript: 10, Rust: 10, C#: 10

## Links Group

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| sgroupappendtoslist | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs:50) |
| sgroupconstructor | ❌ | [✅](js/tests/LinksGroup.test.js:5) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs:9) |
| sgroupconstructorequivalent | ❌ | ❌ | [✅](rust/tests/links_group_tests.rs:3) | ❌ |
| sgrouptolistflattensstructure | ❌ | [✅](js/tests/LinksGroup.test.js:14) | [✅](rust/tests/links_group_tests.rs:25) | [✅](csharp/Link.Foundation.Links.Notation.Tests/LinksGroupTests.cs:24) |
| sgrouptostring | ❌ | [✅](js/tests/LinksGroup.test.js:31) | [✅](rust/tests/links_group_tests.rs:61) | ❌ |

**Category totals:** Python: 0, JavaScript: 3, Rust: 3, C#: 3

## Mixed Indentation Modes

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| deeplynestedmixedmodes | [✅](python/tests/test_mixed_indentation_modes.py:67) | [✅](js/tests/MixedIndentationModes.test.js:173) | [✅](rust/tests/mixed_indentation_modes_tests.rs:106) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:198) |
| heroexamplealternativeformat | ❌ | [✅](js/tests/MixedIndentationModes.test.js:34) | [✅](rust/tests/mixed_indentation_modes_tests.rs:22) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:38) |
| heroexampleequivalence | ❌ | [✅](js/tests/MixedIndentationModes.test.js:63) | [✅](rust/tests/mixed_indentation_modes_tests.rs:37) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:70) |
| heroexamplemixedmodes | ❌ | [✅](js/tests/MixedIndentationModes.test.js:7) | [✅](rust/tests/mixed_indentation_modes_tests.rs:7) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:8) |
| nestedsetandsequencecontexts | [✅](python/tests/test_mixed_indentation_modes.py:48) | [✅](js/tests/MixedIndentationModes.test.js:155) | [✅](rust/tests/mixed_indentation_modes_tests.rs:93) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:177) |
| sequencecontextwithcolon | [✅](python/tests/test_mixed_indentation_modes.py:30) | ❌ | [✅](rust/tests/mixed_indentation_modes_tests.rs:64) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:133) |
| sequencecontextwithcomplexvalues | ❌ | [✅](js/tests/MixedIndentationModes.test.js:134) | [✅](rust/tests/mixed_indentation_modes_tests.rs:79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:153) |
| sequencelistcontextwithcolon | ❌ | [✅](js/tests/MixedIndentationModes.test.js:117) | ❌ | ❌ |
| setcontextwithoutcolon | [✅](python/tests/test_mixed_indentation_modes.py:17) | ❌ | [✅](rust/tests/mixed_indentation_modes_tests.rs:52) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MixedIndentationModesTests.cs:118) |
| setobjectcontextwithoutcolon | ❌ | [✅](js/tests/MixedIndentationModes.test.js:105) | ❌ | ❌ |

**Category totals:** Python: 4, JavaScript: 8, Rust: 8, C#: 8

## Multiline Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| complexstructure | [✅](python/tests/test_multiline_parser.py:75) | [✅](js/tests/MultilineParser.test.js:56) | [✅](rust/tests/multiline_parser_tests.rs:112) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:71) |
| duplicateidentifiers | [✅](python/tests/test_multiline_parser.py:64) | [✅](js/tests/MultilineParser.test.js:46) | [✅](rust/tests/multiline_parser_tests.rs:104) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:58) |
| indentedchildren | [✅](python/tests/test_multiline_parser.py:136) | [✅](js/tests/MultilineParser.test.js:112) | [✅](rust/tests/multiline_parser_tests.rs:172) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:138) |
| mixedformats | [✅](python/tests/test_multiline_parser.py:89) | [✅](js/tests/MultilineParser.test.js:69) | [✅](rust/tests/multiline_parser_tests.rs:126) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:86) |
| multilinesimples | [✅](python/tests/test_multiline_parser.py:120) | [✅](js/tests/MultilineParser.test.js:97) | [✅](rust/tests/multiline_parser_tests.rs:157) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:120) |
| multilinewithid | [✅](python/tests/test_multiline_parser.py:104) | [✅](js/tests/MultilineParser.test.js:83) | [✅](rust/tests/multiline_parser_tests.rs:149) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:102) |
| multipletoplevelelements | [✅](python/tests/test_multiline_parser.py:112) | [✅](js/tests/MultilineParser.test.js:90) | [✅](rust/tests/multiline_parser_tests.rs:141) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:111) |
| parseandstringify | [✅](python/tests/test_multiline_parser.py:18) | [✅](js/tests/MultilineParser.test.js:15) | [✅](rust/tests/multiline_parser_tests.rs:80) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:19) |
| parseandstringify2 | [✅](python/tests/test_multiline_parser.py:35) | ❌ | ❌ | ❌ |
| parseandstringifytest2 | ❌ | [✅](js/tests/MultilineParser.test.js:25) | [✅](rust/tests/multiline_parser_tests.rs:88) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:32) |
| parseandstringifywithlessparentheses | [✅](python/tests/test_multiline_parser.py:52) | [✅](js/tests/MultilineParser.test.js:35) | [✅](rust/tests/multiline_parser_tests.rs:96) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:44) |
| twos | [✅](python/tests/test_multiline_parser.py:9) | [✅](js/tests/MultilineParser.test.js:7) | [✅](rust/tests/multiline_parser_tests.rs:72) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineParserTests.cs:8) |

**Category totals:** Python: 11, JavaScript: 11, Rust: 11, C#: 11

## Multiline Quoted String

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| multilinedoublequotedreference | ❌ | [✅](js/tests/MultilineQuotedString.test.js:6) | [✅](rust/tests/multiline_quoted_string_tests.rs:3) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:8) |
| multilinequotedasid | ❌ | [✅](js/tests/MultilineQuotedString.test.js:65) | [✅](rust/tests/multiline_quoted_string_tests.rs:83) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:76) |
| simplemultilinedoublequoted | ❌ | [✅](js/tests/MultilineQuotedString.test.js:35) | [✅](rust/tests/multiline_quoted_string_tests.rs:43) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:40) |
| simplemultilinesinglequoted | ❌ | [✅](js/tests/MultilineQuotedString.test.js:50) | [✅](rust/tests/multiline_quoted_string_tests.rs:63) | [✅](csharp/Link.Foundation.Links.Notation.Tests/MultilineQuotedStringTests.cs:58) |

**Category totals:** Python: 0, JavaScript: 4, Rust: 4, C#: 4

## Nested Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| complexindentation | [✅](python/tests/test_nested_parser.py:137) | [✅](js/tests/NestedParser.test.js:127) | [✅](rust/tests/nested_parser_tests.rs:89) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:142) |
| deepnestedstructureroundtrip | [✅](python/tests/test_nested_parser.py:195) | ❌ | ❌ | ❌ |
| indentation | [✅](python/tests/test_nested_parser.py:116) | [✅](js/tests/NestedParser.test.js:151) | [✅](rust/tests/nested_parser_tests.rs:121) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:176) |
| indentationbasedchildren | [✅](python/tests/test_nested_parser.py:127) | [✅](js/tests/NestedParser.test.js:118) | [✅](rust/tests/nested_parser_tests.rs:79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:127) |
| indentationconsistency | [✅](python/tests/test_nested_parser.py:116) | [✅](js/tests/NestedParser.test.js:108) | [✅](rust/tests/nested_parser_tests.rs:68) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:115) |
| multiplenestedsroundtrip | [✅](python/tests/test_nested_parser.py:205) | ❌ | ❌ | ❌ |
| nestedindentation | [✅](python/tests/test_nested_parser.py:176) | [✅](js/tests/NestedParser.test.js:160) | [✅](rust/tests/nested_parser_tests.rs:130) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:187) |
| nesteds | [✅](python/tests/test_nested_parser.py:149) | [✅](js/tests/NestedParser.test.js:138) | [✅](rust/tests/nested_parser_tests.rs:104) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:160) |
| parsenestedstructurewithindentation | [✅](python/tests/test_nested_parser.py:99) | [✅](js/tests/NestedParser.test.js:93) | [✅](rust/tests/nested_parser_tests.rs:59) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:102) |
| significantwhitespace | [✅](python/tests/test_nested_parser.py:10) | [✅](js/tests/NestedParser.test.js:7) | [✅](rust/tests/nested_parser_tests.rs:4) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:9) |
| simplesignificantwhitespace | [✅](python/tests/test_nested_parser.py:74) | [✅](js/tests/NestedParser.test.js:70) | [✅](rust/tests/nested_parser_tests.rs:41) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:73) |
| threelevelnestingroundtrip | [✅](python/tests/test_nested_parser.py:185) | ❌ | ❌ | ❌ |
| twospacessizedwhitespace | [✅](python/tests/test_nested_parser.py:87) | [✅](js/tests/NestedParser.test.js:82) | [✅](rust/tests/nested_parser_tests.rs:50) | [✅](csharp/Link.Foundation.Links.Notation.Tests/NestedParserTests.cs:88) |

**Category totals:** Python: 13, JavaScript: 10, Rust: 10, C#: 10

## Single Line Parser

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| bugtest1 | [✅](python/tests/test_single_line_parser.py:25) | [✅](js/tests/SingleLineParser.test.js:21) | [✅](rust/tests/single_line_parser_tests.rs:79) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:28) |
| deeplynested | [✅](python/tests/test_single_line_parser.py:213) | [✅](js/tests/SingleLineParser.test.js:170) | [✅](rust/tests/single_line_parser_tests.rs:257) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:213) |
| hyphenatedidentifiers | [✅](python/tests/test_single_line_parser.py:220) | [✅](js/tests/SingleLineParser.test.js:176) | [✅](rust/tests/single_line_parser_tests.rs:264) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:179) |
| multilinewithid | [✅](python/tests/test_single_line_parser.py:111) | [✅](js/tests/SingleLineParser.test.js:96) | [✅](rust/tests/single_line_parser_tests.rs:181) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:254) |
| multilinewithoutid | [✅](python/tests/test_single_line_parser.py:131) | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:238) |
| multiplewordsinquotes | [✅](python/tests/test_single_line_parser.py:227) | [✅](js/tests/SingleLineParser.test.js:182) | [✅](rust/tests/single_line_parser_tests.rs:271) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:190) |
| nesteds | [✅](python/tests/test_single_line_parser.py:195) | [✅](js/tests/SingleLineParser.test.js:154) | [✅](rust/tests/single_line_parser_tests.rs:239) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:170) |
| parsemultiline | [✅](python/tests/test_single_line_parser.py:73) | [✅](js/tests/SingleLineParser.test.js:64) | [✅](rust/tests/single_line_parser_tests.rs:144) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:90) |
| parsequotedreferences | [✅](python/tests/test_single_line_parser.py:82) | [✅](js/tests/SingleLineParser.test.js:72) | [✅](rust/tests/single_line_parser_tests.rs:158) | ❌ |
| parsequotedreferencesvaluesonly | [✅](python/tests/test_single_line_parser.py:169) | [✅](js/tests/SingleLineParser.test.js:130) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:153) |
| parsereferencewithcolonandvalues | [✅](python/tests/test_single_line_parser.py:62) | [✅](js/tests/SingleLineParser.test.js:54) | [✅](rust/tests/single_line_parser_tests.rs:130) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:75) |
| parsesimplereference | [✅](python/tests/test_single_line_parser.py:51) | [✅](js/tests/SingleLineParser.test.js:44) | [✅](rust/tests/single_line_parser_tests.rs:116) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:59) |
| parsevaluesonly | ❌ | [✅](js/tests/SingleLineParser.test.js:84) | [✅](rust/tests/single_line_parser_tests.rs:166) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:103) |
| parsevaluesonlystandalonecolon | [✅](python/tests/test_single_line_parser.py:95) | ❌ | ❌ | ❌ |
| quotedreference | [✅](python/tests/test_single_line_parser.py:253) | [✅](js/tests/SingleLineParser.test.js:204) | [✅](rust/tests/single_line_parser_tests.rs:287) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:281) |
| quotedreferences | [✅](python/tests/test_single_line_parser.py:33) | [✅](js/tests/SingleLineParser.test.js:142) | [✅](rust/tests/single_line_parser_tests.rs:225) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:37) |
| quotedreferenceswithspaces | [✅](python/tests/test_single_line_parser.py:42) | [✅](js/tests/SingleLineParser.test.js:36) | [✅](rust/tests/single_line_parser_tests.rs:102) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:48) |
| quotedreferenceswithspacesin | [✅](python/tests/test_single_line_parser.py:181) | ❌ | ❌ | ❌ |
| quotedreferenceswithspecialchars | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:135) |
| simpleref | [✅](python/tests/test_single_line_parser.py:236) | [✅](js/tests/SingleLineParser.test.js:189) | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:246) |
| simplereference | [✅](python/tests/test_single_line_parser.py:243) | [✅](js/tests/SingleLineParser.test.js:195) | [✅](rust/tests/single_line_parser_tests.rs:280) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:269) |
| single | [✅](python/tests/test_single_line_parser.py:9) | [✅](js/tests/SingleLineParser.test.js:7) | [✅](rust/tests/single_line_parser_tests.rs:63) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:8) |
| singleline | ❌ | ❌ | [✅](rust/tests/single_line_parser_tests.rs:318) | ❌ |
| singlelinewithid | [✅](python/tests/test_single_line_parser.py:104) | [✅](js/tests/SingleLineParser.test.js:90) | [✅](rust/tests/single_line_parser_tests.rs:174) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:221) |
| singlelinewithoutid | [✅](python/tests/test_single_line_parser.py:118) | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:230) |
| singlequotedreferences | [✅](python/tests/test_single_line_parser.py:188) | [✅](js/tests/SingleLineParser.test.js:148) | [✅](rust/tests/single_line_parser_tests.rs:232) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:144) |
| singlet | [✅](python/tests/test_single_line_parser.py:151) | [✅](js/tests/SingleLineParser.test.js:213) | [✅](rust/tests/single_line_parser_tests.rs:294) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:293) |
| specialcharactersinquotes | [✅](python/tests/test_single_line_parser.py:202) | [✅](js/tests/SingleLineParser.test.js:160) | [✅](rust/tests/single_line_parser_tests.rs:246) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:201) |
| tripletsingle | [✅](python/tests/test_single_line_parser.py:17) | [✅](js/tests/SingleLineParser.test.js:14) | [✅](rust/tests/single_line_parser_tests.rs:71) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:18) |
| value | [✅](python/tests/test_single_line_parser.py:263) | [✅](js/tests/SingleLineParser.test.js:223) | [✅](rust/tests/single_line_parser_tests.rs:303) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:306) |
| withid | ❌ | ❌ | [✅](rust/tests/single_line_parser_tests.rs:310) | ❌ |
| withoutidmultiline | ❌ | [✅](js/tests/SingleLineParser.test.js:108) | [✅](rust/tests/single_line_parser_tests.rs:196) | [✅](csharp/Link.Foundation.Links.Notation.Tests/SingleLineParserTests.cs:262) |
| withoutidsingleline | ❌ | [✅](js/tests/SingleLineParser.test.js:102) | [✅](rust/tests/single_line_parser_tests.rs:188) | ❌ |

**Category totals:** Python: 27, JavaScript: 26, Rust: 26, C#: 27

## Tuple

| Test Name | Python | JavaScript | Rust | C# |
|-----------|--------|------------|------|----|
| namedtupleto | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/TupleTests.cs:33) |
| tupleto | ❌ | ❌ | ❌ | [✅](csharp/Link.Foundation.Links.Notation.Tests/TupleTests.cs:11) |

**Category totals:** Python: 0, JavaScript: 0, Rust: 0, C#: 2

---

## Missing Tests Summary

### Python Missing Tests

**Api** (7 missing):
- indentedidparsing
- indentedidroundtrip
- is
- isref
- multipleindentedidparsing
- multipleindentedidroundtrip
- quotedreferencesparsing

**Indentation Consistency** (3 missing):
- leadingspacesvsnoleadingspacesproducesameresult
- simpletwovsfourspaces
- threelevelnesting

**Indented Id Syntax** (3 missing):
- indentedidmultiplevalues
- indentedidsinglevalue
- unsupportedcolononly

**Link** (2 missing):
- escapereferenceforsimplereference
- escapereferencewithspecialcharacters

**Links Group** (5 missing):
- sgroupappendtoslist
- sgroupconstructor
- sgroupconstructorequivalent
- sgrouptolistflattensstructure
- sgrouptostring

**Mixed Indentation Modes** (6 missing):
- heroexamplealternativeformat
- heroexampleequivalence
- heroexamplemixedmodes
- sequencecontextwithcomplexvalues
- sequencelistcontextwithcolon
- setobjectcontextwithoutcolon

**Multiline Parser** (1 missing):
- parseandstringifytest2

**Multiline Quoted String** (4 missing):
- multilinedoublequotedreference
- multilinequotedasid
- simplemultilinedoublequoted
- simplemultilinesinglequoted

**Single Line Parser** (6 missing):
- parsevaluesonly
- quotedreferenceswithspecialchars
- singleline
- withid
- withoutidmultiline
- withoutidsingleline

**Tuple** (2 missing):
- namedtupleto
- tupleto

**Total missing: 39 tests**

### JavaScript Missing Tests

**Api** (5 missing):
- indentedidparsing
- is
- isref
- multipleindentedidparsing
- quotedreferencesparsing

**Format Config** (9 missing):
- formatconfigbasic
- formatconfigcustomindent
- formatconfiglessparentheses
- formatwithconsecutivegrouping
- formatwithlinelengthlimit
- formatwithmaxinlinerefs
- indentbylength
- indentbyrefcount
- roundtripwithlinelengthformatting

**Indentation Consistency** (3 missing):
- leadingspacesvsnoleadingspaces
- simpletwovsfourspaces
- threelevelnesting

**Indented Id Syntax** (3 missing):
- indentedidmultiplevalues
- indentedidsinglevalue
- unsupportedcolononly

**Link** (2 missing):
- escapereferencesimple
- escapereferencespecialchars

**Links Group** (2 missing):
- sgroupappendtoslist
- sgroupconstructorequivalent

**Mixed Indentation Modes** (2 missing):
- sequencecontextwithcolon
- setcontextwithoutcolon

**Multiline Parser** (1 missing):
- parseandstringify2

**Nested Parser** (3 missing):
- deepnestedstructureroundtrip
- multiplenestedsroundtrip
- threelevelnestingroundtrip

**Single Line Parser** (7 missing):
- multilinewithoutid
- parsevaluesonlystandalonecolon
- quotedreferenceswithspacesin
- quotedreferenceswithspecialchars
- singleline
- singlelinewithoutid
- withid

**Tuple** (2 missing):
- namedtupleto
- tupleto

**Total missing: 39 tests**

### Rust Missing Tests

**Api** (4 missing):
- indentedidroundtrip
- isequivalent
- isrefequivalent
- multipleindentedidroundtrip

**Format Config** (9 missing):
- formatconfigbasic
- formatconfigcustomindent
- formatconfiglessparentheses
- formatwithconsecutivegrouping
- formatwithlinelengthlimit
- formatwithmaxinlinerefs
- indentbylength
- indentbyrefcount
- roundtripwithlinelengthformatting

**Indentation Consistency** (3 missing):
- leadingspacesvsnoleadingspacesproducesameresult
- simpletwovsfourspacesindentation
- threelevelnestingwithdifferentindentation

**Indented Id Syntax** (3 missing):
- indentedidwithmultiplevalues
- indentedidwithsinglevalue
- unsupportedcolononlyfail

**Link** (2 missing):
- escapereferenceforsimplereference
- escapereferencespecialchars

**Links Group** (2 missing):
- sgroupappendtoslist
- sgroupconstructor

**Mixed Indentation Modes** (2 missing):
- sequencelistcontextwithcolon
- setobjectcontextwithoutcolon

**Multiline Parser** (1 missing):
- parseandstringify2

**Nested Parser** (3 missing):
- deepnestedstructureroundtrip
- multiplenestedsroundtrip
- threelevelnestingroundtrip

**Single Line Parser** (7 missing):
- multilinewithoutid
- parsequotedreferencesvaluesonly
- parsevaluesonlystandalonecolon
- quotedreferenceswithspacesin
- quotedreferenceswithspecialchars
- simpleref
- singlelinewithoutid

**Tuple** (2 missing):
- namedtupleto
- tupleto

**Total missing: 38 tests**

### C# Missing Tests

**Api** (5 missing):
- indentedidparsing
- is
- isref
- multipleindentedidparsing
- quotedreferencesparsing

**Format Config** (9 missing):
- formatconfigbasic
- formatconfigcustomindent
- formatconfiglessparentheses
- formatwithconsecutivegrouping
- formatwithlinelengthlimit
- formatwithmaxinlinerefs
- indentbylength
- indentbyrefcount
- roundtripwithlinelengthformatting

**Indentation Consistency** (3 missing):
- leadingspacesvsnoleadingspaces
- simpletwovsfourspaces
- threelevelnesting

**Indented Id Syntax** (3 missing):
- indentedidmultiplevalues
- indentedidsinglevalue
- unsupportedcolononly

**Link** (2 missing):
- escapereferenceforsimplereference
- escapereferencespecialchars

**Links Group** (2 missing):
- sgroupconstructorequivalent
- sgrouptostring

**Mixed Indentation Modes** (2 missing):
- sequencelistcontextwithcolon
- setobjectcontextwithoutcolon

**Multiline Parser** (1 missing):
- parseandstringify2

**Nested Parser** (3 missing):
- deepnestedstructureroundtrip
- multiplenestedsroundtrip
- threelevelnestingroundtrip

**Single Line Parser** (6 missing):
- parsequotedreferences
- parsevaluesonlystandalonecolon
- quotedreferenceswithspacesin
- singleline
- withid
- withoutidsingleline

**Total missing: 36 tests**

