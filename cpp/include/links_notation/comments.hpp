// Comments, and the rule that decides where one starts.
//
// A comment starts at a `#` written where a line or a token starts and runs to
// the end of the line. The parser never sees it: strip_comments replaces every
// byte of every comment with a space, so positions in parse errors still point
// at the characters the writer sees.

#ifndef LINKS_NOTATION_COMMENTS_HPP
#define LINKS_NOTATION_COMMENTS_HPP

#include <string>
#include <string_view>

namespace links_notation {

/// The character that opens a comment.
inline constexpr char comment_character = '#';

/// Blanks out every comment in `document`, keeping every other byte where it
/// was. A `#` inside a delimited reference or inside a word is not a comment.
std::string strip_comments(std::string_view document);

}  // namespace links_notation

#endif  // LINKS_NOTATION_COMMENTS_HPP
