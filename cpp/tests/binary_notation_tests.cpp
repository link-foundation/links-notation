// Binary links notation: the shared vectors in
// docs/protocol/binary-links-notation-vectors.txt, the budgets that bound
// decoding, and malformed input. Ports go/binary_test.go and
// rust/links-notation/tests/binary_notation_tests.rs.

#include <gtest/gtest.h>

#include <algorithm>
#include <cstdint>
#include <functional>
#include <ios>
#include <istream>
#include <limits>
#include <sstream>
#include <streambuf>
#include <string>
#include <utility>
#include <vector>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

constexpr std::uint64_t max_u64 = std::numeric_limits<std::uint64_t>::max();
constexpr std::uint64_t max_i64 = static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());

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
  } catch (const std::exception& error) {
    return std::string("unexpected exception: ") + error.what();
  }
  return "";
}

const std::vector<std::string> corpus = {
    "() ((1 1))",
    "((1: 1 1)) ((1: 1 2))",
    "((1 1)) ()",
    "((1: 1 1)) ()",
    "(($i: $s $t)) (($i: $s $t))",
    "((($index: $source $target)) (($index: $target $source)))",
    "(a b c d)",
    "(name: 'with space' \"it's\")",
    "((a))",
    "(((a)))",
    "(a (b c) ((d)))",
    "1\n2\n3",
    "hello",
    "😀 привет 世界",
    "0",
    "007",
    "9223372036854775807",
    "9223372036854775808",
    "18446744073709551615",
    "18446744073709551616",
    "'multi\nline'",
    ".dot",
    "'a''b\"c`d'",
    "(1: (2: 3 4) 5)",
    "() ()",
    "(* *)",
    "(type: type type)",
};

/// Bytes as space-separated lowercase hexadecimal, like the vectors file.
std::string hex(const std::vector<std::uint8_t>& bytes) {
  const std::string digits = to_hex(bytes);
  std::string result;
  for (std::size_t index = 0; index < digits.size(); index += 2) {
    if (index > 0) result += ' ';
    result += digits.substr(index, 2);
  }
  return result;
}

bool references_option(const std::string& field) {
  if (field == "plain") return false;
  if (field == "external") return true;
  throw std::invalid_argument("unknown references option " + field);
}

bool widths_option(const std::string& field) {
  if (field == "uniform") return false;
  if (field == "packed") return true;
  throw std::invalid_argument("unknown widths option " + field);
}

/// `address:reference reference…` separated by `;`, `#v` being external.
std::vector<PacketLink> parse_links(const std::string& text) {
  std::vector<PacketLink> result;
  for (const std::string& link : split(text, ';')) {
    const std::size_t colon = link.find(':');
    if (colon == std::string::npos) throw std::invalid_argument("bad link " + link);
    PacketLink parsed{std::stoull(link.substr(0, colon)), {}};
    for (const std::string& reference : split(link.substr(colon + 1), ' ')) {
      if (!reference.empty() && reference[0] == '#') {
        parsed.references.push_back(Reference::external_value(std::stoull(reference.substr(1))));
      } else {
        parsed.references.push_back(Reference::to(std::stoull(reference)));
      }
    }
    result.push_back(std::move(parsed));
  }
  return result;
}

/// The vectors shared by every implementation: each must write and read
/// exactly these bytes.
std::vector<std::vector<std::string>> golden_vectors() {
  std::vector<std::vector<std::string>> result;
  for (const std::string& line : lines(read_repository_file("docs/protocol/binary-links-notation-vectors.txt"))) {
    if (line.empty() || line[0] == '#') continue;
    result.push_back(split(line, '\t'));
  }
  return result;
}

ArityRange doublets() { return ArityRange::exact(2); }
ArityRange between(std::uint64_t min, std::uint64_t max) { return ArityRange{min, max}; }
ArityRange at_least(std::uint64_t min) { return ArityRange{min, std::nullopt}; }

std::string describe(const ArityRange& arity) {
  std::string text = std::to_string(arity.min) + "..";
  if (arity.max) text += std::to_string(*arity.max);
  return text;
}

std::string describe(const BinaryLinoOptions& options) {
  return std::string("{external_references: ") + (options.external_references ? "true" : "false") +
         ", arity: " + describe(options.arity) + ", packed_widths: " + (options.packed_widths ? "true" : "false") + "}";
}

std::vector<BinaryLinoOptions> binary_options() {
  std::vector<BinaryLinoOptions> options;
  for (const bool external_references : {false, true}) {
    for (const ArityRange& arity : {doublets(), between(2, 3), at_least(1)}) {
      for (const bool packed_widths : {false, true}) {
        options.push_back(BinaryLinoOptions{external_references, arity, packed_widths});
      }
    }
  }
  return options;
}

BinaryLinoOptions with_external_references(BinaryLinoOptions options, bool value) {
  options.external_references = value;
  return options;
}

BinaryLinoOptions with_arity(BinaryLinoOptions options, ArityRange arity) {
  options.arity = arity;
  return options;
}

BinaryLinoOptions with_packed_widths(BinaryLinoOptions options, bool value) {
  options.packed_widths = value;
  return options;
}

/// The canonical document model of the text helpers.
std::vector<Link> parse_document(const std::string& text) { return BinaryLinoCodec().parse_document(text); }

LinksPacket encode_document(const std::vector<Link>& document, const BinaryLinoOptions& options) {
  return BinaryLinoCodec(options).encode_packet(document);
}

std::vector<Link> decode_document(const LinksPacket& packet, const DecodeLimits& limits) {
  return BinaryLinoCodec(BinaryLinoOptions{}, limits).decode_packet(packet);
}

