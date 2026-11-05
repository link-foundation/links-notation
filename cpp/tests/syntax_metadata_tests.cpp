// Syntax metadata on parsed links (issue #364): a link records how its ID was
// written (raw_id, and the quote derived from it), while equality and
// formatting ignore it. The AST mode turns it off.

#include <gtest/gtest.h>

#include <sstream>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

ParserOptions ast_mode() {
  ParserOptions options;
  options.syntax = false;
  return options;
}

}  // namespace

TEST(SyntaxMetadataTests, BareAndQuotedOneAreTheSameReferenceButKeepHowTheyWereWritten) {
  const std::vector<Link> links = Parser().parse("(t 1 '1')");
  ASSERT_EQ(links.size(), 1u);
  ASSERT_EQ(links[0].values.size(), 3u);
  const Link& bare = links[0].values[1];
  const Link& quoted = links[0].values[2];
  EXPECT_EQ(bare.id, "1");
  EXPECT_EQ(quoted.id, "1");
  EXPECT_EQ(bare.raw_id, "1");
  EXPECT_EQ(quoted.raw_id, "'1'");
  EXPECT_EQ(bare.quote(), std::nullopt);
  EXPECT_EQ(quoted.quote(), '\'');
  // Equality and formatting ignore the metadata.
  EXPECT_TRUE(bare.equals(quoted));
  EXPECT_EQ(bare, quoted);
  EXPECT_EQ(links[0].format(), "(t 1 1)");
}

TEST(SyntaxMetadataTests, RecordsEveryQuoteKindAndRunLength) {
  const std::vector<Link> links = Parser().parse("(\"a\": 'b' `c` \"\"d\"\" ~1{65} f)");
  ASSERT_EQ(links.size(), 1u);
  EXPECT_EQ(links[0].raw_id, "\"a\"");
  EXPECT_EQ(links[0].quote(), '"');
  const std::vector<std::pair<std::string, std::optional<char>>> expected = {
      {"'b'", '\''}, {"`c`", '`'}, {"\"\"d\"\"", '"'}, {"~1{65}", std::nullopt}, {"f", std::nullopt}};
  ASSERT_EQ(links[0].values.size(), expected.size());
  for (std::size_t index = 0; index < expected.size(); ++index) {
    EXPECT_EQ(links[0].values[index].raw_id, expected[index].first) << index;
    EXPECT_EQ(links[0].values[index].quote(), expected[index].second) << index;
  }
}

TEST(SyntaxMetadataTests, KeepsRawTextFromTheSourceNotFromCommentStripping) {
  const std::vector<Link> links = Parser().parse("(a 'b # c') # d");
  ASSERT_EQ(links.size(), 1u);
  EXPECT_EQ(links[0].values[1].raw_id, "'b # c'");
}

TEST(SyntaxMetadataTests, LeavesLinksWithoutWrittenIdsWithoutRawText) {
  const std::vector<Link> links = Parser().parse("(a b)");
  ASSERT_EQ(links.size(), 1u);
  EXPECT_EQ(links[0].raw_id, std::nullopt);
  EXPECT_EQ(links[0].quote(), std::nullopt);
  EXPECT_EQ(Link("x").raw_id, std::nullopt);
  EXPECT_EQ(Link("x").quote(), std::nullopt);
}

TEST(SyntaxMetadataTests, PathCombinationLinksHaveNoRawText) {
  const std::vector<Link> links = Parser().parse("a\n  b");
  ASSERT_EQ(links.size(), 2u);
  EXPECT_TRUE(links[1].from_path_combination);
  EXPECT_EQ(links[1].raw_id, std::nullopt);
  EXPECT_EQ(links[1].values[1].values[0].raw_id, "b");
}

TEST(SyntaxMetadataTests, DoesNotChangeEqualityFormattingOrPrinting) {
  const std::vector<Link> quoted = Parser().parse("('a': 'b')");
  const std::vector<Link> bare = Parser().parse("(a: b)");
  EXPECT_EQ(quoted, bare);
  EXPECT_EQ(format_links(quoted), format_links(bare));
  EXPECT_EQ(quoted[0].to_string(), bare[0].to_string());
  std::ostringstream quoted_out;
  std::ostringstream bare_out;
  quoted_out << quoted[0];
  bare_out << bare[0];
  EXPECT_EQ(quoted_out.str(), bare_out.str());
}

TEST(SyntaxMetadataTests, AstModeDropsTheMetadata) {
  const std::vector<Link> links = Parser(ast_mode()).parse("('a': 'b')");
  ASSERT_EQ(links.size(), 1u);
  EXPECT_EQ(links[0].raw_id, std::nullopt);
  EXPECT_EQ(links[0].values[0].raw_id, std::nullopt);
  EXPECT_EQ(links[0].values[0].quote(), std::nullopt);
  EXPECT_EQ(links[0], Parser().parse("('a': 'b')")[0]);
  EXPECT_TRUE(ParserOptions().syntax);
}

TEST(SyntaxMetadataTests, ParseGroupsAndStreamParserKeepTheMetadata) {
  const std::vector<LinksGroup> groups = Parser().parse_groups("'root':\n  \"child\"");
  ASSERT_EQ(groups.size(), 1u);
  EXPECT_EQ(groups[0].element.raw_id, "'root'");
  ASSERT_EQ(groups[0].children.size(), 1u);
  EXPECT_EQ(groups[0].children[0].element.raw_id, "\"child\"");

  StreamParser stream;
  stream.write("(a '");
  stream.write("b')");
  const std::vector<Link> links = stream.finish();
  ASSERT_EQ(links.size(), 1u);
  EXPECT_EQ(links[0].values[1].raw_id, "'b'");
  EXPECT_EQ(links[0].values[1].quote(), '\'');

  StreamParser ast_stream(ast_mode());
  ast_stream.write("(a 'b')");
  EXPECT_EQ(ast_stream.finish()[0].values[1].raw_id, std::nullopt);
}

TEST(SyntaxMetadataTests, RawIdCanBeSetOnLinksBuiltInCode) {
  Link link("a");
  link.raw_id = "\"a\"";
  EXPECT_EQ(link.quote(), '"');
  EXPECT_EQ(link, Link("a"));
  link.raw_id.reset();
  EXPECT_EQ(link.quote(), std::nullopt);
}

TEST(SyntaxMetadataTests, ReferenceQuoteReadsTheDelimiterOfOneCompleteReference) {
  EXPECT_EQ(reference_quote("'1'"), '\'');
  EXPECT_EQ(reference_quote("\"\"a b\"\""), '"');
  EXPECT_EQ(reference_quote("`x`"), '`');
  EXPECT_EQ(reference_quote("1"), std::nullopt);
  EXPECT_EQ(reference_quote("~1{31}"), std::nullopt);
  EXPECT_EQ(reference_quote("'unclosed"), std::nullopt);
  EXPECT_EQ(reference_quote("'a' b"), std::nullopt);
  EXPECT_EQ(reference_quote(""), std::nullopt);
}

TEST(SyntaxMetadataTests, AnUnclosedQuoteIsABareReference) {
  const std::vector<Link> links = Parser().parse("('x y)");
  ASSERT_EQ(links.size(), 1u);
  ASSERT_EQ(links[0].values.size(), 2u);
  EXPECT_EQ(links[0].values[0].id, "'x");
  EXPECT_EQ(links[0].values[0].raw_id, "'x");
  EXPECT_EQ(links[0].values[0].quote(), std::nullopt);
  EXPECT_EQ(links[0].values[1].raw_id, "y");
}
