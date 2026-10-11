#include "links_notation/parse_error.hpp"

#include <algorithm>
#include <utility>

#include "unicode.hpp"

namespace links_notation {

namespace {

// The number of characters of the offending line a message quotes, and what it
// writes in place of the part of a long line it left out.
constexpr std::size_t quoted_line_width = 80;
constexpr std::string_view ellipsis = "...";

std::optional<std::string> join_alternatives(const std::vector<std::string>& alternatives) {
  if (alternatives.empty()) return std::nullopt;
  std::string result = alternatives[0];
  for (std::size_t index = 1; index < alternatives.size(); ++index) {
    result += index + 1 == alternatives.size() ? " or " : ", ";
    result += alternatives[index];
  }
  return result;
}

// Cuts `line` down to a window around `column`, and says which column the
// offending character sits at in that window. Both columns count from 1.
std::pair<std::string, std::size_t> quote_line(const std::string& line, std::size_t column) {
  std::vector<std::pair<std::size_t, std::size_t>> characters;  // byte start and length
  for (std::size_t position = 0; position < line.size();) {
    const auto decoded = detail::decode_at(line, position);
    characters.emplace_back(position, decoded.length);
    position += decoded.length;
  }
  if (characters.size() <= quoted_line_width) return {line, column};

  const std::size_t target = column - 1;
  const std::size_t last_start = characters.size() - quoted_line_width;
  const std::size_t start =
      std::min(target > quoted_line_width / 2 ? target - quoted_line_width / 2 : 0, last_start);
  const std::size_t end = start + quoted_line_width;

  std::string quoted;
  if (start > 0) quoted += ellipsis;
  const std::size_t from = characters[start].first;
  const std::size_t to = end < characters.size() ? characters[end].first : line.size();
  quoted += line.substr(from, to - from);
  if (end < characters.size()) quoted += ellipsis;

  const std::size_t shift = start > 0 ? ellipsis.size() : 0;
  return {quoted, target - start + shift + 1};
}

std::string summary_of(std::size_t line, std::size_t column, const std::vector<std::string>& expected,
                       bool has_found, char32_t found_code_point, std::optional<std::size_t> max_depth) {
  const std::string position = "line " + std::to_string(line) + ", column " + std::to_string(column) + ": ";
  if (max_depth) return position + "nesting depth exceeds the maximum of " + std::to_string(*max_depth);
  const std::string found = has_found ? "\"" + detail::escape_debug(found_code_point) + "\"" : "end of input";
  const auto alternatives = join_alternatives(expected);
  return alternatives ? position + "expected " + *alternatives + ", found " + found : position + "unexpected " + found;
}

std::string snippet_of(std::size_t number, const std::string& line_text, std::size_t column) {
  const auto [quoted, quoted_column] = quote_line(line_text, column);
  const std::string digits = std::to_string(number);
  return digits + " | " + quoted + "\n" + std::string(digits.size(), ' ') + " | " +
         std::string(quoted_column - 1, ' ') + "^";
}

}  // namespace

ParseError::Location ParseError::locate(const std::string& document, std::size_t offset) {
  offset = std::min(offset, document.size());
  std::size_t line = 1;
  std::size_t line_start = 0;
  std::size_t cursor = 0;
  while (cursor < offset) {
    if (document[cursor] == '\r') {
      ++line;
      ++cursor;
      if (cursor < offset && document[cursor] == '\n') ++cursor;
      line_start = cursor;
    } else if (document[cursor] == '\n') {
      ++line;
      ++cursor;
      line_start = cursor;
    } else {
      ++cursor;
    }
  }
  const std::size_t column =
      detail::count_code_points(std::string_view(document).substr(line_start, offset - line_start)) + 1;
  std::size_t line_end = document.find_first_of("\r\n", line_start);
  if (line_end == std::string::npos) line_end = document.size();

  std::optional<std::string> found;
  char32_t found_code_point = 0;
  if (offset < document.size()) {
    const auto decoded = detail::decode_at(document, offset);
    found = document.substr(offset, decoded.length);
    found_code_point = decoded.code_point;
  }
  return Location{offset, line, column, std::move(found), document.substr(line_start, line_end - line_start),
                  found_code_point};
}

std::string ParseError::message(const Location& location, const std::vector<std::string>& expected,
                                std::optional<std::size_t> max_depth) {
  const char* kind = max_depth ? "Nesting too deep at " : "Syntax error at ";
  return kind +
         summary_of(location.line, location.column, expected, location.found.has_value(), location.found_code_point,
                    max_depth) +
         "\n" + snippet_of(location.line, location.line_text, location.column);
}

ParseError::ParseError(const std::string& document, std::size_t offset, std::vector<std::string> expected,
                       std::optional<std::size_t> max_depth)
    : ParseError(locate(document, offset), std::move(expected), max_depth) {}

ParseError::ParseError(Location location, std::vector<std::string> expected, std::optional<std::size_t> max_depth)
    : std::runtime_error(message(location, expected, max_depth)),
      kind_(max_depth ? Kind::nesting : Kind::syntax),
      offset_(location.offset),
      line_(location.line),
      column_(location.column),
      expected_(max_depth ? std::vector<std::string>() : std::move(expected)),
      found_(std::move(location.found)),
      found_code_point_(location.found_code_point),
      line_text_(std::move(location.line_text)),
      max_depth_(max_depth) {}

std::string ParseError::summary() const {
  return summary_of(line_, column_, expected_, found_.has_value(), found_code_point_, max_depth_);
}

std::string ParseError::snippet() const { return snippet_of(line_, line_text_, column_); }

}  // namespace links_notation
