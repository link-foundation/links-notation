// Single-line links: references, ids with values, quoted references, nesting,
// and the forbidden standalone colon, read whole and as an indentation tree.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

/// The document as one link with no id whose values are its links, the shape
/// parse_lino gives in the Rust implementation.
Link parse_lino(const std::string& source) { return Link(std::nullopt, parse(source)); }

/// A reference: a link with an id and no values.
bool is_reference(const Link& link) { return link.id.has_value() && link.values.empty(); }

/// Formats links the way the C# and JavaScript test helpers do.
std::string format_link(const Link& link, bool less_parentheses) {
  if (is_reference(link)) {
    const std::string& value = *link.id;
    if (value.find_first_of(" :()") != std::string::npos) return "'" + value + "'";
    return value;
  }
  if (link.values.empty()) return "()";
  std::string formatted_values;
  for (const Link& value : link.values) {
    if (!formatted_values.empty()) formatted_values += ' ';
    formatted_values += format_link(value, false);
  }
  if (link.id) {
    const std::string escaped_id = format_link(Link(*link.id), false);
    if (less_parentheses && link.values.size() == 1) return escaped_id + ": " + formatted_values;
    return "(" + escaped_id + ": " + formatted_values + ")";
  }
  bool all_references = true;
  for (const Link& value : link.values) all_references = all_references && is_reference(value);
  if (less_parentheses && all_references) return formatted_values;
  return "(" + formatted_values + ")";
}

std::string format_links_multiline(const Link& link) {
  if (link.values.empty()) return format_link(link, false);
  std::string result;
  for (const Link& value : link.values) {
    if (!result.empty()) result += '\n';
    result += format_link(value, false);
  }
  return result;
}

/// The indentation tree of a document, the C++ counterpart of the Rust
/// parser's parse_document.
std::vector<LinksGroup> parse_document(const std::string& source) { return Parser().parse_groups(source); }

/// The links written inside a parenthesized group. The C++ tree already holds
/// the group's content as the line's link.
std::vector<Link> nested_body(const LinksGroup& group) { return {group.element}; }

}  // namespace

TEST(SingleLineParserTests, SingleLinkTest) {
  const std::string source = "(address: source target)";
  const Link parsed = parse_lino(source);
  EXPECT_EQ(source, format_links_multiline(parsed));
}

TEST(SingleLineParserTests, TripletSingleLinkTest) {
  const std::string source = "(papa has car)";
  const Link parsed = parse_lino(source);
  EXPECT_EQ(source, format_links_multiline(parsed));
}

TEST(SingleLineParserTests, BugTest1) {
  const std::string source = "(ignore conan-center-index repository)";
  const Link parsed = parse_lino(source);
  EXPECT_EQ(source, format_links_multiline(parsed));
}

TEST(SingleLineParserTests, QuotedReferencesTest) {
  const Link parsed = parse_lino(R"((a: 'b' "c"))");
  ASSERT_FALSE(is_reference(parsed));
  ASSERT_EQ(parsed.values.size(), 1u);
  if (!is_reference(parsed.values[0])) {
    EXPECT_EQ(parsed.values[0].id, std::optional<std::string>("a"));
    EXPECT_EQ(parsed.values[0].values.size(), 2u);
  }
}

TEST(SingleLineParserTests, QuotedReferencesWithSpacesTest) {
  const Link parsed = parse_lino(R"(('a a': 'b b' "c c"))");
  ASSERT_FALSE(is_reference(parsed));
  ASSERT_EQ(parsed.values.size(), 1u);
  if (!is_reference(parsed.values[0])) {
    EXPECT_EQ(parsed.values[0].id, std::optional<std::string>("a a"));
    EXPECT_EQ(parsed.values[0].values.size(), 2u);
  }
}

TEST(SingleLineParserTests, ParseSimpleReference) {
  const Link result = parse_lino("test");
  ASSERT_FALSE(is_reference(result));
  EXPECT_FALSE(result.id.has_value());
  ASSERT_EQ(result.values.size(), 1u);
  if (is_reference(result.values[0])) {
    EXPECT_EQ(*result.values[0].id, "test");
  }
}

TEST(SingleLineParserTests, ParseReferenceWithColonAndValues) {
  const Link result = parse_lino("parent: child1 child2");
  ASSERT_FALSE(is_reference(result));
  ASSERT_EQ(result.values.size(), 1u);
  if (!is_reference(result.values[0])) {
    EXPECT_EQ(result.values[0].id, std::optional<std::string>("parent"));
    EXPECT_EQ(result.values[0].values.size(), 2u);
  }
}

