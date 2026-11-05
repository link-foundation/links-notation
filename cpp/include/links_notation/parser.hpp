// Reading documents into links.

#ifndef LINKS_NOTATION_PARSER_HPP
#define LINKS_NOTATION_PARSER_HPP

#include <cstddef>
#include <string_view>
#include <vector>

#include "links_notation/cst.hpp"
#include "links_notation/link.hpp"
#include "links_notation/links_group.hpp"
#include "links_notation/parse_error.hpp"

namespace links_notation {

/// How deep links may nest when nothing says otherwise. The parser recurses
/// once per level, and the same limit applies in every Links Notation
/// implementation, so a document one of them reads is not too deep for another.
inline constexpr std::size_t default_max_depth = 64;

/// How a Parser reads documents.
struct ParserOptions {
  /// The largest document, in bytes, the parser accepts.
  std::size_t max_input_size = 10 * 1024 * 1024;
  /// How deep links may nest: every parenthesized group and every indentation
  /// level is one level.
  std::size_t max_depth = default_max_depth;
  /// Whether a `#` that starts a line or a token opens a comment.
  bool comments = true;
  /// Whether parsed links record how their ids were written (Link::raw_id).
  /// Turning it off is the AST mode: links carry only what the document means.
  bool syntax = true;
};

/// Reads Links Notation documents.
class Parser {
 public:
  Parser() = default;
  explicit Parser(ParserOptions options) : options_(options) {}

  const ParserOptions& options() const { return options_; }

  /// Reads a document into links, expanding indentation into path links.
  ///
  /// Throws ParseError when the document does not parse, and
  /// std::length_error when it is larger than max_input_size.
  std::vector<Link> parse(std::string_view document) const;

  /// Reads the indentation tree of a document: each group's element is the
  /// link on that line, and its children are the lines indented under it.
  /// Indented ID elements have no values; single-reference leaves within
  /// their value subtree are references, agreeing with parse when folded.
  std::vector<LinksGroup> parse_groups(std::string_view document) const;

  /// Reads the concrete syntax tree of a document: every byte belongs to
  /// exactly one token, so the tree's text() is `document` itself, comments,
  /// whitespace and line endings included.
  ///
  /// The document is parsed first, so this throws exactly what parse() throws
  /// for it, with the same options.
  CstNode parse_cst(std::string_view document) const;

 private:
  ParserOptions options_;
};

/// Reads a document with the default options.
std::vector<Link> parse(std::string_view document);

}  // namespace links_notation

#endif  // LINKS_NOTATION_PARSER_HPP