Link wrap(Link link) { return Link(std::nullopt, {std::move(link)}); }

std::string many_links(std::size_t count) {
  // Distinct pairs of distinct names keep every link unique.
  std::string text;
  for (std::size_t index = 0; index < count; ++index) {
    if (index > 0) text += '\n';
    text += "(n" + std::to_string(index) + " m" + std::to_string(index) + ")";
  }
  return text;
}

std::vector<int> section_widths(const LinksPacket& packet) {
  std::vector<int> widths;
  for (const Section& section : packet.sections) widths.push_back(section.width);
  return widths;
}

std::vector<std::size_t> link_lengths(const LinksPacket& packet) {
  std::vector<std::size_t> lengths;
  for (const PacketLink& link : packet.links()) lengths.push_back(link.references.size());
  return lengths;
}

/// Consecutive addresses starting at `first`.
std::vector<PacketLink> addressed(std::uint64_t first, std::vector<std::vector<Reference>> links) {
  std::vector<PacketLink> result;
  for (std::vector<Reference>& link : links) result.push_back(PacketLink{first++, std::move(link)});
  return result;
}

/// The width `pack` chooses for a link referring to `address`: the address
/// tier of the Rust packet module.
std::uint8_t address_tier(std::uint64_t address, bool external_references) {
  return LinksPacket::pack(external_references, {PacketLink{1, {Reference::to(address)}}}, false).sections.at(0).width;
}

std::uint8_t external_tier(std::uint64_t value) {
  return LinksPacket::pack(true, {PacketLink{1, {Reference::external_value(value)}}}, false).sections.at(0).width;
}

std::string decode_error(const std::vector<std::uint8_t>& bytes, const DecodeLimits& limits) {
  return error_of([&] { BinaryLinoCodec(BinaryLinoOptions{}, limits).decode(bytes); });
}

void write_leb128(std::vector<std::uint8_t>& out, std::uint64_t value) {
  for (;;) {
    const auto byte = static_cast<std::uint8_t>(value & 0x7F);
    value >>= 7;
    if (value == 0) {
      out.push_back(byte);
      return;
    }
    out.push_back(byte | 0x80);
  }
}

/// Serves `before`, then fails once when `fail` is set, then serves `after`,
/// one byte per refill.
class Hiccup : public std::streambuf {
 public:
  Hiccup(std::string before, bool fail, std::string after)
      : before_(std::move(before)), fail_(fail), after_(std::move(after)) {}

 protected:
  int_type underflow() override {
    if (position_ == before_.size() && fail_) {
      fail_ = false;
      throw std::ios_base::failure("connection reset");
    }
    const std::string& source = position_ < before_.size() ? before_ : after_;
    const std::size_t index = position_ < before_.size() ? position_ : position_ - before_.size();
    if (index >= source.size()) return traits_type::eof();
    current_ = source[index];
    ++position_;
    setg(&current_, &current_, &current_ + 1);
    return traits_type::to_int_type(current_);
  }

 private:
  std::string before_;
  bool fail_;
  std::string after_;
  std::size_t position_ = 0;
  char current_ = 0;
};

}  // namespace

TEST(BinaryNotationTests, StringBudgetStopsBeforeLaterScalars) {
  BinaryLinoCodec codec;
  codec.limits.max_string_bytes = 1;
  const std::string error =
      error_of([&] { codec.decode(from_hex("13024605011001030000009fffffff9effffff0028ffff06")); });
  EXPECT_NE(error.find("string budget exceeded"), std::string::npos) << error;

  const LinksPacket packet =
      LinksPacket::pack(true,
                        {PacketLink{6,
                                    {Reference::to(3), Reference::external_value(97), Reference::external_value(98),
                                     Reference::external_value(0xd800)}},
                         PacketLink{7, {Reference::to(6)}}},
                        true);
  DecodeLimits limits;
  limits.max_string_bytes = 1;
  EXPECT_THROW(decode_document(packet, limits), BinaryError);
}