TEST(SingleLineParserTests, ParseMultilineLink) {
  const Link result = parse_lino("(parent: child1 child2)");
  ASSERT_FALSE(is_reference(result));
  ASSERT_EQ(result.values.size(), 1u);
  if (!is_reference(result.values[0])) {
    EXPECT_EQ(result.values[0].id, std::optional<std::string>("parent"));
    EXPECT_EQ(result.values[0].values.size(), 2u);
  }
}

TEST(SingleLineParserTests, ParseQuotedReferences) {
  const Link result = parse_lino(R"("has space" 'has:colon')");
  EXPECT_EQ("('has space' 'has:colon')", format_links_multiline(result));
}

TEST(SingleLineParserTests, ParseValuesOnly) {
  // A standalone ':' is forbidden.
  EXPECT_THROW(parse_lino(": value1 value2"), ParseError);
}

TEST(SingleLineParserTests, TestSingleLineLinkWithId) { EXPECT_NO_THROW(parse_lino("id: value1 value2")); }

TEST(SingleLineParserTests, TestMultiLineLinkWithId) { EXPECT_NO_THROW(parse_lino("(id: value1 value2)")); }

TEST(SingleLineParserTests, TestLinkWithoutIdSingleLine) {
  // A standalone ':' is forbidden.
  EXPECT_THROW(parse_lino(": value1 value2"), ParseError);
}

TEST(SingleLineParserTests, TestLinkWithoutIdMultiLine) {
  // '(:)' is forbidden.
  EXPECT_THROW(parse_lino("(: value1 value2)"), ParseError);
}

TEST(SingleLineParserTests, TestSingletLink) {
  const Link result = parse_lino("(singlet)");
  ASSERT_FALSE(is_reference(result));
  EXPECT_FALSE(result.id.has_value());
  ASSERT_EQ(result.values.size(), 1u);
  if (is_reference(result.values[0])) {
    EXPECT_EQ(*result.values[0].id, "singlet");
  }
}

TEST(SingleLineParserTests, TestValueLink) { EXPECT_NO_THROW(parse_lino("(value1 value2 value3)")); }

TEST(SingleLineParserTests, TestQuotedReferences) {
  EXPECT_NO_THROW(parse_lino(R"(("id with spaces": "value with spaces"))"));
}

TEST(SingleLineParserTests, TestSingleQuotedReferences) { EXPECT_NO_THROW(parse_lino("('id': 'value')")); }

TEST(SingleLineParserTests, TestNestedLinks) { EXPECT_NO_THROW(parse_lino("(outer: (inner: value))")); }

TEST(SingleLineParserTests, TestSpecialCharactersInQuotes) {
  EXPECT_NO_THROW(parse_lino(R"(("key:with:colons": "value(with)parens"))"));
  EXPECT_NO_THROW(parse_lino(R"(('key with spaces': 'value: with special chars'))"));
}

TEST(SingleLineParserTests, TestDeeplyNested) { EXPECT_NO_THROW(parse_lino("(a: (b: (c: (d: (e: value)))))")); }

TEST(SingleLineParserTests, TestHyphenatedIdentifiers) {
  EXPECT_NO_THROW(parse_lino("(conan-center-index: repository info)"));
}

TEST(SingleLineParserTests, TestMultipleWordsInQuotes) { EXPECT_NO_THROW(parse_lino(R"(("New York": city state))")); }

// Tests of the parser's own tree.

TEST(SingleLineParserTests, TestSimpleReference) {
  const std::vector<LinksGroup> result = parse_document("hello");
  ASSERT_EQ(result.size(), 1u);
  EXPECT_EQ(result[0].element.id, std::nullopt);
  ASSERT_FALSE(result[0].element.values.empty());
  EXPECT_EQ(result[0].element.values[0].id, std::optional<std::string>("hello"));
}

TEST(SingleLineParserTests, TestQuotedReference) {
  const std::vector<LinksGroup> result = parse_document("\"hello world\"");
  ASSERT_EQ(result.size(), 1u);
  EXPECT_EQ(result[0].element.id, std::nullopt);
  ASSERT_FALSE(result[0].element.values.empty());
  EXPECT_EQ(result[0].element.values[0].id, std::optional<std::string>("hello world"));
}

