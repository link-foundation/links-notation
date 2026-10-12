// FormatConfig: its options and how Link::format and format_links follow them.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

bool contains(const std::string& text, const std::string& part) { return text.find(part) != std::string::npos; }

/// A link with an id and a reference for each of `references`.
Link link_of(const std::string& id, const std::vector<std::string>& references) {
  std::vector<Link> values;
  for (const std::string& reference : references) values.emplace_back(reference);
  return Link(id, values);
}

}  // namespace

TEST(FormatConfigTests, FormatConfigBasic) {
  const FormatConfig config;
  EXPECT_FALSE(config.less_parentheses);
  EXPECT_EQ(config.max_line_length, 80u);
  EXPECT_FALSE(config.indent_long_lines);
}

TEST(FormatConfigTests, FormatWithLineLengthLimit) {
  // The line would be 32+ characters, so the threshold is 30.
  const FormatConfig config =
      FormatConfig::builder().indent_long_lines(true).max_line_length(30).prefer_inline(false).build();
  EXPECT_TRUE(config.indent_long_lines);
  EXPECT_EQ(config.max_line_length, 30u);
}

TEST(FormatConfigTests, FormatWithMaxInlineRefs) {
  // max_inline_refs 3 indents a link with 4 references.
  const FormatConfig config = FormatConfig::builder().max_inline_refs(3).prefer_inline(false).build();
  EXPECT_EQ(config.max_inline_refs, std::optional<std::size_t>(3));
  EXPECT_TRUE(config.should_indent_by_ref_count(4));
}

TEST(FormatConfigTests, FormatWithConsecutiveGrouping) {
  const FormatConfig config = FormatConfig::builder().group_consecutive(true).build();
  EXPECT_TRUE(config.group_consecutive);
}

TEST(FormatConfigTests, FormatConfigCustomIndent) {
  const FormatConfig config =
      FormatConfig::builder().max_inline_refs(3).prefer_inline(false).indent_string("    ").build();
  EXPECT_EQ(config.indent_string, "    ");
}

TEST(FormatConfigTests, FormatConfigLessParentheses) {
  const FormatConfig config = FormatConfig::builder().less_parentheses(true).build();
  EXPECT_TRUE(config.less_parentheses);
}

TEST(FormatConfigTests, RoundtripWithLineLengthFormatting) {
  const FormatConfig config = FormatConfig::builder().max_inline_refs(2).prefer_inline(false).build();
  EXPECT_EQ(config.max_inline_refs, std::optional<std::size_t>(2));
}

TEST(FormatConfigTests, ShouldIndentByLength) {
  const FormatConfig config = FormatConfig::builder().indent_long_lines(true).max_line_length(80).build();
  EXPECT_FALSE(config.should_indent_by_length("short"));
  EXPECT_TRUE(config.should_indent_by_length(std::string(100, 'a')));
}

TEST(FormatConfigTests, ShouldIndentByRefCount) {
  const FormatConfig config = FormatConfig::builder().max_inline_refs(3).build();
  EXPECT_FALSE(config.should_indent_by_ref_count(2));
  EXPECT_FALSE(config.should_indent_by_ref_count(3));
  EXPECT_TRUE(config.should_indent_by_ref_count(4));
}

// Integration tests that actually format.

TEST(FormatConfigTests, FormatLinkWithLessParenthesesIntegration) {
  const Link link = link_of("id", {"value"});
  const FormatConfig config = FormatConfig::builder().less_parentheses(true).build();
  // No outer parentheses.
  EXPECT_EQ(link.format(config), "id: value");
}

TEST(FormatConfigTests, FormatLinkWithMaxInlineRefsIntegration) {
  const Link link = link_of("id", {"1", "2", "3", "4"});
  // max_inline_refs 3 indents a link with 4 references.
  const FormatConfig config = FormatConfig::builder().max_inline_refs(3).prefer_inline(false).build();
  const std::string output = link.format(config);
  EXPECT_TRUE(contains(output, "id:")) << "Output should contain 'id:': " << output;
  EXPECT_TRUE(contains(output, "\n")) << "Output should be indented across multiple lines: " << output;
}

TEST(FormatConfigTests, FormatLinkWithLineLengthLimitIntegration) {
  const Link link = link_of("sequence", {"1", "2", "3", "4", "5", "6", "7", "8", "9", "10"});
  // "(sequence: 1 2 3 4 5 6 7 8 9 10)" is 32 characters, so the threshold is 30.
  const FormatConfig config =
      FormatConfig::builder().indent_long_lines(true).max_line_length(30).prefer_inline(false).build();
  const std::string output = link.format(config);
  EXPECT_TRUE(contains(output, "sequence:")) << "Output should contain 'sequence:': " << output;
  EXPECT_TRUE(contains(output, "\n")) << "Output should be indented across multiple lines: " << output;
}

TEST(FormatConfigTests, FormatLinksWithConsecutiveGroupingIntegration) {
  const std::vector<Link> links = {link_of("SetA", {"a"}), link_of("SetA", {"b"}), link_of("SetA", {"c"})};
  const FormatConfig config = FormatConfig::builder().group_consecutive(true).build();
  const std::string output = format_links(links, config);
  // The consecutive SetA links are grouped, holding a, b and c.
  EXPECT_TRUE(contains(output, "SetA")) << "Output should contain 'SetA': " << output;
  EXPECT_TRUE(contains(output, "a")) << "Output should contain 'a': " << output;
  EXPECT_TRUE(contains(output, "b")) << "Output should contain 'b': " << output;
  EXPECT_TRUE(contains(output, "c")) << "Output should contain 'c': " << output;
}

TEST(FormatConfigTests, FormatLinkWithCustomIndentIntegration) {
  const Link link = link_of("id", {"1", "2", "3", "4"});
  const FormatConfig config =
      FormatConfig::builder().max_inline_refs(3).prefer_inline(false).indent_string("    ").build();
  const std::string output = link.format(config);
  EXPECT_TRUE(contains(output, "    ")) << "Output should use 4-space indentation: " << output;
}

TEST(FormatConfigTests, FormatRoundtripWithConfigIntegration) {
  const Link original_link = link_of("test", {"a", "b", "c"});
  const FormatConfig config = FormatConfig::builder().max_inline_refs(2).prefer_inline(false).build();
  const std::string formatted = original_link.format(config);

  // It parses back, and not to nothing.
  std::vector<Link> parsed;
  ASSERT_NO_THROW(parsed = parse(formatted)) << "Should parse successfully: " << formatted;
  EXPECT_FALSE(parsed.empty()) << "Parsed result should not be empty";
}

TEST(FormatConfigTests, FormatEmptyLinksWithConfig) {
  const std::vector<Link> links;
  const FormatConfig config;
  EXPECT_EQ(format_links(links, config), "");
}

TEST(FormatConfigTests, FormatSingleRefWithConfig) {
  const Link link("value");

  const FormatConfig config_with_parens;
  EXPECT_EQ(link.format(config_with_parens), "(value)");

  const FormatConfig config_less_parens = FormatConfig::builder().less_parentheses(true).build();
  EXPECT_EQ(link.format(config_less_parens), "value");
}
