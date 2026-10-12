// Helpers shared by the test suites.

#ifndef LINKS_NOTATION_TEST_SUPPORT_HPP
#define LINKS_NOTATION_TEST_SUPPORT_HPP

#include <cstdint>
#include <cstdlib>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

#include "links_notation.hpp"

namespace links_notation_test {

/// How many times longer than usual the timing tests may take, from
/// LINKS_NOTATION_TIME_SCALE. Sanitizers slow every step a few times over;
/// the readings the bounds guard against were slower by orders of magnitude.
inline int time_scale() {
  const char* value = std::getenv("LINKS_NOTATION_TIME_SCALE");
  const int scale = value == nullptr ? 1 : std::atoi(value);
  return scale > 0 ? scale : 1;
}

/// Reads a file of the repository, given relative to its root.
inline std::string read_repository_file(const std::string& path) {
  std::ifstream in(std::string(LINKS_NOTATION_REPOSITORY_ROOT) + "/" + path, std::ios::binary);
  if (!in) throw std::runtime_error("cannot read " + path);
  std::ostringstream content;
  content << in.rdbuf();
  return content.str();
}

/// Splits text at every separator, keeping empty parts.
inline std::vector<std::string> split(const std::string& text, char separator) {
  std::vector<std::string> parts;
  std::string part;
  for (const char character : text) {
    if (character == separator) {
      parts.push_back(part);
      part.clear();
    } else {
      part += character;
    }
  }
  parts.push_back(part);
  return parts;
}

/// The lines of text, without their line breaks.
inline std::vector<std::string> lines(const std::string& text) {
  std::vector<std::string> result = split(text, '\n');
  for (std::string& line : result) {
    if (!line.empty() && line.back() == '\r') line.pop_back();
  }
  if (!result.empty() && result.back().empty()) result.pop_back();
  return result;
}

/// Bytes from hexadecimal digits, ignoring spaces.
inline std::vector<std::uint8_t> from_hex(const std::string& hex) {
  std::string digits;
  for (const char character : hex) {
    if (character != ' ') digits += character;
  }
  if (digits.size() % 2 != 0) throw std::invalid_argument("odd hexadecimal length");
  std::vector<std::uint8_t> bytes;
  for (std::size_t index = 0; index < digits.size(); index += 2) {
    bytes.push_back(static_cast<std::uint8_t>(std::stoul(digits.substr(index, 2), nullptr, 16)));
  }
  return bytes;
}

/// Text from hexadecimal UTF-8.
inline std::string text_from_hex(const std::string& hex) {
  const std::vector<std::uint8_t> bytes = from_hex(hex);
  return std::string(bytes.begin(), bytes.end());
}

/// Lowercase hexadecimal digits of bytes.
template <typename Bytes>
std::string to_hex(const Bytes& bytes) {
  static const char digits[] = "0123456789abcdef";
  std::string hex;
  for (const auto byte : bytes) {
    const auto value = static_cast<unsigned char>(byte);
    hex += digits[value >> 4];
    hex += digits[value & 15];
  }
  return hex;
}

/// The bytes of a string.
inline std::vector<std::uint8_t> bytes_of(const std::string& text) {
  return std::vector<std::uint8_t>(text.begin(), text.end());
}

}  // namespace links_notation_test

#endif  // LINKS_NOTATION_TEST_SUPPORT_HPP
