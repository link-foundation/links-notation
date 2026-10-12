#include "links_notation/comments.hpp"

#include <cstddef>

#include "quotes.hpp"

namespace links_notation {

namespace {

// Whether the byte before `position` is one of `allowed`, treating the start
// of the document as one of them.
bool follows(std::string_view bytes, std::size_t position, std::string_view allowed) {
  return position == 0 || allowed.find(bytes[position - 1]) != std::string_view::npos;
}

// What can stand before a delimited reference, and before a comment. A `#`
// inside a word is part of that word, so `issue#1047` is a reference.
constexpr std::string_view before_reference = " \t\n\r(:";
constexpr std::string_view before_comment = " \t\n\r";

}  // namespace

std::string strip_comments(std::string_view document) {
  std::string bytes(document);
  const detail::DelimitedReferences references(document);
  std::size_t position = 0;

  while (position < bytes.size()) {
    const char byte = bytes[position];

    if (detail::is_quote(byte) && follows(bytes, position, before_reference)) {
      const auto end = references.end_at(position);
      position = end ? *end : position + 1;
      continue;
    }

    if (byte == comment_character && follows(bytes, position, before_comment)) {
      while (position < bytes.size() && bytes[position] != '\n' && bytes[position] != '\r') {
        bytes[position] = ' ';
        ++position;
      }
      continue;
    }

    ++position;
  }
  return bytes;
}

}  // namespace links_notation
