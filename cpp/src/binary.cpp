// A port of go/binary.go, which writes and reads exactly the bytes of the
// shared vectors in docs/protocol/binary-links-notation-vectors.txt.

#include "links_notation/binary.hpp"

#include <array>
#include <functional>
#include <istream>
#include <limits>
#include <map>
#include <ostream>
#include <utility>

#include "links_notation/parser.hpp"
#include "links_notation/references.hpp"
#include "unicode.hpp"

namespace links_notation {

namespace {

using u64 = std::uint64_t;

constexpr u64 max_u64 = std::numeric_limits<u64>::max();
constexpr std::array<std::uint8_t, 4> widths{1, 2, 4, 8};

void demand(bool ok, const char* reason) {
  if (!ok) throw BinaryError(reason);
}

u64 add(u64 left, u64 right) {
  demand(left <= max_u64 - right, "uint64 overflow");
  return left + right;
}

int width_code(std::uint8_t width) {
  for (std::size_t code = 0; code < widths.size(); ++code) {
    if (widths[code] == width) return static_cast<int>(code);
  }
  throw BinaryError("invalid width");
}

std::uint8_t reference_width(const Reference& reference, bool external_references) {
  demand(!reference.external || external_references, "external references disabled");
  for (const std::uint8_t width : widths) {
    unsigned bits = width * 8u;
    if (external_references) --bits;
    if (bits == 64 || reference.value < (u64{1} << bits)) return width;
  }
  throw BinaryError("reference exceeds capacity");
}

bool is_decimal(std::string_view text) {
  if (text.empty()) return false;
  for (const char character : text) {
    if (character < '0' || character > '9') return false;
  }
  return true;
}

/// The decimal digits as a number, or nothing when it does not fit 64 bits.
std::optional<u64> parse_u64(std::string_view text) {
  if (!is_decimal(text)) return std::nullopt;
  u64 value = 0;
  for (const char character : text) {
    const u64 digit = static_cast<u64>(character - '0');
    if (value > (max_u64 - digit) / 10) return std::nullopt;
    value = value * 10 + digit;
  }
  return value;
}

u64 demand_u64(std::string_view text, const char* reason) {
  const auto value = parse_u64(text);
  demand(value.has_value(), reason);
  return *value;
}

std::string_view trim(std::string_view text) {
  const auto space = [](char character) {
    return character == ' ' || character == '\t' || character == '\n' || character == '\r' || character == '\v' ||
           character == '\f';
  };
  while (!text.empty() && space(text.front())) text.remove_prefix(1);
  while (!text.empty() && space(text.back())) text.remove_suffix(1);
  return text;
}

std::vector<std::string_view> split(std::string_view text, std::string_view separator) {
  std::vector<std::string_view> parts;
  for (;;) {
    const std::size_t found = text.find(separator);
    if (found == std::string_view::npos) {
      parts.push_back(text);
      return parts;
    }
    parts.push_back(text.substr(0, found));
    text.remove_prefix(found + separator.size());
  }
}

void validate(const LinksPacket& packet, const DecodeLimits& limits) {
  demand(packet.sections.size() <= limits.max_links, "too many sections");
  u64 address = 1;
  u64 links = 0;
  u64 references = 0;
  for (const Section& section : packet.sections) {
    width_code(section.width);
    section.arity.validate();
    address = add(add(address, section.gap), section.links.size());
    links = add(links, section.links.size());
    demand(links <= limits.max_links, "too many links");
    for (const std::vector<Reference>& link : section.links) {
      demand(section.arity.contains(link.size()), "link outside arity");
      references = add(references, link.size());
      demand(references <= limits.max_references, "too many references");
      for (const Reference& reference : link) {
        demand(reference_width(reference, packet.external_references) <= section.width, "reference outside width");
      }
    }
  }
}

void put_leb128(std::vector<std::uint8_t>& out, u64 value) {
  while (value >= 128) {
    out.push_back(static_cast<std::uint8_t>((value & 127) | 128));
    value >>= 7;
  }
  out.push_back(static_cast<std::uint8_t>(value));
}

std::vector<std::uint8_t> packet_bytes(const LinksPacket& packet, const DecodeLimits& limits) {
  validate(packet, limits);
  std::vector<std::uint8_t> out;
  std::uint8_t header = 0x10;
  if (packet.external_references) header |= 1;

  bool compact = packet.sections.empty();
  if (packet.sections.size() == 1) {
    const Section& section = packet.sections[0];
    compact =
        section.gap == 5 && section.arity.normalized().min == 2 && section.arity.is_fixed() && !section.links.empty();
  }
  if (compact) {
    std::uint8_t width = 1;
    u64 count = 0;
    if (!packet.sections.empty()) {
      width = packet.sections[0].width;
      count = packet.sections[0].links.size();
    }
    out.push_back(static_cast<std::uint8_t>(header | (width_code(width) << 2)));
    put_leb128(out, count);
  } else {
    out.push_back(header | 2);
    put_leb128(out, packet.sections.size());
    for (const Section& section : packet.sections) {
      const ArityRange arity = section.arity.normalized();
      u64 shape = arity.min << 4 | static_cast<u64>(width_code(section.width));
      if (section.gap > 0) shape |= 4;
      if (!arity.is_fixed()) shape |= 8;
      put_leb128(out, shape);
      if (section.gap > 0) put_leb128(out, section.gap);
      if (!arity.is_fixed()) put_leb128(out, arity.max ? *arity.max - arity.min : 0);
      put_leb128(out, section.links.size());
    }
  }

  for (const Section& section : packet.sections) {
    const ArityRange arity = section.arity.normalized();
    for (const std::vector<Reference>& link : section.links) {
      if (!arity.is_fixed()) put_leb128(out, link.size() - arity.min);
      for (const Reference& reference : link) {
        u64 raw = reference.value;
        if (reference.external) raw = raw == 0 ? u64{1} << (section.width * 8u - 1) : u64{0} - raw;
        for (std::uint8_t byte = 0; byte < section.width; ++byte) {
          out.push_back(static_cast<std::uint8_t>(raw >> (8u * byte)));
        }
      }
    }
  }
  return out;
}

/// Reads bytes one at a time; returns false at the end of the input.
using ByteSource = std::function<bool(std::uint8_t&)>;

u64 read_raw(const ByteSource& source, std::uint8_t width) {
  u64 value = 0;
  for (std::uint8_t index = 0; index < width; ++index) {
    std::uint8_t byte = 0;
    demand(source(byte), "unexpected end of input");
    value |= static_cast<u64>(byte) << (8u * index);
  }
  return value;
}

u64 read_leb128(const ByteSource& source) {
  u64 value = 0;
  for (unsigned shift = 0; shift < 64; shift += 7) {
    const u64 byte = read_raw(source, 1);
    demand(shift != 63 || (byte & 127) <= 1, "LEB128 overflow");
    value |= (byte & 127) << shift;
    if (byte < 128) return value;
  }
  throw BinaryError("LEB128 overflow");
}

std::optional<LinksPacket> read_packet(const ByteSource& source, const DecodeLimits& limits) {
  std::uint8_t header = 0;
  if (!source(header)) return std::nullopt;
  demand((header & 0xf0) == 0x10, "unsupported binary version");

  LinksPacket packet;
  packet.external_references = (header & 1) != 0;
  std::vector<u64> counts;
  if ((header & 2) != 0) {
    demand((header & 12) == 0, "explicit header width bits set");
    const u64 sections = read_leb128(source);
    demand(sections <= limits.max_links, "too many sections");
    u64 address = 1;
    u64 total = 0;
    for (u64 index = 0; index < sections; ++index) {
      const u64 shape = read_leb128(source);
      const u64 gap = (shape & 4) != 0 ? read_leb128(source) : 0;
      const u64 min = shape >> 4;
      demand(min > 0, "invalid arity");
      ArityRange arity = ArityRange::exact(min);
      if ((shape & 8) != 0) {
        const u64 extra = read_leb128(source);
        arity.max.reset();
        if (extra != 0) arity.max = add(min, extra);
      }
      arity.validate();
      const u64 count = read_leb128(source);
      address = add(add(address, gap), count);
      total = add(total, count);
      demand(total <= limits.max_links, "too many links");
      packet.sections.push_back(Section{gap, arity, widths[shape & 3], {}});
      counts.push_back(count);
    }
  } else {
    const u64 count = read_leb128(source);
    add(6, count);
    demand(count <= limits.max_links, "too many links");
    if (count != 0) {
      packet.sections.push_back(Section{5, ArityRange::exact(2), widths[(header >> 2) & 3], {}});
      counts.push_back(count);
    }
  }

  u64 references = 0;
  for (std::size_t index = 0; index < packet.sections.size(); ++index) {
    Section& section = packet.sections[index];
    const u64 top = u64{1} << (section.width * 8u - 1);
    for (u64 link_index = 0; link_index < counts[index]; ++link_index) {
      u64 length = section.arity.min;
      if (!section.arity.is_fixed()) length = add(length, read_leb128(source));
      demand(section.arity.contains(length), "link outside arity");
      references = add(references, length);
      demand(references <= limits.max_references, "too many references");
      std::vector<Reference> link;
      for (u64 reference_index = 0; reference_index < length; ++reference_index) {
        const u64 raw = read_raw(source, section.width);
        Reference reference{raw, false};
        if (packet.external_references && raw >= top) {
          reference.external = true;
          if (raw == top) {
            reference.value = 0;
          } else {
            reference.value = u64{0} - raw;
            if (section.width < 8) reference.value &= (u64{1} << (section.width * 8u)) - 1;
          }
        }
        link.push_back(reference);
      }
      section.links.push_back(std::move(link));
    }
  }
  return packet;
}

// ---- Packing raw links into sections ----

struct Run {
  std::size_t count;
  std::uint8_t width;
};

LinksPacket pack_links(bool external_references, const std::vector<PacketLink>& links, bool packed) {
  std::vector<std::uint8_t> needs(links.size());
  u64 previous = 0;
  for (std::size_t index = 0; index < links.size(); ++index) {
    const PacketLink& link = links[index];
    demand(link.address > previous && link.address < max_u64 && !link.references.empty(),
           "invalid address order or empty link");
    previous = link.address;
    needs[index] = 1;
    for (const Reference& reference : link.references) {
      needs[index] = std::max(needs[index], reference_width(reference, external_references));
    }
  }

  // The cheapest split into sections, by dynamic programming over the state
  // of the section each link is in: its width and whether its arity varies.
  const auto plan = [&](bool any_width) {
    std::vector<Run> result;
    if (links.empty()) return result;
    std::uint8_t widest = 1;
    for (const std::uint8_t need : needs) widest = std::max(widest, need);
    using Costs = std::array<u64, 8>;
    const auto cheapest = [](const Costs& costs) {
      std::size_t best = 0;
      for (std::size_t state = 1; state < 8; ++state) {
        if (costs[state] < costs[best]) best = state;
      }
      return best;
    };
    constexpr u64 unreachable = max_u64 / 4;
    Costs costs;
    costs.fill(unreachable);
    std::vector<std::uint8_t> opens(links.size());
    std::vector<std::size_t> bests(links.size());
    for (std::size_t index = 0; index < links.size(); ++index) {
      const PacketLink& link = links[index];
      const std::size_t best = cheapest(costs);
      bests[index] = best;
      const u64 before = index > 0 ? costs[best] : 0;
      Costs next;
      for (std::size_t state = 0; state < 8; ++state) {
        next[state] = unreachable;
        const std::uint8_t width = widths[state / 2];
        const u64 variable = state % 2;
        if ((!any_width && width != widest) || width < needs[index]) continue;
        const u64 opening = before + 2 + variable;
        u64 continuing = unreachable;
        if (index > 0 && links[index - 1].address + 1 == link.address &&
            (variable != 0 || links[index - 1].references.size() == link.references.size())) {
          continuing = costs[state];
        }
        const u64 body = link.references.size() * u64{width} + variable;
        if (continuing <= opening) {
          next[state] = continuing + body;
        } else {
          next[state] = opening + body;
          opens[index] |= static_cast<std::uint8_t>(1u << state);
        }
      }
      costs = next;
    }
    std::size_t end = links.size();
    std::size_t state = cheapest(costs);
    for (std::size_t index = links.size(); index-- > 0;) {
      if ((opens[index] & (1u << state)) != 0) {
        result.push_back(Run{end - index, widths[state / 2]});
        end = index;
        state = bests[index];
      }
    }
    return std::vector<Run>(result.rbegin(), result.rend());
  };

  const auto layout = [&](const std::vector<Run>& runs) {
    LinksPacket packet;
    packet.external_references = external_references;
    std::size_t index = 0;
    u64 address = 1;
    for (const Run& run : runs) {
      u64 min = max_u64;
      u64 max = 0;
      std::vector<std::vector<Reference>> references;
      for (std::size_t member = index; member < index + run.count; ++member) {
        const u64 length = links[member].references.size();
        min = std::min(min, length);
        max = std::max(max, length);
        references.push_back(links[member].references);
      }
      const u64 start = links[index].address;
      packet.sections.push_back(Section{start - address, ArityRange{min, max}, run.width, std::move(references)});
      index += run.count;
      address = start + run.count;
    }
    return packet;
  };

  LinksPacket uniform = layout(plan(false));
  if (!packed) return uniform;
  LinksPacket candidate = layout(plan(true));
  const DecodeLimits unlimited = DecodeLimits::unlimited();
  if (packet_bytes(candidate, unlimited).size() < packet_bytes(uniform, unlimited).size()) return candidate;
  return uniform;
}

// ---- Documents onto links ----

/// A reference while encoding: an internal address ('i'), an external value
/// ('e'), or the index of a created doublet ('d') or longer tuple ('t').
struct Node {
  char kind;
  u64 value;

