#include "links_notation/link.hpp"

#include <cstddef>

#include "links_notation/references.hpp"
#include "unicode.hpp"

namespace links_notation {

namespace {

std::string join(const std::vector<std::string>& parts, std::string_view separator) {
  std::string result;
  for (std::size_t index = 0; index < parts.size(); ++index) {
    if (index > 0) result += separator;
    result += parts[index];
  }
  return result;
}

bool all_simple(const std::vector<Link>& values) {
  for (const Link& value : values) {
    if (!value.values.empty()) return false;
  }
  return true;
}

std::string escaped_ids(const std::vector<Link>& values) {
  std::vector<std::string> parts;
  parts.reserve(values.size());
  for (const Link& value : values) parts.push_back(escape_reference(value.id));
  return join(parts, " ");
}

std::vector<Link> group_consecutive_links(const std::vector<Link>& links) {
  std::vector<Link> grouped;
  std::size_t index = 0;
  while (index < links.size()) {
    const Link& current = links[index];
    if (current.id && !current.values.empty()) {
      std::vector<Link> same_id_values = current.values;
      std::size_t next = index + 1;
      while (next < links.size() && links[next].id == current.id && !links[next].values.empty()) {
        same_id_values.insert(same_id_values.end(), links[next].values.begin(), links[next].values.end());
        ++next;
      }
      if (next > index + 1) {
        grouped.emplace_back(current.id, std::move(same_id_values));
        index = next;
        continue;
      }
    }
    grouped.push_back(current);
    ++index;
  }
  return grouped;
}

}  // namespace

FormatConfigBuilder FormatConfig::builder() { return FormatConfigBuilder(); }

bool FormatConfig::should_indent_by_length(std::string_view line) const {
  return indent_long_lines && detail::count_code_points(line) > max_line_length;
}

bool FormatConfig::should_indent_by_ref_count(std::size_t ref_count) const {
  return max_inline_refs && ref_count > *max_inline_refs;
}

FormatConfigBuilder& FormatConfigBuilder::less_parentheses(bool value) {
  config_.less_parentheses = value;
  return *this;
}

FormatConfigBuilder& FormatConfigBuilder::max_line_length(std::size_t value) {
  config_.max_line_length = value;
  return *this;
}

FormatConfigBuilder& FormatConfigBuilder::indent_long_lines(bool value) {
  config_.indent_long_lines = value;
  return *this;
}

FormatConfigBuilder& FormatConfigBuilder::max_inline_refs(std::optional<std::size_t> value) {
  config_.max_inline_refs = value;
  return *this;
}

FormatConfigBuilder& FormatConfigBuilder::group_consecutive(bool value) {
  config_.group_consecutive = value;
  return *this;
}

FormatConfigBuilder& FormatConfigBuilder::indent_string(std::string value) {
  config_.indent_string = std::move(value);
  return *this;
}

FormatConfigBuilder& FormatConfigBuilder::prefer_inline(bool value) {
  config_.prefer_inline = value;
  return *this;
}

FormatConfig FormatConfigBuilder::build() const { return config_; }

std::string Link::get_values_string() const {
  std::vector<std::string> parts;
  parts.reserve(values.size());
  for (const Link& value : values) parts.push_back(value.to_link_or_id_string());
  return join(parts, " ");
}

Link Link::simplify() const {
  if (values.empty()) return *this;
  if (values.size() == 1) return values[0];
  std::vector<Link> simplified;
  simplified.reserve(values.size());
  for (const Link& value : values) simplified.push_back(value.simplify());
  return Link(id, std::move(simplified));
}

Link Link::combine(const Link& other) const { return Link(std::nullopt, {*this, other}); }

std::string Link::to_link_or_id_string() const {
  if (values.empty()) return escape_reference(id);
  return to_string();
}

bool Link::equals(const Link& other) const {
  if (id != other.id || values.size() != other.values.size()) return false;
  for (std::size_t index = 0; index < values.size(); ++index) {
    if (!values[index].equals(other.values[index])) return false;
  }
  return true;
}

bool Link::needs_parentheses(std::string_view id) {
  return id.find_first_of(" :()") != std::string_view::npos;
}

std::string Link::format_value(const Link& value) const {
  // Values of a link combined from an indented path keep their parentheses.
  if (from_path_combination) return value.format(false, true);
  // A reference is written bare as a value.
  if (value.values.empty()) return escape_reference(value.id);
  return value.format(false, false);
}

std::string Link::values_string() const {
  std::vector<std::string> parts;
  parts.reserve(values.size());
  for (const Link& value : values) parts.push_back(format_value(value));
  return join(parts, " ");
}

std::string Link::format(bool less_parentheses, bool compound) const {
  if (!id && values.empty()) return less_parentheses ? "" : "()";

  if (values.empty()) {
    const std::string escaped = escape_reference(id);
    if (compound) return "(" + escaped + ")";
    return less_parentheses && !needs_parentheses(*id) ? escaped : "(" + escaped + ")";
  }

  const std::string formatted_values = values_string();
  if (!id) {
    if (less_parentheses) return all_simple(values) ? escaped_ids(values) : formatted_values;
    return "(" + formatted_values + ")";
  }

  const std::string with_colon = escape_reference(id) + ": " + formatted_values;
  return less_parentheses && !needs_parentheses(*id) ? with_colon : "(" + with_colon + ")";
}

std::string Link::format(const FormatConfig& config, bool compound) const {
  if (values.empty()) return format(config.less_parentheses, compound);

  bool should_indent = config.should_indent_by_ref_count(values.size());
  if (!should_indent) {
    const std::string formatted_values = values_string();
    std::string test_line;
    if (id) {
      const std::string with_colon = escape_reference(id) + ": " + formatted_values;
      test_line = config.less_parentheses ? with_colon : "(" + with_colon + ")";
    } else {
      test_line = config.less_parentheses ? formatted_values : "(" + formatted_values + ")";
    }
    should_indent = config.should_indent_by_length(test_line);
  }

  if (should_indent && !config.prefer_inline) return format_indented(config);
  return format(config.less_parentheses, compound);
}

std::string Link::format_indented(const FormatConfig& config) const {
  std::vector<std::string> lines;
  if (id) lines.push_back(escape_reference(id) + ":");
  for (const Link& value : values) lines.push_back(config.indent_string + format_value(value));
  return join(lines, "\n");
}

bool operator==(const Link& left, const Link& right) { return left.equals(right); }

bool operator!=(const Link& left, const Link& right) { return !left.equals(right); }

std::ostream& operator<<(std::ostream& out, const Link& link) { return out << link.to_string(); }

std::string format_links(const std::vector<Link>& links, bool less_parentheses) {
  std::vector<std::string> lines;
  lines.reserve(links.size());
  for (const Link& link : links) lines.push_back(link.format(less_parentheses));
  return join(lines, "\n");
}

std::string format_links(const std::vector<Link>& links, const FormatConfig& config) {
  const std::vector<Link> grouped = config.group_consecutive ? group_consecutive_links(links) : links;
  std::vector<std::string> lines;
  lines.reserve(grouped.size());
  for (const Link& link : grouped) lines.push_back(link.format(config));
  return join(lines, "\n");
}

}  // namespace links_notation
