// The empty reference (issue #288): a bare delimiter pair, for each of the
// three delimiters, read and written the same way by every implementation.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

/// Renders a parsed link unambiguously: every reference is wrapped in angle
/// brackets, so an empty one shows as `<>`.
std::string render(const Link& node) {
  if (node.values.empty() && node.id) return "<" + *node.id + ">";
  std::string result = "(";
  if (node.id) result += "<" + *node.id + ">: ";
  for (std::size_t index = 0; index < node.values.size(); ++index) {
    if (index > 0) result += ' ';
    result += render(node.values[index]);
  }
  return result + ")";
}

std::string rendered(const std::string& input) {
  std::string result;
  for (const Link& link : parse(input)) {
    if (!result.empty()) result += '\n';
    result += render(link);
  }
  return result;
}

}  // namespace

TEST(EmptyReferenceTests, BareDelimiterPairIsTheEmptyReference) {
  EXPECT_EQ(rendered(R"((a "" b))"), "(<a> <> <b>)");
}

TEST(EmptyReferenceTests, EveryDelimiterStyleYieldsTheSameEmptyReference) {
  EXPECT_EQ(rendered(R"((a "" b))"), "(<a> <> <b>)");
  EXPECT_EQ(rendered(R"((a '' b))"), "(<a> <> <b>)");
  EXPECT_EQ(rendered("(a `` b)"), "(<a> <> <b>)");
}

TEST(EmptyReferenceTests, AdjacentEmptyReferencesStaySeparate) {
  EXPECT_EQ(rendered(R"((a "" "" b))"), "(<a> <> <> <b>)");
  EXPECT_EQ(rendered(R"((a '' '' b))"), "(<a> <> <> <b>)");
  EXPECT_EQ(rendered("(a `` `` b)"), "(<a> <> <> <b>)");
  EXPECT_EQ(rendered(R"((a ""  "" b))"), "(<a> <> <> <b>)");
}

TEST(EmptyReferenceTests, NestedEmptyReferencesParse) {
  EXPECT_EQ(rendered(R"(("" ("" 1)))"), "(<> (<> <1>))");
  EXPECT_EQ(rendered(R"(("" ('' 1)))"), "(<> (<> <1>))");
  EXPECT_EQ(rendered(R"(("x" ("" 1)))"), "(<x> (<> <1>))");
  EXPECT_EQ(rendered(R"(("" ("x" 1)))"), "(<> (<x> <1>))");
  EXPECT_EQ(rendered(R"(("" x ("" 1)))"), "(<> <x> (<> <1>))");
  EXPECT_EQ(rendered(R"(("" 1 ("" 1)))"), "(<> <1> (<> <1>))");
}

TEST(EmptyReferenceTests, EmptyReferenceIsValidAsAnId) {
  EXPECT_EQ(rendered(R"(("": 1))"), "(<>: <1>)");
  EXPECT_EQ(rendered(R"((o: ("" (o: ("" 1)))))"), "(<o>: (<> (<o>: (<> <1>))))");
}

TEST(EmptyReferenceTests, NQuoteDelimitedBodiesAreUnchanged) {
  // A run that encloses a substantive body keeps its n-quote meaning.
  EXPECT_EQ(rendered(R"((a ""x"" b))"), "(<a> <x> <b>)");
  EXPECT_EQ(rendered(R"((x "" " ""))"), R"((<x> < " >))");
  EXPECT_EQ(rendered(R"((x ' " '))"), R"((<x> < " >))");
  // An n-quote-delimited empty is still empty.
  EXPECT_EQ(rendered(R"((a """" b))"), "(<a> <> <b>)");
}

TEST(EmptyReferenceTests, ASingleSpaceStillReadsAsASpace) {
  EXPECT_EQ(rendered(R"((a " " b))"), "(<a> < > <b>)");
}

TEST(EmptyReferenceTests, EmptyReferenceSurvivesARoundTrip) {
  for (const std::string input :
       {R"((a "" b))", R"((a "" "" b))", R"(("" ("" 1)))", R"(("": 1))", R"((o: ("" (o: ("" 1)))))"}) {
    const std::vector<Link> links = parse(input);
    const std::string formatted = format_links(links);
    std::vector<Link> reparsed;
    ASSERT_NO_THROW(reparsed = parse(formatted)) << "formatted " << formatted << " did not parse";
    EXPECT_EQ(links, reparsed) << "round trip changed " << input;
  }
}

TEST(EmptyReferenceTests, EmptyReferenceIsWrittenAsAVersionedLiteral) {
  EXPECT_EQ(format_links(parse(R"((a "" b))")), "(a ~1{} b)");
}
