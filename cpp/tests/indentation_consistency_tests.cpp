// Indentation consistency: documents that differ only in how far their lines
// are indented read to the same links.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;

namespace {

void expect_same_formatting(const std::string& first, const std::string& second) {
  std::vector<Link> first_links;
  std::vector<Link> second_links;
  ASSERT_NO_THROW(first_links = parse(first)) << "First style should parse successfully";
  ASSERT_NO_THROW(second_links = parse(second)) << "Second style should parse successfully";
  EXPECT_EQ(format_links(first_links), format_links(second_links))
      << "Both indentation styles should produce identical formatted output";
}

}  // namespace

TEST(IndentationConsistencyTests, TestLeadingSpacesVsNoLeadingSpaces) {
  // Example with 2 leading spaces (from issue #135)
  const std::string with_leading =
      "  TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\n  TELEGRAM_ALLOWED_CHATS:\n    -1002975819706\n    "
      "-1002861722681\n  TELEGRAM_HIVE_OVERRIDES:\n    --all-issues\n    --once\n  TELEGRAM_BOT_VERBOSE: true";
  // Example without leading spaces (from issue #135)
  const std::string without_leading =
      "TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\nTELEGRAM_ALLOWED_CHATS:\n  -1002975819706\n  "
      "-1002861722681\nTELEGRAM_HIVE_OVERRIDES:\n  --all-issues\n  --once\nTELEGRAM_BOT_VERBOSE: true";
  expect_same_formatting(with_leading, without_leading);
}

TEST(IndentationConsistencyTests, TestTwoSpacesVsFourSpacesIndentation) {
  // Example with 2 spaces per level
  const std::string two_spaces =
      "TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\nTELEGRAM_ALLOWED_CHATS:\n  -1002975819706\n  "
      "-1002861722681\nTELEGRAM_HIVE_OVERRIDES:\n  --all-issues\n  --once\n  --auto-fork\n  --skip-issues-with-prs\n  "
      "--attach-logs\n  --verbose\n  --no-tool-check\nTELEGRAM_SOLVE_OVERRIDES:\n  --auto-fork\n  --auto-continue\n  "
      "--attach-logs\n  --verbose\n  --no-tool-check\nTELEGRAM_BOT_VERBOSE: true";
  // Example with 4 spaces per level
  const std::string four_spaces =
      "TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\nTELEGRAM_ALLOWED_CHATS:\n    -1002975819706\n    "
      "-1002861722681\nTELEGRAM_HIVE_OVERRIDES:\n    --all-issues\n    --once\n    --auto-fork\n    "
      "--skip-issues-with-prs\n    --attach-logs\n    --verbose\n    --no-tool-check\nTELEGRAM_SOLVE_OVERRIDES:\n    "
      "--auto-fork\n    --auto-continue\n    --attach-logs\n    --verbose\n    --no-tool-check\nTELEGRAM_BOT_VERBOSE: "
      "true";
  expect_same_formatting(two_spaces, four_spaces);
}

TEST(IndentationConsistencyTests, TestSimpleTwoVsFourSpacesIndentation) {
  expect_same_formatting("parent:\n  child1\n  child2", "parent:\n    child1\n    child2");
}

TEST(IndentationConsistencyTests, TestThreeLevelNestingWithDifferentIndentation) {
  expect_same_formatting("level1:\n  level2:\n    level3a\n    level3b\n  level2b",
                         "level1:\n    level2:\n        level3a\n        level3b\n    level2b");
}
