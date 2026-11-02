#include "quotes.hpp"

#include <algorithm>

namespace links_notation::detail {

namespace {

std::size_t run_length(std::string_view text, std::size_t start, char quote) {
  std::size_t position = start;
  while (position < text.size() && text[position] == quote) ++position;
  return position - start;
}

bool is_whitespace_byte(char character) {
  return character == ' ' || character == '\t' || character == '\n' || character == '\r';
}

// A body written between an even run of delimiters is substantive when it
// holds at least one visible character and does not straddle a parenthesis.
bool is_substantive_body(std::string_view content) {
  long depth = 0;
  bool has_visible = false;
  for (const char character : content) {
    if (character == '(') {
      ++depth;
    } else if (character == ')') {
      --depth;
      if (depth < 0) return false;
    }
    if (!is_whitespace_byte(character)) has_visible = true;
  }
  return has_visible && depth == 0;
}

// The reading of a reference opened by `count` delimiters at the start of
// `rest`, closed by the run that ends at `end` when there is one.
std::optional<Reading> reading(std::string_view rest, char quote, std::size_t count, std::optional<std::size_t> end) {
  std::optional<Reading> empty_reference;
  if (count % 2 == 0) empty_reference = Reading{std::string(), count, true};
  if (!end) {
    // Nothing closes the run: an even one is the empty reference, which a
    // later closing run would still turn into one holding what follows.
    if (empty_reference) empty_reference->closed = false;
    return empty_reference;
  }

  const std::string_view body = rest.substr(count, *end - count);
  std::string value;
  value.reserve(body.size());
  std::size_t position = 0;
  for (;;) {
    const std::size_t start = body.find(quote, position);
    if (start == std::string_view::npos) break;
    const std::size_t length = run_length(body, start, quote);
    const std::size_t escaped = length / (2 * count) * count;
    // The closing run is the last one of the body.
    const std::size_t closes = start + length == body.size() ? count : 0;
    value.append(body.substr(position, start - position));
    value.append(length - escaped - closes, quote);
    position = start + length;
  }
  value.append(body.substr(position));

  if (empty_reference && !is_substantive_body(value)) return empty_reference;
  return Reading{std::move(value), *end, true};
}

std::size_t quote_index(char quote) { return quotes.find(quote); }

}  // namespace

DelimiterRuns::DelimiterRuns(std::string_view document, char quote) {
  std::size_t position = 0;
  for (;;) {
    const std::size_t start = document.find(quote, position);
    if (start == std::string_view::npos) break;
    const std::size_t length = run_length(document, start, quote);
    starts_.push_back(start);
    lengths_.push_back(length);
    position = start + length;
  }

  // Every run between a run and the next longer one is at most as long as it,
  // which is what lets a search for a run of some length jump over them.
  const std::size_t total = starts_.size();
  next_longer_.assign(total, total);
  std::vector<std::size_t> longer;
  for (std::size_t run = total; run-- > 0;) {
    while (!longer.empty() && lengths_[longer.back()] <= lengths_[run]) longer.pop_back();
    if (!longer.empty()) next_longer_[run] = longer.back();
    longer.push_back(run);
  }
}

std::size_t DelimiterRuns::holding(std::size_t position) const {
  const auto after = std::upper_bound(starts_.begin(), starts_.end(), position);
  const auto index = static_cast<std::size_t>(after - starts_.begin());
  return index == 0 ? 0 : index - 1;
}

DelimitedReferences::DelimitedReferences(std::string_view document)
    : document_(document),
      runs_{DelimiterRuns(document, quotes[0]), DelimiterRuns(document, quotes[1]),
            DelimiterRuns(document, quotes[2])} {}

std::optional<Reading> DelimitedReferences::read(std::size_t start) const {
  const auto found = readings_.find(start);
  if (found != readings_.end()) return found->second;
  auto result = read_at(start);
  readings_.emplace(start, result);
  return result;
}

std::optional<std::size_t> DelimitedReferences::end_at(std::size_t start) const {
  const auto result = read(start);
  if (!result) return std::nullopt;
  return start + result->length;
}

std::optional<Reading> DelimitedReferences::read_at(std::size_t start) const {
  if (start >= document_.size()) return std::nullopt;
  const char quote = document_[start];
  const std::size_t index = quote_index(quote);
  if (index == std::string_view::npos) return std::nullopt;
  const DelimiterRuns& runs = runs_[index];
  const std::size_t opening = runs.holding(start);
  const std::size_t count = runs.end(opening) - start;

  // The first run after the opening one that closes the reference.
  std::size_t closing = opening + 1;
  while (closing < runs.count()) {
    const std::size_t length = runs.lengths_[closing];
    if (length < count) {
      closing = runs.next_longer_[closing];
    } else if ((length / count) % 2 == 1) {
      break;
    } else {
      ++closing;
    }
  }
  std::optional<std::size_t> end;
  if (closing < runs.count()) end = runs.end(closing) - start;
  return reading(document_.substr(start), quote, count, end);
}

std::optional<Reading> read_reference(std::string_view rest) {
  if (rest.empty() || !is_quote(rest[0])) return std::nullopt;
  const char quote = rest[0];
  const std::size_t count = run_length(rest, 0, quote);

  std::size_t position = count;
  std::optional<std::size_t> end;
  for (;;) {
    const std::size_t start = rest.find(quote, position);
    if (start == std::string_view::npos) break;
    const std::size_t length = run_length(rest, start, quote);
    position = start + length;
    if (length >= count && (length / count) % 2 == 1) {
      end = position;
      break;
    }
  }
  return reading(rest, quote, count, end);
}

std::optional<std::size_t> reference_literal_end(std::string_view text, std::size_t start) {
  std::size_t position = start;
  if (position >= text.size() || text[position] != '~') return std::nullopt;
  ++position;
  const std::size_t digits = position;
  while (position < text.size() && text[position] >= '0' && text[position] <= '9') ++position;
  if (position == digits || position >= text.size() || text[position] != '{') return std::nullopt;
  ++position;
  for (; position < text.size(); ++position) {
    const char character = text[position];
    if (character == '}') return position + 1;
    if (character == ' ' || character == '\t' || character == '\r' || character == '\n' || character == '(' ||
        character == ')') {
      return std::nullopt;
    }
  }
  return std::nullopt;
}

std::optional<std::size_t> delimited_token_end(std::string_view document, std::size_t start,
                                               const DelimitedReferences& references) {
  if (const auto literal = reference_literal_end(document, start)) return literal;
  if (start < document.size() && is_quote(document[start])) return references.end_at(start);
  return std::nullopt;
}

}  // namespace links_notation::detail
