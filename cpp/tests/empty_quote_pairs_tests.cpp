// Issue #443: an empty quoted value at the end of a line must not swallow the
// lines after it.
//
// An even run of quotes (`""`, `''`, `""""`, ...) followed by whitespace up to
// the end of its line is the empty reference, however later lines continue. A
// run followed directly by text (`""x`) still opens a reference that may reach
// across lines, so multiline references keep working.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

std::string parses(const std::string& document) { return tree_of(parse(document)); }

// The characters of ASCII text, each as its own chunk.
std::vector<std::string> characters(const std::string& text) {
  std::vector<std::string> result;
  for (const char character : text) result.emplace_back(1, character);
  return result;
}

}  // namespace

TEST(EmptyQuotePairsTests, EmptyValuesOnConsecutiveIndentedLinesStayOnTheirLines) {
  const std::string expected = R"([["root",[null,["a"],[""]],[null,["b"],[""]]]])";
  EXPECT_EQ(parses("root:\n  a \"\"\n  b \"\"\n"), expected);
  EXPECT_EQ(parses("root:\n  a ''\n  b ''\n"), expected);
  EXPECT_EQ(parses("root:\n  a \"\"\n  b \"\""), expected);
}

TEST(EmptyQuotePairsTests, AnEmptyValueBeforeAQuotedValueKeepsBothValues) {
  const std::vector<Link> links = parse("root:\n  a \"\"\n  b \"x y\"\n");
  ASSERT_EQ(links.size(), 1u);
  EXPECT_EQ(tree_of(links[0].values), R"([[null,["a"],[""]],[null,["b"],["x y"]]])");
}

TEST(EmptyQuotePairsTests, AnEmptyValueAtTheEndOfATopLevelLineStaysOnItsLine) {
  EXPECT_EQ(format_links(parse("a \"\"\nb \"\"\n")), "(a ~1{})\n(b ~1{})");
  EXPECT_EQ(format_links(parse("a \"\" \nb \"\"\n")), "(a ~1{})\n(b ~1{})");
  EXPECT_EQ(format_links(parse("a \"\"")), "(a ~1{})");
}

TEST(EmptyQuotePairsTests, ALongerEvenRunAtTheEndOfALineIsEmptyToo) {
  EXPECT_EQ(format_links(parse("a \"\"\"\"\nb \"\"\"\"\n")), "(a ~1{})\n(b ~1{})");
}

TEST(EmptyQuotePairsTests, DoubledQuotesThatNothingClosesAreTheEmptyReference) {
  EXPECT_EQ(parses("(a: \"\"\"\")"), R"([["a",[""]]])");
  EXPECT_EQ(parses("(a: \"\"\"\"\"\")"), R"([["a",[""]]])");
}

TEST(EmptyQuotePairsTests, ASingleQuoteCharacterIsWrittenBetweenTheOtherQuotes) {
  EXPECT_EQ(parses(R"((a: '"'))"), R"([["a",["\""]]])");
  EXPECT_EQ(parses(R"((a: "'"))"), R"([["a",["'"]]])");
  EXPECT_EQ(parses(R"((a: `"`))"), R"([["a",["\""]]])");
}

TEST(EmptyQuotePairsTests, AnEvenRunFollowedByTextStillOpensAMultilineReference) {
  EXPECT_EQ(parses("a \"\"x\ny\"\"\n"), R"([[null,["a"],["x\u000ay"]]])");
}

TEST(EmptyQuotePairsTests, AnEvenRunStillHoldsWhatTheSameLineCloses) {
  EXPECT_EQ(parses(R"((x "" " ""))"), R"([[null,["x"],[" \" "]]])");
  EXPECT_EQ(parses(R"(a "" b "")"), R"([[null,["a"],[" b "]]])");
}

TEST(EmptyQuotePairsTests, TheStreamEmitsALineThatEndsWithAnEmptyValueAtOnce) {
  StreamParser stream;
  std::vector<Link> emitted;
  for (const std::string& character : characters("a \"\"\nb \"\"\nc\n")) {
    for (Link& link : stream.write(character)) emitted.push_back(std::move(link));
  }
  EXPECT_EQ(format_links(emitted), "(a ~1{})\n(b ~1{})");
  EXPECT_EQ(format_links(stream.finish()), "(a ~1{})\n(b ~1{})\n(c)");
}
