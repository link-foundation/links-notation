// Version 1 lossless UTF-8 reference literals, with readable legacy quoting.

#include <cstddef>
#include <stdexcept>

#include "links_notation/references.hpp"
#include "unicode.hpp"

namespace links_notation {

namespace {

constexpr const char* invalid_literal = "Invalid or unsupported reference literal (expected ~1{UTF-8 hex})";

bool is_digit(char character) { return character >= '0' && character <= '9'; }

int hex_value(char character) {
  if (character >= '0' && character <= '9') return character - '0';
  if (character >= 'a' && character <= 'f') return character - 'a' + 10;
  if (character >= 'A' && character <= 'F') return character - 'A' + 10;
  return -1;
}

}  // namespace

std::string encode_reference_literal(std::string_view text) {
  detail::require_well_formed(text);
  static constexpr char digits[] = "0123456789abcdef";
  std::string result;
  result.reserve(text.size() * 2 + 4);
  result += "~1{";
  for (const char character : text) {
    const auto byte = static_cast<unsigned char>(character);
    result.push_back(digits[byte >> 4U]);
    result.push_back(digits[byte & 0x0FU]);
  }
  result.push_back('}');
  return result;
}

std::string decode_reference_literal(std::string_view literal) {
  if (literal.size() < 4 || literal[0] != '~') throw std::invalid_argument(invalid_literal);
  std::size_t position = 1;
  while (position < literal.size() && is_digit(literal[position])) ++position;
  if (position == 1 || literal.substr(1, position - 1) != "1" || position >= literal.size() ||
      literal[position] != '{' || literal.back() != '}') {
    throw std::invalid_argument(invalid_literal);
  }
  const std::string_view hex = literal.substr(position + 1, literal.size() - position - 2);
  if (hex.size() % 2 != 0) throw std::invalid_argument(invalid_literal);
  std::string bytes;
  bytes.reserve(hex.size() / 2);
  for (std::size_t index = 0; index < hex.size(); index += 2) {
    const int high = hex_value(hex[index]);
    const int low = hex_value(hex[index + 1]);
    if (high < 0 || low < 0) throw std::invalid_argument(invalid_literal);
    bytes.push_back(static_cast<char>((high << 4) | low));
  }
  if (!detail::is_valid_utf8(bytes)) throw std::invalid_argument(invalid_literal);
  return bytes;
}

bool has_reference_literal_prefix(std::string_view text) {
  if (text.empty() || text[0] != '~') return false;
  std::size_t position = 1;
  while (position < text.size() && is_digit(text[position])) ++position;
  return position > 1 && position < text.size() && text[position] == '{';
}

std::string format_reference(std::string_view text) {
  detail::require_well_formed(text);
  if (text.empty() || detail::has_control_character(text)) return encode_reference_literal(text);

  bool needs_quoting = text[0] == '#' || has_reference_literal_prefix(text);
  for (std::size_t position = 0; !needs_quoting && position < text.size();) {
    const auto decoded = detail::decode_at(text, position);
    const char32_t c = decoded.code_point;
    needs_quoting = detail::is_white_space(c) || c == 0xFEFF || c == '(' || c == ')' || c == ':' ||
                    c == '\'' || c == '"' || c == '`';
    position += decoded.length;
  }
  if (!needs_quoting) return std::string(text);

  char chosen = 0;
  std::size_t chosen_count = 0;
  for (const char quote : {'\'', '"', '`'}) {
    if (text[0] == quote) continue;
    std::size_t longest = 0;
    std::size_t run = 0;
    for (const char character : text) {
      run = character == quote ? run + 1 : 0;
      if (run > longest) longest = run;
    }
    const std::size_t count = (longest + 1) | 1U;
    if (chosen == 0 || count < chosen_count) {
      chosen = quote;
      chosen_count = count;
    }
  }
  const std::string delimiter(chosen_count, chosen);
  std::string result;
  result.reserve(text.size() + 2 * chosen_count);
  result += delimiter;
  result += text;
  result += delimiter;
  return result;
}

}  // namespace links_notation