  bool operator<(const Node& other) const { return kind != other.kind ? kind < other.kind : value < other.value; }
};

class Encoder {
 public:
  explicit Encoder(const BinaryLinoOptions& options) : options_(options) {}

  Node encode(const Link& link) {
    if (link.id && link.values.empty()) return reference(*link.id);
    std::vector<Node> elements;
    if (link.id) elements.push_back(reference(*link.id));
    for (const Link& value : link.values) elements.push_back(encode(value));
    if (link.id) return typed(5, std::move(elements));
    return list(std::move(elements));
  }

  Node list(std::vector<Node> elements) {
    if (elements.empty()) return Node{'i', 0};
    if (elements.size() == 2 || options_.arity.contains(elements.size())) return link(std::move(elements));
    return typed(4, std::move(elements));
  }

  LinksPacket finish() const {
    std::vector<PacketLink> links;
    const auto add_links = [&](const std::vector<std::vector<Node>>& created) {
      for (const std::vector<Node>& items : created) {
        std::vector<Reference> references;
        for (const Node& node : items) {
          Reference reference{node.value, node.kind == 'e'};
          if (node.kind == 'd') reference.value = 6 + node.value;
          if (node.kind == 't') reference.value = 6 + node.value + doublets_.size();
          references.push_back(reference);
        }
        links.push_back(PacketLink{6 + links.size(), std::move(references)});
      }
    };
    add_links(doublets_);
    add_links(tuples_);
    return pack_links(options_.external_references, links, options_.packed_widths);
  }

