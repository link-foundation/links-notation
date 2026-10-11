#include "links_notation/indented_document.hpp"

#include <stdexcept>

#include "links_notation/references.hpp"

namespace links_notation {

namespace {

// A text line can be a single quoted reference or a flat list of words. Named
// links and nested values have more structure than this document format holds.
std::string line_text(const Link& link) {
  if (link.id && link.values.empty()) return *link.id;
  bool all_text = !link.id && !link.values.empty();
  for (const Link& value : link.values) all_text = all_text && value.id && value.values.empty();
  if (!all_text) throw std::invalid_argument("Indented document lines must contain only text references");

  std::string text;
  for (const Link& value : link.values) {
    if (!text.empty() || &value != &link.values.front()) text += ' ';
    text += *value.id;
  }
  return text;
}

}  // namespace

std::vector<IndentedEntry> parse_indented_document(std::string_view document, MultipleValues multiple_values,
                                                   ParserOptions options) {
  std::vector<IndentedEntry> entries;
  for (const LinksGroup& group : Parser(options).parse_groups(document)) {
    const std::string parent = line_text(group.element);
    IndentedEntry* entry = nullptr;
    for (IndentedEntry& known : entries) {
      if (known.parent == parent) entry = &known;
    }
    if (!entry) {
      entries.push_back(IndentedEntry{parent, {}});
      entry = &entries.back();
    }
    for (const LinksGroup& child : group.children) {
      if (!child.children.empty()) {
        throw std::invalid_argument("Indented documents support only immediate children");
      }
      entry->values.push_back(line_text(child.element));
    }
  }

  if (multiple_values == MultipleValues::join) {
    for (IndentedEntry& entry : entries) {
      if (entry.values.size() < 2) continue;
      std::string joined = entry.values.front();
      for (std::size_t index = 1; index < entry.values.size(); ++index) joined += "\n" + entry.values[index];
      entry.values.assign(1, std::move(joined));
    }
  }
  return entries;
}

std::string format_indented_document(const std::vector<IndentedEntry>& entries) {
  std::string document;
  for (const IndentedEntry& entry : entries) {
    document += escape_reference(entry.parent, true);
    document += '\n';
    for (const std::string& value : entry.values) {
      document += "  ";
      document += escape_reference(value, true);
      document += '\n';
    }
  }
  return document;
}

}  // namespace links_notation
