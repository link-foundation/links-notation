#include "unicode.hpp"

#include <cstdio>
#include <stdexcept>

namespace links_notation::detail {

namespace {

constexpr char32_t replacement_character = 0xFFFD;

unsigned char byte_at(std::string_view text, std::size_t position) {
  return static_cast<unsigned char>(text[position]);
}

bool is_continuation(unsigned char byte) { return (byte & 0xC0U) == 0x80U; }

// Printable as far as escape_debug is concerned: Rust escapes the grapheme
// extenders and everything that is not printable. The common cases that
// matter for messages are the controls, the separators and unassigned
// surrogate-adjacent ranges; anything else is shown as written.
bool is_printable(char32_t code_point) {
  if (code_point < 0x20 || (code_point >= 0x7F && code_point < 0xA0)) return false;
  if (code_point == 0xAD) return false;
  if (code_point >= 0x2028 && code_point <= 0x202E) return false;
  if (code_point >= 0x200B && code_point <= 0x200F) return false;
  if (code_point >= 0x2060 && code_point <= 0x206F) return false;
  if (code_point == 0xFEFF) return false;
  if (code_point >= 0xFFF9 && code_point <= 0xFFFB) return false;
  if (code_point >= 0xE000 && code_point <= 0xF8FF) return false;
  if (code_point >= 0xF0000) return false;
  return true;
}

}  // namespace

std::optional<Decoded> decode_strict_at(std::string_view text, std::size_t position) {
  if (position >= text.size()) return std::nullopt;
  const unsigned char lead = byte_at(text, position);
  if (lead < 0x80) return Decoded{lead, 1};

  std::size_t length = 0;
  char32_t code_point = 0;
  char32_t minimum = 0;
  if ((lead & 0xE0U) == 0xC0U) {
    length = 2;
    code_point = lead & 0x1FU;
    minimum = 0x80;
  } else if ((lead & 0xF0U) == 0xE0U) {
    length = 3;
    code_point = lead & 0x0FU;
    minimum = 0x800;
  } else if ((lead & 0xF8U) == 0xF0U) {
    length = 4;
    code_point = lead & 0x07U;
    minimum = 0x10000;
  } else {
    return std::nullopt;
  }
  if (position + length > text.size()) return std::nullopt;
  for (std::size_t index = 1; index < length; ++index) {
    const unsigned char next = byte_at(text, position + index);
    if (!is_continuation(next)) return std::nullopt;
    code_point = (code_point << 6U) | (next & 0x3FU);
  }
  if (code_point < minimum || code_point > 0x10FFFF ||
      (code_point >= 0xD800 && code_point <= 0xDFFF)) {
    return std::nullopt;
  }
  return Decoded{code_point, length};
}

Decoded decode_at(std::string_view text, std::size_t position) {
  if (auto decoded = decode_strict_at(text, position)) return *decoded;
  return Decoded{replacement_character, 1};
}

bool is_valid_utf8(std::string_view text) {
  std::size_t position = 0;
  while (position < text.size()) {
    const auto decoded = decode_strict_at(text, position);
    if (!decoded) return false;
    position += decoded->length;
  }
  return true;
}

void append_utf8(std::string& out, char32_t code_point) {
  if (code_point < 0x80) {
    out.push_back(static_cast<char>(code_point));
  } else if (code_point < 0x800) {
    out.push_back(static_cast<char>(0xC0U | (code_point >> 6U)));
    out.push_back(static_cast<char>(0x80U | (code_point & 0x3FU)));
  } else if (code_point < 0x10000) {
    out.push_back(static_cast<char>(0xE0U | (code_point >> 12U)));
    out.push_back(static_cast<char>(0x80U | ((code_point >> 6U) & 0x3FU)));
    out.push_back(static_cast<char>(0x80U | (code_point & 0x3FU)));
  } else {
    out.push_back(static_cast<char>(0xF0U | (code_point >> 18U)));
    out.push_back(static_cast<char>(0x80U | ((code_point >> 12U) & 0x3FU)));
    out.push_back(static_cast<char>(0x80U | ((code_point >> 6U) & 0x3FU)));
    out.push_back(static_cast<char>(0x80U | (code_point & 0x3FU)));
  }
}

std::size_t count_code_points(std::string_view text) {
  std::size_t count = 0;
  std::size_t position = 0;
  while (position < text.size()) {
    position += decode_at(text, position).length;
    ++count;
  }
  return count;
}

bool is_white_space(char32_t code_point) {
  return (code_point >= 0x09 && code_point <= 0x0D) || code_point == 0x20 || code_point == 0x85 ||
         code_point == 0xA0 || code_point == 0x1680 || (code_point >= 0x2000 && code_point <= 0x200A) ||
         code_point == 0x2028 || code_point == 0x2029 || code_point == 0x202F || code_point == 0x205F ||
         code_point == 0x3000;
}

bool has_control_character(std::string_view text) {
  for (const char character : text) {
    const auto byte = static_cast<unsigned char>(character);
    if (byte < 0x20 || byte == 0x7F) return true;
  }
  return false;
}

void require_well_formed(std::string_view text) {
  if (!is_valid_utf8(text)) {
    throw std::invalid_argument("Reference must be well-formed Unicode text");
  }
}

std::string escape_debug(char32_t code_point) {
  switch (code_point) {
    case '\t':
      return "\\t";
    case '\r':
      return "\\r";
    case '\n':
      return "\\n";
    case '\\':
      return "\\\\";
    case '\'':
      return "\\'";
    case '"':
      return "\\\"";
    case 0:
      return "\\0";
    default:
      break;
  }
  if (!is_printable(code_point)) {
    char buffer[16];
    std::snprintf(buffer, sizeof buffer, "\\u{%x}", static_cast<unsigned>(code_point));
    return buffer;
  }
  std::string out;
  append_utf8(out, code_point);
  return out;
}

}  // namespace links_notation::detail
