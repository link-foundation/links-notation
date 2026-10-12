// How Link and format_links lay out their output.

#ifndef LINKS_NOTATION_FORMAT_CONFIG_HPP
#define LINKS_NOTATION_FORMAT_CONFIG_HPP

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>

namespace links_notation {

class FormatConfigBuilder;

/// Formatting options, matching FormatConfig in the other implementations.
struct FormatConfig {
  /// Omit parentheses where the result still reads back the same.
  bool less_parentheses = false;
  /// The longest line, in code points, before indent_long_lines applies.
  std::size_t max_line_length = 80;
  /// Indent links whose inline form is longer than max_line_length.
  bool indent_long_lines = false;
  /// Indent links with more values than this.
  std::optional<std::size_t> max_inline_refs;
  /// Merge consecutive links that share an id into one link.
  bool group_consecutive = false;
  /// What one level of indentation is written as.
  std::string indent_string = "  ";
  /// Keep links inline even when a threshold says they could be indented.
  bool prefer_inline = true;

  static FormatConfigBuilder builder();

  /// Whether `line` is long enough to be indented.
  bool should_indent_by_length(std::string_view line) const;

  /// Whether a link with `ref_count` values has enough of them to be indented.
  bool should_indent_by_ref_count(std::size_t ref_count) const;
};

/// Builds a FormatConfig one option at a time.
class FormatConfigBuilder {
 public:
  FormatConfigBuilder& less_parentheses(bool value);
  FormatConfigBuilder& max_line_length(std::size_t value);
  FormatConfigBuilder& indent_long_lines(bool value);
  FormatConfigBuilder& max_inline_refs(std::optional<std::size_t> value);
  FormatConfigBuilder& group_consecutive(bool value);
  FormatConfigBuilder& indent_string(std::string value);
  FormatConfigBuilder& prefer_inline(bool value);
  FormatConfig build() const;

 private:
  FormatConfig config_;
};

}  // namespace links_notation

#endif  // LINKS_NOTATION_FORMAT_CONFIG_HPP
