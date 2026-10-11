#include <cstddef>
#include <stdexcept>

#include "links_notation/references.hpp"
#include "quotes.hpp"
#include "unicode.hpp"

namespace links_notation {

namespace {

std::size_t count_of(std::string_view text, char character) {
  std::size_t count = 0;
  for (const char each : text) {
    if (each == character) ++count;
  }
  return count;
}

// Whether a minimal reference has to be quoted to read back as itself.
bool needs_minimal_quoting(std::string_view reference) {
  // A literal prefix at the start of a word, as /(^| )~[0-9]+\{/ finds it.
  for (std::size_t position = 0; position < reference.size(); ++position) {
    if ((position == 0 || reference[position - 1] == ' ') &&
        has_reference_literal_prefix(reference.substr(position))) {
      return true;
    }
  }
  for (std::size_t position = 0; position < reference.size();) {
    const auto decoded = detail::decode_at(reference, position);
    const char32_t c = decoded.code_point;
    if (c == ':' || c == '(' || c == ')' || c == '\'' || c == '"' || c == '`') return true;
    if (c != ' ' && (detail::is_white_space(c) || c == 0xFEFF)) return true;
    position += decoded.length;
  }
  if (reference.front() == ' ' || reference.back() == ' ') return true;
  if (reference.find("  ") != std::string_view::npos) return true;
  // A comment marker at the start of a word.
  for (std::size_t position = 0; position < reference.size(); ++position) {
    if (reference[position] == '#' && (position == 0 || reference[position - 1] == ' ')) return true;
  }
  return false;
}

}  // namespace

std::string escape_reference(std::string_view reference, bool minimal) {
  detail::require_well_formed(reference);
  // Keep ordinary Link formatting identical to binary text formatting. The
  // versioned literal also preserves empty strings and control characters in
  // minimal document lines, including exact line endings.
  if (!minimal || reference.empty() || detail::has_control_character(reference)) {
    return format_reference(reference);
  }
  if (!needs_minimal_quoting(reference)) return std::string(reference);

  const std::size_t single_quotes = count_of(reference, '\'');
  const std::size_t double_quotes = count_of(reference, '"');
  char quote = single_quotes <= double_quotes ? '\'' : '"';
  // The opening delimiter must be a run of exactly one quote. Choosing the
  // other wrapper keeps a leading content quote from extending that run.
  if (reference.front() == quote) quote = quote == '\'' ? '"' : '\'';

  std::string result;
  result.reserve(reference.size() + 2);
  result.push_back(quote);
  for (const char character : reference) {
    if (character == quote) result.push_back(quote);
    result.push_back(character);
  }
  result.push_back(quote);
  return result;
}

std::string escape_reference(const std::optional<std::string>& reference, bool minimal) {
  if (!reference) return std::string();
  return escape_reference(std::string_view(*reference), minimal);
}

std::string unescape_reference(std::string_view reference) {
  if (has_reference_literal_prefix(reference)) return decode_reference_literal(reference);
  if (reference.empty() || !detail::is_quote(reference[0])) return std::string(reference);
  auto reading = detail::read_reference(reference);
  if (!reading || reading->length != reference.size()) {
    throw std::invalid_argument("Expected one complete quoted reference");
  }
  return std::move(reading->value);
}

}  // namespace links_notation
