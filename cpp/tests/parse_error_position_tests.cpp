// A parse error says where the document stopped making sense (issue #302):
// the line, column and offset of the defect, what could have stood there, and
// a message that quotes one line rather than the rest of the document.

#include <gtest/gtest.h>

#include <algorithm>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

ParseError syntax_error(const std::string& document) {
  try {
    const std::vector<Link> parsed = parse(document);
    ADD_FAILURE() << "expected " << document << " not to parse, got " << format_links(parsed);
  } catch (const ParseError& error) {
    if (error.kind() == ParseError::Kind::syntax) return error;
    ADD_FAILURE() << "expected a syntax error for " << document << ", got " << error.what();
    return error;
  }
  throw std::logic_error("the document parsed");
}

// What a syntax error displays without the "Syntax error at " prefix.
std::string display(const ParseError& error) { return error.summary() + "\n" + error.snippet(); }

std::string message_of(const std::string& document) {
  try {
    parse(document);
  } catch (const ParseError& error) {
    return error.what();
  }
  ADD_FAILURE() << "expected " << document << " not to parse";
  return "";
}

std::string repeat(const std::string& text, std::size_t count) {
  std::string result;
  for (std::size_t index = 0; index < count; ++index) result += text;
  return result;
}

}  // namespace

TEST(ParseErrorPositionTests, TestReportsTheLineAndColumnOfTheDefect) {
  // The defect is the second colon on line 2, and the two lines after it are
  // fine.
  const ParseError error = syntax_error("ci_gate x\nstage: rust: nextest\nnext stage\n  clippy");

  EXPECT_EQ(error.line(), 2u);
  EXPECT_EQ(error.column(), 12u);
  EXPECT_EQ(error.found(), std::optional<std::string>(":"));
}

TEST(ParseErrorPositionTests, TestOffsetAgreesWithTheJavascriptPort) {
  // JavaScript reports { offset: 21, line: 2, column: 12 } for this document.
  const ParseError error = syntax_error("ci_gate x\nstage: rust: nextest\n");

  EXPECT_EQ(error.offset(), 21u);
  EXPECT_EQ(error.line(), 2u);
  EXPECT_EQ(error.column(), 12u);
}

TEST(ParseErrorPositionTests, TestPointsAtTheDefectRatherThanAtTheLineItStartsOn) {
  // A parser that backtracks would report the start of line 2, where the
  // document last parsed cleanly. The defect is eleven characters later.
  const ParseError error = syntax_error("ci_gate x\nstage: rust: nextest\n");

  EXPECT_NE(error.column(), 1u);
  EXPECT_EQ(error.line_text().substr(error.column() - 1, 1), ":");
}

TEST(ParseErrorPositionTests, TestReportsTheLineALateDefectIsOn) {
  const ParseError error = syntax_error("a\nb\nc\nd\ne: f: g\nh\n");

  EXPECT_EQ(error.line(), 5u);
  EXPECT_EQ(error.column(), 5u);
  EXPECT_EQ(error.line_text(), "e: f: g");
}

TEST(ParseErrorPositionTests, TestLoneCrCountsAsOneLineBreakInDiagnostics) {
  const ParseError error = syntax_error("a\rb: c: d");

  EXPECT_EQ(error.line(), 2u);
  EXPECT_EQ(error.column(), 5u);
  EXPECT_EQ(error.line_text(), "b: c: d");
}

TEST(ParseErrorPositionTests, TestSaysWhatCouldHaveStoodThere) {
  const ParseError error = syntax_error("a: b: c");

  EXPECT_EQ(error.expected(), (std::vector<std::string>{"\"(\"", "a reference", "end of line"}));
}

TEST(ParseErrorPositionTests, TestReportsTheEndOfTheDocumentWhenAGroupIsNeverClosed) {
  // JavaScript reports { offset: 5, line: 2, column: 1 } for this document.
  const ParseError error = syntax_error("a (b\n");

  EXPECT_EQ(error.offset(), 5u);
  EXPECT_EQ(error.line(), 2u);
  EXPECT_EQ(error.column(), 1u);
  EXPECT_EQ(error.found(), std::nullopt);
  const std::vector<std::string>& expected = error.expected();
  EXPECT_NE(std::find(expected.begin(), expected.end(), "\")\""), expected.end());
}

TEST(ParseErrorPositionTests, TestReportsAnUnmatchedClosingParenthesis) {
  // JavaScript reports { offset: 3, line: 1, column: 4 } for this document.
  const ParseError error = syntax_error("a b)\n");

  EXPECT_EQ(error.offset(), 3u);
  EXPECT_EQ(error.line(), 1u);
  EXPECT_EQ(error.column(), 4u);
  EXPECT_EQ(error.found(), std::optional<std::string>(")"));
}

