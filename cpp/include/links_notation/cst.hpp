// The concrete syntax tree of a Links Notation document.
//
// Every byte of a document belongs to exactly one token, so the text of the
// tree is the document itself, comments, blank lines, indentation, quotes and
// line endings included. A document is a list of `line` nodes; a line holds the
// tokens up to and including its line ending, and a parenthesized `group` node
// holds its own parentheses and the lines written between them. A group is part
// of the line it opens on, however many lines it spans.
//
// The tree records how a document was written; Parser::parse reads what it
// means. Parser::parse_cst builds the tree.

#ifndef LINKS_NOTATION_CST_HPP
#define LINKS_NOTATION_CST_HPP

#include <optional>
#include <ostream>
#include <string>
#include <string_view>
#include <vector>

namespace links_notation {

/// The kinds of nodes and tokens of a concrete syntax tree.
enum class CstKind {
  /// The whole document: its lines.
  document,
  /// One line: its tokens and groups, up to and including its line ending.
  line,
  /// A parenthesized group: `(`, the lines inside it, and `)`.
  group,
  /// A run of spaces and tabs.
  whitespace,
  /// One line ending: `\n`, `\r\n` or `\r`.
  newline,
  /// A comment, from `#` up to the line ending.
  comment,
  /// `(`
  open_paren,
  /// `)`
  close_paren,
  /// `:`
  colon,
  /// A bare, quoted or versioned literal reference.
  reference,
};

/// The name of a kind, as S-expressions write it: `document`, `open_paren`, ...
std::string_view to_string(CstKind kind);

std::ostream& operator<<(std::ostream& out, CstKind kind);

/// One node or token of a concrete syntax tree. A node (document, line or
/// group) has children; a token has text instead.
class CstNode {
 public:
  /// A node with no children yet.
  explicit CstNode(CstKind kind) : kind(kind) {}

  /// A token read as `text`.
  static CstNode token(CstKind kind, std::string text, std::optional<std::string> value = std::nullopt,
                       std::optional<char> quote = std::nullopt);

  CstKind kind;
  /// The children of a node, in document order; empty for a token.
  std::vector<CstNode> children;
  /// What a reference token means, its delimiters and escapes resolved (the
  /// id a parsed link has); nothing for every other node and token.
  std::optional<std::string> value;
  /// The delimiter (`'`, `"` or `` ` ``) a quoted reference token was written
  /// between; nothing for a bare or literal reference and every other kind.
  std::optional<char> quote;

  /// Whether this is a token rather than a node with children.
  bool is_token() const;

  /// The exact text this node or token was read from. For a node it is the
  /// text of its children, one after another.
  std::string text() const;

  /// The exact text this node or token was read from, the same as text().
  std::string to_string() const { return text(); }

  /// Every token of this subtree, in document order.
  std::vector<CstNode> tokens() const;

  /// The tree as an S-expression: `(kind child ...)` for a node and
  /// `kind:"text"` for a token, the text with `\`, `"`, line feeds, carriage
  /// returns and tabs escaped and every other byte written as is. Two trees
  /// are the same exactly when their S-expressions are. For `a '1'`:
  ///
  ///     (document (line reference:"a" whitespace:" " reference:"'1'"))
  std::string to_s_expression() const;

 private:
  void append_text(std::string& out) const;
  void append_tokens(std::vector<CstNode>& out) const;
  void append_s_expression(std::string& out) const;

  std::string text_;
};

/// Writes the exact text the node was read from.
std::ostream& operator<<(std::ostream& out, const CstNode& node);

}  // namespace links_notation

#endif  // LINKS_NOTATION_CST_HPP
