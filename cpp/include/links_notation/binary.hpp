// Binary links notation, version 1: packets of raw links and the lossless
// mapping of documents onto them. The wire format and the conformance vectors
// are in docs/protocol.

#ifndef LINKS_NOTATION_BINARY_HPP
#define LINKS_NOTATION_BINARY_HPP

#include <cstddef>
#include <cstdint>
#include <iosfwd>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

#include "links_notation/link.hpp"

namespace links_notation {

/// Thrown when a packet or a document cannot be written or read as binary
/// links notation. The message starts with "binary notation: ".
class BinaryError : public std::runtime_error {
 public:
  explicit BinaryError(const std::string& reason) : std::runtime_error("binary notation: " + reason) {}
};

/// An internal link address, or an external unsigned value when the packet
/// allows them.
struct Reference {
  std::uint64_t value = 0;
  bool external = false;

  static Reference to(std::uint64_t address) { return Reference{address, false}; }
  static Reference external_value(std::uint64_t value) { return Reference{value, true}; }

  bool operator==(const Reference& other) const { return value == other.value && external == other.external; }
  bool operator!=(const Reference& other) const { return !(*this == other); }
};

/// A raw link and the address it implicitly has in its packet.
struct PacketLink {
  std::uint64_t address = 0;
  std::vector<Reference> references;

  bool operator==(const PacketLink& other) const { return address == other.address && references == other.references; }
  bool operator!=(const PacketLink& other) const { return !(*this == other); }
};

/// An inclusive range of link lengths. A missing maximum is unbounded, and the
/// default range {0, unbounded} means doublets: exactly 2.
struct ArityRange {
  std::uint64_t min = 0;
  std::optional<std::uint64_t> max;

  static ArityRange exact(std::uint64_t length) { return ArityRange{length, length}; }
  /// Reads "2", "2..3" or "1..". Throws BinaryError on anything else.
  static ArityRange parse(std::string_view text);

  /// The range itself, or exactly 2 for the default range.
  ArityRange normalized() const;
  bool contains(std::uint64_t length) const;
  bool is_fixed() const;
  /// Throws BinaryError unless the range can be written to a packet.
  void validate() const;

  bool operator==(const ArityRange& other) const { return min == other.min && max == other.max; }
  bool operator!=(const ArityRange& other) const { return !(*this == other); }
};

/// Bounds on what decoding, and encoding, may produce. Raise them only for
/// trusted input.
struct DecodeLimits {
  std::uint64_t max_links = std::uint64_t{1} << 22;
  std::uint64_t max_references = std::uint64_t{1} << 24;
  std::uint64_t max_nodes = std::uint64_t{1} << 22;
  std::uint64_t max_string_bytes = std::uint64_t{64} << 20;
  std::uint64_t max_depth = 64;

  static DecodeLimits unlimited();
};

/// A run of consecutive links, after `gap` unused addresses, whose lengths are
/// in `arity` and whose references are `width` bytes wide.
struct Section {
  std::uint64_t gap = 0;
  ArityRange arity;
  std::uint8_t width = 1;
  std::vector<std::vector<Reference>> links;

  bool operator==(const Section& other) const {
    return gap == other.gap && arity == other.arity && width == other.width && links == other.links;
  }
  bool operator!=(const Section& other) const { return !(*this == other); }
};

/// Raw links, independent of what document they may encode.
struct LinksPacket {
  bool external_references = false;
  std::vector<Section> sections;

  /// Every link with its address. Addresses start at 1.
  std::vector<PacketLink> links() const;

  std::vector<std::uint8_t> to_bytes(const DecodeLimits& limits = {}) const;
  void write_to(std::ostream& out, const DecodeLimits& limits = {}) const;

  /// Reads exactly one packet, or nothing when the stream ends cleanly before
  /// one starts. A packet cut short is an error, never the end.
  static std::optional<LinksPacket> read_from(std::istream& in, const DecodeLimits& limits = {});
  /// Reads one packet that spans all of `bytes`.
  static LinksPacket from_bytes(const std::vector<std::uint8_t>& bytes, const DecodeLimits& limits = {});

  /// Lays out links, given in increasing address order, in as few bytes as
  /// the sections allow. With `packed`, sections may use different widths.
  static LinksPacket pack(bool external_references, const std::vector<PacketLink>& links, bool packed);

  bool operator==(const LinksPacket& other) const {
    return external_references == other.external_references && sections == other.sections;
  }
  bool operator!=(const LinksPacket& other) const { return !(*this == other); }
};

/// Reads raw links written as `address:reference reference…` separated by
/// `;`, where `#v` is the external value v and a bare number an address.
std::vector<PacketLink> parse_packet_links(std::string_view text);

/// Which encoding features a codec uses. The defaults are version 1 doublets.
struct BinaryLinoOptions {
  bool external_references = false;
  ArityRange arity;
  bool packed_widths = false;

  /// The options a packet was evidently written with.
  static BinaryLinoOptions of_packet(const LinksPacket& packet);
};

/// Writes documents as binary links notation and reads them back exactly.
class BinaryLinoCodec {
 public:
  BinaryLinoCodec() = default;
  explicit BinaryLinoCodec(BinaryLinoOptions options, DecodeLimits limits = {}) : options(options), limits(limits) {}

  BinaryLinoOptions options;
  DecodeLimits limits;

  LinksPacket encode_packet(const std::vector<Link>& document) const;
  std::vector<std::uint8_t> encode(const std::vector<Link>& document) const;
  std::vector<Link> decode_packet(const LinksPacket& packet) const;
  std::vector<Link> decode(const std::vector<std::uint8_t>& bytes) const;

  /// Parses text into the canonical model the text helpers use, where a group
  /// holding one reference is that reference.
  std::vector<Link> parse_document(std::string_view text) const;
  std::vector<std::uint8_t> encode_text(std::string_view text) const;
  std::string decode_text(const std::vector<std::uint8_t>& bytes) const;
};

/// Writes a reference the way the binary text helpers do.
std::string format_binary_reference(std::string_view text);
/// Writes a decoded document as text that parse_document reads back.
std::string format_binary_document(const std::vector<Link>& document);

}  // namespace links_notation

#endif  // LINKS_NOTATION_BINARY_HPP
