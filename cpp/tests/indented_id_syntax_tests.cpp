// Indented id syntax: `id:` followed by indented values reads as `(id: values)`.

#include <gtest/gtest.h>

#include <utility>

#include "test_support.hpp"

using namespace links_notation;

namespace {

// How a link displays on its own: a reference bare, any other link whole.
std::string display(const Link& link) { return link.to_link_or_id_string(); }

bool contains(const std::string& text, const std::string& part) { return text.find(part) != std::string::npos; }

}  // namespace

TEST(IndentedIdSyntaxTests, BasicIndentedIdSyntaxTest) {
  const std::vector<Link> indented_result = parse("3:\n  papa\n  loves\n  mama");
  const std::vector<Link> inline_result = parse("(3: papa loves mama)");

  // Both should produce the same structure when formatted
  ASSERT_EQ(indented_result.size(), 1u);
  ASSERT_EQ(inline_result.size(), 1u);
  EXPECT_EQ(display(indented_result[0]), display(inline_result[0]));
}

TEST(IndentedIdSyntaxTests, IndentedIdSyntaxWithSingleValueTest) {
  const std::vector<Link> result = parse("greeting:\n  hello");
  ASSERT_EQ(result.size(), 1u);
  EXPECT_EQ(display(result[0]), "(greeting: hello)");
}

TEST(IndentedIdSyntaxTests, IndentedIdSyntaxWithMultipleValuesTest) {
  const std::vector<Link> result = parse("action:\n  run\n  fast\n  now");
  ASSERT_EQ(result.size(), 1u);
  EXPECT_EQ(display(result[0]), "(action: run fast now)");
}

TEST(IndentedIdSyntaxTests, IndentedIdSyntaxWithNumericIdTest) {
  const std::vector<Link> result = parse("42:\n  answer\n  to\n  everything");
  ASSERT_EQ(result.size(), 1u);
  EXPECT_EQ(display(result[0]), "(42: answer to everything)");
}

TEST(IndentedIdSyntaxTests, UnsupportedColonOnlySyntaxShouldFailTest) {
  EXPECT_THROW(parse(":\n  papa\n  loves\n  mama"), ParseError);
}

TEST(IndentedIdSyntaxTests, EmptyIndentedIdShouldWorkTest) {
  const std::vector<Link> result = parse("empty:");
  ASSERT_EQ(result.size(), 1u);
  // For empty ID, it shows just the ID as a reference
  EXPECT_EQ(display(result[0]), "empty");
}

TEST(IndentedIdSyntaxTests, IndentedIdSyntaxWithQuotedIdTest) {
  const std::vector<Link> result = parse("\"complex id\":\n  value1\n  value2");
  ASSERT_EQ(result.size(), 1u);
  const std::string formatted = display(result[0]);
  EXPECT_TRUE(contains(formatted, "complex id")) << formatted;
  EXPECT_TRUE(contains(formatted, "value1")) << formatted;
  EXPECT_TRUE(contains(formatted, "value2")) << formatted;
}

TEST(IndentedIdSyntaxTests, MultipleIndentedIdLinksTest) {
  const std::vector<Link> result = parse("first:\n  a\n  b\nsecond:\n  c\n  d");
  ASSERT_EQ(result.size(), 2u);
  EXPECT_TRUE(contains(display(result[0]), "first")) << display(result[0]);
  EXPECT_TRUE(contains(display(result[1]), "second")) << display(result[1]);
}

TEST(IndentedIdSyntaxTests, MixedIndentedAndRegularSyntaxTest) {
  const std::vector<Link> result = parse("first:\n  a\n  b\n(second: c d)\nthird value");
  ASSERT_EQ(result.size(), 3u);
  // First link should have 'first' with values
  EXPECT_TRUE(contains(display(result[0]), "first")) << display(result[0]);
}

TEST(IndentedIdSyntaxTests, IndentedIdWithDeeperNestingTest) {
  const std::vector<Link> result = parse("root:\n  child1\n  child2\n    grandchild");
  ASSERT_EQ(result.size(), 1u);
  EXPECT_EQ(display(result[0]), "(root: child1 (child2 grandchild))");
}

TEST(IndentedIdSyntaxTests, EquivalenceTestComprehensive) {
  const std::vector<std::pair<std::string, std::string>> test_cases = {
      {"test:\n  one", "(test: one)"},
      {"x:\n  a\n  b\n  c", "(x: a b c)"},
  };

  for (const auto& [indented, inline_source] : test_cases) {
    const std::vector<Link> indented_result = parse(indented);
    const std::vector<Link> inline_result = parse(inline_source);
    ASSERT_EQ(indented_result.size(), inline_result.size()) << indented;
    // Both should format to the same output
    EXPECT_EQ(display(indented_result[0]), display(inline_result[0])) << indented;
  }
}