TEST(SingleLineParserTests, TestSingletLinkParser) {
  const std::vector<LinksGroup> result = parse_document("(singlet)");
  ASSERT_EQ(result.size(), 1u);
  const std::vector<Link> body = nested_body(result[0]);
  ASSERT_EQ(body.size(), 1u);
  EXPECT_EQ(body[0].id, std::nullopt);
  ASSERT_EQ(body[0].values.size(), 1u);
  EXPECT_EQ(body[0].values[0].id, std::optional<std::string>("singlet"));
  EXPECT_EQ(result[0].children.size(), 0u);
}

TEST(SingleLineParserTests, TestValueLinkParser) {
  const std::vector<LinksGroup> result = parse_document("(a b c)");
  ASSERT_EQ(result.size(), 1u);
  const std::vector<Link> body = nested_body(result[0]);
  ASSERT_EQ(body.size(), 1u);
  EXPECT_EQ(body[0].values.size(), 3u);
}

TEST(SingleLineParserTests, TestLinkWithId) {
  const std::vector<LinksGroup> result = parse_document("(id: a b c)");
  ASSERT_EQ(result.size(), 1u);
  const std::vector<Link> body = nested_body(result[0]);
  ASSERT_EQ(body.size(), 1u);
  EXPECT_EQ(body[0].id, std::optional<std::string>("id"));
  EXPECT_EQ(body[0].values.size(), 3u);
}

TEST(SingleLineParserTests, TestSingleLineLink) {
  const std::vector<LinksGroup> result = parse_document("id: value1 value2");
  ASSERT_EQ(result.size(), 1u);
  EXPECT_EQ(result[0].element.id, std::optional<std::string>("id"));
  EXPECT_EQ(result[0].element.values.size(), 2u);
}

TEST(SingleLineParserTests, TestParseQuotedReferencesValuesOnly) {
  const std::vector<Link> links = parse(R"("has space" 'has:colon')");
  ASSERT_EQ(links.size(), 1u);
  ASSERT_FALSE(is_reference(links[0])) << "Expected Link";
  EXPECT_EQ(links[0].id, std::nullopt);
  EXPECT_EQ(links[0].values.size(), 2u);
}

TEST(SingleLineParserTests, TestQuotedReferenceParser) { EXPECT_FALSE(parse(R"(("quoted"))").empty()); }

TEST(SingleLineParserTests, TestSimpleRef) { EXPECT_FALSE(parse("simpleref").empty()); }

TEST(SingleLineParserTests, TestSimpleReferenceParser) { EXPECT_FALSE(parse("reference").empty()); }

TEST(SingleLineParserTests, TestMultilineWithoutId) {
  // '(:)' is rejected: an empty id with values is forbidden.
  EXPECT_THROW(parse_document("(: value1 value2)"), ParseError);
}

TEST(SingleLineParserTests, TestParseValuesOnlyStandaloneColon) {
  // A standalone ':' is rejected: an empty id with values is forbidden.
  EXPECT_THROW(parse_document(": value1 value2"), ParseError);
}

TEST(SingleLineParserTests, TestQuotedReferencesWithSpacesInLink) {
  const std::vector<Link> result = parse(R"((id: "value with spaces"))");
  ASSERT_EQ(result.size(), 1u);
  ASSERT_FALSE(is_reference(result[0])) << "Expected Link";
  EXPECT_EQ(result[0].id, std::optional<std::string>("id"));
  EXPECT_EQ(result[0].values.size(), 1u);
}

TEST(SingleLineParserTests, TestQuotedReferencesWithSpecialChars) {
  const std::vector<Link> result = parse(R"(("special:char" "another@char"))");
  ASSERT_EQ(result.size(), 1u);
  ASSERT_FALSE(is_reference(result[0])) << "Expected Link";
  EXPECT_EQ(result[0].id, std::nullopt);
  EXPECT_EQ(result[0].values.size(), 2u);
}

TEST(SingleLineParserTests, TestSingleLineWithId) {
  const std::vector<Link> result = parse("myid: val1 val2");
  ASSERT_FALSE(result.empty());
  ASSERT_FALSE(is_reference(result[0])) << "Expected Link";
  EXPECT_EQ(result[0].id, std::optional<std::string>("myid"));
  EXPECT_EQ(result[0].values.size(), 2u);
}

TEST(SingleLineParserTests, TestSingleLineWithoutId) {
  const std::vector<Link> result = parse("(value1 value2)");
  ASSERT_EQ(result.size(), 1u);
  ASSERT_FALSE(is_reference(result[0])) << "Expected Link";
  EXPECT_EQ(result[0].id, std::nullopt);
  EXPECT_EQ(result[0].values.size(), 2u);
}
