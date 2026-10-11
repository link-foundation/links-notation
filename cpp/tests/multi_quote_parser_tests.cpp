// Delimited references: single, doubled, tripled and wider runs of double
// quotes, single quotes and backticks, with the delimiter escaped inside.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

/// The document as one link with no id whose values are its links, the shape
/// parse_lino gives in the Rust implementation.
Link parse_lino(const std::string& source) { return Link(std::nullopt, parse(source)); }

/// A reference: a link with an id and no values.
bool is_reference(const Link& link) { return link.id.has_value() && link.values.empty(); }

/// The single reference of a parsed singlet link, looking through the outer
/// document link around it.
std::optional<std::string> get_single_ref_id(const Link& link) {
  if (link.values.empty()) return link.id;
  if (!link.id && link.values.size() == 1) return get_single_ref_id(link.values[0]);
  return std::nullopt;
}

/// The values of a link, or of the one link it wraps.
std::optional<std::vector<Link>> get_values(const Link& link) {
  if (is_reference(link)) return std::nullopt;
  if (link.values.size() == 1 && !is_reference(link.values[0])) return link.values[0].values;
  return link.values;
}

}  // namespace

TEST(MultiQuoteParserTests, TestBacktickQuotedReference) {
  EXPECT_EQ(get_single_ref_id(parse_lino("`backtick quoted`")), std::optional<std::string>("backtick quoted"));
}

TEST(MultiQuoteParserTests, TestBacktickQuotedWithSpaces) {
  EXPECT_EQ(get_single_ref_id(parse_lino("`text with spaces`")), std::optional<std::string>("text with spaces"));
}

TEST(MultiQuoteParserTests, TestBacktickQuotedMultiline) {
  const Link result = parse_lino("(`line1\nline2`)");
  if (!is_reference(result) && !result.values.empty()) {
    const Link& inner = result.values.front();
    if (!is_reference(inner) && !inner.values.empty() && is_reference(inner.values.front())) {
      EXPECT_EQ(*inner.values.front().id, "line1\nline2");
      return;
    }
    if (is_reference(inner)) {
      EXPECT_EQ(*inner.id, "line1\nline2");
      return;
    }
  }
  FAIL() << "Expected multiline backtick content";
}

TEST(MultiQuoteParserTests, TestBacktickQuotedWithEscapedBacktick) {
  EXPECT_EQ(get_single_ref_id(parse_lino("`text with `` escaped backtick`")), std::optional<std::string>("text with ` escaped backtick"));
}

TEST(MultiQuoteParserTests, TestSingleQuoteWithEscapedSingleQuote) {
  EXPECT_EQ(get_single_ref_id(parse_lino("'text with '' escaped quote'")), std::optional<std::string>("text with ' escaped quote"));
}

TEST(MultiQuoteParserTests, TestDoubleQuoteWithEscapedDoubleQuote) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"text with \"\" escaped quote\"")), std::optional<std::string>("text with \" escaped quote"));
}

TEST(MultiQuoteParserTests, TestDoubleDoubleQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"double double quotes\"\"")), std::optional<std::string>("double double quotes"));
}

TEST(MultiQuoteParserTests, TestDoubleDoubleQuotesWithSingleQuoteInside) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"text with \" inside\"\"")), std::optional<std::string>("text with \" inside"));
}

TEST(MultiQuoteParserTests, TestDoubleDoubleQuotesWithEscape) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"text with \"\"\"\" escaped double\"\"")), std::optional<std::string>("text with \"\" escaped double"));
}

TEST(MultiQuoteParserTests, TestDoubleSingleQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("''double single quotes''")), std::optional<std::string>("double single quotes"));
}

TEST(MultiQuoteParserTests, TestDoubleSingleQuotesWithSingleQuoteInside) {
  EXPECT_EQ(get_single_ref_id(parse_lino("''text with ' inside''")), std::optional<std::string>("text with ' inside"));
}

