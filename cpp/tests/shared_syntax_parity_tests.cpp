// The shared corpus in parity/syntax-vectors.tsv: every implementation reads
// the same raw IDs, quotes and concrete syntax trees from it, and recovers
// every shared input exactly from its concrete syntax tree.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

std::string hex_or_null(const std::optional<std::string>& text) { return text ? to_hex(*text) : "~"; }

// Links as the vectors write them: (ID|RAW|QUOTE children...).
std::string tree(const std::vector<Link>& links) {
  std::string result;
  for (const Link& link : links) {
    if (!result.empty()) result += ' ';
    const std::optional<char> quote = link.quote();
    result += "(" + hex_or_null(link.id) + "|" + hex_or_null(link.raw_id) + "|" +
              (quote ? to_hex(std::string(1, *quote)) : "~");
    if (!link.values.empty()) result += " " + tree(link.values);
    result += ")";
  }
  return result;
}

// The cases of a vector file: its lines without the header, split into columns.
std::vector<std::vector<std::string>> cases(const std::string& path) {
  std::vector<std::vector<std::string>> result;
  for (const std::string& line : lines(read_repository_file(path))) {
    if (line.empty() || line[0] == '#') continue;
    result.push_back(split(line, '\t'));
  }
  return result;
}

// The document written one UTF-8 character at a time.
std::vector<Link> stream_by_character(const std::string& input) {
  StreamParser stream;
  for (std::size_t position = 0; position < input.size();) {
    std::size_t length = 1;
    while (position + length < input.size() && (static_cast<unsigned char>(input[position + length]) & 0xC0) == 0x80) {
      ++length;
    }
    stream.write(std::string_view(input).substr(position, length));
    position += length;
  }
  return stream.finish();
}

}  // namespace

TEST(SharedSyntaxParityTests, RawReferencesAndConcreteSyntaxTrees) {
  std::size_t count = 0;
  for (const std::vector<std::string>& columns : cases("parity/syntax-vectors.tsv")) {
    ASSERT_EQ(columns.size(), 4u) << columns[0];
    const std::string& id = columns[0];
    const std::string input = text_from_hex(columns[1]);
    const Parser parser;
    EXPECT_EQ(tree(parser.parse(input)), columns[2]) << id << " parse";
    const CstNode cst = parser.parse_cst(input);
    EXPECT_EQ(cst.to_s_expression(), text_from_hex(columns[3])) << id << " cst";
    EXPECT_EQ(cst.to_string(), input) << id << " text";
    EXPECT_EQ(tree(stream_by_character(input)), columns[2]) << id << " stream";
    ++count;
  }
  EXPECT_GT(count, 0u) << "empty syntax fixture corpus";
}

TEST(SharedSyntaxParityTests, EverySharedInputIsRecoveredFromItsConcreteSyntaxTree) {
  std::size_t count = 0;
  for (const std::string path : {"parity/text-vectors.tsv", "parity/syntax-vectors.tsv"}) {
    for (const std::vector<std::string>& columns : cases(path)) {
      ASSERT_GE(columns.size(), 2u) << path;
      const std::string input = text_from_hex(columns[1]);
      const CstNode cst = Parser().parse_cst(input);
      EXPECT_EQ(cst.to_string(), input) << columns[0];
      std::string joined;
      for (const CstNode& token : cst.tokens()) joined += token.text();
      EXPECT_EQ(joined, input) << columns[0];
      ++count;
    }
  }
  EXPECT_GT(count, 0u) << "empty fixture corpus";
}
