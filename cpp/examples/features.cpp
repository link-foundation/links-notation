// The features the C++ README shows, each checked against what it prints, so
// the README's snippets stay compilable and correct.

#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

#include "links_notation.hpp"

using namespace links_notation;

namespace {

int failures = 0;

void expect(const std::string& what, const std::string& actual, const std::string& expected) {
  std::cout << what << ": " << actual << '\n';
  if (actual != expected) {
    std::cerr << "  expected: " << expected << '\n';
    ++failures;
  }
}

}  // namespace

int main() {
  // Format configuration: long lines become indented values.
  const FormatConfig config =
      FormatConfig::builder().indent_long_lines(true).max_line_length(20).prefer_inline(false).build();
  expect("format config", format_links(parse("(record: first second third fourth)"), config),
         "record:\n  first\n  second\n  third\n  fourth");

  // Streaming: chunks may split anywhere, and records arrive once complete.
  StreamParser stream;
  std::vector<std::string> streamed;
  stream.on_link([&](const Link& link) { streamed.push_back(link.format()); });
  for (const char* chunk : {"papa (lov", "esMama: loves mama)\nson lo", "vesMama\n"}) stream.write(chunk);
  stream.finish();
  expect("streaming", streamed.size() == 2 ? streamed[0] + " | " + streamed[1] : "wrong count",
         "(papa (lovesMama: loves mama)) | (son lovesMama)");

  // Indented documents: parents and their text children.
  const std::vector<IndentedEntry> entries = parse_indented_document("colors\n  red\n  'light blue'\nempty\n");
  expect("indented document", format_indented_document(entries), "colors\n  red\n  light blue\nempty\n");

  // Groups: a parsed link kept with its indented children.
  const std::vector<LinksGroup> groups = Parser().parse_groups("parent\n  child");
  expect("groups", std::to_string(groups.size()) + " group, " + std::to_string(groups[0].children.size()) + " child",
         "1 group, 1 child");

  // Binary Links Notation: the same document as bytes, and back.
  const BinaryLinoCodec codec;
  const std::vector<std::uint8_t> bytes = codec.encode_text("papa (lovesMama: loves mama)");
  expect("binary", codec.decode_text(bytes),
         format_binary_document(codec.parse_document("papa (lovesMama: loves mama)")));

  return failures == 0 ? EXIT_SUCCESS : EXIT_FAILURE;
}
