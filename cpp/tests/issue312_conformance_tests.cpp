// The documents from issue #312, which the JavaScript and Rust parsers read to
// the same links: line breaks, which whitespace is grammar whitespace, and
// single references at every depth.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

std::string render(const Link& node) {
  if (node.id && node.values.empty()) return "<" + *node.id + ">";
  std::string head = node.id ? "<" + *node.id + ">: " : "";
  std::string body;
  for (const Link& value : node.values) {
    if (!body.empty()) body += ' ';
    body += render(value);
  }
  return "(" + head + body + ")";
}

void expect_parses_as(const std::string& source, const std::string& expected) {
  std::vector<Link> links;
  try {
    links = parse(source);
  } catch (const ParseError& error) {
    ADD_FAILURE() << source << ": " << error.what();
    return;
  }
  std::string result;
  for (std::size_t index = 0; index < links.size(); ++index) {
    if (index > 0) result += '\n';
    result += render(links[index]);
  }
  EXPECT_EQ(result, expected) << source;
}

// U+0085, U+00A0, U+2028, U+3000 and U+FEFF in UTF-8: Unicode spaces that are
// not grammar whitespace.
const std::vector<std::string> unicode_spaces = {"\xC2\x85", "\xC2\xA0", "\xE2\x80\xA8", "\xE3\x80\x80",
                                                 "\xEF\xBB\xBF"};

}  // namespace

TEST(Issue312ConformanceTests, CrIsALineBreak) {
  expect_parses_as("a\rb", "(<a>)\n(<b>)");
  expect_parses_as("a\r\nb", "(<a>)\n(<b>)");
}

TEST(Issue312ConformanceTests, OnlyGrammarWhitespaceMakesAnEmptyDocument) {
  expect_parses_as(" \t\n\r", "");
  for (const std::string& character : unicode_spaces) {
    expect_parses_as(character, "(<" + character + ">)");
  }
}

TEST(Issue312ConformanceTests, UnicodeSpacesAreSubstantiveEvenQuoteBodies) {
  for (const std::string& character : unicode_spaces) {
    expect_parses_as("''" + character + "''", "(<" + character + ">)");
  }
}

TEST(Issue312ConformanceTests, TrailingIndentationIsDocumentWhitespace) {
  expect_parses_as("a\n  ", "(<a>)");
  expect_parses_as("a\n  \t", "(<a>)");
}

TEST(Issue312ConformanceTests, ASingleReferenceIsALinkValueAtEveryDepth) {
  expect_parses_as("1", "(<1>)");
  expect_parses_as("(1)", "(<1>)");
  expect_parses_as("((1))", "((<1>))");
}
