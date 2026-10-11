// The stream parser reads a document written in chunks of any size to the
// links the parser reads from it whole, emits only complete records, and keeps
// its memory bounded.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

const std::string document =
    "first loves data\n"
    "# streamed comment\n"
    "profile:\n"
    "  name Ada\n"
    "  note \"line one\nline two\"\n"
    "(nested:\n  child value)\n"
    "last sees first";

// The characters of UTF-8 text, each as its own string.
std::vector<std::string> characters(const std::string& text) {
  std::vector<std::string> result;
  for (std::size_t index = 0; index < text.size();) {
    const auto lead = static_cast<unsigned char>(text[index]);
    const std::size_t length = lead < 0x80 ? 1 : lead < 0xE0 ? 2 : lead < 0xF0 ? 3 : 4;
    result.push_back(text.substr(index, length));
    index += length;
  }
  return result;
}

// The lines of text, each with its line break.
std::vector<std::string> lines_with_breaks(const std::string& text) {
  std::vector<std::string> result;
  std::size_t start = 0;
  while (start < text.size()) {
    const std::size_t end = text.find('\n', start);
    if (end == std::string::npos) {
      result.push_back(text.substr(start));
      break;
    }
    result.push_back(text.substr(start, end + 1 - start));
    start = end + 1;
  }
  return result;
}

}  // namespace

TEST(StreamParserTests, MatchesCanonicalParserOneSymbolAtATime) {
  StreamParser stream;
  for (const std::string& character : characters(document)) {
    stream.write(character);
  }

  EXPECT_EQ(format_links(stream.finish()), format_links(parse(document)));
}

TEST(StreamParserTests, EmitsOnlyCompleteRecords) {
  std::vector<std::string> seen;
  StreamParser stream;
  stream.on_link([&seen](const Link& link) { seen.push_back(link.to_string()); });

  EXPECT_TRUE(stream.write("profile:\n  name Ada\n  note \"first\nsecond\"\n").empty());
  const std::vector<Link> emitted = stream.write("n");

  ASSERT_EQ(emitted.size(), 1u);
  EXPECT_EQ(seen, std::vector<std::string>{emitted[0].to_string()});
}

TEST(StreamParserTests, SupportsLineChunksFinalRecordAndPosition) {
  StreamParser stream;
  for (const std::string& line : lines_with_breaks(document)) {
    stream.write(line);
  }

  EXPECT_EQ(format_links(stream.finish()), format_links(parse(document)));
  EXPECT_EQ(stream.position().offset, document.size());
  EXPECT_EQ(stream.position().buffered, 0u);
}

TEST(StreamParserTests, SupportsDrainResetAndBoundedMemory) {
  std::size_t seen = 0;
  StreamParser stream;
  stream.set_collect(false);
  stream.set_max_buffer_size(8);
  stream.on_link([&seen](const Link&) { ++seen; });
  for (int index = 0; index < 100; ++index) {
    stream.write("a\n");
  }

  EXPECT_TRUE(stream.drain().empty());
  EXPECT_EQ(stream.finish().size(), 1u);
  EXPECT_EQ(seen, 100u);

  stream.reset();
  EXPECT_THROW(stream.write("123456789"), StreamParseError);
}

TEST(StreamParserTests, ProvidesLazyAdapters) {
  ChunkedLinks links = parse_chunks(std::vector<std::string>{"one link\n", "two link"});
  std::vector<std::string> actual;
  while (const std::optional<Link> link = links.next()) {
    actual.push_back(link->to_string());
  }

  EXPECT_EQ(actual, (std::vector<std::string>{"(one link)", "(two link)"}));
}

TEST(StreamParserTests, RejectsWritesAfterFinish) {
  StreamParser stream;
  stream.write("one");
  stream.finish();

  EXPECT_THROW(stream.write("two"), StreamParseError);
}
