// The error a document that does not parse is reported with.

#ifndef LINKS_NOTATION_PARSE_ERROR_HPP
#define LINKS_NOTATION_PARSE_ERROR_HPP

#include <cstddef>
#include <optional>
#include <stdexcept>
#include <string>
#include <vector>

namespace links_notation {

/// Thrown when a document does not parse, carrying the position the parser
/// stopped at: the furthest position any alternative reached.
///
/// The message names the line and column, what could have continued the
/// document there and what does, and quotes the offending line with a caret
/// under the offending column:
///
///     Syntax error at line 1, column 5: expected "(", a reference or end of line, found ":"
///     1 | a: b: c
///       |     ^
class ParseError : public std::runtime_error {
 public:
  enum class Kind {
    /// The document stops making sense at the reported position.
    syntax,
    /// The document nests links deeper than ParserOptions::max_depth, and the
    /// reported position is where the level that is one too deep opens.
    nesting,
  };

  /// Locates `offset` in `document` and builds the error for it.
  ParseError(const std::string& document, std::size_t offset, std::vector<std::string> expected,
             std::optional<std::size_t> max_depth);

  Kind kind() const { return kind_; }
  /// Byte offset of the offending position from the start of the document.
  std::size_t offset() const { return offset_; }
  /// Line the offending position is on, counted from 1.
  std::size_t line() const { return line_; }
  /// Column the offending position is at, in code points, counted from 1.
  std::size_t column() const { return column_; }
  /// What could have continued the document at this position; empty when the
  /// parser stopped somewhere it names no expectation for.
  const std::vector<std::string>& expected() const { return expected_; }
  /// The character found instead, or nothing at the end of the document.
  const std::optional<std::string>& found() const { return found_; }
  /// The offending line, as written, without its line ending.
  const std::string& line_text() const { return line_text_; }
  /// The deepest nesting allowed, for a nesting error.
  std::optional<std::size_t> max_depth() const { return max_depth_; }

  /// The one-line summary: where the parser stopped and why.
  std::string summary() const;
  /// The offending line with a caret under the offending column.
  std::string snippet() const;

 private:
  struct Location {
    std::size_t offset;
    std::size_t line;
    std::size_t column;
    std::optional<std::string> found;
    std::string line_text;
    char32_t found_code_point;
  };
  ParseError(Location location, std::vector<std::string> expected, std::optional<std::size_t> max_depth);
  static Location locate(const std::string& document, std::size_t offset);
  static std::string message(const Location& location, const std::vector<std::string>& expected,
                             std::optional<std::size_t> max_depth);

  Kind kind_;
  std::size_t offset_;
  std::size_t line_;
  std::size_t column_;
  std::vector<std::string> expected_;
  std::optional<std::string> found_;
  char32_t found_code_point_;
  std::string line_text_;
  std::optional<std::size_t> max_depth_;
};

}  // namespace links_notation

#endif  // LINKS_NOTATION_PARSE_ERROR_HPP
