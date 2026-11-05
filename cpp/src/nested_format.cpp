#include <stdexcept>

#include "links_notation/link.hpp"
#include "links_notation/references.hpp"

namespace links_notation {
namespace {
bool atom(const Link& link) { return link.id && link.values.empty(); }
bool can_nest(const Link& link) {
  return !atom(link) && !(link.id == std::nullopt && link.values.size() == 1 && !atom(link.values[0]));
}
bool line_holds(const Link& link, std::size_t count) {
  return link.id || count >= 2 || (count == 1 && atom(link.values[0]));
}
void write(const Link& link, const std::string& pad, const std::string& indent, bool under_name,
           std::vector<std::string>& lines) {
  if (!line_holds(link, link.values.size()) || (under_name && !link.id && link.values.size() == 1)) {
    lines.push_back(pad + link.format());
    return;
  }
  std::size_t count = link.values.size();
  while (count > 0 && can_nest(link.values[count - 1])) --count;
  while (count < link.values.size() && !line_holds(link, count)) ++count;
  std::string head = link.id ? escape_reference(link.id) + ":" : "";
  for (std::size_t i = 0; i < count; ++i) {
    if (!head.empty()) head += ' ';
    const Link& value = link.values[i];
    head += atom(value) ? escape_reference(value.id) : value.format();
  }
  lines.push_back(pad + head);
  for (std::size_t i = count; i < link.values.size(); ++i) {
    write(link.values[i], pad + indent, indent, under_name || (link.id && count == 0), lines);
  }
}
}  // namespace

std::string format_nested(const std::vector<Link>& links, const std::string& indent) {
  if (indent.empty() || indent.find_first_not_of(" ") != std::string::npos) {
    throw std::invalid_argument("indent must contain only spaces and be nonempty");
  }
  std::vector<std::string> lines;
  for (const Link& link : links) write(link, "", indent, false, lines);
  std::string result;
  for (std::size_t i = 0; i < lines.size(); ++i) {
    if (i) result += '\n';
    result += lines[i];
  }
  return result;
}
}  // namespace links_notation
