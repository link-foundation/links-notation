// The link: an optional id and the links it is made of.

#ifndef LINKS_NOTATION_LINK_HPP
#define LINKS_NOTATION_LINK_HPP

#include <optional>
#include <ostream>
#include <string>
#include <string_view>
#include <vector>

#include "links_notation/format_config.hpp"

namespace links_notation {

/// A link. A link with an id and no values is a reference; a link with
/// neither is the empty link `()`.
class Link {
 public:
  /// The empty link.
  Link() = default;
  /// A reference.
  Link(const char* id) : id(std::string(id)) {}  // NOLINT(google-explicit-constructor)
  /// A reference.
  explicit Link(std::string id) : id(std::move(id)) {}
  /// A link with an optional id and its values.
  Link(std::optional<std::string> id, std::vector<Link> values)
      : id(std::move(id)), values(std::move(values)) {}

  std::optional<std::string> id;
  std::vector<Link> values;
  /// Set on links the parser builds by combining an indented path, whose
  /// values format in parentheses.
  bool from_path_combination = false;

  /// Whether this link has no values.
  bool is_reference() const { return values.empty(); }

  /// The link as notation, with every parenthesis written.
  std::string to_string() const { return format(false); }

  /// The values written one after another, separated by spaces.
  std::string get_values_string() const;

  /// The link with every link of one value replaced by that value.
  Link simplify() const;

  /// A link with no id whose values are this link and `other`.
  Link combine(const Link& other) const;

  /// The escaped id of a reference, or the whole link otherwise.
  std::string to_link_or_id_string() const;

  /// Whether both links have the same id and equal values.
  bool equals(const Link& other) const;

  /// Writes the link. `less_parentheses` omits parentheses where safe; a
  /// `compound` value is a reference that is written in parentheses.
  std::string format(bool less_parentheses = false, bool compound = false) const;

  /// Writes the link following `config`.
  std::string format(const FormatConfig& config, bool compound = false) const;

  /// Whether an id must be written in parentheses to stand alone.
  static bool needs_parentheses(std::string_view id);

 private:
  std::string format_value(const Link& value) const;
  std::string values_string() const;
  std::string format_indented(const FormatConfig& config) const;
};

bool operator==(const Link& left, const Link& right);
bool operator!=(const Link& left, const Link& right);
std::ostream& operator<<(std::ostream& out, const Link& link);

/// Writes links one per line.
std::string format_links(const std::vector<Link>& links, bool less_parentheses = false);

/// Writes links one per line following `config`.
std::string format_links(const std::vector<Link>& links, const FormatConfig& config);

}  // namespace links_notation

#endif  // LINKS_NOTATION_LINK_HPP