TEST(BinaryNotationTests, SharedVectors) {
  std::size_t count = 0;
  for (const std::string& line : lines(read_repository_file("docs/protocol/binary-links-notation-vectors.txt"))) {
    if (line.empty() || line[0] == '#') continue;
    const std::vector<std::string> fields = split(line, '\t');
    const std::vector<std::uint8_t> want = from_hex(fields.back());
    if (fields[0] == "document") {
      BinaryLinoCodec codec(
          BinaryLinoOptions{fields[2] == "external", ArityRange::parse(fields[3]), fields[4] == "packed"});
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

TEST(BinaryNotationTests, GoldenDocumentsAreStable) {
  std::size_t checked = 0;
  for (const std::vector<std::string>& fields : golden_vectors()) {
    if (fields[0] != "document") continue;
    ASSERT_EQ(fields.size(), 6u) << "bad document vector";
    const std::string text = replace_line_breaks(fields[1]);
    const BinaryLinoOptions options{references_option(fields[2]), ArityRange::parse(fields[3]),
                                    widths_option(fields[4])};
    const std::string& expected = fields[5];
    const std::vector<Link> document = parse_document(text);
    const BinaryLinoCodec binary(options);
    EXPECT_EQ(hex(binary.encode(document)), expected) << text << " with " << describe(options);
    EXPECT_EQ(binary.decode(from_hex(expected)), document) << text << " with " << describe(options);
    ++checked;
  }
  EXPECT_GE(checked, 80u) << "only " << checked << " document vectors";
}

TEST(BinaryNotationTests, GoldenPacketsAreStable) {
  std::size_t checked = 0;
  for (const std::vector<std::string>& fields : golden_vectors()) {
    if (fields[0] != "links") continue;
    ASSERT_EQ(fields.size(), 5u) << "bad links vector";
    const std::vector<PacketLink> links = parse_links(fields[1]);
    const std::string& expected = fields[4];
    const LinksPacket packet = LinksPacket::pack(references_option(fields[2]), links, widths_option(fields[3]));
    EXPECT_EQ(hex(packet.to_bytes()), expected) << fields[1];
    const LinksPacket read = LinksPacket::from_bytes(from_hex(expected), DecodeLimits{});
    EXPECT_EQ(read, packet) << fields[1];
    EXPECT_EQ(read.links(), links) << fields[1];
    ++checked;
  }
  EXPECT_GE(checked, 10u) << "only " << checked << " links vectors";
}

TEST(BinaryNotationTests, EveryOptionSetRoundTripsTheCorpus) {
  for (const std::string& text : corpus) {
    const std::vector<Link> document = parse_document(text);
    for (const BinaryLinoOptions& options : binary_options()) {
      const BinaryLinoCodec binary(options);
      const std::vector<std::uint8_t> bytes = binary.encode(document);
      ASSERT_FALSE(bytes.empty());
      EXPECT_TRUE(bytes[0] >= 0x10 && bytes[0] <= 0x1F) << text;
      EXPECT_EQ(binary.decode(bytes), document) << text << " with " << describe(options);
    }
  }
}

TEST(BinaryNotationTests, CanonicalTextRoundTripsTheCorpus) {
  for (const std::string& text : corpus) {
    const std::vector<Link> document = parse_document(text);
    const std::string canonical = format_binary_document(document);
    EXPECT_EQ(parse_document(canonical), document) << text << " -> " << canonical;
  }
  EXPECT_EQ(format_binary_document(parse_document("(()((1 1)))")), "() ((1 1))");
  EXPECT_EQ(format_binary_document(parse_document("((1: 1 1)) ((1: 1 2))")), "((1: 1 1)) ((1: 1 2))");
  // Rust tells an id without values from a reference and writes it "(a:)";
  // here such a link is the reference itself, which reads back the same.
  const Link empty_named_link(std::optional<std::string>("a"), {});
  EXPECT_EQ(parse_document(format_binary_document({empty_named_link})), std::vector<Link>{Link("a")});
  EXPECT_EQ(parse_document("(a:)"), std::vector<Link>{Link("a")});
}

TEST(BinaryNotationTests, ReferencesAreQuotedOnlyWhenNeeded) {
  EXPECT_EQ(format_binary_reference("plain"), "plain");
  EXPECT_EQ(format_binary_reference("$x"), "$x");
  EXPECT_EQ(format_binary_reference(""), "~1{}");
  EXPECT_EQ(format_binary_reference("a b"), "'a b'");
  EXPECT_EQ(format_binary_reference("it's"), "\"it's\"");
  EXPECT_EQ(format_binary_reference("'\""), "`'\"`");
  EXPECT_EQ(format_binary_reference("'\"`"), "\"\"\"'\"`\"\"\"");
  for (const std::string reference : {"", "a b", "a:b", "(x)", "it's", "'\"", "'\"`", "tab\there", "a\nb", "'x", "x'",
                                      "'", "''", "'''", "\"'`x`'\"", "a''''b\"\"`", "`'\"\"\"'''``", "(a) ''"}) {
    const std::vector<Link> document = parse_document(format_binary_reference(reference));
    EXPECT_EQ(format_binary_document(document), format_binary_reference(reference)) << reference;
    EXPECT_EQ(document, std::vector<Link>{Link(reference)}) << reference;
  }
}

TEST(BinaryNotationTests, WidthTiersFollowTheNumberOfLinks) {
  EXPECT_EQ(address_tier(0, false), 1);
  EXPECT_EQ(address_tier(255, false), 1);
  EXPECT_EQ(address_tier(256, false), 2);
  EXPECT_EQ(address_tier(65'535, false), 2);
  EXPECT_EQ(address_tier(65'536, false), 4);
  EXPECT_EQ(address_tier(std::numeric_limits<std::uint32_t>::max(), false), 4);
  EXPECT_EQ(address_tier(std::uint64_t{std::numeric_limits<std::uint32_t>::max()} + 1, false), 8);
  // External references take the top bit, halving every range.
  EXPECT_EQ(address_tier(127, true), 1);
  EXPECT_EQ(address_tier(128, true), 2);
  EXPECT_EQ(address_tier(32'767, true), 2);
  EXPECT_EQ(address_tier(32'768, true), 4);
  EXPECT_EQ(address_tier(max_u64, false), 8);
  // No width holds an internal address in the external half.
  EXPECT_THROW(address_tier(std::uint64_t{1} << 63, true), BinaryError);
  // The internal capacity of 8 bytes, without and with external references.
  EXPECT_EQ(address_tier(max_u64, false), 8);
  EXPECT_EQ(address_tier(max_i64, true), 8);
  EXPECT_THROW(address_tier(max_i64 + 1, true), BinaryError);
  // The external capacity of one byte is 127.
  EXPECT_EQ(external_tier(127), 1);
  EXPECT_EQ(external_tier(128), 2);
}

TEST(BinaryNotationTests, ExternalReferencesMatchPlatformDataHybrid) {
  for (const std::uint8_t width : {1, 2, 4, 8}) {
    const unsigned bits = width * 8u - 1;
    const std::uint64_t capacity = (std::uint64_t{1} << bits) - 1;
    for (const std::uint64_t value :
         {std::uint64_t{0}, std::uint64_t{1}, std::uint64_t{2}, std::uint64_t{100}, capacity}) {
      const LinksPacket packet{true, {Section{0, ArityRange::exact(1), width, {{Reference::external_value(value)}}}}};
      const LinksPacket read = LinksPacket::from_bytes(packet.to_bytes());
      EXPECT_EQ(read.links().at(0).references.at(0), Reference::external_value(value)) << value << " @ " << int{width};
    }
    // The largest internal value is no external.
    const LinksPacket packet{true, {Section{0, ArityRange::exact(1), width, {{Reference::to(capacity)}}}}};
    EXPECT_EQ(LinksPacket::from_bytes(packet.to_bytes()).links().at(0).references.at(0), Reference::to(capacity))
        << int{width};
  }
  // Externals 1 and 0 at width 1 are the raw bytes 0xFF and 0x80.
  const LinksPacket packet{true,
                           {Section{5, doublets(), 1, {{Reference::external_value(1), Reference::external_value(0)}}}}};
  EXPECT_EQ(hex(packet.to_bytes()), "11 01 ff 80");
}

TEST(BinaryNotationTests, UniformWidthsGrowPast256AddressesAndPackedWidthsStaySmall) {
  const LinksPacket small = encode_document(parse_document(many_links(3)), BinaryLinoOptions{});
  EXPECT_EQ(section_widths(small), std::vector<int>{1});

  const std::vector<Link> document = parse_document(many_links(400));
  const LinksPacket uniform = encode_document(document, BinaryLinoOptions{});
  EXPECT_EQ(section_widths(uniform), std::vector<int>{2});
  const std::vector<std::uint8_t> uniform_bytes = uniform.to_bytes();
  const std::size_t header = 1 + 2;  // header byte + two-byte LEB128 count
  EXPECT_EQ(uniform_bytes.size(), header + uniform.links().size() * 2 * 2);

  const LinksPacket packed = encode_document(document, with_packed_widths(BinaryLinoOptions{}, true));
  const std::vector<int> packed_widths = section_widths(packed);
  ASSERT_FALSE(packed_widths.empty());
  EXPECT_EQ(packed_widths[0], 1);
  EXPECT_NE(std::find(packed_widths.begin(), packed_widths.end(), 2), packed_widths.end());
  const std::vector<std::uint8_t> packed_bytes = packed.to_bytes();
  EXPECT_LT(packed_bytes.size(), uniform_bytes.size());
  const DecodeLimits limits;
  for (const std::vector<std::uint8_t>& bytes : {uniform_bytes, packed_bytes}) {
    const LinksPacket packet = LinksPacket::from_bytes(bytes, limits);
    EXPECT_EQ(decode_document(packet, limits), document);
  }
}

TEST(BinaryNotationTests, PackedWidthsNeverTakeMoreBytesThanUniformOnes) {
  std::vector<std::string> texts = corpus;
  texts.push_back(many_links(200));
  texts.push_back("(1000 1)");
  for (const std::string& text : texts) {
    const std::vector<Link> document = parse_document(text);
    for (const BinaryLinoOptions& options : binary_options()) {
      if (!options.packed_widths) continue;
      const LinksPacket packed = encode_document(document, options);
      const LinksPacket uniform = encode_document(document, with_packed_widths(options, false));
      EXPECT_LE(packed.to_bytes().size(), uniform.to_bytes().size()) << text << " with " << describe(options);
    }
  }
}

TEST(BinaryNotationTests, LargeExternalValuesWidenOnlyTheirSection) {
  const BinaryLinoOptions options = with_packed_widths(with_external_references(BinaryLinoOptions{}, true), true);
  EXPECT_EQ(section_widths(encode_document(parse_document("(100 1)"), options)), std::vector<int>{1});
  EXPECT_EQ(section_widths(encode_document(parse_document("(70000 1)"), options)), (std::vector<int>{4, 1}));
  // Beyond 63 bits the number falls back to in-band unary links.
  const LinksPacket packet = encode_document(parse_document("18446744073709551615"), options);
  EXPECT_GT(packet.links().size(), 60u);
}

TEST(BinaryNotationTests, ArityOptionsChooseDoubletsTripletsOrAnyLength) {
  const std::vector<Link> document = parse_document("(a b c)\n(d e)");
  const auto arities = [&](const ArityRange& arity) {
    const BinaryLinoOptions options = with_arity(with_external_references(BinaryLinoOptions{}, true), arity);
    const LinksPacket packet = encode_document(document, options);
    EXPECT_EQ(BinaryLinoCodec().decode(packet.to_bytes()), document) << describe(arity);
    return link_lengths(packet);
  };
  for (const std::size_t length : arities(doublets())) EXPECT_EQ(length, 2u);
  // `(a b c)` is one triplet; the strings `(String code point)` stay doublets.
  const std::vector<std::size_t> triplets = arities(between(2, 3));
  EXPECT_EQ(std::count(triplets.begin(), triplets.end(), 3u), 1);
  for (const std::size_t length : triplets) EXPECT_TRUE(length == 2 || length == 3) << length;
  EXPECT_EQ(arities(at_least(1)), triplets);
  // Only any length turns a one-item list, here the root, into one link.
  const std::vector<Link> single = parse_document("a");
  const BinaryLinoOptions options = with_external_references(BinaryLinoOptions{}, true);
  const auto lengths = [&](const BinaryLinoOptions& with) { return link_lengths(encode_document(single, with)); };
  EXPECT_EQ(lengths(options), (std::vector<std::size_t>{2, 2, 2, 2}));
  EXPECT_EQ(lengths(with_arity(options, at_least(1))), (std::vector<std::size_t>{2, 2, 1}));
  // Long lists only become single links when the range allows their length.
  const std::vector<Link> long_list = parse_document("(a b c d e f g h)");
  for (const auto& [arity, single_link] :
       std::vector<std::pair<ArityRange, bool>>{{between(2, 3), false}, {between(2, 8), true}, {at_least(2), true}}) {
    const LinksPacket packet =
        encode_document(long_list, with_arity(with_external_references(BinaryLinoOptions{}, true), arity));
    const std::vector<std::size_t> all = link_lengths(packet);
    ASSERT_FALSE(all.empty());
    const std::size_t longest = *std::max_element(all.begin(), all.end());
    EXPECT_EQ(longest == 8, single_link) << describe(arity);
  }
}

TEST(BinaryNotationTests, AritiesWithoutDoubletsAreUnencodable) {
  for (const ArityRange& arity : {ArityRange::exact(3), ArityRange::exact(1), at_least(3)}) {
    EXPECT_THROW(encode_document(parse_document("(a b)"), with_arity(BinaryLinoOptions{}, arity)), BinaryError)
        << describe(arity);
  }
}

TEST(BinaryNotationTests, ArityRangesParseAndDisplay) {
  for (const auto& [text, range] : std::vector<std::pair<std::string, ArityRange>>{
           {"2", doublets()}, {"2..3", between(2, 3)}, {"1..", at_least(1)}, {"3..3", ArityRange::exact(3)}}) {
    EXPECT_EQ(ArityRange::parse(text), range) << text;
  }
  // ArityRange has no display here; the displayed forms read back instead.
  EXPECT_EQ(ArityRange::parse("3"), between(3, 3));
  EXPECT_EQ(ArityRange::parse("2..3"), between(2, 3));
  EXPECT_EQ(ArityRange::parse("1.."), at_least(1));
  // The default range stands for doublets.
  EXPECT_EQ(ArityRange{}.normalized(), doublets());
  for (const char* invalid : {"", "0", "0..2", "3..2", "a", "1..b", "..3", "-1", " 2"}) {
    EXPECT_THROW(ArityRange::parse(invalid), BinaryError) << '"' << invalid << '"';
  }
  EXPECT_TRUE(at_least(2).contains(1'000));
  EXPECT_FALSE(between(2, 3).contains(4));
  EXPECT_TRUE(ArityRange::exact(2).is_fixed() && !at_least(2).is_fixed());
}

TEST(BinaryNotationTests, ReplyOptionsFollowTheReceivedPacket) {
  const std::vector<Link> document = parse_document("(a b c) 70000");
  const BinaryLinoOptions options{true, between(2, 3), true};
  BinaryLinoOptions reply = BinaryLinoOptions::of_packet(encode_document(document, options));
  EXPECT_EQ(reply.external_references, options.external_references);
  EXPECT_EQ(reply.arity, options.arity) << describe(reply.arity);
  EXPECT_EQ(reply.packed_widths, options.packed_widths);
  reply = BinaryLinoOptions::of_packet(encode_document(document, BinaryLinoOptions{}));
  const BinaryLinoOptions defaults;
  EXPECT_EQ(reply.external_references, defaults.external_references);
  EXPECT_EQ(reply.arity.normalized(), defaults.arity.normalized()) << describe(reply.arity);
  EXPECT_EQ(reply.packed_widths, defaults.packed_widths);
}

TEST(BinaryNotationTests, HandBuiltPacketsDecode) {
  // One doublet (One One) is 2^1 in unary, so `(Number 7)` is the number 2.
  std::vector<std::vector<Reference>> links;
  for (const auto& [source, target] :
       std::vector<std::pair<std::uint64_t, std::uint64_t>>{{1, 1}, {2, 6}, {7, 0}, {4, 8}}) {
    links.push_back({Reference::to(source), Reference::to(target)});
  }
  LinksPacket packet{false, {Section{5, doublets(), 1, links}}};
  std::vector<std::uint8_t> bytes = packet.to_bytes();
  EXPECT_EQ(hex(bytes), "10 04 01 01 02 06 07 00 04 08");
  const BinaryLinoCodec protocol;
  EXPECT_EQ(format_binary_document(protocol.decode(bytes)), "2");

  // The same links as a variable section of width 2 use the explicit layout.
  packet.sections[0].arity = at_least(1);
  packet.sections[0].width = 2;
  bytes = packet.to_bytes();
  EXPECT_EQ(hex(bytes), "12 01 1d 05 00 04 01 01 00 01 00 01 02 00 06 00 01 07 00 00 00 01 04 00 08 00");
  EXPECT_EQ(format_binary_document(protocol.decode(bytes)), "2");
}

TEST(BinaryNotationTests, PackingRejectsLinksItCannotLayOut) {
  const auto unencodable = [](const std::vector<PacketLink>& links, bool external_references,
                              const std::string& description) {
    EXPECT_THROW(LinksPacket::pack(external_references, links, true), BinaryError) << description;
  };
  const auto link = [](std::initializer_list<std::uint64_t> references) {
    std::vector<Reference> result;
    for (const std::uint64_t reference : references) result.push_back(Reference::to(reference));
    return result;
  };
  unencodable({{0, link({1})}}, false, "address 0 is null");
  unencodable({{2, link({1})}, {1, link({1})}}, false, "descending");
  unencodable({{2, link({1})}, {2, link({1})}}, false, "repeated");
  unencodable({{1, {}}}, false, "no references");
  unencodable({{1, {Reference::external_value(1)}}}, false, "external without external references");
  unencodable({{1, {Reference::external_value(std::uint64_t{1} << 63)}}}, true, "external 2^63");
  unencodable({{1, link({std::uint64_t{1} << 63})}}, true, "the top bit marks externals");
  EXPECT_NO_THROW(LinksPacket::pack(false, {{1, link({max_u64})}}, true));
}

TEST(BinaryNotationTests, WritingRejectsSectionsThatDoNotHoldTheirLinks) {
  const auto section = [](ArityRange arity, std::uint8_t width, std::vector<std::vector<Reference>> links) {
    return LinksPacket{false, {Section{0, arity, width, std::move(links)}}};
  };
  const auto unencodable = [](const LinksPacket& packet, const std::string& description) {
    EXPECT_THROW(packet.to_bytes(), BinaryError) << description;
  };
  const std::vector<Reference> pair{Reference::to(1), Reference::to(1)};
  unencodable(section(ArityRange::exact(3), 1, {pair}), "pair in arity 3");
  unencodable(section(ArityRange::exact(0), 1, {}), "arity 0");
  unencodable(section(between(3, 2), 1, {}), "arity 3..2");
  unencodable(section(ArityRange::exact(std::uint64_t{1} << 62), 1, {}), "arity 2^62");
  unencodable(section(doublets(), 3, {pair}), "width 3");
  unencodable(section(doublets(), 1, {{Reference::to(256), Reference::to(0)}}), "256 in width 1");
  LinksPacket gaps = section(doublets(), 1, {pair});
  gaps.sections[0].gap = max_u64;
  unencodable(gaps, "gap 2^64-1");
}

TEST(BinaryNotationTests, MalformedPacketsAreRejected) {
  // Each case names the exact problem, so none passes for another reason. The
  // reasons are the ones JS and Go give; Rust and C# word them differently.
  for (const auto& [bytes, detail] : std::vector<std::pair<std::string, std::string>>{
           {"", "empty input"},
           {"20 00", "unsupported binary version"},
           {"10 01 06 00", "document contains forward reference"},
           {"10 01 07 00", "document contains forward reference"},
           {"10 02 00", "unexpected end of input"},
           {"10 00 00", "trailing bytes"},
           // A tenth byte above 1, then an eleventh byte.
           {"10 ff ff ff ff ff ff ff ff ff 7f", "LEB128 overflow"},
           {"10 80 80 80 80 80 80 80 80 80 81", "LEB128 overflow"},
           {"10 01 01 01", "root must be list"},
           // The chain ends in marker 2, not null.
           {"10 02 00 02 04 06", "broken chain"},
           {"10 01 04 02", "broken chain"},
           {"10 02 02 00 04 06", "standalone marker"},
           {"10 03 01 00 06 00 04 07", "invalid typed marker"},
           // (Number) alone.
           {"12 02 14 05 01 20 02 02 06 00 04 07", "number needs one value"},
           {"10 03 05 00 06 00 04 07", "identified needs id"},
           // (Number 3): marker 3 is no number.
           {"10 03 02 03 06 00 04 07", "expected unary number"},
           // (Number 6) where link 6 is (5 5), not a unary number.
           {"10 05 05 05 06 00 02 07 08 00 04 09", "expected unary number"},
           // The id is ().
           {"10 04 00 00 05 06 07 00 04 08", "id must be reference"},
           {"16 00", "explicit header width bits set"},
           {"12 01 04 05 00", "invalid arity"},
           // A link of 6 in a section of arity 1..2.
           {"12 01 18 01 01 05 00", "link outside arity"},
           {"12 01 f8 ff ff ff ff ff ff ff ff 01 ff ff ff ff ff ff ff ff ff 01 00", "uint64 overflow"},
           // The gap, then the count.
           {"12 01 24 ff ff ff ff ff ff ff ff ff 01 01", "uint64 overflow"},
           {"12 01 20 ff ff ff ff ff ff ff ff ff 01", "uint64 overflow"},
           {"12 01 24 06 01 01 01", "document links must be contiguous from 6"},
           // A hole.
           {"12 02 24 05 01 24 01 01 01 01 04 06", "document links must be contiguous from 6"},
       }) {
    EXPECT_EQ(decode_error(from_hex(bytes), DecodeLimits{}), "binary notation: " + detail) << bytes;
  }
}

TEST(BinaryNotationTests, InvalidCodePointsAreRejected) {
  // (String (0x110000)) is not a valid code point.
  const std::vector<PacketLink> links = addressed(6, {
                                                         {Reference::external_value(0x11'0000), Reference::to(0)},
                                                         {Reference::to(3), Reference::to(6)},
                                                         {Reference::to(7), Reference::to(0)},
                                                         {Reference::to(4), Reference::to(8)},
                                                     });
  const std::vector<std::uint8_t> bytes = LinksPacket::pack(true, links, false).to_bytes();
  EXPECT_EQ(decode_error(bytes, DecodeLimits{}), "binary notation: invalid Unicode scalar") << hex(bytes);
}

TEST(BinaryNotationTests, HostilePacketsHitLimits) {
  const auto limited = [](const std::vector<std::uint8_t>& bytes, const DecodeLimits& limits) {
    EXPECT_THROW(BinaryLinoCodec(BinaryLinoOptions{}, limits).decode(bytes), BinaryError) << hex(bytes);
  };
  DecodeLimits few_links;
  few_links.max_links = 8;
  limited({0x10, 0x09}, few_links);
  limited({0x12, 0x09}, few_links);                          // more sections than links allowed
  limited({0x12, 0x02, 0x20, 0x05, 0x20, 0x05}, few_links);  // 10 in all
  DecodeLimits few_references;
  few_references.max_references = 5;
  limited({0x10, 0x03, 1, 1, 1, 1, 1, 1}, few_references);
  limited({0x12, 0x01, 0x18, 0x00, 0x01, 0x05}, few_references);  // one link of 6

  // A doubling chain `d(k) = (d(k-1) d(k-1))` expands to 2^k nodes.
  std::vector<std::vector<Reference>> links{{Reference::to(0), Reference::to(0)}};
  for (std::uint64_t address = 6; address < 60; ++address) {
    links.push_back({Reference::to(address), Reference::to(address)});
  }
  const std::uint64_t last = 5 + links.size();
  links.push_back({Reference::to(last), Reference::to(0)});
  links.push_back({Reference::to(4), Reference::to(last + 1)});
  const LinksPacket bomb = LinksPacket::pack(false, addressed(6, links), false);
  DecodeLimits small_budget;
  small_budget.max_nodes = 1 << 12;
  EXPECT_EQ(decode_error(bomb.to_bytes(), small_budget), "binary notation: node or depth budget exceeded");

  std::string deep;
  for (int index = 0; index < 40; ++index) deep += "(y ";
  deep += "x";
  for (int index = 0; index < 40; ++index) deep += ")";
  const std::vector<std::uint8_t> bytes = BinaryLinoCodec().encode(parse_document(deep));
  DecodeLimits shallow;
  shallow.max_depth = 10;
  EXPECT_EQ(decode_error(bytes, shallow), "binary notation: node or depth budget exceeded");

  const std::vector<std::uint8_t> three_links = BinaryLinoCodec().encode(parse_document("a b c"));
  DecodeLimits two_nodes;
  two_nodes.max_nodes = 2;
  EXPECT_EQ(decode_error(three_links, two_nodes), "binary notation: broken or excessive chain");
  EXPECT_EQ(DecodeLimits::unlimited().max_links, max_u64);
}

TEST(BinaryNotationTests, StreamFailuresAreIoErrorsAndInterruptionsAreRetried) {
  // A C++ stream has no interruption to retry; a packet served one byte per
  // refill stands for it.
  Hiccup interrupted("", false, std::string("\x10\x00", 2));
  std::istream interrupted_stream(&interrupted);
  const std::optional<LinksPacket> packet = LinksPacket::read_from(interrupted_stream, DecodeLimits{});
  ASSERT_TRUE(packet.has_value());
  EXPECT_EQ(packet->links().size(), 0u);
  // Before the header, then inside the packet.
  Hiccup reset("", true, "");
  std::istream reset_stream(&reset);
  EXPECT_EQ(error_of([&] { LinksPacket::read_from(reset_stream, DecodeLimits{}); }), "binary notation: read failed")
      << "failure before the header";
  Hiccup reset_inside("\x10", true, "");
  std::istream reset_inside_stream(&reset_inside);
  EXPECT_THROW(LinksPacket::read_from(reset_inside_stream, DecodeLimits{}), BinaryError) << "failure inside the packet";
}

TEST(BinaryNotationTests, EveryShortReferenceOverDelimitersRoundTrips) {
  const std::string alphabet = "'\"`a ():";
  std::vector<std::string> stack{""};
  while (!stack.empty()) {
    const std::string reference = stack.back();
    stack.pop_back();
    if (!reference.empty()) {
      const std::string text = format_binary_reference(reference);
      std::vector<Link> document;
      try {
        document = parse_document(text);
      } catch (const std::exception& error) {
        FAIL() << '"' << reference << "\" as \"" << text << "\": " << error.what();
      }
      if (document != std::vector<Link>{Link(reference)}) {
        FAIL() << '"' << reference << "\" as \"" << text << "\" reads back as " << format_binary_document(document);
      }
    }
    if (reference.size() < 5) {
      for (const char character : alphabet) stack.push_back(reference + character);
    }
  }
}

TEST(BinaryNotationTests, CommentReferencesSurviveBinaryAndTextRoundTrips) {
  for (const char* reference : {"#", "#tag", "# with space", "issue#1047"}) {
    const std::vector<Link> document{Link(reference)};
    const BinaryLinoCodec codec;
    const std::vector<Link> decoded = codec.decode(codec.encode(document));
    EXPECT_EQ(decoded, document) << reference;
    EXPECT_EQ(parse_document(format_binary_document(decoded)), document) << reference;
  }
}

TEST(BinaryNotationTests, TextHelpersPreserveUnicodeWhitespaceReferences) {
  for (const char* reference : {"\u00a0", "\u2003", "\u2028"}) {
    const std::vector<Link> document{Link(reference)};
    EXPECT_EQ(parse_document(reference), document) << to_hex(std::string(reference));
    EXPECT_EQ(parse_document(format_binary_document(document)), document) << to_hex(std::string(reference));
  }
}

TEST(BinaryNotationTests, NativeParserGroupsRoundTripWithoutCanonicalization) {
  for (const std::string& text : corpus) {
    const std::vector<Link> document = parse(text);
    for (const BinaryLinoOptions& options : binary_options()) {
      const BinaryLinoCodec codec(options);
      EXPECT_EQ(codec.decode(codec.encode(document)), document) << text << " with " << describe(options);
    }
  }
}

TEST(BinaryNotationTests, StreamPacketsAreReadOneAtATimeAndTruncationIsRejected) {
  const std::vector<std::uint8_t> bytes = BinaryLinoCodec().encode(parse_document("(a b)"));
  for (std::size_t end = 0; end < bytes.size(); ++end) {
    const std::vector<std::uint8_t> prefix(bytes.begin(), bytes.begin() + static_cast<std::ptrdiff_t>(end));
    EXPECT_THROW(LinksPacket::from_bytes(prefix, DecodeLimits{}), BinaryError) << end;
  }
  const std::string once(bytes.begin(), bytes.end());
  std::stringstream stream(once + once);
  for (int index = 0; index < 2; ++index) {
    EXPECT_TRUE(LinksPacket::read_from(stream, DecodeLimits{}).has_value());
  }
  EXPECT_FALSE(LinksPacket::read_from(stream, DecodeLimits{}).has_value());
}

TEST(BinaryNotationTests, InMemoryPacketsObeyLimits) {
  const LinksPacket packet = encode_document(parse_document("(a b)"), BinaryLinoOptions{});
  DecodeLimits no_links;
  no_links.max_links = 0;
  DecodeLimits no_references;
  no_references.max_references = 0;
  for (const DecodeLimits& limits : {no_links, no_references}) {
    EXPECT_THROW(decode_document(packet, limits), BinaryError);
  }
}

TEST(BinaryNotationTests, InMemoryPacketsRejectInvalidWireShapes) {
  const LinksPacket valid = LinksPacket::pack(true, {PacketLink{6, {Reference::external_value(3)}}}, false);
  LinksPacket invalid_external = valid;
  invalid_external.external_references = false;
  LinksPacket invalid_width = valid;
  invalid_width.sections[0].width = 3;
  LinksPacket invalid_arity = valid;
  invalid_arity.sections[0].arity = doublets();
  for (const LinksPacket& packet : {invalid_external, invalid_width, invalid_arity}) {
    EXPECT_THROW(decode_document(packet, DecodeLimits{}), BinaryError);
  }
}

TEST(BinaryNotationTests, CompactAddressOverflowIsRejectedBeforeReadingLinks) {
  std::vector<std::uint8_t> bytes{0x10};
  write_leb128(bytes, max_u64);
  const std::string error = error_of([&] { LinksPacket::from_bytes(bytes, DecodeLimits::unlimited()); });
  EXPECT_EQ(error, "binary notation: uint64 overflow");
}

TEST(BinaryNotationTests, RepeatedReferencesObeyATotalUtf8ExpansionBudget) {
  for (const std::string reference : {"😀", "12"}) {
    const std::vector<Link> document{Link(reference), Link(reference)};
    for (const BinaryLinoOptions& options : binary_options()) {
      const LinksPacket packet = encode_document(document, options);
      DecodeLimits limits;
      limits.max_string_bytes = reference.size() * 2;
      EXPECT_EQ(decode_document(packet, limits), document) << reference << " with " << describe(options);
      limits.max_string_bytes -= 1;
      EXPECT_THROW(decode_document(packet, limits), BinaryError) << reference << " with " << describe(options);
    }
  }
}

TEST(BinaryNotationTests, InvalidEncoderModelsAndAddressOverflowAreErrors) {
  const BinaryLinoOptions options = with_arity(BinaryLinoOptions{}, between(0, 2));
  EXPECT_THROW(encode_document({}, options), BinaryError);
  EXPECT_THROW(LinksPacket::pack(false, {PacketLink{max_u64, {Reference::to(0)}}}, false), BinaryError);
  Link link("a");
  for (std::uint64_t index = 0; index < DecodeLimits{}.max_depth; ++index) link = wrap(link);
  EXPECT_THROW(encode_document({link}, BinaryLinoOptions{}), BinaryError);
}

TEST(BinaryNotationTests, DefaultDepthLimitRejectsABoundedDeepPacket) {
  std::vector<PacketLink> links{PacketLink{6, {Reference::to(0), Reference::to(0)}}};
  for (std::uint64_t address = 7; address < 80; ++address) {
    links.push_back(PacketLink{address, {Reference::to(address - 1), Reference::to(0)}});
  }
  const LinksPacket packet = LinksPacket::pack(false, links, false);
  EXPECT_THROW(decode_document(packet, DecodeLimits{}), BinaryError);
}

TEST(BinaryNotationTests, IdsDoNotAddAnExtraModelNestingLevel) {
  // An id without values is a reference in this model.
  Link link(std::optional<std::string>("id"), {});
  for (std::uint64_t index = 1; index < DecodeLimits{}.max_depth; ++index) link = wrap(link);
  const std::vector<Link> document{link};
  for (const BinaryLinoOptions& options : binary_options()) {
    const BinaryLinoCodec codec(options);
    EXPECT_EQ(codec.decode(codec.encode(document)), document) << describe(options);
  }
}

TEST(BinaryNotationTests, CodecEncoderUsesConfiguredLimits) {
  const std::vector<Link> document{Link(std::optional<std::string>("abcdef"), {Link("value")})};
  std::vector<DecodeLimits> all(5);
  all[0].max_nodes = 1;
  all[1].max_string_bytes = 2;
  all[2].max_depth = 1;
  all[3].max_links = 1;
  all[4].max_references = 1;
  for (std::size_t index = 0; index < all.size(); ++index) {
    EXPECT_THROW(BinaryLinoCodec(BinaryLinoOptions{}, all[index]).encode(document), BinaryError)
        << "encode ignored limit " << index;
  }
  Link deep("a");
  for (int index = 0; index < 70; ++index) deep = wrap(deep);
  const std::vector<Link> deep_document{deep};
  DecodeLimits limits;
  limits.max_depth = 80;
  const BinaryLinoCodec codec(BinaryLinoOptions{}, limits);
  EXPECT_EQ(codec.decode(codec.encode(deep_document)), deep_document);
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