TEST(MultiQuoteParserTests, TestDoubleSingleQuotesWithEscape) {
  EXPECT_EQ(get_single_ref_id(parse_lino("''text with '''' escaped single''")), std::optional<std::string>("text with '' escaped single"));
}

TEST(MultiQuoteParserTests, TestDoubleBacktickQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("``double backtick quotes``")), std::optional<std::string>("double backtick quotes"));
}

TEST(MultiQuoteParserTests, TestDoubleBacktickQuotesWithBacktickInside) {
  EXPECT_EQ(get_single_ref_id(parse_lino("``text with ` inside``")), std::optional<std::string>("text with ` inside"));
}

TEST(MultiQuoteParserTests, TestDoubleBacktickQuotesWithEscape) {
  EXPECT_EQ(get_single_ref_id(parse_lino("``text with ```` escaped backtick``")), std::optional<std::string>("text with `` escaped backtick"));
}

TEST(MultiQuoteParserTests, TestTripleDoubleQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"\"triple double quotes\"\"\"")), std::optional<std::string>("triple double quotes"));
}

TEST(MultiQuoteParserTests, TestTripleDoubleQuotesWithDoubleQuoteInside) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"\"text with \"\" inside\"\"\"")), std::optional<std::string>("text with \"\" inside"));
}

TEST(MultiQuoteParserTests, TestTripleDoubleQuotesWithEscape) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"\"text with \"\"\"\"\"\" escaped triple\"\"\"")), std::optional<std::string>("text with \"\"\" escaped triple"));
}

TEST(MultiQuoteParserTests, TestTripleSingleQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("'''triple single quotes'''")), std::optional<std::string>("triple single quotes"));
}

TEST(MultiQuoteParserTests, TestTripleSingleQuotesWithDoubleQuoteInside) {
  EXPECT_EQ(get_single_ref_id(parse_lino("'''text with '' inside'''")), std::optional<std::string>("text with '' inside"));
}

TEST(MultiQuoteParserTests, TestTripleSingleQuotesWithEscape) {
  EXPECT_EQ(get_single_ref_id(parse_lino("'''text with '''''' escaped triple'''")), std::optional<std::string>("text with ''' escaped triple"));
}

TEST(MultiQuoteParserTests, TestTripleBacktickQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("```triple backtick quotes```")), std::optional<std::string>("triple backtick quotes"));
}

TEST(MultiQuoteParserTests, TestTripleBacktickQuotesWithDoubleBacktickInside) {
  EXPECT_EQ(get_single_ref_id(parse_lino("```text with `` inside```")), std::optional<std::string>("text with `` inside"));
}

TEST(MultiQuoteParserTests, TestTripleBacktickQuotesWithEscape) {
  EXPECT_EQ(get_single_ref_id(parse_lino("```text with `````` escaped triple```")), std::optional<std::string>("text with ``` escaped triple"));
}

TEST(MultiQuoteParserTests, TestQuadrupleDoubleQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"\"\"quadruple double quotes\"\"\"\"")), std::optional<std::string>("quadruple double quotes"));
}

TEST(MultiQuoteParserTests, TestQuadrupleDoubleQuotesWithTripleQuoteInside) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"\"\"text with \"\"\" inside\"\"\"\"")), std::optional<std::string>("text with \"\"\" inside"));
}

TEST(MultiQuoteParserTests, TestQuadrupleSingleQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("''''quadruple single quotes''''")), std::optional<std::string>("quadruple single quotes"));
}

TEST(MultiQuoteParserTests, TestQuadrupleBacktickQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("````quadruple backtick quotes````")), std::optional<std::string>("quadruple backtick quotes"));
}

TEST(MultiQuoteParserTests, TestQuintupleDoubleQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"\"\"\"quintuple double quotes\"\"\"\"\"")), std::optional<std::string>("quintuple double quotes"));
}

TEST(MultiQuoteParserTests, TestQuintupleDoubleQuotesWithQuadQuoteInside) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"\"\"\"text with \"\"\"\" inside\"\"\"\"\"")), std::optional<std::string>("text with \"\"\"\" inside"));
}