TEST(ParseErrorPositionTests, TestSummaryReadsAsASentence) {
  const ParseError error = syntax_error("ci_gate x\nstage: rust: nextest\n");

  EXPECT_EQ(error.summary(), R"(line 2, column 12: expected "(", a reference or end of line, found ":")");
}

TEST(ParseErrorPositionTests, TestSnippetPointsACaretAtTheOffendingCharacter) {
  const ParseError error = syntax_error("ci_gate x\nstage: rust: nextest\n");

  EXPECT_EQ(error.snippet(), "2 | stage: rust: nextest\n  |            ^");
}

TEST(ParseErrorPositionTests, TestMessageQuotesOneLineRatherThanTheRestOfTheDocument) {
  // The whole complaint in #302: the message used to carry the entire
  // unconsumed remainder, so it grew with the size of the document.
  const std::string document = "ci_gate x\nstage: rust: nextest\n" + repeat("trailing line\n", 500);

  const std::string message = message_of(document);

  EXPECT_NE(message.find("line 2, column 12"), std::string::npos) << message;
  EXPECT_EQ(message.find("trailing line"), std::string::npos) << message;
  EXPECT_LT(message.size(), 200u) << "message is " << message.size() << " bytes";
}

TEST(ParseErrorPositionTests, TestMessageOfALongLineStaysAMessage) {
  const std::string document = repeat("a", 400) + ": " + repeat("b", 400) + ": c";

  const ParseError error = syntax_error(document);
  const std::string message = display(error);

  EXPECT_EQ(error.line(), 1u);
  EXPECT_EQ(error.column(), 803u);
  EXPECT_NE(message.find("..."), std::string::npos) << message;
  EXPECT_LT(message.size(), 300u) << "message is " << message.size() << " bytes";
  // The caret still lands under the character the message is about.
  const std::vector<std::string> message_lines = lines(message);
  ASSERT_GE(message_lines.size(), 2u);
  const std::size_t caret = message_lines.back().find('^');
  ASSERT_NE(caret, std::string::npos);
  const std::string& quoted = message_lines[1];
  ASSERT_LT(caret, quoted.size());
  EXPECT_EQ(quoted.substr(caret, 1), ":");
}

TEST(ParseErrorPositionTests, TestErrorDisplayStartsWithThePosition) {
  const std::string message = message_of("a: b: c");

  EXPECT_EQ(message.rfind("Syntax error at line 1, column 5:", 0), 0u) << message;
}

TEST(ParseErrorPositionTests, TestNomInternalsStayOutOfTheMessage) {
  const std::string message = message_of("a: b: c");

  for (const char* internal : {"ErrorKind", "code:", "Eof", "Verify", "TakeWhile1"}) {
    EXPECT_EQ(message.find(internal), std::string::npos) << message << " mentions " << internal;
  }
}

TEST(ParseErrorPositionTests, TestBothEntryPointsReportTheSamePosition) {
  // The free function and a Parser with the default options are the two entry
  // points.
  const std::string document = "ci_gate x\nstage: rust: nextest\n";

  const ParseError one = syntax_error(document);
  try {
    Parser().parse(document);
    FAIL() << "expected a syntax error";
  } catch (const ParseError& many) {
    ASSERT_EQ(many.kind(), ParseError::Kind::syntax);
    EXPECT_EQ(one.offset(), many.offset());
    EXPECT_EQ(one.line(), many.line());
    EXPECT_EQ(one.column(), many.column());
    EXPECT_EQ(one.expected(), many.expected());
    EXPECT_EQ(one.found(), many.found());
    EXPECT_EQ(one.line_text(), many.line_text());
    EXPECT_EQ(std::string(one.what()), std::string(many.what()));
  }
}

TEST(ParseErrorPositionTests, TestColumnCountsCharactersRatherThanBytes) {
  // The identifier is six characters wide and twelve bytes long.
  const ParseError error = syntax_error("привет: b: c");

  EXPECT_EQ(error.line(), 1u);
  EXPECT_EQ(error.column(), 10u);
  EXPECT_EQ(error.offset(), 15u);
  EXPECT_EQ(error.found(), std::optional<std::string>(":"));
}

TEST(ParseErrorPositionTests, TestADocumentThatParsesReportsNothing) { EXPECT_NO_THROW(parse("a: b\n  c: d\n")); }
