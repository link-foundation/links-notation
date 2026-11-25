// Quoting a reference, and reading every quoted reference back (issues #443
// and #444).
//
// quote_reference writes one reference so a parser reads it back as exactly
// that text; needs_quoting says whether the text can be written bare. The
// property tests below feed text built from the characters that matter to the
// grammar through the formatter and read it back in the ID and the value
// position of parenthesised, single-line and indented links. The seeded
// generator is the one js/tests/QuoteReference.test.js uses, so both try the
// same texts.

#include <gtest/gtest.h>

#include <cstdint>
#include <functional>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

// A small, seeded generator (mulberry32), so a failure names the text that
// broke and the same texts are tried on every run.
std::function<double()> seeded_random(std::uint32_t seed) {
  return [state = seed]() mutable {
    state += 0x6d2b79f5u;
    std::uint32_t value = state;
    value = (value ^ (value >> 15)) * (value | 1u);
    value ^= value + (value ^ (value >> 7)) * (value | 61u);
    return static_cast<double>(value ^ (value >> 14)) / 4294967296.0;
  };
}

const std::vector<std::string> alphabet = {"a", "b", "1", " ", " ", "\t", "\n", "\r", "\"", "\"", "'",
                                           "'", "`", "#", ":", "(", ")",  "~",  "{",  "}",  "é",  "😀"};

std::vector<std::string> texts(std::size_t count, std::uint32_t seed) {
  const std::function<double()> next = seeded_random(seed);
  std::vector<std::string> result;
  for (std::size_t index = 0; index < count; ++index) {
    const auto length = static_cast<std::size_t>(next() * 9);
    std::string text;
    for (std::size_t position = 0; position < length; ++position) {
      text += alphabet[static_cast<std::size_t>(next() * static_cast<double>(alphabet.size()))];
    }
    result.push_back(text);
  }
  return result;
}

// Texts that broke a parser or a formatter before, or came close.
const std::vector<std::string> tricky = {"",         " ",    "\"",    "'",     "`",    "\"\"", "''",
                                         "\"\"\"\"", "\"'",  "'\"",   "#",     "#x",   "a #b", ":",
                                         "a:",       ":a",   "12:30", "a: b",  "(",    ")",    "~1{}",
                                         "~1{61}",   "a\nb", "\"\" ", " \"\"", "\"\n", "it's", "say \"hi\""};

std::string read_back(const std::string& document) { return tree_of(parse(document)); }

}  // namespace

TEST(QuoteReferenceTests, WritesTextThatNeedsNoDelimitersAsItIs) {
  for (const std::string text : {"plain", "issue#1047", "a-b_c.d", "π", "~1"}) {
    EXPECT_EQ(quote_reference(text), text);
    EXPECT_FALSE(needs_quoting(text)) << text;
  }
}

TEST(QuoteReferenceTests, QuotesTextAParserWouldReadDifferently) {
  EXPECT_EQ(quote_reference("has space"), "'has space'");
  EXPECT_EQ(quote_reference("12:30"), "'12:30'");
  EXPECT_EQ(quote_reference("#release"), "'#release'");
  EXPECT_EQ(quote_reference("(a)"), "'(a)'");
  EXPECT_EQ(quote_reference("\""), "'\"'");
  EXPECT_EQ(quote_reference("'"), "\"'\"");
  EXPECT_EQ(quote_reference(""), "~1{}");
  EXPECT_EQ(quote_reference("a\nb"), "~1{610a62}");
  for (const std::string text : {"has space", "12:30", "#release", "", "\"", "a\nb"}) {
    EXPECT_TRUE(needs_quoting(text)) << text;
  }
}

TEST(QuoteReferenceTests, IsEscapeReference) {
  for (const std::string text : {"a b", "a", "it's", "", "#x", "x:y"}) {
    EXPECT_EQ(quote_reference(text), escape_reference(text));
    EXPECT_EQ(quote_reference(text, true), escape_reference(text, true));
  }
  EXPECT_EQ(quote_reference(std::optional<std::string>()), "");
}

TEST(QuoteReferenceTests, NeedsQuotingRefusesWhatIsNotText) {
  EXPECT_THROW(needs_quoting(std::string("\xff")), std::invalid_argument);
  EXPECT_THROW(quote_reference(std::string("\xff")), std::invalid_argument);
}

TEST(QuoteReferenceTests, EveryQuotedReferenceReadsBackInEveryPosition) {
  std::vector<std::string> pool = tricky;
  for (std::string& text : texts(2000, 443444)) pool.push_back(std::move(text));
  for (const std::string& text : pool) {
    const std::string written = quote_reference(text);
    const std::string message = json_string(text) + " written as " + json_string(written);
    EXPECT_EQ(unescape_reference(written), text) << message;

    const std::string link = "[[" + json_string(text) + ",[" + json_string(text) + R"(],["x"]]])";
    EXPECT_EQ(read_back("(" + written + ": " + written + " x)"), link) << message;
    EXPECT_EQ(read_back(written + ": " + written + " x"), link) << message;
    EXPECT_EQ(read_back(written + ": " + written + " x\n"), link) << message;
    EXPECT_EQ(read_back(written + ":\n  " + written + "\n  x\n"), link) << message;
    // Two lines that each end with the reference: the shape of issue #443.
    EXPECT_EQ(read_back("root:\n  a " + written + "\n  b " + written + "\n"),
              R"([["root",[null,["a"],[)" + json_string(text) + R"(]],[null,["b"],[)" + json_string(text) + "]]]]")
        << message;
    EXPECT_EQ(read_back("(a (" + written + " " + written + ") b)"),
              R"([[null,["a"],[null,[)" + json_string(text) + "],[" + json_string(text) + R"(]],["b"]]])")
        << message;
  }
}

TEST(QuoteReferenceTests, EveryFormattedLinkReadsBackAsTheSameLink) {
  std::vector<std::string> pool = tricky;
  for (std::string& text : texts(400, 445)) pool.push_back(std::move(text));
  for (std::size_t index = 0; index + 2 < pool.size(); index += 3) {
    const std::vector<Link> links = {
        Link(pool[index], {Link(pool[index + 1]), Link("x")}),
        Link(std::nullopt, {Link(pool[index + 2]), Link(pool[index])}),
    };
    const std::string message =
        json_string(pool[index]) + " " + json_string(pool[index + 1]) + " " + json_string(pool[index + 2]);
    for (const std::string& document : {format_links(links), format_links(links, true)}) {
      const std::vector<Link> parsed = parse(document);
      ASSERT_EQ(parsed.size(), links.size()) << message << " " << document;
      for (std::size_t at = 0; at < parsed.size(); ++at) {
        EXPECT_TRUE(parsed[at] == links[at]) << message << " " << document;
      }
    }
    // The nested writer puts every value on a line of its own.
    EXPECT_EQ(tree_of(parse(format_nested(links))), tree_of(parse(format_links(links)))) << message;
  }
}
