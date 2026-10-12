// Delimited references, and how far each one reaches.
//
// A reference opened by a run of N delimiters (`"`, `'` or `` ` ``) closes at
// the next run of exactly N, and a run of 2N inside it is that delimiter
// escaped. An even run that encloses nothing substantive is the empty
// reference. This is a port of rust/links-notation/src/quotes.rs.

#ifndef LINKS_NOTATION_SRC_QUOTES_HPP
#define LINKS_NOTATION_SRC_QUOTES_HPP

#include <array>
#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

namespace links_notation::detail {

/// The characters a reference can be written between.
inline constexpr std::string_view quotes = "\"'`";

inline bool is_quote(char character) { return quotes.find(character) != std::string_view::npos; }

/// What a delimited reference holds, and how many bytes of the document it takes.
struct Reading {
  std::string value;
  std::size_t length = 0;
};

/// The maximal runs of one delimiter in a document, each linked to the next
/// run that is longer than it.
class DelimiterRuns {
 public:
  DelimiterRuns(std::string_view document, char quote);

  std::size_t count() const { return starts_.size(); }
  std::size_t end(std::size_t run) const { return starts_[run] + lengths_[run]; }
  std::size_t holding(std::size_t position) const;

  std::vector<std::size_t> starts_;
  std::vector<std::size_t> lengths_;
  std::vector<std::size_t> next_longer_;
};

/// Every delimited reference of one document, read on demand and remembered.
class DelimitedReferences {
 public:
  explicit DelimitedReferences(std::string_view document);

  /// The reference opened at byte `start` of the document.
  std::optional<Reading> read(std::size_t start) const;

  /// The offset just past the reference opened at `start`.
  std::optional<std::size_t> end_at(std::size_t start) const;

 private:
  std::optional<Reading> read_at(std::size_t start) const;

  std::string_view document_;
  std::array<DelimiterRuns, 3> runs_;
  mutable std::unordered_map<std::size_t, std::optional<Reading>> readings_;
};

/// The reference opened where `rest` starts, read without a list of runs.
std::optional<Reading> read_reference(std::string_view rest);

}  // namespace links_notation::detail

#endif  // LINKS_NOTATION_SRC_QUOTES_HPP
