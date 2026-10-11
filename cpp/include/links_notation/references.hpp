// Writing and reading single references.

#ifndef LINKS_NOTATION_REFERENCES_HPP
#define LINKS_NOTATION_REFERENCES_HPP

#include <optional>
#include <string>
#include <string_view>

namespace links_notation {

/// Encodes exact Unicode text as a version 1 UTF-8 hexadecimal reference,
/// such as `~1{68690a}` for "hi\n".
///
/// Throws std::invalid_argument when `text` is not well-formed UTF-8.
std::string encode_reference_literal(std::string_view text);

/// Decodes a complete `~1{...}` literal.
///
/// Throws std::invalid_argument for another version, an odd number of hex
/// digits, anything after the closing brace or bytes that are not UTF-8.
std::string decode_reference_literal(std::string_view literal);

/// Whether `text` starts with the reserved literal prefix `~<digits>{`.
bool has_reference_literal_prefix(std::string_view text);

/// Writes `text` as one reference: unchanged when it reads back as itself,
/// quoted with the delimiter that needs the shortest run otherwise, and as a
/// reference literal when it is empty or holds a control character.
std::string format_reference(std::string_view text);

/// Writes `reference` so that the parser reads it back exactly.
///
/// With `minimal`, ordinary text with single spaces stays unquoted, which is
/// how indented documents write their lines.
std::string escape_reference(std::string_view reference, bool minimal = false);

/// escape_reference for an optional id: a missing id writes as "".
std::string escape_reference(const std::optional<std::string>& reference, bool minimal = false);

// Strings and literals convert to both of the above, so they pick one here.
inline std::string escape_reference(const std::string& reference, bool minimal = false) {
  return escape_reference(std::string_view(reference), minimal);
}
inline std::string escape_reference(const char* reference, bool minimal = false) {
  return escape_reference(std::string_view(reference), minimal);
}

/// Decodes one complete escaped reference. Text that is neither quoted nor a
/// reference literal is returned unchanged.
///
/// Throws std::invalid_argument when a quoted reference does not span the
/// whole text or a literal is invalid.
std::string unescape_reference(std::string_view reference);

}  // namespace links_notation

#endif  // LINKS_NOTATION_REFERENCES_HPP
