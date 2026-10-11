// Issue #316: a reference that opens with a wide run of delimiters used to be
// read one character at a time, comparing the whole width at every position,
// and every run that never closed was read to the end of the document again.
// These documents took seconds; read a run at a time they take milliseconds,
// so the bound below only fails on the old behaviour.

#include <gtest/gtest.h>

#include <chrono>
#include <cmath>

#include "../src/quotes.hpp"
#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

using Duration = std::chrono::steady_clock::duration;

const Duration bound = std::chrono::seconds(2);
constexpr std::size_t size = 1000000;
// Shapes that end in a long list of short references: reading those is most
// of the time the parser takes on them, fixed or not, so they are kept smaller.
constexpr std::size_t many_references_size = 400000;

bool is_reference(const Link& link) { return link.id.has_value() && link.values.empty(); }

std::string render(const Link& node) {
  if (is_reference(node)) return "<" + *node.id + ">";
  std::string result = "(";
  if (node.id) result += "<" + *node.id + ">: ";
  for (std::size_t index = 0; index < node.values.size(); ++index) {
    if (index > 0) result += ' ';
    result += render(node.values[index]);
  }
  return result + ")";
}

void expect_parses_as(const std::string& source, const std::string& expected) {
  std::vector<Link> links;
  try {
    links = parse(source);
  } catch (const ParseError& error) {
    ADD_FAILURE() << source << ": " << error.what();
    return;
  }
  std::string rendered;
  for (std::size_t index = 0; index < links.size(); ++index) {
    if (index > 0) rendered += '\n';
    rendered += render(links[index]);
  }
  EXPECT_EQ(rendered, expected) << source;
}

std::string q(std::size_t count) { return std::string(count, '\''); }

std::string repeat(const std::string& text, std::size_t count) {
  std::string result;
  result.reserve(text.size() * count);
  for (std::size_t index = 0; index < count; ++index) result += text;
  return result;
}

template <typename Read>
Duration timed(Read read) {
  const auto started = std::chrono::steady_clock::now();
  read();
  return std::chrono::steady_clock::now() - started;
}

double milliseconds(Duration duration) { return std::chrono::duration<double, std::milli>(duration).count(); }

/// The offset just past the delimited reference that starts at `start`, or
/// nothing when nothing that far into `document` opens one: the Rust parser's
/// quoted_reference_end, which the C++ library keeps internal.
std::optional<std::size_t> quoted_reference_end(std::string_view document, std::size_t start) {
  if (start > document.size()) return std::nullopt;
  const auto reading = detail::read_reference(document.substr(start));
  if (!reading) return std::nullopt;
  return start + reading->length;
}

// The shapes from the issue, and two that defeat shortcuts a fix could take.

std::string wide_quote_over_a_long_run(std::size_t size) {
  const std::size_t width = size / 4;
  return q(width + 1) + " a " + q(width - 4) + " " + std::string(2 * width, 'x');
}

std::string narrowing_unclosed_quotes(std::size_t size) {
  std::string head;
  const std::size_t last = static_cast<std::size_t>(std::sqrt(static_cast<double>(size / 2))) / 2;
  for (std::size_t half = last + 1; half-- > 0;) {
    if (!head.empty()) head += ' ';
    head += q(2 * half + 1) + "x";
  }
  return head + " " + repeat("a' ", (size - head.size()) / 3);
}

std::string closed_wide_quote_over_quotes(std::size_t size) {
  const std::size_t width = size / 8;
  return q(width) + repeat(q(width - 1) + "x", 6) + q(width);
}

std::string unclosed_widths_over_an_even_run(std::size_t size) {
  const std::size_t run = size / 4;
  std::string head;
  const std::size_t widest = static_cast<std::size_t>(std::sqrt(static_cast<double>(size)));
  for (std::size_t width = widest; width >= 2; --width) {
    if ((run / width) % 2 != 0) continue;
    if (!head.empty()) head += ' ';
    head += q(width) + "x";
  }
  const std::string tail = repeat("a' ", (size - head.size() - run) / 3);
  return head + " " + tail + q(run) + " b";
}

void expect_parsed_within_bound(const std::string& source) {
  Duration elapsed = timed([&] {
    try {
      parse(source);
    } catch (const ParseError&) {
    }
  });
  EXPECT_LT(elapsed, bound) << "parsing took " << milliseconds(elapsed) << " ms";
  elapsed = timed([&] { strip_comments(source); });
  EXPECT_LT(elapsed, bound) << "stripping comments took " << milliseconds(elapsed) << " ms";
}

}  // namespace

