// The indentation tree of a document, before it is expanded into links.

#ifndef LINKS_NOTATION_LINKS_GROUP_HPP
#define LINKS_NOTATION_LINKS_GROUP_HPP

#include <string>
#include <vector>

#include "links_notation/link.hpp"

namespace links_notation {

/// One line of a document and the groups for the lines indented under it.
struct LinksGroup {
  Link element;
  std::vector<LinksGroup> children;

  LinksGroup() = default;
  explicit LinksGroup(Link element, std::vector<LinksGroup> children = {})
      : element(std::move(element)), children(std::move(children)) {}

  /// The element followed by the elements of every descendant, depth first.
  std::vector<Link> to_list() const;

  /// Every element of to_list in parentheses, separated by spaces.
  std::string to_string() const;
};

}  // namespace links_notation

#endif  // LINKS_NOTATION_LINKS_GROUP_HPP