 private:
  Node link(std::vector<Node> items) {
    bool doublet = items.size() == 2;
    for (const Node& node : items) {
      if (node.kind == 't') doublet = false;
    }
    const auto known = created_.find(items);
    if (known != created_.end()) return known->second;
    Node node{'t', tuples_.size()};
    if (doublet) {
      node = Node{'d', doublets_.size()};
      doublets_.push_back(items);
    } else {
      tuples_.push_back(items);
    }
    created_.emplace(std::move(items), node);
    return node;
  }

  Node chain(const std::vector<Node>& items) {
    Node tail{'i', 0};
    for (std::size_t index = items.size(); index-- > 0;) tail = link({items[index], tail});
    return tail;
  }

  Node typed(u64 marker, std::vector<Node> elements) {
    std::vector<Node> items{Node{'i', marker}};
    items.insert(items.end(), elements.begin(), elements.end());
    if (items.size() != 2 && options_.arity.contains(items.size())) return link(std::move(items));
    return link({Node{'i', marker}, chain(elements)});
  }

  Node unary(u64 value) {
    std::vector<Node> powers;
    for (int bit = 63; bit >= 0; --bit) {
      if ((value & (u64{1} << bit)) == 0) continue;
      while (powers_.size() <= static_cast<std::size_t>(bit)) {
        const Node power = powers_.back();
        powers_.push_back(link({power, power}));
      }
      powers.push_back(powers_[static_cast<std::size_t>(bit)]);
    }
    if (powers.empty()) return Node{'i', 0};
    Node sum = powers.back();
    for (std::size_t index = powers.size() - 1; index-- > 0;) sum = link({powers[index], sum});
    return sum;
  }