TEST(Issue316QuoteRunsTests, ARunInsideABodyIsReadAsEscapesThenAClosingRun) {
  expect_parses_as("'''a'''", "(<a>)");
  expect_parses_as("'''a''''''b'''", "(<a'''b>)");
  expect_parses_as("''a'''", "(<a'>)");
  expect_parses_as("'a'''", "(<a'>)");
  expect_parses_as(q(3) + "a" + q(9) + " b", "(<a'''> <b>)");
  expect_parses_as(q(50) + "a" + q(100) + "b" + q(50), "(<a" + q(50) + "b>)");
  expect_parses_as("\"\"\"a\"\"b\"\"\"", "(<a\"\"b>)");
  expect_parses_as("``a````b``", "(<a``b>)");
}

TEST(Issue316QuoteRunsTests, ARunThatNeverClosesTheReferenceLeavesItUnclosed) {
  // 7 / 3 is even: two escaped runs of three and one delimiter.
  std::string source = q(3) + "a" + q(7);
  expect_parses_as(source, "(<" + source + ">)");
  source = q(5) + "a" + q(4);
  expect_parses_as(source, "(<" + source + ">)");
  expect_parses_as("''a'''''", "(<> <a'''''>)");
  expect_parses_as("''''x a", "(<> <x> <a>)");
}

TEST(Issue316QuoteRunsTests, AReferenceCanOpenInsideARun) {
  // Comment stripping and the stream parser ask where a reference opened at
  // any delimiter ends, including one in the middle of a run.
  EXPECT_EQ(quoted_reference_end("x'''a'''", 1), std::optional<std::size_t>(8));
  EXPECT_EQ(quoted_reference_end("x'''a''", 2), std::optional<std::size_t>(7));
  EXPECT_EQ(quoted_reference_end("x'''a'", 3), std::optional<std::size_t>(6));
  EXPECT_EQ(quoted_reference_end("'''a", 0), std::nullopt);
  EXPECT_EQ(quoted_reference_end("''''a", 0), std::optional<std::size_t>(4));
  EXPECT_EQ(quoted_reference_end("a", 0), std::nullopt);
  EXPECT_EQ(quoted_reference_end("'a'", 3), std::nullopt);
}

TEST(Issue316QuoteRunsTests, AReferenceThatOpensWithAWideRunIsReadInLinearTime) {
  const std::size_t width = size / 4;
  const std::string source = wide_quote_over_a_long_run(size);
  std::vector<Link> links;
  const Duration elapsed = timed([&] { links = parse(source); });
  // The odd opening run never closes, so it is a plain reference; the even
  // run after `a` encloses nothing and is the empty reference.
  ASSERT_EQ(links.size(), 1u);
  ASSERT_FALSE(is_reference(links[0])) << "expected a link, got " << links[0];
  std::vector<std::string> ids;
  for (const Link& value : links[0].values) {
    ASSERT_TRUE(is_reference(value)) << "expected a reference, got " << value;
    ids.push_back(*value.id);
  }
  EXPECT_EQ(ids, (std::vector<std::string>{q(width + 1), "a", "", std::string(2 * width, 'x')}));
  EXPECT_LT(elapsed, bound) << "parsing took " << milliseconds(elapsed) << " ms";
}

TEST(Issue316QuoteRunsTests, WideQuoteOverALongRunIsParsedWithinTheTimeBound) {
  expect_parsed_within_bound(wide_quote_over_a_long_run(size));
}

TEST(Issue316QuoteRunsTests, NarrowingUnclosedQuotesIsParsedWithinTheTimeBound) {
  expect_parsed_within_bound(narrowing_unclosed_quotes(many_references_size));
}

TEST(Issue316QuoteRunsTests, ClosedWideQuoteOverQuotesIsParsedWithinTheTimeBound) {
  expect_parsed_within_bound(closed_wide_quote_over_quotes(size));
}

TEST(Issue316QuoteRunsTests, UnclosedWidthsOverAnEvenRunIsParsedWithinTheTimeBound) {
  expect_parsed_within_bound(unclosed_widths_over_an_even_run(many_references_size));
}

TEST(Issue316QuoteRunsTests, AStreamOfWideQuotesIsReadWithinTheTimeBound) {
  // The second line is what makes the stream ask whether the first is complete.
  const std::string source = closed_wide_quote_over_quotes(size) + "\nb";
  std::vector<Link> links;
  const Duration elapsed = timed([&] {
    StreamParser stream;
    stream.write(source);
    links = stream.finish();
  });
  EXPECT_EQ(links.size(), 2u);
  EXPECT_LT(elapsed, bound) << "streaming took " << milliseconds(elapsed) << " ms";
}
