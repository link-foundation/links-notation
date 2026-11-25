// Comments, and the rule that decides where one starts.
//
// A comment starts at a `#` that opens a token and is not a value, and runs to
// the end of the line:
//
// - at the start of a line, after any indentation, a `#` always starts one;
// - later on a line, after a space or a tab, a `#` starts one only when no
//   character that could continue a bare reference follows it, that is when
//   whitespace, the end of the document, `(`, `)` or `:` comes next. So
//   `a: b # why` and `a: b #` hold a comment, while `tag #release` is the link
//   of `tag` and `#release` (issue #444): a value is never silently dropped.
//
// A `#` written inside a token (`issue#1047`) or inside a delimited reference
// (`"# not a comment"`) is an ordinary character. The parser never sees a
// comment: strip_comments replaces every byte of every comment with a space,
// so positions in parse errors still point at the characters the writer sees.

#ifndef LINKS_NOTATION_COMMENTS_HPP
#define LINKS_NOTATION_COMMENTS_HPP

#include <string>
#include <string_view>

namespace links_notation {

/// The character that opens a comment.
inline constexpr char comment_character = '#';

/// Blanks out every comment in `document`, keeping every other byte where it
/// was. A `#` inside a delimited reference or inside a word is not a comment,
/// and neither is one that opens a value later on a line: `"tag #release\n"`
/// is returned unchanged.
std::string strip_comments(std::string_view document);

}  // namespace links_notation

#endif  // LINKS_NOTATION_COMMENTS_HPP