  Node scalar(u64 value) {
    if (options_.external_references && value <= static_cast<u64>(std::numeric_limits<std::int64_t>::max())) {
      return Node{'e', value};
    }
    return unary(value);
  }

  Node reference(const std::string& text) {
    const bool canonical = is_decimal(text) && (text == "0" || text[0] != '0');
    if (canonical) {
      if (const auto value = parse_u64(text)) {
        if (options_.external_references && *value <= static_cast<u64>(std::numeric_limits<std::int64_t>::max())) {
          return Node{'e', *value};
        }
        return link({Node{'i', 2}, unary(*value)});
      }
    }
    std::vector<Node> elements;
    for (std::size_t position = 0; position < text.size();) {
      const detail::Decoded decoded = detail::decode_at(text, position);
      elements.push_back(scalar(decoded.code_point));
      position += decoded.length;
    }
    return typed(3, std::move(elements));
  }

  BinaryLinoOptions options_;
  std::vector<std::vector<Node>> doublets_;
  std::vector<std::vector<Node>> tuples_;
  std::map<std::vector<Node>, Node> created_;
  std::vector<Node> powers_{Node{'i', 1}};
};

class Decoder {
 public:
  Decoder(const LinksPacket& packet, const DecodeLimits& limits)
      : limits_(limits), nodes_(limits.max_nodes), strings_(limits.max_string_bytes) {
    validate(packet, limits);
    for (PacketLink& link : packet.links()) {
      demand(link.address == 6 + links_.size(), "document links must be contiguous from 6");
      for (const Reference& reference : link.references) {
        demand(reference.external || reference.value < link.address, "document contains forward reference");
      }
      std::optional<u64> number;
      if (link.references.size() == 2) {
        const auto first = value_of(link.references[0]);
        const auto second = value_of(link.references[1]);
        if (first && second && *first <= max_u64 - *second) number = *first + *second;
      }
      unary_.push_back(number);
      links_.push_back(std::move(link.references));
    }
  }

