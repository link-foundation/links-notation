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

// What ends a bare reference. A token starts after one of these, at the start
// of the document, and right after a delimited reference or a versioned
// literal: the places the grammar reads a reference from.
constexpr std::string_view separators = " \t\n\r(:)";

// What can stand before a comment. A `#` inside a word is part of that word,
// so `issue#1047` is a reference.
constexpr std::string_view before_comment = " \t\n\r";

// Indentation: what may stand between the start of a line and a comment.
constexpr std::string_view indentation = " \t";

}  // namespace

namespace detail {

bool opens_comment(std::string_view document, std::size_t position) {
  if (position >= document.size() || document[position] != comment_character) return false;
  if (!follows(document, position, before_comment)) return false;
  std::size_t before = position;
  while (before > 0 && indentation.find(document[before - 1]) != std::string_view::npos) --before;
  if (before == 0 || document[before - 1] == '\n' || document[before - 1] == '\r') return true;
  const std::size_t next = position + 1;
  return next >= document.size() || separators.find(document[next]) != std::string_view::npos;
}

}  // namespace detail

std::string strip_comments(std::string_view document) {
  std::string bytes(document);
  const detail::DelimitedReferences references(document);
  std::size_t position = 0;
  // Whether a token may start at `position`. The document is read token by
  // token, as the grammar reads it, so a `#` inside a reference that starts
  // right after a group, another reference or a literal stays content, and
  // references are read in the document as written (issue #377).
  bool token_start = true;

  while (position < bytes.size()) {
    const char byte = bytes[position];

    if (byte == comment_character && detail::opens_comment(document, position)) {
      while (position < bytes.size() && bytes[position] != '\n' && bytes[position] != '\r') {
        bytes[position] = ' ';
        ++position;
      }
      continue;
    }

    if (separators.find(byte) != std::string_view::npos) {
      token_start = true;
      ++position;
      continue;
    }

    if (token_start) {
      if (const auto end = detail::delimited_token_end(document, position, references)) {
        position = *end;
        continue;
      }
    }

    // Anything else is part of a bare reference, which runs to a separator.
    token_start = false;
    ++position;
  }
  return bytes;
}

}  // namespace links_notation