TEST(MultiQuoteParserTests, TestQuintupleSingleQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("'''''quintuple single quotes'''''")), std::optional<std::string>("quintuple single quotes"));
}

TEST(MultiQuoteParserTests, TestQuintupleBacktickQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("`````quintuple backtick quotes`````")), std::optional<std::string>("quintuple backtick quotes"));
}

TEST(MultiQuoteParserTests, TestMixedQuotesInLink) {
  const Link result = parse_lino("(\"double\" 'single' `backtick`)");
  const std::optional<std::vector<Link>> values = get_values(result);
  ASSERT_TRUE(values.has_value()) << "Expected values in link";
  ASSERT_EQ(values->size(), 3u);
  if (is_reference((*values)[0])) {
    EXPECT_EQ(*(*values)[0].id, "double");
  }
  if (is_reference((*values)[1])) {
    EXPECT_EQ(*(*values)[1].id, "single");
  }
  if (is_reference((*values)[2])) {
    EXPECT_EQ(*(*values)[2].id, "backtick");
  }
}

TEST(MultiQuoteParserTests, TestBacktickAsIdInLink) {
  const Link result = parse_lino("(`myId`: value1 value2)");
  if (!is_reference(result) && !result.values.empty() && !is_reference(result.values.front())) {
    const Link& first = result.values.front();
    EXPECT_EQ(first.id, std::optional<std::string>("myId"));
    EXPECT_EQ(first.values.size(), 2u);
    return;
  }
  FAIL() << "Expected link with backtick id";
}

TEST(MultiQuoteParserTests, TestCodeBlockLikeContent) {
  EXPECT_EQ(get_single_ref_id(parse_lino("```const x = 1;```")), std::optional<std::string>("const x = 1;"));
}

TEST(MultiQuoteParserTests, TestNestedQuotesInMarkdown) {
  EXPECT_EQ(get_single_ref_id(parse_lino("``Use `code` in markdown``")), std::optional<std::string>("Use `code` in markdown"));
}

TEST(MultiQuoteParserTests, TestJsonStringWithQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"{ \"key\": \"value\"}\"\"")), std::optional<std::string>("{ \"key\": \"value\"}"));
}

TEST(MultiQuoteParserTests, TestWhitespacePreservedInQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"  spaces  \"")), std::optional<std::string>("  spaces  "));
}

TEST(MultiQuoteParserTests, TestMultilineInDoubleDoubleQuotes) {
  const Link result = parse_lino("(\"\"line1\nline2\"\")");
  const std::optional<std::vector<Link>> values = get_values(result);
  if (values && !values->empty() && is_reference(values->front())) {
    EXPECT_EQ(*values->front().id, "line1\nline2");
    return;
  }
  FAIL() << "Expected multiline content in double double quotes";
}

TEST(MultiQuoteParserTests, TestUnlimitedQuotes6) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"\"\"\"\"hello\"\"\"\"\"\"")), std::optional<std::string>("hello"));
}

TEST(MultiQuoteParserTests, TestUnlimitedQuotes10) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"\"\"\"\"\"\"\"\"very deeply quoted\"\"\"\"\"\"\"\"\"\"")), std::optional<std::string>("very deeply quoted"));
}

TEST(MultiQuoteParserTests, TestUnlimitedQuotes6WithInnerQuotes) {
  EXPECT_EQ(get_single_ref_id(parse_lino("\"\"\"\"\"\"hello with \"\"\"\"\" five quotes inside\"\"\"\"\"\"")), std::optional<std::string>("hello with \"\"\"\"\" five quotes inside"));
}

TEST(MultiQuoteParserTests, TestUnlimitedSingleQuotes7) {
  EXPECT_EQ(get_single_ref_id(parse_lino("'''''''seven single quotes'''''''")), std::optional<std::string>("seven single quotes"));
}

TEST(MultiQuoteParserTests, TestUnlimitedBackticks8) {
  EXPECT_EQ(get_single_ref_id(parse_lino("````````eight backticks````````")), std::optional<std::string>("eight backticks"));
}