  std::vector<Link> document() {
    std::vector<Link> result;
    if (links_.empty()) return result;
    const std::vector<Reference>& root = links_.back();
    std::vector<Reference> elements = root;
    if (root.size() == 2 && !root[0].external && root[0].value == 4) {
      elements = chain(root[1]);
    } else {
      demand(root[0].external || root[0].value < 1 || root[0].value > 5, "root must be list");
    }
    for (const Reference& element : elements) result.push_back(decode(element, 0));
    return result;
  }

 private:
  std::optional<u64> value_of(const Reference& reference) const {
    if (reference.external) return std::nullopt;
    if (reference.value <= 1) return reference.value;
    if (reference.value >= 6) return unary_[reference.value - 6];
    return std::nullopt;
  }

  std::vector<Reference> chain(Reference tail) const {
    std::vector<Reference> result;
    while (tail.external || tail.value != 0) {
      demand(!tail.external && tail.value >= 6, "broken chain");
      const std::vector<Reference>& items = links_[tail.value - 6];
      demand(items.size() == 2 && result.size() < limits_.max_nodes, "broken or excessive chain");
      result.push_back(items[0]);
      tail = items[1];
    }
    return result;
  }

  u64 number(const Reference& reference) const {
    if (reference.external || reference.value <= 1) return reference.value;
    demand(reference.value >= 6 && unary_[reference.value - 6].has_value(), "expected unary number");
    return *unary_[reference.value - 6];
  }

