// The concrete syntax tree (issue #364): every byte of a document belongs to
// exactly one token, so the document is recovered exactly from its tree.

#include <gtest/gtest.h>

#include <sstream>
#include <tuple>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

std::string round_trip(const std::string& input, ParserOptions options = {}) {
  return Parser(options).parse_cst(input).to_string();
}

std::vector<CstKind> kinds(const std::vector<CstNode>& nodes) {
  std::vector<CstKind> result;
  for (const CstNode& node : nodes) result.push_back(node.kind);
  return result;
}

}  // namespace

TEST(CstTests, IsTheLosslessViewOfADocument) {
  const std::string input = "(t 1 '1')";
  const CstNode cst = Parser().parse_cst(input);
  EXPECT_EQ(cst.kind, CstKind::document);
  EXPECT_FALSE(cst.is_token());
  EXPECT_EQ(cst.to_string(), input);
  EXPECT_EQ(cst.text(), input);
  std::ostringstream out;
  out << cst;
  EXPECT_EQ(out.str(), input);
  EXPECT_EQ(cst.to_s_expression(),
            "(document (line (group open_paren:\"(\" (line reference:\"t\" whitespace:\" \" reference:\"1\" "
            "whitespace:\" \" reference:\"'1'\") close_paren:\")\")))");
}

TEST(CstTests, ReferenceTokensCarryTheirValueAndDelimiter) {
  std::vector<CstNode> references;
  for (const CstNode& token : Parser().parse_cst("(a \"b c\" ~1{64} ''e''''f'')").tokens()) {
    EXPECT_TRUE(token.is_token());
    EXPECT_TRUE(token.children.empty());
    if (token.kind == CstKind::reference) references.push_back(token);
  }
  ASSERT_EQ(references.size(), 4u);
  const std::vector<std::tuple<std::string, std::string, std::optional<char>>> expected = {
      {"a", "a", std::nullopt}, {"\"b c\"", "b c", '"'}, {"~1{64}", "d", std::nullopt}, {"''e''''f''", "e''f", '\''}};
  for (std::size_t index = 0; index < expected.size(); ++index) {
    EXPECT_EQ(references[index].text(), std::get<0>(expected[index])) << index;
    EXPECT_EQ(references[index].value, std::get<1>(expected[index])) << index;
    EXPECT_EQ(references[index].quote, std::get<2>(expected[index])) << index;
  }
}

TEST(CstTests, OnlyReferenceTokensHaveAValue) {
  for (const CstNode& token : Parser().parse_cst("a: (b) # c\n").tokens()) {
    if (token.kind != CstKind::reference) {
      EXPECT_EQ(token.value, std::nullopt) << token.kind;
      EXPECT_EQ(token.quote, std::nullopt) << token.kind;
    }
  }
}

TEST(CstTests, RecoversEveryDocumentExactly) {
  const std::vector<std::pair<std::string, std::string>> documents = {
      {"empty", ""},
      {"only whitespace", " \t "},
      {"blank lines", "\n\n"},
      {"CRLF and CR", "a\r\nb\rc\r\n"},
      {"tabs and trailing spaces", "a\t b  \n"},
      {"comments everywhere", "# head\na: b # tail\n  # inner\n  c\n# end"},
      {"multiline quotes", "(note: \"one\n  two\r\nthree\")"},
      {"nested groups over lines", "(a (b\n  (c d)\n) e)\n"},
      {"indentation", "root:\n  child:\n    leaf\n  tail"},
      {"literals", "(~1{} ~1{e6a0b9})"},
      {"comment marks inside quotes", "('#a' \"b # c\" `#`)"},
      {"unicode", "(\xE6\xA0\xB9: caf\xC3\xA9 \xF0\x9F\x99\x82)\n"},
  };
  for (const auto& [name, input] : documents) {
    EXPECT_EQ(round_trip(input), input) << name;
  }
}

TEST(CstTests, AnEmptyDocumentHasNoLines) { EXPECT_EQ(Parser().parse_cst("").to_s_expression(), "(document)"); }

TEST(CstTests, WithoutCommentSupportHashIsPartOfReferences) {
  const std::string input = "a #b";
  ParserOptions options;
  options.comments = false;
  const CstNode cst = Parser(options).parse_cst(input);
  EXPECT_EQ(cst.to_string(), input);
  EXPECT_EQ(kinds(cst.tokens()), (std::vector<CstKind>{CstKind::reference, CstKind::whitespace, CstKind::reference}));
  EXPECT_EQ(kinds(Parser().parse_cst(input).tokens()),
            (std::vector<CstKind>{CstKind::reference, CstKind::whitespace, CstKind::comment}));
}

TEST(CstTests, AGroupBelongsToTheLineItOpensOn) {
  const CstNode cst = Parser().parse_cst("a (b\nc)\nd");
  ASSERT_EQ(cst.children.size(), 2u);
  EXPECT_EQ(cst.children[0].to_string(), "a (b\nc)\n");
  EXPECT_EQ(cst.children[1].to_string(), "d");
  const CstNode& group = cst.children[0].children[2];
  EXPECT_EQ(group.kind, CstKind::group);
  EXPECT_EQ(kinds(group.children),
            (std::vector<CstKind>{CstKind::open_paren, CstKind::line, CstKind::line, CstKind::close_paren}));
}

TEST(CstTests, AnUnclosedQuoteIsABareReference) {
  EXPECT_EQ(Parser().parse_cst("('x y)").to_s_expression(),
            "(document (line (group open_paren:\"(\" (line reference:\"'x\" whitespace:\" \" reference:\"y\") "
            "close_paren:\")\")))");
}

TEST(CstTests, EscapesTheSExpressionText) {
  EXPECT_EQ(Parser().parse_cst("'a\\\"b'\t\r\n").to_s_expression(),
            "(document (line reference:\"'a\\\\\\\"b'\" whitespace:\"\\t\" newline:\"\\r\\n\"))");
}

TEST(CstTests, KindsAreWrittenByName) {
  EXPECT_EQ(to_string(CstKind::document), "document");
  EXPECT_EQ(to_string(CstKind::open_paren), "open_paren");
  EXPECT_EQ(to_string(CstKind::close_paren), "close_paren");
  std::ostringstream out;
  out << CstKind::reference;
  EXPECT_EQ(out.str(), "reference");
}

TEST(CstTests, RejectsWhatParseRejects) {
  EXPECT_THROW(Parser().parse_cst("(a"), ParseError);
  EXPECT_THROW(Parser().parse_cst("a)"), ParseError);
  ParserOptions shallow;
  shallow.max_depth = 1;
  EXPECT_THROW(Parser(shallow).parse_cst("((a))"), ParseError);
  ParserOptions small;
  small.max_input_size = 2;
  EXPECT_THROW(Parser(small).parse_cst("abc"), std::length_error);
}
