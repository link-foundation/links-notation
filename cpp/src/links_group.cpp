#include "links_notation/links_group.hpp"

namespace links_notation {

namespace {

void append_to_list(const LinksGroup& group, std::vector<Link>& list) {
  list.push_back(group.element);
  for (const LinksGroup& child : group.children) append_to_list(child, list);
}

}  // namespace

std::vector<Link> LinksGroup::to_list() const {
  std::vector<Link> list;
  append_to_list(*this, list);
  return list;
}

std::string LinksGroup::to_string() const {
  std::string result;
  for (const Link& item : to_list()) {
    if (!result.empty()) result += ' ';
    result += '(';
    result += item.id && !item.id->empty() ? *item.id : item.to_string();
    result += ')';
  }
  return result;
}

}  // namespace links_notation
