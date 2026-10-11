// Indented documents, link groups and minimal quoting, ported from
// js/tests/IndentedDocument.test.js.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

using Entries = std::vector<IndentedEntry>;

std::vector<std::string> ids(const std::vector<Link>& links) {
  std::vector<std::string> result;
  for (const Link& link : links) result.push_back(link.id.value_or("<null>"));
  return result;
}

std::vector<std::string> reference_corpus() {
  std::vector<std::string> references;
  for (const std::string& line : lines(read_repository_file("docs/protocol/reference-literals.txt"))) {
    if (line.empty() || line[0] == '#') continue;
    references.push_back(line == "-" ? "" : text_from_hex(line));
  }
  return references;
}

}  // namespace

TEST(IndentedDocumentTests, MixedQuotesRoundTripThroughTheExistingLinkFormatter) {
  const std::string text = "He said \"it's ready\"";
  const std::string formatted = Link(text).to_string();
  EXPECT_EQ(*parse(formatted)[0].values[0].id, text);
  EXPECT_EQ(formatted.find("\\'"), std::string::npos);
  EXPECT_EQ(escape_reference(text, true), "'He said \"it''s ready\"'");
}

TEST(IndentedDocumentTests, MinimalEscapingLeavesOrdinaryProseUnquoted) {
  EXPECT_EQ(escape_reference("What is your experience?", true), "What is your experience?");
  EXPECT_EQ(escape_reference("What is your experience?"), "'What is your experience?'");
}

TEST(IndentedDocumentTests, PublicGroupsPreserveImmediateChildrenAndDeeperIndentation) {
  const std::vector<LinksGroup> groups =
      Parser().parse_groups("What is your experience?\n  JavaScript\n  Python\n    Django\nOther question\n  Answer");
  ASSERT_EQ(groups.size(), 2u);
  EXPECT_EQ(ids(groups[0].element.values), (std::vector<std::string>{"What", "is", "your", "experience?"}));
  ASSERT_EQ(groups[0].children.size(), 2u);
  EXPECT_EQ(*groups[0].children[1].children[0].element.values[0].id, "Django");
  EXPECT_EQ(*groups[1].children[0].element.values[0].id, "Answer");
}

TEST(IndentedDocumentTests, GroupsRetainNamedAndNestedLinksAndShareParserDiagnostics) {
  const Parser parser;
  const std::vector<LinksGroup> groups = parser.parse_groups("root:\n  child: (one two)\n  branch\n    leaf");
  ASSERT_EQ(groups.size(), 1u);
  const LinksGroup& root = groups[0];
  EXPECT_EQ(root.element.id, "root");
  EXPECT_TRUE(root.element.values.empty());
  EXPECT_EQ(root.children[0].element.to_string(), "(child: (one two))");
  EXPECT_EQ(root.children[1].children.size(), 1u);
  EXPECT_THROW(parser.parse_groups("root: child: value"), ParseError);
  ParserOptions shallow;
  shallow.max_depth = 0;
  EXPECT_THROW(Parser(shallow).parse_groups("root\n  child"), ParseError);
  ParserOptions small;
  small.max_input_size = 2;
  try {
    Parser(small).parse_groups("root");
    FAIL() << "accepted an oversized document";
  } catch (const std::length_error& error) {
    EXPECT_NE(std::string(error.what()).find("Input size exceeds"), std::string::npos);
  }
}

TEST(IndentedDocumentTests, ParseTheIssueDocumentWithoutInspectingPrivatePathFlags) {
  const std::string input =
      "What is your experience?\n"
      "  I have worked with JavaScript\n"
      "'Question with \"quotes\": and colon'\n"
      "  Answer\n";
  EXPECT_EQ(parse_indented_document(input), (Entries{{"What is your experience?", {"I have worked with JavaScript"}},
                                                     {"Question with \"quotes\": and colon", {"Answer"}}}));
}

TEST(IndentedDocumentTests, MultipleChildLinesHaveExplicitArrayOrJoinedTextBehavior) {
  const std::string input = "Skills\n  JavaScript\n  Python\nUnanswered\nSkills\n  Go";
  EXPECT_EQ(parse_indented_document(input), (Entries{{"Skills", {"JavaScript", "Python", "Go"}}, {"Unanswered", {}}}));
  EXPECT_EQ(parse_indented_document(input, MultipleValues::join),
            (Entries{{"Skills", {"JavaScript\nPython\nGo"}}, {"Unanswered", {}}}));
}

TEST(IndentedDocumentTests, FormatTheIssueDocumentWithTwoSpaceIndentationAndAFinalNewline) {
  const Entries entries{{"What is your experience?", {"I have worked with JavaScript"}},
                        {"Skills", {"JavaScript", "Python"}}};
  EXPECT_EQ(format_indented_document(entries),
            "What is your experience?\n  I have worked with JavaScript\nSkills\n  JavaScript\n  Python\n");
  EXPECT_EQ(parse_indented_document(format_indented_document(entries)), entries);
  EXPECT_EQ(format_indented_document({}), "");
  EXPECT_TRUE(parse_indented_document("").empty());
}

