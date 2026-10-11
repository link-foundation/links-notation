// Reading nested groups takes time that grows with the size of the document,
// not with two to the power of its nesting depth (issue #314). Each case runs
// on its own thread and fails when it has not finished within the budget, so a
// regression fails instead of hanging.

#include <gtest/gtest.h>

#include <chrono>
#include <exception>
#include <future>
#include <limits>
#include <memory>
#include <stdexcept>
#include <thread>
#include <type_traits>
#include <utility>

#include "stack_thread.hpp"
#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

// Generous enough for a debug build on a slow machine, and far below what the
// exponential and quadratic readings took at the depths used here.
constexpr std::chrono::seconds budget(5);

// The depth used for the shapes that used to take exponential time.
constexpr std::size_t deep = 32;

// The depth used for the shapes that used to take quadratic time.
constexpr std::size_t very_deep = 4096;

// Runs `work` on a thread with a large stack, so only time is measured, and
// fails when it does not finish within the budget. A thread that overruns is
// left behind with the state it shares.
template <typename Work>
auto within_budget(const std::string& what, Work work) -> std::invoke_result_t<Work> {
  using Result = std::invoke_result_t<Work>;
  auto task = std::make_shared<std::packaged_task<Result()>>(std::move(work));
  std::future<Result> future = task->get_future();
  // Deep nesting recurses deeply; give it room so only time is measured.
  std::thread([task] { run_on_stack(std::size_t{512} << 20, [&task] { (*task)(); }); }).detach();
  if (future.wait_for(budget) != std::future_status::ready) {
    throw std::runtime_error(what + " did not finish within 5s");
  }
  return future.get();
}

// Parses a document that nests deeper than the default limit on purpose: only
// the time it takes is measured here.
std::vector<Link> parse_very_deep(const std::string& source) {
  ParserOptions options;
  options.max_depth = std::numeric_limits<std::size_t>::max();
  return Parser(options).parse(source);
}

std::string repeat(const std::string& text, std::size_t count) {
  std::string result;
  for (std::size_t index = 0; index < count; ++index) result += text;
  return result;
}

std::string closed(std::size_t depth) { return repeat("(", depth) + "a" + repeat(")", depth); }

std::string value_after(std::size_t depth) { return repeat("(", depth) + "a" + repeat(") b", depth); }

std::string unclosed(std::size_t depth) { return repeat("(", depth) + "a"; }

// Unclosed groups on lines that are each indented one space deeper.
std::string indented_unclosed(std::size_t depth) {
  std::string result;
  for (std::size_t level = 0; level < depth; ++level) {
    if (level > 0) result += '\n';
    result += std::string(level, ' ') + "(a";
  }
  return result;
}

bool fails(const std::string& source) {
  try {
    parse(source);
  } catch (const ParseError&) {
    return true;
  }
  return false;
}

}  // namespace

TEST(NestingDepthTests, ClosedGroupsReadInLinearTime) {
  const std::string source = closed(deep);
  const std::string formatted = within_budget("closed groups", [source] { return format_links(parse(source)); });
  EXPECT_EQ(formatted, source);
}

TEST(NestingDepthTests, ValuesAfterGroupsReadInLinearTime) {
  const std::string source = value_after(deep);
  const std::string formatted = within_budget("values after groups", [source] { return format_links(parse(source)); });
  EXPECT_EQ(formatted, "(" + source + ")");
}

TEST(NestingDepthTests, UnclosedGroupsFailInLinearTime) {
  const std::string source = unclosed(deep);
  EXPECT_TRUE(within_budget("unclosed groups", [source] { return fails(source); }));
}

TEST(NestingDepthTests, UnclosedGroupsOnIndentedLinesFailInLinearTime) {
  const std::string source = indented_unclosed(deep);
  EXPECT_TRUE(within_budget("unclosed indented groups", [source] { return fails(source); }));
}

TEST(NestingDepthTests, ParseLinoToLinksDoesNotCopyEachLevel) {
  const std::string source = closed(very_deep);
  const std::string formatted =
      within_budget("very deep closed groups", [source] { return format_links(parse_very_deep(source)); });
  EXPECT_EQ(formatted, source);
}

TEST(NestingDepthTests, ValuesAfterVeryDeepGroupsReadInLinearTime) {
  const std::string source = value_after(very_deep);
  const std::size_t length = source.size();
  // A document parses only when all of it is read.
  const bool parsed = within_budget("very deep values after groups", [source] {
    try {
      parse_very_deep(source);
    } catch (const ParseError&) {
      return false;
    }
    return true;
  });
  EXPECT_TRUE(parsed) << "all " << length << " bytes should be read";
}

TEST(NestingDepthTests, GroupFollowedByValuesKeepsItsStructure) {
  const std::vector<std::pair<std::string, std::string>> cases = {
      {"(a) b", "((a) b)"},           {"(a) (b) c", "((a) (b) c)"},
      {"((a) b) c", "(((a) b) c)"},   {"(a: b) c", "((a: b) c)"},
      {"(a)\n(b) c", "(a)\n((b) c)"}, {"x\n  (a) b\n  (c)", "(x)\n((x) ((a) b))\n((x) (c))"},
  };
  for (const auto& [source, expected] : cases) {
    EXPECT_EQ(format_links(parse(source)), expected) << source;
  }
}