  Link text(std::string value) {
    demand(value.size() <= strings_, "string budget exceeded");
    strings_ -= value.size();
    return Link(std::move(value));
  }

  Link decode(const Reference& reference, u64 depth) {
    demand(depth < limits_.max_depth && nodes_ > 0, "node or depth budget exceeded");
    --nodes_;
    if (reference.external) return text(std::to_string(reference.value));
    if (reference.value == 0) return Link();
    demand(reference.value >= 6, "standalone marker");
    const std::vector<Reference>& items = links_[reference.value - 6];
    std::vector<Reference> elements = items;
    if (!items[0].external && items[0].value >= 1 && items[0].value <= 5) {
      const u64 marker = items[0].value;
      elements.assign(items.begin() + 1, items.end());
      if (items.size() == 2 && marker != 2) elements = chain(items[1]);
      switch (marker) {
        case 2:
          demand(elements.size() == 1, "number needs one value");
          return text(std::to_string(number(elements[0])));
        case 3: {
          std::string value;
          for (const Reference& element : elements) {
            const u64 code_point = number(element);
            demand(code_point <= 0x10FFFF && !(code_point >= 0xD800 && code_point <= 0xDFFF), "invalid Unicode scalar");
            const std::size_t length = code_point < 0x80 ? 1 : code_point < 0x800 ? 2 : code_point < 0x10000 ? 3 : 4;
            demand(length <= strings_ - value.size(), "string budget exceeded");
            detail::append_utf8(value, static_cast<char32_t>(code_point));
          }
          return text(std::move(value));
        }
        case 5: {
          demand(!elements.empty(), "identified needs id");
          const Link id = decode(elements[0], depth);
          demand(id.id.has_value() && id.values.empty(), "id must be reference");
          std::vector<Link> values;
          for (std::size_t index = 1; index < elements.size(); ++index) {
            values.push_back(decode(elements[index], depth + 1));
          }
          return Link(id.id, std::move(values));
        }
        case 4:
          break;
        default:
          throw BinaryError("invalid typed marker");
      }
    }
    std::vector<Link> values;
    for (const Reference& element : elements) values.push_back(decode(element, depth + 1));
    return Link(std::nullopt, std::move(values));
  }

