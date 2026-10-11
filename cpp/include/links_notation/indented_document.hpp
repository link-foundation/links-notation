// Plain text documents written as parents with indented children.
//
//     colors
//       red
//       "light blue"
//     empty
//
// reads as {colors: [red, light blue], empty: []}: each parent maps to the text
// of the lines indented under it.

#ifndef LINKS_NOTATION_INDENTED_DOCUMENT_HPP
#define LINKS_NOTATION_INDENTED_DOCUMENT_HPP

#include <string>
#include <string_view>
#include <utility>
#include <vector>

#include "links_notation/parser.hpp"

namespace links_notation {

/// How several children of one parent are returned.
enum class MultipleValues {
  /// Every child separately.
  array,
  /// All children joined into one text, one child per line.
  join,
};

/// One parent and the texts of its children, in document order.
struct IndentedEntry {
  std::string parent;
  std::vector<std::string> values;

  bool operator==(const IndentedEntry& other) const {
    return parent == other.parent && values == other.values;
  }
  bool operator!=(const IndentedEntry& other) const { return !(*this == other); }
};

/// Reads text parents and their immediate text children. A parent written
/// again keeps its first place and gathers the children of every occurrence.
/// With MultipleValues::join, several children become one value joined with
/// line breaks.
///
/// Throws std::invalid_argument when a line holds more structure than text, or
/// a child has children of its own, and ParseError when the document does not
/// parse.
std::vector<IndentedEntry> parse_indented_document(std::string_view document,
                                                   MultipleValues multiple_values = MultipleValues::array,
                                                   ParserOptions options = {});

/// Writes parents and children with minimal quoting and two-space indentation.
/// Each value is one child line, so a text with line breaks stays one quoted
/// reference. A document with entries ends with a line break.
std::string format_indented_document(const std::vector<IndentedEntry>& entries);

}  // namespace links_notation

#endif  // LINKS_NOTATION_INDENTED_DOCUMENT_HPP
