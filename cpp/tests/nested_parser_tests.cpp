// Nested documents: significant indentation expanded into path links, the
// indentation tree itself, and deeply nested links written back.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;

namespace {

// The whole document as one link without an id, holding every top-level link.
Link parse_root(const std::string& source) { return Link(std::nullopt, parse(source)); }

// Each value of the root on its own line, references in parentheses.
std::string format_alternate(const Link& root) {
  std::string result;
  for (std::size_t index = 0; index < root.values.size(); ++index) {
    if (index > 0) result += '\n';
    const Link& value = root.values[index];
    result += value.is_reference() ? "(" + value.to_link_or_id_string() + ")" : value.to_link_or_id_string();
  }
  return result;
}

bool contains(const std::string& text, const std::string& part) { return text.find(part) != std::string::npos; }

}  // namespace

TEST(NestedParserTests, SignificantWhitespaceTest) {
  const std::string source =
      "\n"
      "users\n"
      "    user1\n"
      "        id\n"
      "            43\n"
      "        name\n"
      "            first\n"
      "                John\n"
      "            last\n"
      "                Williams\n"
      "        location\n"
      "            New York\n"
      "        age\n"
      "            23\n"
      "    user2\n"
      "        id\n"
      "            56\n"
      "        name\n"
      "            first\n"
      "                Igor\n"
      "            middle\n"
      "                Petrovich\n"
      "            last\n"
      "                Ivanov\n"
      "        location\n"
      "            Moscow\n"
      "        age\n"
      "            20";

  const std::string target =
      "(users)\n((users) (user1))\n(((users) (user1)) (id))\n((((users) (user1)) (id)) (43))\n(((users) (user1)) "
      "(name))\n((((users) (user1)) (name)) (first))\n(((((users) (user1)) (name)) (first)) (John))\n((((users) "
      "(user1)) (name)) (last))\n(((((users) (user1)) (name)) (last)) (Williams))\n(((users) (user1)) "
      "(location))\n((((users) (user1)) (location)) (New York))\n(((users) (user1)) (age))\n((((users) (user1)) "
      "(age)) (23))\n((users) (user2))\n(((users) (user2)) (id))\n((((users) (user2)) (id)) (56))\n(((users) "
      "(user2)) (name))\n((((users) (user2)) (name)) (first))\n(((((users) (user2)) (name)) (first)) "
      "(Igor))\n((((users) (user2)) (name)) (middle))\n(((((users) (user2)) (name)) (middle)) (Petrovich))\n((((users) "
      "(user2)) (name)) (last))\n(((((users) (user2)) (name)) (last)) (Ivanov))\n(((users) (user2)) "
      "(location))\n((((users) (user2)) (location)) (Moscow))\n(((users) (user2)) (age))\n((((users) (user2)) (age)) "
      "(20))";
  EXPECT_EQ(target, format_alternate(parse_root(source)));
}

TEST(NestedParserTests, SimpleSignificantWhitespaceTest) {
  EXPECT_EQ("(a)\n((a) (b))\n((a) (c))", format_alternate(parse_root("a\n    b\n    c")));
}

TEST(NestedParserTests, TwoSpacesSizedWhitespaceTest) {
  EXPECT_EQ("(users)\n((users) (user1))", format_alternate(parse_root("\nusers\n  user1")));
}

TEST(NestedParserTests, ParseNestedStructureWithIndentation) {
  EXPECT_EQ("(parent)\n((parent) (child1))\n((parent) (child2))",
            format_alternate(parse_root("parent\n  child1\n  child2")));
}

TEST(NestedParserTests, TestIndentationConsistency) {
  // Test that indentation must be consistent
  const std::string output = format_alternate(parse_root("parent\n  child1\n   child2"));  // Inconsistent indentation
  // Should produce at least the parent and child1 as separate links
  EXPECT_TRUE(contains(output, "(parent)")) << output;
  EXPECT_TRUE(contains(output, "((parent) (child1))")) << output;
}

TEST(NestedParserTests, TestIndentationBasedChildren) {
  // Test indentation-based children
  const std::string output = format_alternate(parse_root("parent\n  child1\n  child2\n    grandchild"));
  EXPECT_EQ("(parent)\n((parent) (child1))\n((parent) (child2))\n(((parent) (child2)) (grandchild))", output);
}

TEST(NestedParserTests, TestComplexIndentation) {
  // Test complex indentation
  const std::string input = "root\n  level1a\n    level2a\n    level2b\n  level1b\n    level2c";
  const std::string expected =
      "(root)\n((root) (level1a))\n(((root) (level1a)) (level2a))\n(((root) (level1a)) (level2b))\n((root) "
      "(level1b))\n(((root) (level1b)) (level2c))";
  EXPECT_EQ(expected, format_alternate(parse_root(input)));
}

TEST(NestedParserTests, TestNestedLinks) {
  const std::string input = "(1: (2: (3: 3)))";
  const Link parsed = parse_root(input);

  // Validate regular formatting
  EXPECT_EQ("((1: (2: (3: 3))))", parsed.to_string());

  // Validate alternate formatting
  EXPECT_EQ(input, format_alternate(parsed));
}

// Tests moved from parser.rs

TEST(NestedParserTests, TestIndentationParser) {
  const std::vector<LinksGroup> result = Parser().parse_groups("parent\n  child1\n  child2");
  ASSERT_EQ(result.size(), 1u);
  EXPECT_EQ(result[0].element.id, std::nullopt);
  ASSERT_FALSE(result[0].element.values.empty());
  EXPECT_EQ(result[0].element.values[0].id, std::optional<std::string>("parent"));
  EXPECT_EQ(result[0].children.size(), 2u);
}

TEST(NestedParserTests, TestNestedIndentationParser) {
  const std::vector<LinksGroup> result = Parser().parse_groups("parent\n  child\n    grandchild");
  ASSERT_EQ(result.size(), 1u);
  ASSERT_EQ(result[0].children.size(), 1u);
  EXPECT_EQ(result[0].children[0].children.size(), 1u);
}

TEST(NestedParserTests, TestThreeLevelNestingRoundtrip) {
  const std::string input = "(1: (2: (3: 3)))";
  // Validate round-trip
  EXPECT_EQ(format_links(parse(input)), input);
}

TEST(NestedParserTests, TestDeepNestedStructureRoundtrip) {
  const std::string input = "(a: (b: (c: (d: d))))";
  // Validate round-trip
  EXPECT_EQ(format_links(parse(input)), input);
}

TEST(NestedParserTests, TestMultipleNestedLinksRoundtrip) {
  const std::string input = "(parent: (child1: value1) (child2: value2))";
  // Validate round-trip
  EXPECT_EQ(format_links(parse(input)), input);
}
