// Edge cases of the parser: empty links and documents, forbidden standalone
// colons, singlets and unclosed groups.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

// The whole document as one link with no id whose values are the links read,
// the way the Rust parse_lino returns it.
Link parse_lino(const std::string& document) { return Link(std::nullopt, parse(document)); }

}  // namespace

TEST(EdgeCaseParserTests, EmptyLinkTest) {
  // Standalone ':' is forbidden and is an error.
  EXPECT_THROW(parse_lino(":"), ParseError);
}

TEST(EdgeCaseParserTests, EmptyLinkWithParenthesesTest) {
  const Link parsed = parse_lino("()");
  // Parses as an empty link, written the way C# and JavaScript write it.
  EXPECT_EQ(format_links(parsed.values), "()");
}

TEST(EdgeCaseParserTests, EmptyLinkWithEmptySelfReferenceTest) {
  // '(:)' is forbidden and is an error.
  EXPECT_THROW(parse_lino("(:)"), ParseError);
}

TEST(EdgeCaseParserTests, TestAllFeaturesTest) {
  // Single-line link with id.
  EXPECT_NO_THROW(parse_lino("id: value1 value2"));

  // Multi-line link with id.
  EXPECT_NO_THROW(parse_lino("(id: value1 value2)"));

  // Link without id (single-line) is forbidden.
  EXPECT_THROW(parse_lino(": value1 value2"), ParseError);

  // Link without id (multi-line) is forbidden.
  EXPECT_THROW(parse_lino("(: value1 value2)"), ParseError);

  // Singlet link.
  {
    const Link parsed = parse_lino("(singlet)");
    EXPECT_FALSE(parsed.id.has_value());
    ASSERT_EQ(parsed.values.size(), 1u);
    if (parsed.values[0].is_reference()) {
      EXPECT_EQ(parsed.values[0].id, std::optional<std::string>("singlet"));
    }
  }

  // Value link.
  EXPECT_NO_THROW(parse_lino("(value1 value2 value3)"));

  // Quoted references.
  EXPECT_NO_THROW(parse_lino(R"(("id with spaces": "value with spaces"))"));

  // Single-quoted references.
  EXPECT_NO_THROW(parse_lino("('id': 'value')"));

  // Nested links.
  EXPECT_NO_THROW(parse_lino("(outer: (inner: value))"));
}

TEST(EdgeCaseParserTests, TestEmptyDocumentTest) {
  // An empty document holds no links, as in C# and JavaScript.
  std::vector<Link> parsed;
  ASSERT_NO_THROW(parsed = parse(""));
  EXPECT_TRUE(parsed.empty());
}

TEST(EdgeCaseParserTests, TestWhitespaceOnlyTest) {
  // A whitespace-only document holds no links, as in C# and JavaScript.
  std::vector<Link> parsed;
  ASSERT_NO_THROW(parsed = parse("   \n   \n   "));
  EXPECT_TRUE(parsed.empty());
}

TEST(EdgeCaseParserTests, TestEmptyLinksTest) {
  EXPECT_NO_THROW(parse_lino("()"));

  // '(:)' is forbidden.
  EXPECT_THROW(parse_lino("(:)"), ParseError);

  EXPECT_NO_THROW(parse_lino("(id:)"));
}

TEST(EdgeCaseParserTests, TestSingletLinks) {
  // (1)
  {
    const Link parsed = parse_lino("(1)");
    EXPECT_FALSE(parsed.id.has_value());
    ASSERT_EQ(parsed.values.size(), 1u);
    if (parsed.values[0].is_reference()) {
      EXPECT_EQ(parsed.values[0].id, std::optional<std::string>("1"));
    }
  }

  // (1 2)
  {
    const Link parsed = parse_lino("(1 2)");
    EXPECT_FALSE(parsed.id.has_value());
    ASSERT_EQ(parsed.values.size(), 1u);
    const Link& inner = parsed.values[0];
    if (!inner.is_reference()) {
      EXPECT_FALSE(inner.id.has_value());
      ASSERT_EQ(inner.values.size(), 2u);
      EXPECT_EQ(inner.values[0], Link("1"));
      EXPECT_EQ(inner.values[1], Link("2"));
    }
  }

  // (1 2 3)
  {
    const Link parsed = parse_lino("(1 2 3)");
    EXPECT_FALSE(parsed.id.has_value());
    ASSERT_EQ(parsed.values.size(), 1u);
    const Link& inner = parsed.values[0];
    if (!inner.is_reference()) {
      EXPECT_FALSE(inner.id.has_value());
      ASSERT_EQ(inner.values.size(), 3u);
      EXPECT_EQ(inner.values[0], Link("1"));
      EXPECT_EQ(inner.values[1], Link("2"));
      EXPECT_EQ(inner.values[2], Link("3"));
    }
  }

  // (1 2 3 4)
  {
    const Link parsed = parse_lino("(1 2 3 4)");
    EXPECT_FALSE(parsed.id.has_value());
    ASSERT_EQ(parsed.values.size(), 1u);
    const Link& inner = parsed.values[0];
    if (!inner.is_reference()) {
      EXPECT_FALSE(inner.id.has_value());
      ASSERT_EQ(inner.values.size(), 4u);
      EXPECT_EQ(inner.values[0], Link("1"));
      EXPECT_EQ(inner.values[1], Link("2"));
      EXPECT_EQ(inner.values[2], Link("3"));
      EXPECT_EQ(inner.values[3], Link("4"));
    }
  }
}

TEST(EdgeCaseParserTests, TestInvalidInput) { EXPECT_THROW(parse_lino("(invalid"), ParseError); }