  DecodeLimits limits_;
  std::vector<std::vector<Reference>> links_;
  std::vector<std::optional<u64>> unary_;
  u64 nodes_;
  u64 strings_;
};

Link canonical(const Link& link) {
  if (!link.id && link.values.size() == 1 && link.values[0].id && link.values[0].values.empty()) {
    return link.values[0];
  }
  std::vector<Link> values;
  for (const Link& value : link.values) values.push_back(canonical(value));
  return Link(link.id, std::move(values));
}

bool is_reference(const Link& link) { return link.id.has_value() && link.values.empty(); }

std::string format_nested(const Link& link, bool top) {
  if (is_reference(link)) return format_binary_reference(*link.id);
  std::string values;
  for (const Link& value : link.values) {
    if (!values.empty() || &value != &link.values.front()) values += ' ';
    values += format_nested(value, false);
  }
  if (link.id) return "(" + format_binary_reference(*link.id) + ": " + values + ")";
  if (link.values.size() == 1 && is_reference(link.values[0])) return "((" + values + "))";
  if (top && link.values.size() >= 2) return values;
  return "(" + values + ")";
}

}  // namespace

// ---- ArityRange ----

ArityRange ArityRange::parse(std::string_view text) {
  const std::vector<std::string_view> parts = split(text, "..");
  demand(parts.size() <= 2, "invalid arity");
  ArityRange result = exact(demand_u64(parts[0], "invalid arity"));
  if (parts.size() == 2) {
    result.max.reset();
    if (!parts[1].empty()) result.max = demand_u64(parts[1], "invalid arity");
  }
  // A written zero is rejected rather than read as the default range.
  demand(result.min > 0, "invalid arity");
  result.validate();
  return result;
}

ArityRange ArityRange::normalized() const {
  if (min == 0 && !max) return exact(2);
  return *this;
}

bool ArityRange::contains(std::uint64_t length) const {
  const ArityRange range = normalized();
  return length >= range.min && (!range.max || length <= *range.max);
}

bool ArityRange::is_fixed() const {
  const ArityRange range = normalized();
  return range.max && *range.max == range.min;
}

void ArityRange::validate() const {
  const ArityRange range = normalized();
  demand(range.min > 0 && range.min <= (max_u64 >> 4) && (!range.max || *range.max >= range.min), "invalid arity");
}

DecodeLimits DecodeLimits::unlimited() { return DecodeLimits{max_u64, max_u64, max_u64, max_u64, max_u64}; }

// ---- LinksPacket ----

std::vector<PacketLink> LinksPacket::links() const {
  std::vector<PacketLink> result;
  u64 address = 1;
  for (const Section& section : sections) {
    address += section.gap;
    for (const std::vector<Reference>& link : section.links) result.push_back(PacketLink{address++, link});
  }
  return result;
}

std::vector<std::uint8_t> LinksPacket::to_bytes(const DecodeLimits& limits) const {
  return packet_bytes(*this, limits);
}

void LinksPacket::write_to(std::ostream& out, const DecodeLimits& limits) const {
  const std::vector<std::uint8_t> bytes = packet_bytes(*this, limits);
  out.write(reinterpret_cast<const char*>(bytes.data()), static_cast<std::streamsize>(bytes.size()));
  demand(static_cast<bool>(out), "short write");
}

std::optional<LinksPacket> LinksPacket::read_from(std::istream& in, const DecodeLimits& limits) {
  return read_packet(
      [&in](std::uint8_t& byte) {
        const auto character = in.get();
        // A stream that failed to read is not one that ended: istream::get
        // swallows the exception and sets badbit.
        demand(!in.bad(), "read failed");
        if (character == std::istream::traits_type::eof()) return false;
        byte = static_cast<std::uint8_t>(character);
        return true;
      },
      limits);
}

LinksPacket LinksPacket::from_bytes(const std::vector<std::uint8_t>& bytes, const DecodeLimits& limits) {
  std::size_t position = 0;
  std::optional<LinksPacket> packet = read_packet(
      [&](std::uint8_t& byte) {
        if (position >= bytes.size()) return false;
        byte = bytes[position++];
        return true;
      },
      limits);
  demand(packet.has_value(), "empty input");
  demand(position == bytes.size(), "trailing bytes");
  return std::move(*packet);
}

LinksPacket LinksPacket::pack(bool external_references, const std::vector<PacketLink>& links, bool packed) {
  return pack_links(external_references, links, packed);
}

std::vector<PacketLink> parse_packet_links(std::string_view text) {
  std::vector<PacketLink> result;
  for (const std::string_view entry : split(text, ";")) {
    if (trim(entry).empty()) continue;
    const std::vector<std::string_view> parts = split(entry, ":");
    demand(parts.size() == 2, "invalid raw links");
    PacketLink link{demand_u64(trim(parts[0]), "invalid raw links"), {}};
    std::string_view words = parts[1];
    for (;;) {
      words = trim(words);
      if (words.empty()) break;
      std::size_t end = 0;
      while (end < words.size() && trim(words.substr(end, 1)).size() == 1) ++end;
      std::string_view word = words.substr(0, end);
      words.remove_prefix(end);
      const bool external = !word.empty() && word.front() == '#';
      if (external) word.remove_prefix(1);
      link.references.push_back(Reference{demand_u64(word, "invalid raw links"), external});
    }
    result.push_back(std::move(link));
  }
  return result;
}

BinaryLinoOptions BinaryLinoOptions::of_packet(const LinksPacket& packet) {
  u64 min = 2;
  u64 max = 2;
  std::uint8_t width = 0;
  bool packed = false;
  for (const Section& section : packet.sections) {
    if (width != 0 && width != section.width) packed = true;
    width = section.width;
    for (const std::vector<Reference>& link : section.links) {
      min = std::min<u64>(min, link.size());
      max = std::max<u64>(max, link.size());
    }
  }
  return BinaryLinoOptions{packet.external_references, ArityRange{min, max}, packed};
}

// ---- BinaryLinoCodec ----

LinksPacket BinaryLinoCodec::encode_packet(const std::vector<Link>& document) const {
  options.arity.validate();
  demand(options.arity.contains(2), "arity must contain 2");

  std::vector<std::pair<const Link*, u64>> pending;
  for (const Link& link : document) pending.emplace_back(&link, 0);
  u64 nodes = 0;
  u64 strings = 0;
  while (!pending.empty()) {
    const auto [link, depth] = pending.back();
    pending.pop_back();
    demand(depth < limits.max_depth, "invalid model or excessive depth");
    nodes = add(nodes, 1);
    if (link->id) {
      demand(detail::is_valid_utf8(*link->id), "invalid UTF-8");
      strings = add(strings, link->id->size());
      if (!link->values.empty()) nodes = add(nodes, 1);
    }
    demand(nodes <= limits.max_nodes && strings <= limits.max_string_bytes, "model budget exceeded");
    for (const Link& value : link->values) pending.emplace_back(&value, depth + 1);
  }

  Encoder encoder(options);
  if (!document.empty()) {
    std::vector<Node> elements;
    for (const Link& link : document) elements.push_back(encoder.encode(link));
    encoder.list(std::move(elements));
  }
  LinksPacket packet = encoder.finish();
  validate(packet, limits);
  return packet;
}

std::vector<std::uint8_t> BinaryLinoCodec::encode(const std::vector<Link>& document) const {
  return packet_bytes(encode_packet(document), limits);
}

std::vector<Link> BinaryLinoCodec::decode_packet(const LinksPacket& packet) const {
  return Decoder(packet, limits).document();
}

std::vector<Link> BinaryLinoCodec::decode(const std::vector<std::uint8_t>& bytes) const {
  return decode_packet(LinksPacket::from_bytes(bytes, limits));
}

std::vector<Link> BinaryLinoCodec::parse_document(std::string_view text) const {
  std::vector<Link> document = parse(text);
  for (Link& link : document) link = canonical(link);
  return document;
}

std::vector<std::uint8_t> BinaryLinoCodec::encode_text(std::string_view text) const {
  return encode(parse_document(text));
}

std::string BinaryLinoCodec::decode_text(const std::vector<std::uint8_t>& bytes) const {
  return format_binary_document(decode(bytes));
}

std::string format_binary_reference(std::string_view text) { return format_reference(text); }

std::string format_binary_document(const std::vector<Link>& document) {
  std::string result;
  for (std::size_t index = 0; index < document.size(); ++index) {
    if (index > 0) result += '\n';
    result += format_nested(document[index], true);
  }
  return result;
}

}  // namespace links_notation
