// UTF-8 helpers shared by the parser, the formatter and the binary codec.
//
// Documents are UTF-8 byte strings. Offsets are byte offsets, as in the Rust
// and Go bindings; columns and line lengths count code points.

#ifndef LINKS_NOTATION_SRC_UNICODE_HPP
#define LINKS_NOTATION_SRC_UNICODE_HPP

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <string_view>

namespace links_notation::detail {

/// A code point and the number of bytes it takes.
struct Decoded {
  char32_t code_point;
  std::size_t length;
};

/// The code point at `position` of `text`. A byte that does not start a valid
/// UTF-8 sequence reads as U+FFFD one byte long, so positions always advance.
Decoded decode_at(std::string_view text, std::size_t position);

/// The strictly decoded code point at `position`, or nothing when the bytes
/// there are not well-formed UTF-8 (overlong, surrogate, out of range or cut).
std::optional<Decoded> decode_strict_at(std::string_view text, std::size_t position);

/// Whether `text` is well-formed UTF-8.
bool is_valid_utf8(std::string_view text);

/// Appends the UTF-8 encoding of `code_point`.
void append_utf8(std::string& out, char32_t code_point);

/// The number of code points in `text`.
std::size_t count_code_points(std::string_view text);

/// Unicode's White_Space property.
bool is_white_space(char32_t code_point);

/// Whether `text` holds U+0000-U+001F or U+007F.
bool has_control_character(std::string_view text);

/// Throws std::invalid_argument when `text` is not well-formed UTF-8.
void require_well_formed(std::string_view text);

/// The character the way Rust's `char::escape_debug` writes it.
std::string escape_debug(char32_t code_point);

}  // namespace links_notation::detail

#endif  // LINKS_NOTATION_SRC_UNICODE_HPP
