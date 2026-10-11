// Binary links notation: the shared vectors in
// docs/protocol/binary-links-notation-vectors.txt, the budgets that bound
// decoding, and malformed input.

#include <gtest/gtest.h>

#include <sstream>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

std::string replace_line_breaks(const std::string& text) {
  std::string result;
  for (std::size_t index = 0; index < text.size(); ++index) {
    if (text[index] == '\\' && index + 1 < text.size() && text[index + 1] == 'n') {
      result += '\n';
      ++index;
    } else {
      result += text[index];
    }
  }
  return result;
}

template <typename Function>
std::string error_of(Function function) {
  try {
    function();
  } catch (const BinaryError& error) {
    return error.what();
  }
  return "";
}

}  // namespace

TEST(BinaryNotationTests, StringBudgetStopsBeforeLaterScalars) {
  BinaryLinoCodec codec;
  codec.limits.max_string_bytes = 1;
  const std::string error =
      error_of([&] { codec.decode(from_hex("13024605011001030000009fffffff9effffff0028ffff06")); });
  EXPECT_NE(error.find("string budget exceeded"), std::string::npos) << error;
}

TEST(BinaryNotationTests, SharedVectors) {
  std::size_t count = 0;
  for (const std::string& line : lines(read_repository_file("docs/protocol/binary-links-notation-vectors.txt"))) {
    if (line.empty() || line[0] == '#') continue;
    const std::vector<std::string> fields = split(line, '\t');
    const std::vector<std::uint8_t> want = from_hex(fields.back());
    if (fields[0] == "document") {
      BinaryLinoCodec codec(BinaryLinoOptions{fields[2] == "external", ArityRange::parse(fields[3]), fields[4] == "packed"});
      const std::vector<Link> model = codec.parse_document(replace_line_breaks(fields[1]));
      EXPECT_EQ(to_hex(codec.encode(model)), to_hex(want)) << line;
      EXPECT_EQ(codec.decode(want), model) << line;
    } else {
      const std::vector<PacketLink> links = parse_packet_links(fields[1]);
      const LinksPacket packet = LinksPacket::pack(fields[2] == "external", links, fields[3] == "packed");
      EXPECT_EQ(to_hex(packet.to_bytes()), to_hex(want)) << line;
      EXPECT_EQ(LinksPacket::from_bytes(want).links(), links) << line;
    }
    ++count;
  }
  EXPECT_EQ(count, 96u);
}

TEST(BinaryNotationTests, NativeModels) {
  for (const char* source : {"", "()", "\"\"", "a", "(a)", "((a))", "(a b c)", "(\"\": () \"\" (b))", "a:\n  b\n  c",
                             "\"#x\" \"λ😀\" \"007\" \"18446744073709551615\"", "# comment\n(a # tail\n b)"}) {
    const std::vector<Link> model = parse(source);
    for (const bool external : {false, true}) {
      for (const char* arity : {"2", "2..3", "1.."}) {
        for (const bool packed : {false, true}) {
          BinaryLinoCodec codec(BinaryLinoOptions{external, ArityRange::parse(arity), packed});
          EXPECT_EQ(codec.decode(codec.encode(model)), model) << source << ' ' << arity;
        }
      }
    }
  }
}

TEST(BinaryNotationTests, LimitsAndMalformed) {
  const std::vector<Link> model{Link(std::nullopt, {Link("abcdef")})};
  BinaryLinoCodec codec;
  const std::vector<std::uint8_t> data = codec.encode(model);
  for (int index = 0; index < 5; ++index) {
    DecodeLimits limits;
    switch (index) {
      case 0:
        limits.max_nodes = 1;
        break;
      case 1:
        limits.max_string_bytes = 2;
        break;
      case 2:
        limits.max_depth = 1;
        break;
      case 3:
        limits.max_links = 1;
        break;
      default:
        limits.max_references = 1;
        break;
    }
    codec.limits = limits;
    EXPECT_THROW(codec.decode(data), BinaryError) << "decode ignored limit " << index;
    EXPECT_THROW(codec.encode(model), BinaryError) << "encode ignored limit " << index;
  }
  codec = BinaryLinoCodec();
  for (const char* hex : {"", "20", "1e00", "1001", "100000", "10ffffffffffffffffffff"}) {
    EXPECT_THROW(codec.decode(from_hex(hex)), BinaryError) << "accepted malformed " << hex;
  }
}

TEST(BinaryNotationTests, StreamsUint64TruncationAndDepth) {
  for (const bool external : {false, true}) {
    const std::vector<PacketLink> links =
        parse_packet_links(external ? "6:#0 #9223372036854775807" : "6:0 18446744073709551615");
    const std::vector<std::uint8_t> data = LinksPacket::pack(external, links, true).to_bytes();
    std::stringstream stream(std::string(data.begin(), data.end()) + std::string(data.begin(), data.end()));
    for (int index = 0; index < 2; ++index) {
      const std::optional<LinksPacket> packet = LinksPacket::read_from(stream);
      ASSERT_TRUE(packet.has_value());
      EXPECT_EQ(packet->links(), links);
      EXPECT_EQ(static_cast<std::size_t>(stream.tellg()), (index + 1) * data.size());
    }
    EXPECT_FALSE(LinksPacket::read_from(stream).has_value());
    for (std::size_t end = 0; end < data.size(); ++end) {
      const std::vector<std::uint8_t> prefix(data.begin(), data.begin() + static_cast<std::ptrdiff_t>(end));
      EXPECT_THROW(LinksPacket::from_bytes(prefix), BinaryError) << "accepted truncated prefix " << end;
    }
  }
  std::vector<Link> document{Link("leaf")};
  for (int index = 0; index < 70; ++index) document = {Link(std::nullopt, document)};
  BinaryLinoCodec codec;
  EXPECT_THROW(codec.encode(document), BinaryError);
  codec.limits.max_depth = 80;
  EXPECT_EQ(codec.decode(codec.encode(document)), document);
}
