// The shared corpus in parity/text-vectors.tsv, which every implementation
// parses, formats and streams to the same trees.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

Link unindent(const LinksGroup& group) {
  if (group.children.empty()) return group.element;
  std::vector<Link> values = group.element.values;
  for (const LinksGroup& child : group.children) values.push_back(unindent(child));
  return Link(group.element.id, std::move(values));
}

std::string tree(const std::vector<Link>& links) {
  std::string result;
  for (const Link& link : links) {
    if (!result.empty()) result += ' ';
    const std::string reference = link.id ? to_hex(*link.id) : "~";
    if (link.values.empty()) {
      result += "(" + reference + ")";
    } else {
      result += "(" + reference + " " + tree(link.values) + ")";
    }
  }
  return result;
}

}  // namespace

TEST(SharedTextParityTests, IndentedIdGroupsAgreeWithParse) {
  std::size_t count = 0;
  for (const std::string& line : lines(read_repository_file("parity/text-vectors.tsv"))) {
    if (line.empty() || line[0] == '#') continue;
    const std::vector<std::string> columns = split(line, '\t');
    ASSERT_EQ(columns.size(), 5u);
    if (columns[0].find("indented-id-") != 0) continue;
    const std::string input = text_from_hex(columns[1]);
    const auto groups = Parser().parse_groups(input);
    ASSERT_EQ(groups.size(), 1u) << columns[0];
    EXPECT_EQ(groups[0].element.id, "x") << columns[0];
    EXPECT_TRUE(groups[0].element.values.empty()) << columns[0];
    EXPECT_EQ(std::vector<Link>{unindent(groups[0])}, parse(input)) << columns[0];
    ++count;
  }
  EXPECT_EQ(count, 6u);
  for (const std::string input : {"id:", "(id:)"}) {
    const auto groups = Parser().parse_groups(input);
    ASSERT_EQ(groups.size(), 1u);
    EXPECT_EQ(groups[0].element, Link("id"));
  }
  const auto ordinary = Parser().parse_groups("x: kind\n  a\n  b");
  ASSERT_EQ(ordinary.size(), 1u);
  ASSERT_EQ(ordinary[0].children.size(), 2u);
  EXPECT_EQ(ordinary[0].children[0].element, Link(std::nullopt, {Link("a")}));
  EXPECT_EQ(ordinary[0].children[1].element, Link(std::nullopt, {Link("b")}));
  ParserOptions ast;
  ast.syntax = false;
  const auto groups = Parser(ast).parse_groups("x:\n  'a'");
  ASSERT_EQ(groups.size(), 1u);
  ASSERT_EQ(groups[0].children.size(), 1u);
  EXPECT_EQ(groups[0].children[0].element.id, "a");
  EXPECT_FALSE(groups[0].children[0].element.raw_id);
}

TEST(SharedTextParityTests, SharedTextParity) {
  std::size_t count = 0;
  for (const std::string& line : lines(read_repository_file("parity/text-vectors.tsv"))) {
    if (line.empty() || line[0] == '#') continue;
    const std::vector<std::string> columns = split(line, '\t');
    ASSERT_EQ(columns.size(), 5u) << line;
    const std::string input = text_from_hex(columns[1]);
    const std::string formatted = text_from_hex(columns[3]);
    const std::vector<Link> parsed = parse(input);
    EXPECT_EQ(tree(parsed), columns[2]) << columns[0] << " parse";
    EXPECT_EQ(format_links(parsed), formatted) << columns[0] << " format";
    EXPECT_EQ(tree(parse(formatted)), columns[2]) << columns[0] << " reparse";

    StreamParser stream;
    for (std::size_t position = 0; position < input.size();) {
      std::size_t length = 1;
      while (position + length < input.size() &&
             (static_cast<unsigned char>(input[position + length]) & 0xC0) == 0x80) {
        ++length;
      }
      stream.write(std::string_view(input).substr(position, length));
      position += length;
    }
    EXPECT_EQ(tree(stream.finish()), columns[2]) << columns[0] << " stream";
    ++count;
  }
  EXPECT_GT(count, 0u) << "empty fixture corpus";
}

TEST(SharedTextParityTests, SharedLessParenthesesRoundTrip) {
  FormatConfig config;
  config.less_parentheses = true;
  std::size_t count = 0;
  for (const std::string& line : lines(read_repository_file("parity/text-vectors.tsv"))) {
    if (line.empty() || line[0] == '#') continue;
    const std::vector<std::string> columns = split(line, '\t');
    ASSERT_EQ(columns.size(), 5u) << line;
    const std::string less_parentheses = text_from_hex(columns[4]);
    const std::vector<Link> parsed = parse(text_from_hex(columns[1]));
    EXPECT_EQ(format_links(parsed, true), less_parentheses) << columns[0] << " boolean";
    EXPECT_EQ(format_links(parsed, config), less_parentheses) << columns[0] << " config";
    EXPECT_EQ(tree(parse(less_parentheses)), columns[2]) << columns[0] << " reparse";
    ++count;
  }
  EXPECT_GT(count, 0u) << "empty fixture corpus";
}

TEST(SharedTextParityTests, SharedNestedFormat) {
  std::size_t count = 0;
  for (const std::string& line : lines(read_repository_file("parity/nested-vectors.tsv"))) {
    if (line.empty() || line[0] == '#') continue;
    const auto columns = split(line, '\t');
    ASSERT_EQ(columns.size(), 3u);
    const auto parsed = parse(text_from_hex(columns[1]));
    const auto text = format_nested(parsed);
    EXPECT_EQ(text, text_from_hex(columns[2])) << columns[0];
    std::vector<Link> folded;
    for (const auto& group : Parser().parse_groups(text)) folded.push_back(unindent(group));
    EXPECT_EQ(folded, parsed) << columns[0];
    ++count;
  }
  EXPECT_GT(count, 0u);
}

TEST(SharedTextParityTests, AnonymousThresholdRoundTrip) {
  for (const std::string input : {"a b c", "((b c))", "(a (b c))"}) {
    const auto links = parse(input);
    FormatConfig refs;
    refs.less_parentheses = true;
    refs.max_inline_refs = 0;
    refs.prefer_inline = false;
    FormatConfig length = refs;
    length.max_inline_refs = std::nullopt;
    length.indent_long_lines = true;
    length.max_line_length = 1;
    for (const auto& config : {refs, length}) EXPECT_EQ(parse(format_links(links, config)), links) << input;
  }
}
