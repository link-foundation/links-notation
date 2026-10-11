// Quoted references that span several lines, as values and as ids.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

/// A link with no id.
Link anonymous(std::vector<Link> values) { return Link(std::nullopt, std::move(values)); }

}  // namespace

TEST(MultilineQuotedStringTests, TestMultilineDoubleQuotedReference) {
  const std::string input = R"((
  "long
string literal representing
the reference"

  'another
long string literal
as another reference'
))";
  EXPECT_EQ(parse(input), std::vector<Link>({anonymous({
                              anonymous({Link("long\nstring literal representing\nthe reference")}),
                              anonymous({Link("another\nlong string literal\nas another reference")}),
                          })}));
}

TEST(MultilineQuotedStringTests, TestSimpleMultilineDoubleQuoted) {
  const std::string input = R"(("line1
line2"))";
  EXPECT_EQ(parse(input), std::vector<Link>({anonymous({Link("line1\nline2")})}));
}

TEST(MultilineQuotedStringTests, TestSimpleMultilineSingleQuoted) {
  const std::string input = R"(('line1
line2'))";
  EXPECT_EQ(parse(input), std::vector<Link>({anonymous({Link("line1\nline2")})}));
}

TEST(MultilineQuotedStringTests, TestMultilineQuotedAsId) {
  const std::string input = R"(("multi
line
id": value1 value2))";
  // The document as one link with no id whose values are its links.
  const Link result(std::nullopt, parse(input));
  EXPECT_FALSE(result.id.has_value());
  ASSERT_EQ(result.values.size(), 1u);
  const Link& first = result.values[0];
  ASSERT_FALSE(first.values.empty()) << "Expected first value to be a Link";
  ASSERT_TRUE(first.id.has_value());
  EXPECT_EQ(*first.id, "multi\nline\nid");
  EXPECT_EQ(first.values.size(), 2u);
}
