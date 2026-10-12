// Multiline documents: several links, one per line, read and written back.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;

namespace {

bool needs_quotes(const std::string& value) { return value.find_first_of(" :()") != std::string::npos; }

// Writes a link the way the C# and JavaScript versions do: references quoted
// when they hold a space, a colon or a parenthesis.
std::string format_lino(const Link& lino, bool less_parentheses) {
  if (lino.id && lino.values.empty()) {
    return needs_quotes(*lino.id) ? "'" + *lino.id + "'" : *lino.id;
  }
  if (lino.values.empty()) return "()";

  std::string formatted_values;
  for (std::size_t index = 0; index < lino.values.size(); ++index) {
    if (index > 0) formatted_values += ' ';
    formatted_values += format_lino(lino.values[index], false);
  }

  if (lino.id) {
    const std::string escaped_id = format_lino(Link(*lino.id), false);
    // Mirror JS/C#: if less_parentheses and id doesn't need parentheses, drop outer parens
    if (less_parentheses && !needs_quotes(escaped_id)) return escaped_id + ": " + formatted_values;
    return "(" + escaped_id + ": " + formatted_values + ")";
  }
  // Values-only link: in less_parentheses mode always drop outer parentheses
  return less_parentheses ? formatted_values : "(" + formatted_values + ")";
}

// Writes each value of the document's root link on its own line.
std::string format_lino_multiline(const Link& lino, bool less_parentheses) {
  if (lino.values.empty()) return format_lino(lino, less_parentheses);
  std::string result;
  for (std::size_t index = 0; index < lino.values.size(); ++index) {
    if (index > 0) result += '\n';
    result += format_lino(lino.values[index], less_parentheses);
  }
  return result;
}

// The whole document as one link without an id, holding every top-level link.
Link parse_root(const std::string& source) { return Link(std::nullopt, parse(source)); }

std::string format_links_multiline(const Link& lino) { return format_lino_multiline(lino, false); }

std::string format_links_multiline_with_less_parentheses(const Link& lino) { return format_lino_multiline(lino, true); }

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

}  // namespace

TEST(MultilineParserTests, TwoLinksTest) {
  const std::string source = "(first: x y)\n(second: a b)";
  EXPECT_EQ(source, format_links_multiline(parse_root(source)));
}

TEST(MultilineParserTests, ParseAndStringifyTest) {
  const std::string source = "(papa (lovesMama: loves mama))\n(son lovesMama)\n(daughter lovesMama)\n(all (love mama))";
  EXPECT_EQ(source, format_links_multiline(parse_root(source)));
}

TEST(MultilineParserTests, ParseAndStringifyTest2) {
  const std::string source = "father (lovesMom: loves mom)\nson lovesMom\ndaughter lovesMom\nall (love mom)";
  EXPECT_EQ(source, format_links_multiline_with_less_parentheses(parse_root(source)));
}

TEST(MultilineParserTests, ParseAndStringifyWithLessParenthesesTest) {
  const std::string source =
      "lovesMama: loves mama\npapa lovesMama\nson lovesMama\ndaughter lovesMama\nall (love mama)";
  EXPECT_EQ(source, format_links_multiline_with_less_parentheses(parse_root(source)));
}

TEST(MultilineParserTests, DuplicateIdentifiersTest) {
  const std::string source = "(a: a b)\n(a: b c)";
  EXPECT_EQ(source, format_links_multiline(parse_root(source)));
}

TEST(MultilineParserTests, TestComplexStructure) {
  const std::string input =
      "(Type: Type Type)\n  Number\n  String\n  Array\n  Value\n    (property: name type)\n    (method: name params "
      "return)";
  EXPECT_NO_THROW(parse(input));
}

TEST(MultilineParserTests, TestMixedFormats) {
  // Mix of single-line and multi-line formats
  const std::string input = "id1: value1\n(id2: value2 value3)\nsimple_ref\n(complex: \n  nested1\n  nested2\n)";
  EXPECT_NO_THROW(parse(input));
}

TEST(MultilineParserTests, TestMultipleTopLevelElements) {
  // Test multiple top-level elements
  EXPECT_NO_THROW(parse("(elem1: val1)\n(elem2: val2)"));
}

TEST(MultilineParserTests, TestMultilineWithId) {
  // Test multi-line link with id
  EXPECT_NO_THROW(parse("(id: value1 value2)"));
}

TEST(MultilineParserTests, TestMultilineSimpleLinks) {
  const std::string input = "(1: 1 1)\n(2: 2 2)";
  const Link parsed = parse_root(input);

  // Validate regular formatting
  EXPECT_EQ("((1: 1 1) (2: 2 2))", parsed.to_string());

  // Validate alternate formatting
  EXPECT_EQ(input, format_alternate(parsed));
}

TEST(MultilineParserTests, TestIndentedChildren) {
  const Link parsed = parse_root("parent\n  child1\n  child2");

  // The parsed structure should have parent with children
  EXPECT_FALSE(parsed.values.empty());
}
