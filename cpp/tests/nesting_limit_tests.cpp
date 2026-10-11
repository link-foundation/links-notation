// Links nested too deeply are refused with an error rather than recursed into
// until the stack overflows (issue #315). Every parenthesized group and every
// indentation level is one level, and the lines of a document start at level 0.

#include <gtest/gtest.h>

#include <exception>
#include <stdexcept>
#include <tuple>

#include "stack_thread.hpp"
#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

std::string repeat(const std::string& text, std::size_t count) {
  std::string result;
  for (std::size_t index = 0; index < count; ++index) result += text;
  return result;
}

std::string parens(std::size_t depth) { return repeat("(", depth) + "a" + repeat(")", depth); }

std::string values(std::size_t depth) { return repeat("(a ", depth) + "b" + repeat(")", depth); }

std::string indentation(std::size_t depth) {
  std::string result;
  for (std::size_t level = 0; level <= depth; ++level) result += std::string(level, ' ') + "a\n";
  return result;
}

ParserOptions with_max_depth(std::size_t max_depth) {
  ParserOptions options;
  options.max_depth = max_depth;
  return options;
}

ParseError too_deep(const std::string& document, std::size_t max_depth) {
  try {
    const std::vector<Link> links = Parser(with_max_depth(max_depth)).parse(document);
    ADD_FAILURE() << "expected " << document << " to be too deep, got " << format_links(links);
  } catch (const ParseError& error) {
    if (error.kind() == ParseError::Kind::nesting) return error;
    ADD_FAILURE() << "expected " << document << " to be too deep, got " << error.what();
    return error;
  }
  throw std::logic_error("the document parsed");
}

bool accepted(const std::string& document, std::size_t max_depth) {
  try {
    Parser(with_max_depth(max_depth)).parse(document);
  } catch (const ParseError&) {
    return false;
  }
  return true;
}

bool parses(const std::string& document) {
  try {
    parse(document);
  } catch (const ParseError&) {
    return false;
  }
  return true;
}

}  // namespace

TEST(NestingLimitTests, TestDefaultLimitIsSharedByEveryImplementation) {
  EXPECT_EQ(default_max_depth, 64u);
  EXPECT_EQ(ParserOptions{}.max_depth, default_max_depth);
}

TEST(NestingLimitTests, TestParenthesesUpToTheLimitAreAccepted) {
  EXPECT_TRUE(accepted(parens(3), 3));
  EXPECT_TRUE(accepted(values(3), 3));
  EXPECT_TRUE(parses(parens(default_max_depth)));
  EXPECT_TRUE(parses(values(default_max_depth)));
}

TEST(NestingLimitTests, TestParenthesesPastTheLimitAreRefusedAtTheGroupThatIsTooDeep) {
  const ParseError error = too_deep(parens(4), 3);

  EXPECT_EQ(error.max_depth(), std::optional<std::size_t>(3));
  EXPECT_EQ(std::make_tuple(error.line(), error.column(), error.offset()),
            std::make_tuple(std::size_t{1}, std::size_t{4}, std::size_t{3}));
  // The Rust NestingTooDeep displays as its summary and its snippet.
  EXPECT_EQ(error.summary() + "\n" + error.snippet(),
            "line 1, column 4: nesting depth exceeds the maximum of 3\n1 | ((((a))))\n  |    ^");
}

TEST(NestingLimitTests, TestGroupsInValuePositionCountLikeAnyOtherGroup) {
  const ParseError error = too_deep(values(4), 3);

  EXPECT_EQ(std::make_pair(error.line(), error.column()), std::make_pair(std::size_t{1}, std::size_t{10}));
}

TEST(NestingLimitTests, TestIndentationUpToTheLimitIsAccepted) {
  EXPECT_TRUE(accepted(indentation(3), 3));
  EXPECT_TRUE(parses(indentation(default_max_depth)));
}

TEST(NestingLimitTests, TestIndentationPastTheLimitIsRefusedAtTheLineThatIsTooDeep) {
  const ParseError error = too_deep(indentation(4), 3);

  EXPECT_EQ(std::make_pair(error.line(), error.column()), std::make_pair(std::size_t{5}, std::size_t{5}));
  EXPECT_EQ(error.line_text(), "    a");
}

TEST(NestingLimitTests, TestGroupsAndIndentationAddUp) {
  // `(b)` on the line indented once is at level 2.
  EXPECT_TRUE(accepted("a\n  (b)\n", 2));
  const ParseError error = too_deep("a\n  (b)\n", 1);

  EXPECT_EQ(std::make_pair(error.line(), error.column()), std::make_pair(std::size_t{2}, std::size_t{3}));
}

TEST(NestingLimitTests, TestTrailingSpacesOnADeepLineAreNotADeeperLine) {
  EXPECT_TRUE(accepted("a\n  b\n    c   \n", 2));
}

TEST(NestingLimitTests, TestRefusesADocumentFarPastTheLimitWithoutOverflowingTheStack) {
  // Without the limit each of these would overflow a 2 MiB stack and abort the
  // process.
  std::vector<std::size_t> outcome;
  std::vector<std::string> failures;
  run_on_stack(std::size_t{2} << 20, [&outcome, &failures] {
    for (const std::string& document : {parens(100000), values(100000), indentation(2000)}) {
      try {
        parse(document);
        failures.push_back("expected the nesting to be too deep, the document parsed");
      } catch (const ParseError& error) {
        if (error.kind() == ParseError::Kind::nesting && error.max_depth()) {
          outcome.push_back(*error.max_depth());
        } else {
          failures.push_back(std::string("expected the nesting to be too deep, got ") + error.what());
        }
      }
    }
  });

  EXPECT_TRUE(failures.empty()) << (failures.empty() ? "" : failures.front());
  EXPECT_EQ(outcome, std::vector<std::size_t>(3, default_max_depth));
}

TEST(NestingLimitTests, TestStreamParserReportsWhereTheNestingIsTooDeep) {
  StreamParser stream(with_max_depth(1));
  stream.write("a\nb ((c))\n");
  try {
    stream.finish();
    FAIL() << "expected the stream to be too deep";
  } catch (const StreamParseError& error) {
    ASSERT_TRUE(error.location().has_value()) << "the error has a location";
    const StreamPosition& location = *error.location();

    ASSERT_TRUE(error.parse_error().has_value());
    EXPECT_EQ(error.parse_error()->kind(), ParseError::Kind::nesting);
    EXPECT_EQ(std::make_tuple(location.line, location.column, location.offset),
              std::make_tuple(std::size_t{2}, std::size_t{4}, std::size_t{5}));
  }
}
