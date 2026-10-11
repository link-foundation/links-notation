// The shared corpus in parity/text-vectors.tsv, which every implementation
// parses, formats and streams to the same trees.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

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

TEST(SharedTextParityTests, SharedTextParity) {
  std::size_t count = 0;
  for (const std::string& line : lines(read_repository_file("parity/text-vectors.tsv"))) {
    if (line.empty() || line[0] == '#') continue;
    const std::vector<std::string> columns = split(line, '\t');
    ASSERT_EQ(columns.size(), 4u) << line;
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
