// Mixed indentation modes: indented sets, `id:` sequences and parenthesized
// records combined in one document.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;

namespace {

// How a link displays on its own: a reference bare, any other link whole.
std::string display(const Link& link) { return link.to_link_or_id_string(); }

// Every link displayed on its own line.
std::string display_lines(const std::vector<Link>& links) {
  std::string result;
  for (std::size_t index = 0; index < links.size(); ++index) {
    if (index > 0) result += '\n';
    result += display(links[index]);
  }
  return result;
}

bool contains(const std::string& text, const std::string& part) { return text.find(part) != std::string::npos; }

// Whether the name appears whole, or at least both of its words do.
bool contains_name(const std::string& text, const std::string& first, const std::string& last) {
  return contains(text, first + " " + last) || (contains(text, first) && contains(text, last));
}

const char* const hero_version1 =
    "empInfo\n  employees:\n    (\n      name (James Kirk)\n      age 40\n    )\n    (\n      name (Jean-Luc "
    "Picard)\n      age 45\n    )\n    (\n      name (Wesley Crusher)\n      age 27\n    )";

const char* const hero_version2 =
    "empInfo\n  (\n    employees:\n      (\n        name (James Kirk)\n        age 40\n      )\n      (\n        "
    "name (Jean-Luc Picard)\n        age 45\n      )\n      (\n        name (Wesley Crusher)\n        age 27\n      "
    ")\n  )";

}  // namespace

TEST(MixedIndentationModesTests, HeroExampleMixedModesTest) {
  const std::vector<Link> result = parse(hero_version1);
  ASSERT_FALSE(result.empty());
  const std::string formatted = display_lines(result);
  EXPECT_TRUE(contains(formatted, "empInfo")) << formatted;
  EXPECT_TRUE(contains(formatted, "employees:")) << formatted;
  EXPECT_TRUE(contains_name(formatted, "James", "Kirk")) << formatted;
  EXPECT_TRUE(contains_name(formatted, "Jean-Luc", "Picard")) << formatted;
  EXPECT_TRUE(contains_name(formatted, "Wesley", "Crusher")) << formatted;
}

TEST(MixedIndentationModesTests, HeroExampleAlternativeFormatTest) {
  const std::vector<Link> result = parse(hero_version2);
  ASSERT_FALSE(result.empty());
  const std::string formatted = display_lines(result);
  EXPECT_TRUE(contains(formatted, "empInfo")) << formatted;
  EXPECT_TRUE(contains(formatted, "employees:")) << formatted;
  EXPECT_TRUE(contains_name(formatted, "James", "Kirk")) << formatted;
  EXPECT_TRUE(contains_name(formatted, "Jean-Luc", "Picard")) << formatted;
  EXPECT_TRUE(contains_name(formatted, "Wesley", "Crusher")) << formatted;
}

TEST(MixedIndentationModesTests, HeroExampleEquivalenceTest) {
  EXPECT_EQ(display_lines(parse(hero_version1)), display_lines(parse(hero_version2)));
}

TEST(MixedIndentationModesTests, SetContextWithoutColonTest) {
  const std::vector<Link> result = parse("empInfo\n  employees");
  ASSERT_FALSE(result.empty());
  const std::string formatted = display_lines(result);
  EXPECT_TRUE(contains(formatted, "empInfo")) << formatted;
  EXPECT_TRUE(contains(formatted, "employees")) << formatted;
}

TEST(MixedIndentationModesTests, SequenceContextWithColonTest) {
  const std::vector<Link> result = parse("employees:\n  James Kirk\n  Jean-Luc Picard\n  Wesley Crusher");
  ASSERT_FALSE(result.empty());
  EXPECT_EQ(result.size(), 1u);
  const std::string formatted = display_lines(result);
  EXPECT_TRUE(contains(formatted, "employees:")) << formatted;
  EXPECT_TRUE(contains_name(formatted, "James", "Kirk")) << formatted;
  EXPECT_TRUE(contains_name(formatted, "Jean-Luc", "Picard")) << formatted;
  EXPECT_TRUE(contains_name(formatted, "Wesley", "Crusher")) << formatted;
}

TEST(MixedIndentationModesTests, SequenceContextWithComplexValuesTest) {
  const std::vector<Link> result = parse(
      "employees:\n  (\n    name (James Kirk)\n    age 40\n  )\n  (\n    name (Jean-Luc Picard)\n    age 45\n  )");
  ASSERT_FALSE(result.empty());
  EXPECT_EQ(result.size(), 1u);
  const std::string formatted = display_lines(result);
  EXPECT_TRUE(contains(formatted, "employees:")) << formatted;
  EXPECT_TRUE(contains_name(formatted, "James", "Kirk")) << formatted;
  EXPECT_TRUE(contains_name(formatted, "Jean-Luc", "Picard")) << formatted;
}

TEST(MixedIndentationModesTests, NestedSetAndSequenceContextsTest) {
  const std::vector<Link> result =
      parse("company\n  departments:\n    engineering\n    sales\n  employees:\n    (name John)\n    (name Jane)");
  ASSERT_FALSE(result.empty());
  const std::string formatted = display_lines(result);
  EXPECT_TRUE(contains(formatted, "company")) << formatted;
  EXPECT_TRUE(contains(formatted, "departments:")) << formatted;
  EXPECT_TRUE(contains(formatted, "employees:")) << formatted;
}

TEST(MixedIndentationModesTests, DeeplyNestedMixedModesTest) {
  const std::vector<Link> result =
      parse("root\n  level1\n    level2:\n      value1\n      value2\n    level2b\n      level3");
  ASSERT_FALSE(result.empty());
  const std::string formatted = display_lines(result);
  EXPECT_TRUE(contains(formatted, "root")) << formatted;
  EXPECT_TRUE(contains(formatted, "level2:")) << formatted;
}
