// Issue #444: colons inside a bare reference.
//
// A run of colons between two characters of a bare reference belongs to the
// reference, so times, URLs and qualified names need no quotes. A colon that is
// followed by whitespace, a parenthesis, a quote or a versioned literal still
// separates an ID from its values, and a bare reference never starts or ends
// with a colon.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

std::string parses(const std::string& document) { return tree_of(parse(document)); }

void same(const std::string& document, const std::string& expected) {
  EXPECT_EQ(parses(document), parses(expected)) << "document: " << document;
}

}  // namespace

TEST(BareReferenceColonsTests, ATimeIsOneReference) {
  same("time 12:30\n", "time '12:30'\n");
  same("root:\n  time 12:30\n", "root:\n  time '12:30'\n");
}

TEST(BareReferenceColonsTests, AUrlIsOneReference) {
  same("url https://example.com/a#b\n", "url 'https://example.com/a#b'\n");
}

TEST(BareReferenceColonsTests, AQualifiedNameIsOneReference) { same("type std::string\n", "type 'std::string'\n"); }

TEST(BareReferenceColonsTests, AnIdMayHoldAColon) {
  same("a:b: c\n", "'a:b': c\n");
  same("(a:b: c)", "('a:b': c)");
  same("a:b\n", "'a:b'\n");
}

TEST(BareReferenceColonsTests, AColonBeforeAValueThatCannotContinueAReferenceSeparates) {
  same("a: b\n", "(a: b)");
  same("a:\"b c\"\n", "(a: 'b c')");
  same("a:'b'\n", "(a: b)");
  same("a:(b c)\n", "(a: (b c))");
  same("a:~1{62}\n", "(a: b)");
  same("a :b\n", "(a: b)");
}

TEST(BareReferenceColonsTests, AValueOfTheLinkMayHoldAColon) { same("a: b:c\n", "(a: 'b:c')"); }

TEST(BareReferenceColonsTests, ASecondIdOnALineIsStillAnError) {
  EXPECT_THROW(parse("stage: rust: nextest\n"), ParseError);
  EXPECT_THROW(parse(": a\n"), ParseError);
}

TEST(BareReferenceColonsTests, AReferenceWithColonsIsWrittenWithQuotes) {
  EXPECT_EQ(format_links(parse("time 12:30\n")), "(time '12:30')");
}

TEST(BareReferenceColonsTests, TheSyntaxTreeReadsColonsInsideAReference) {
  std::vector<std::string> references;
  for (const CstNode& token : Parser().parse_cst("a:b: 12:30 std::string\nx:\"y\"\n").tokens()) {
    if (token.kind == CstKind::reference) references.push_back(token.text());
  }
  EXPECT_EQ(references, (std::vector<std::string>{"a:b", "12:30", "std::string", "x", "\"y\""}));
}
