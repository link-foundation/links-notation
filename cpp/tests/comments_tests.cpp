// Line comments (issue #301): `#` starts a comment that runs to the end of the
// line unless it sits inside a token or a delimited reference, parsers accept
// comments by default, and they can be told to treat `#` as an ordinary
// character again.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

// Renders a parsed node unambiguously: every reference is wrapped in angle
// brackets, so a `#` that survived as content is visible.
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

std::string render_all(const std::vector<Link>& links) {
  std::string result;
  for (std::size_t index = 0; index < links.size(); ++index) {
    if (index > 0) result += '\n';
    result += render(links[index]);
  }
  return result;
}

std::string rendered(const std::string& input) { return render_all(parse(input)); }

void expect_parses_as(const std::string& input, const std::string& expected) {
  EXPECT_EQ(rendered(input), expected) << "input: " << input;
}

ParserOptions without_comments() {
  ParserOptions options;
  options.comments = false;
  return options;
}

// Writes a document the way a caller that keeps the default formatting does.
std::string written(const std::vector<Link>& links) { return format_links(links, FormatConfig{}); }

}  // namespace

TEST(CommentsTests, ALineThatStartsWithAHashIsAComment) { expect_parses_as("# a b\n", ""); }

TEST(CommentsTests, ACommentMayHoldAColon) {
  // The document from #301: prose with a colon used to be a parse error.
  expect_parses_as("# a: b\n", "");
}

TEST(CommentsTests, ACommentMayHoldAnythingAtAll) { expect_parses_as("# ) : ( \" ' ` #\n", ""); }

TEST(CommentsTests, ACommentEndsAtTheEndOfItsLine) { expect_parses_as("# note\na: b\n", "(<a>: <b>)"); }

TEST(CommentsTests, ACommentMayFollowALink) { expect_parses_as("a: b # why\n", "(<a>: <b>)"); }

TEST(CommentsTests, ACommentMayFollowAGroup) { expect_parses_as("(a b) # why\n", "(<a> <b>)"); }

TEST(CommentsTests, ACommentNeedsNoClosingNewline) { expect_parses_as("a: b # why", "(<a>: <b>)"); }

TEST(CommentsTests, ACommentLineInsideAnIndentedBlockIsSkipped) {
  EXPECT_EQ(rendered("parent\n  # what the child is for\n  child\n"), rendered("parent\n  child\n"));
}

TEST(CommentsTests, ACommentLineInsideAGroupIsSkipped) {
  expect_parses_as("(\n  a\n  # why\n  b\n)\n", "((<a>) (<b>))");
}

TEST(CommentsTests, ADocumentOfCommentsAloneHoldsNoLinks) { expect_parses_as("# one\n# two\n", ""); }

TEST(CommentsTests, AHashInsideATokenIsAnOrdinaryCharacter) {
  expect_parses_as("issue#1047\n", "(<issue#1047>)");
}

TEST(CommentsTests, AHashThatOpensATokenIsAnOrdinaryCharacter) {
  expect_parses_as("a: b#c\n", "(<a>: <b#c>)");
}

TEST(CommentsTests, AHashInsideADelimitedReferenceIsContent) {
  expect_parses_as("\"# not a comment\" a\n", "(<# not a comment> <a>)");
}

TEST(CommentsTests, ACommentMayFollowADelimitedReference) { expect_parses_as("\"a\" # why\n", "(<a>)"); }

TEST(CommentsTests, AHashInsideAMultilineDelimitedReferenceIsContent) {
  expect_parses_as("\"a # b\nc\" d\n", "(<a # b\nc> <d>)");
}

TEST(CommentsTests, AParserWithoutCommentsKeepsTheHash) {
  const std::vector<Link> links = Parser(without_comments()).parse("# a b\n");

  EXPECT_EQ(render_all(links), "(<#> <a> <b>)");
}

TEST(CommentsTests, AParserWithoutCommentsStillRejectsTheDocumentFromTheIssue) {
  EXPECT_THROW(Parser(without_comments()).parse("# a: b\n"), ParseError);
}

TEST(CommentsTests, CommentsAreOnByDefault) {
  // ParserOptions has no equality and no named constructors, so the default
  // options are compared field by field with options that turn comments on.
  EXPECT_TRUE(ParserOptions{}.comments);
  const ParserOptions defaults;
  ParserOptions with_comments;
  with_comments.comments = true;
  EXPECT_EQ(defaults.max_input_size, with_comments.max_input_size);
  EXPECT_EQ(defaults.max_depth, with_comments.max_depth);
  EXPECT_EQ(defaults.comments, with_comments.comments);
  EXPECT_TRUE(Parser().options().comments);
}

TEST(CommentsTests, ACommentDoesNotMoveThePositionALaterErrorIsReportedAt) {
  // Blanking a comment keeps every later character where it was, so the
  // position reported for a defect is the position in the original document.
  try {
    parse("# a comment\nstage: rust: nextest\n");
    FAIL() << "expected a parse error";
  } catch (const ParseError& error) {
    const std::string message = error.what();
    EXPECT_EQ(message.rfind("Syntax error at line 2, column 12:", 0), 0u) << message;
  }
}

TEST(CommentsTests, ALineOfSpacesSeparatesLinksTheWayAnEmptyLineDoes) {
  // Blanking a comment leaves a line of spaces behind, so such a line has to
  // read as a blank line.
  EXPECT_EQ(rendered("a\n   \nb\n"), rendered("a\n\nb\n"));
}

TEST(CommentsTests, AReferenceThatBeginsWithAHashIsWrittenQuoted) {
  // Without the quotes the document would read as `a` followed by a comment.
  const std::string document = written({Link(std::nullopt, {Link("a"), Link("#tag")})});

  EXPECT_EQ(document, "(a '#tag')");
  EXPECT_EQ(rendered(document), "(<a> <#tag>)");
}

TEST(CommentsTests, AHashThatCannotOpenACommentIsLeftUnquoted) {
  const auto quoted = [](const std::string& reference) { return written({Link(reference)}); };

  EXPECT_EQ(quoted("issue#1047"), "(issue#1047)");
  EXPECT_EQ(quoted("#"), "('#')");
  EXPECT_EQ(quoted("#ff0000"), "('#ff0000')");
}

TEST(CommentsTests, BlankingACommentKeepsTheLengthOfTheDocument) {
  EXPECT_EQ(strip_comments("a: b # why\n"), "a: b      \n");
  EXPECT_EQ(strip_comments("\"# kept\"\n"), "\"# kept\"\n");
  EXPECT_EQ(strip_comments("issue#1047\n"), "issue#1047\n");
  EXPECT_EQ(strip_comments("# why\n"), "     \n");
}
