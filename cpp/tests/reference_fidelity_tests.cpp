// Exact references: every fixture of docs/protocol/reference-literals.txt
// survives formatting, streaming at any split and the binary codec, and the
// literals of docs/protocol/invalid-reference-literals.txt are refused.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

/// The references of the shared fixture file; `-` is the empty reference.
std::vector<std::string> fixtures() {
  std::vector<std::string> result;
  for (const std::string& line : lines(read_repository_file("docs/protocol/reference-literals.txt"))) {
    if (!line.empty() && line[0] == '#') continue;
    result.push_back(line == "-" ? std::string() : text_from_hex(line));
  }
  return result;
}

/// A link with an id and values.
Link link(const std::string& id, std::vector<Link> values) {
  return Link(std::optional<std::string>(id), std::move(values));
}

}  // namespace

// Also covers Go's TestNativeReferenceFidelity, whose three writings (plain,
// less parentheses, indented by reference count 1) are the ones checked here.
TEST(ReferenceFidelityTests, NativeReferenceFidelity) {
  const std::vector<std::string> references = fixtures();
  ASSERT_FALSE(references.empty());
  for (const std::string& reference : references) {
    const std::vector<Link> original = {link(reference, {Link(reference), link("nested", {Link(reference)})})};
    const std::string hex = to_hex(reference);
    EXPECT_EQ(parse(format_links(original)), original) << hex;
    for (const FormatConfig& config : {FormatConfig::builder().less_parentheses(true).build(),
                                       FormatConfig::builder().max_inline_refs(1).prefer_inline(false).build()}) {
      const std::string text = format_links(original, config);
      EXPECT_EQ(parse(text), original) << hex << " written as " << text;
    }
    // Go formats the single link itself rather than the document.
    for (const std::string& text : {original[0].format(false), original[0].format(true)}) {
      EXPECT_EQ(parse(text), original) << hex << " written as " << text;
    }
  }
}

// Also covers Go's TestReferenceLiteralsAtEveryChunkSplit, which additionally
// writes the reference with escape_reference and splits at every byte.
TEST(ReferenceFidelityTests, ReferenceLiteralsAtEveryChunkSplit) {
  const std::vector<std::string> references = fixtures();
  ASSERT_FALSE(references.empty());
  for (const std::string& reference : references) {
    const std::string hex = to_hex(reference);
    EXPECT_EQ(decode_reference_literal(encode_reference_literal(reference)), reference) << hex;
    for (const std::string& literal :
         {format_binary_reference(reference), encode_reference_literal(reference), escape_reference(reference)}) {
      const std::string text = "(root: " + literal + ")\n(" + literal + ": fixture)";
      const std::vector<Link> expected = {link("root", {Link(reference)}), link(reference, {Link("fixture")})};
      EXPECT_EQ(parse(text), expected) << hex << " in " << text;
      for (std::size_t split = 0; split <= text.size(); ++split) {
        StreamParser stream;
        stream.write(std::string_view(text).substr(0, split));
        stream.write(std::string_view(text).substr(split));
        EXPECT_EQ(stream.finish(), expected) << hex << " in " << text << " split at " << split;
      }
    }
  }
}

TEST(ReferenceFidelityTests, BinaryReferenceFidelity) {
  const BinaryLinoCodec codec;
  for (const std::string& reference : fixtures()) {
    const std::vector<Link> original = {link(reference, {Link(reference)})};
    const std::vector<Link> decoded = codec.decode(codec.encode(original));
    EXPECT_EQ(decoded, original) << to_hex(reference);
    EXPECT_EQ(parse(format_binary_document(decoded)), original) << to_hex(reference);
  }
}

TEST(ReferenceFidelityTests, MalformedReferenceLiteralsAreRejected) {
  for (const std::string& literal : lines(read_repository_file("docs/protocol/invalid-reference-literals.txt"))) {
    if (!literal.empty() && literal[0] == '#') continue;
    EXPECT_THROW(decode_reference_literal(literal), std::invalid_argument) << literal;
    EXPECT_THROW(parse(literal), ParseError) << literal;
  }
  EXPECT_EQ(decode_reference_literal("~1{C3A9}"), "\xC3\xA9");
}
