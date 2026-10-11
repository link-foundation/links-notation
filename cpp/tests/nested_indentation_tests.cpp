// Indentation inside parentheses
// (https://github.com/link-foundation/links-notation/issues/282): a
// parenthesized group opens a nested context that starts fresh at indentation
// level zero and follows exactly the root's rules.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;

namespace {

std::string format_source(const std::string& source) { return format_links(parse(source)); }

void expect_format(const std::string& source, const std::string& expected) {
  EXPECT_EQ(expected, format_source(source)) << "Parsing " << source;
}

}  // namespace

TEST(NestedIndentationTests, ParenthesesReproduceRootIndentation) {
  expect_format("a\n  b\nc\n  d", "(a)\n((a) (b))\n(c)\n((c) (d))");

  // The same lines inside parentheses keep the same structure, nested under
  // the link the group belongs to.
  expect_format("array (\n  a\n    b\n  c\n    d\n)", "(array ((a) ((a) (b)) (c) ((c) (d))))");
}

TEST(NestedIndentationTests, ParenthesesKeepRecordBoundaries) {
  const std::string source = "value (\n  id \"1\"\n  label \"one\"\n)";
  expect_format(source, "(value ((id 1) (label one)))");

  const std::vector<Link> links = parse(source);
  ASSERT_EQ(1u, links.size());
  ASSERT_FALSE(links[0].values.empty()) << "Expected a link, got " << links[0];

  const std::vector<Link>& values = links[0].values;
  ASSERT_EQ(2u, values.size());

  ASSERT_FALSE(values[1].values.empty()) << "Expected the group to be a link, got " << values[1];
  EXPECT_FALSE(values[1].id.has_value()) << "Expected the group to be anonymous";
  const std::vector<Link>& records = values[1].values;
  ASSERT_EQ(2u, records.size()) << "Expected 2 records in the group";
  EXPECT_EQ("(id 1)", records[0].to_string());
  EXPECT_EQ("(label one)", records[1].to_string());
}

TEST(NestedIndentationTests, ParenthesesKeepSeveralRecordsSeparate) {
  expect_format("value (\n  (id \"1\" label \"one\")\n  (id \"2\" label \"two\")\n)",
                "(value ((id 1 label one) (id 2 label two)))");
}

TEST(NestedIndentationTests, ParenthesesNestDeeply) {
  expect_format("outer (\n  inner (\n    x 1\n    y 2\n  )\n  z 3\n)", "(outer ((inner ((x 1) (y 2))) (z 3)))");
}

TEST(NestedIndentationTests, SingleLineParenthesesAreUnchanged) {
  expect_format("(a b c)", "(a b c)");
  expect_format("(1: 2 3)", "(1: 2 3)");
  expect_format("(a: b c)", "(a: b c)");
  expect_format("((a b))", "((a b))");
  expect_format("()", "()");
}

TEST(NestedIndentationTests, ParenthesesWithIndentedIdSyntax) {
  expect_format("(\n  a:\n    b\n    c\n)", "(a: b c)");
}

TEST(NestedIndentationTests, BlankLinesInsideParenthesesAreSkipped) {
  expect_format("(\n  a\n\n  b\n)", "((a) (b))");
}

TEST(NestedIndentationTests, EmployeeRecordsKeepTheirFields) {
  const std::string source =
      "empInfo\n  employees:\n    (\n      name (James Kirk)\n      age 40\n    )\n    (\n      name (Jean-Luc "
      "Picard)\n      age 45\n    )";
  const std::string expected =
      "(empInfo)\n((empInfo) (employees: ((name (James Kirk)) (age 40)) ((name (Jean-Luc Picard)) (age 45))))";
  expect_format(source, expected);
}