TEST(IndentedDocumentTests, EmptyTextExactWhitespaceCommentsQuotesAndMultilineTextSurvive) {
  for (const std::string text : {"",
                                 " ",
                                 "  leading",
                                 "trailing  ",
                                 "two  spaces",
                                 "a\tb",
                                 "# question",
                                 "text # literal",
                                 "issue#333",
                                 "Question: (details)",
                                 "`backticks`",
                                 "\"double\" and 'single'",
                                 "'starts with both \"quotes\"",
                                 "\"starts with both 'quotes'",
                                 "ends with both '\"",
                                 "repeated ''' and \"\"\"",
                                 "literal \\n and \\'",
                                 "line one\n  line two",
                                 "carriage\rreturn",
                                 "Windows\r\nline",
                                 "Привет 🌍"}) {
    const std::string escaped = escape_reference(text, true);
    EXPECT_EQ(unescape_reference(escaped), text) << escaped;
    const Entries entries{{text, {text}}};
    EXPECT_EQ(parse_indented_document(format_indented_document(entries)), entries) << escaped;
  }
}

TEST(IndentedDocumentTests, UnescapingUsesTheGrammarAndNeverDecodesAlreadyParsedIdsAgain) {
  EXPECT_EQ(unescape_reference("\"He said \"\"hello\"\"\""), "He said \"hello\"");
  EXPECT_EQ(unescape_reference("'it''s ready'"), "it's ready");
  EXPECT_EQ(unescape_reference("``text with ` inside``"), "text with ` inside");
  EXPECT_EQ(unescape_reference("plain text"), "plain text");
  EXPECT_EQ(unescape_reference("literal \\n"), "literal \\n");
  EXPECT_THROW(unescape_reference("\"unfinished"), std::invalid_argument);
  EXPECT_THROW(unescape_reference("\"value\" extra"), std::invalid_argument);
  EXPECT_EQ(parse_indented_document("Question\n  \"two '' quotes\""), (Entries{{"Question", {"two '' quotes"}}}));
}

TEST(IndentedDocumentTests, DocumentHelpersRejectDeeperOrNamedValueStructuresInsteadOfLosingData) {
  EXPECT_THROW(parse_indented_document("Question\n  Answer\n    Detail"), std::invalid_argument);
  EXPECT_THROW(parse_indented_document("Question\n  answer: value"), std::invalid_argument);
}

TEST(IndentedDocumentTests, DocumentParsingRespectsCommentsAndExistingParserOptions) {
  EXPECT_EQ(parse_indented_document("# comment\nQuestion\n  Answer # comment"), (Entries{{"Question", {"Answer"}}}));
  ParserOptions options;
  options.comments = false;
  EXPECT_EQ(parse_indented_document("# question\n  Answer", MultipleValues::array, options),
            (Entries{{"# question", {"Answer"}}}));
}

TEST(IndentedDocumentTests, OneElementArraysNormalizeToStringsAndUnansweredParentsRemainDistinct) {
  const Entries entries{{"One option", {"only"}}, {"No options", {}}, {"Empty answer", {""}}};
  EXPECT_EQ(parse_indented_document(format_indented_document(entries)), entries);
}

TEST(IndentedDocumentTests, DocumentHelpersPreserveTheSharedUnicodeReferenceCorpusAndReservedPrefixes) {
  std::vector<std::string> references = reference_corpus();
  ASSERT_FALSE(references.empty());
  for (const char* text : {"~1{61}", "~2{00}", "~1{invalid}", "text ~1{61} after", "text ~2{00}", "text ~1{invalid}"}) {
    references.emplace_back(text);
  }
  for (const std::string& text : references) {
    EXPECT_EQ(escape_reference(text), format_binary_reference(text));
    EXPECT_EQ(unescape_reference(escape_reference(text)), text);
    EXPECT_EQ(unescape_reference(escape_reference(text, true)), text);
    const Entries entries{{text, {text}}};
    EXPECT_EQ(parse_indented_document(format_indented_document(entries)), entries) << to_hex(text);
  }
}

TEST(IndentedDocumentTests, UnescapingDecodesVersionedLiteralsWithoutDecodingParsedDocumentIdsTwice) {
  EXPECT_EQ(unescape_reference("~1{}"), "");
  EXPECT_EQ(unescape_reference("~1{00}"), std::string(1, '\0'));
  EXPECT_EQ(unescape_reference("~1{C3A9}"), "é");
  for (const char* literal : {"~2{61}", "~1{0}", "~1{gg}", "~1{ff}"}) {
    EXPECT_THROW(unescape_reference(literal), std::invalid_argument) << literal;
  }
  const Entries entries{{"~1{61}", {"~1{62}"}}};
  EXPECT_EQ(parse_indented_document(format_indented_document(entries)), entries);
  EXPECT_THROW(escape_reference("\xED\xA0\x80", true), std::invalid_argument);
}
