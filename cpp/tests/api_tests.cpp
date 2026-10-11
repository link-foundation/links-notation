// The public API: references and links, formatting parsed documents, and the
// indented id syntax.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

/// The whole document as one link without an id, as Rust's parse_lino returns it.
Link parse_document(const std::string& input) { return Link(std::nullopt, parse(input)); }

}  // namespace

TEST(ApiTests, TestIsRef) {
  const Link reference("some_value");
  EXPECT_TRUE(reference.is_reference());
  EXPECT_FALSE(!reference.is_reference());
}

TEST(ApiTests, TestIsLink) {
  const Link link(std::string("id"), {Link("child")});
  EXPECT_TRUE(!link.is_reference());
  EXPECT_FALSE(link.is_reference());
}

TEST(ApiTests, TestIsRefEquivalent) {
  // Same as TestIsRef, for API consistency with other languages.
  const Link reference("some_value");
  EXPECT_TRUE(reference.is_reference());
  EXPECT_FALSE(!reference.is_reference());
}

TEST(ApiTests, TestIsLinkEquivalent) {
  // Same as TestIsLink, for API consistency with other languages.
  const Link link(std::string("id"), {Link("child")});
  EXPECT_TRUE(!link.is_reference());
  EXPECT_FALSE(link.is_reference());
}

TEST(ApiTests, TestEmptyLink) {
  const Link link(std::nullopt, {});
  EXPECT_EQ(link.to_string(), "()");
}

TEST(ApiTests, TestSimpleLink) {
  const std::string input = "(1: 1 1)";
  // Regular formatting wraps the document in parentheses.
  EXPECT_EQ(parse_document(input).to_string(), "((1: 1 1))");
  // Alternate formatting writes the document's links one per line.
  EXPECT_EQ(format_links(parse(input)), input);
}

TEST(ApiTests, TestLinkWithSourceTarget) {
  const std::string input = "(index: source target)";
  EXPECT_EQ(parse_document(input).to_string(), "((index: source target))");
  EXPECT_EQ(format_links(parse(input)), input);
}

TEST(ApiTests, TestLinkWithSourceTypeTarget) {
  const std::string input = "(index: source type target)";
  EXPECT_EQ(parse_document(input).to_string(), "((index: source type target))");
  EXPECT_EQ(format_links(parse(input)), input);
}

TEST(ApiTests, TestSingleLineFormat) {
  const std::string output = parse_document("id: value1 value2").to_string();
  EXPECT_NE(output.find("id"), std::string::npos) << output;
  EXPECT_NE(output.find("value1"), std::string::npos) << output;
  EXPECT_NE(output.find("value2"), std::string::npos) << output;
}

TEST(ApiTests, TestQuotedReferences) {
  const std::string output = parse_document(R"(("quoted id": "value with spaces"))").to_string();
  EXPECT_NE(output.find("quoted id"), std::string::npos) << output;
  EXPECT_NE(output.find("value with spaces"), std::string::npos) << output;
}

TEST(ApiTests, TestQuotedReferencesParsing) {
  const std::string output = parse_document(R"(("quoted id": "value with spaces"))").to_string();
  EXPECT_NE(output.find("quoted id"), std::string::npos) << output;
  EXPECT_NE(output.find("value with spaces"), std::string::npos) << output;
}

TEST(ApiTests, TestIndentedIdSyntaxParsing) {
  const std::string indented_output = format_links(parse("id:\n  value1\n  value2"));
  const std::string inline_output = format_links(parse("(id: value1 value2)"));
  EXPECT_EQ(indented_output, inline_output);
  EXPECT_EQ(indented_output, "(id: value1 value2)");
}

TEST(ApiTests, TestMultipleIndentedIdSyntaxParsing) {
  const std::string indented_output = format_links(parse("id1:\n  a\n  b\nid2:\n  c\n  d"));
  const std::string inline_output = format_links(parse("(id1: a b)\n(id2: c d)"));
  EXPECT_EQ(indented_output, inline_output);
  EXPECT_EQ(indented_output, "(id1: a b)\n(id2: c d)");
}

TEST(ApiTests, TestIndentedIdSyntaxRoundtrip) {
  const std::vector<Link> parsed = parse("id:\n  value1\n  value2");
  const FormatConfig config = FormatConfig::builder().max_inline_refs(1).prefer_inline(false).build();
  EXPECT_FALSE(parsed.empty());
  EXPECT_EQ(config.max_inline_refs, std::optional<std::size_t>(1));
  EXPECT_FALSE(config.prefer_inline);
  EXPECT_TRUE(config.should_indent_by_ref_count(2));
}

TEST(ApiTests, TestMultipleIndentedIdSyntaxRoundtrip) {
  const std::vector<Link> parsed = parse("id1:\n  a\n  b\nid2:\n  c\n  d");
  const FormatConfig config = FormatConfig::builder().max_inline_refs(1).prefer_inline(false).build();
  EXPECT_GE(parsed.size(), 2u);
  EXPECT_EQ(config.max_inline_refs, std::optional<std::size_t>(1));
  EXPECT_FALSE(config.prefer_inline);
  EXPECT_TRUE(config.should_indent_by_ref_count(2));
}
