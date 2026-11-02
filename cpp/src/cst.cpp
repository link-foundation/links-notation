// Building the concrete syntax tree of a parsed document.
//
// The tree and the parser agree because a document is parsed before its tree
// is built, and the tokens are read with the same rules the grammar uses:
// comments are found by strip_comments, delimited references by
// DelimitedReferences and versioned literals by the same pattern. This is the
// lexer of docs/case-studies/issue-364/specification.md, a port of
// js/src/Cst.js that works on UTF-8 bytes.

#include "links_notation/cst.hpp"

#include <cstddef>
#include <utility>

#include "links_notation/comments.hpp"
#include "links_notation/parse_error.hpp"
#include "links_notation/parser.hpp"
#include "links_notation/references.hpp"
#include "quotes.hpp"

namespace links_notation {

namespace {

/// What ends a bare reference.
bool ends_bare_reference(char character) {
  return character == ' ' || character == '\t' || character == '\r' || character == '\n' || character == '(' ||
         character == ':' || character == ')';
}

void append_escaped(std::string& out, std::string_view text) {
  for (const char character : text) {
    switch (character) {
      case '\\':
        out += "\\\\";
        break;
      case '"':
        out += "\\\"";
        break;
      case '\n':
        out += "\\n";
        break;
      case '\r':
        out += "\\r";
        break;
      case '\t':
        out += "\\t";
        break;
      default:
        out += character;
    }
  }
}

/// An open container (the document or a group) and whether its last child is
/// a line still being filled.
struct Container {
  CstNode node;
  bool line_open = false;
};

/// The tree of `input`, which has already been parsed with the same `comments`.
CstNode build_cst(std::string_view input, bool comments) {
  // Bare references end where they end in the document the grammar reads: the
  // one with its comments blanked, which keeps every position of the one
  // written. Delimited references and literals are read, as the grammar reads
  // them, in the document as written, so a comment never changes what a
  // reference holds (issue #377).
  const std::string prepared = comments ? strip_comments(input) : std::string(input);
  const detail::DelimitedReferences references(input);
  // The open containers, innermost last. A group is added to the line it
  // opens on when it closes: nothing else changes that line in between.
  std::vector<Container> containers;
  containers.push_back(Container{CstNode(CstKind::document)});

  const auto add = [&containers](CstNode child) {
    Container& container = containers.back();
    if (!container.line_open) {
      container.node.children.emplace_back(CstKind::line);
      container.line_open = true;
    }
    container.node.children.back().children.push_back(std::move(child));
  };
  const auto slice = [input](std::size_t start, std::size_t end) {
    return std::string(input.substr(start, end - start));
  };

  std::size_t position = 0;
  while (position < input.size()) {
    const char character = input[position];
    std::size_t end = position + 1;

    if (comments && character == comment_character && prepared[position] != comment_character) {
      // A blanked `#` opens a comment, which runs to the line ending.
      while (end < input.size() && input[end] != '\n' && input[end] != '\r') ++end;
      add(CstNode::token(CstKind::comment, slice(position, end)));
    } else if (character == '\r' || character == '\n') {
      if (character == '\r' && end < input.size() && input[end] == '\n') ++end;
      add(CstNode::token(CstKind::newline, slice(position, end)));
      containers.back().line_open = false;
    } else if (character == ' ' || character == '\t') {
      while (end < input.size() && (input[end] == ' ' || input[end] == '\t')) ++end;
      add(CstNode::token(CstKind::whitespace, slice(position, end)));
    } else if (character == '(') {
      Container group{CstNode(CstKind::group)};
      group.node.children.push_back(CstNode::token(CstKind::open_paren, slice(position, end)));
      containers.push_back(std::move(group));
    } else if (character == ')') {
      if (containers.size() == 1) throw ParseError(std::string(input), position, {"end of input"}, std::nullopt);
      CstNode group = std::move(containers.back().node);
      containers.pop_back();
      group.children.push_back(CstNode::token(CstKind::close_paren, slice(position, end)));
      add(std::move(group));
    } else if (character == ':') {
      add(CstNode::token(CstKind::colon, slice(position, end)));
    } else if (const auto literal = character == '~' ? detail::reference_literal_end(input, position) : std::nullopt) {
      end = *literal;
      add(CstNode::token(CstKind::reference, slice(position, end), decode_reference_literal(slice(position, end))));
    } else if (const auto quoted = detail::is_quote(character) ? references.read(position) : std::nullopt) {
      end = position + quoted->length;
      add(CstNode::token(CstKind::reference, slice(position, end), quoted->value, character));
    } else {
      while (end < prepared.size() && !ends_bare_reference(prepared[end])) ++end;
      add(CstNode::token(CstKind::reference, slice(position, end), slice(position, end)));
    }
    position = end;
  }

  if (containers.size() != 1) throw ParseError(std::string(input), input.size(), {"\")\""}, std::nullopt);
  return std::move(containers.back().node);
}

}  // namespace

std::string_view to_string(CstKind kind) {
  switch (kind) {
    case CstKind::document:
      return "document";
    case CstKind::line:
      return "line";
    case CstKind::group:
      return "group";
    case CstKind::whitespace:
      return "whitespace";
    case CstKind::newline:
      return "newline";
    case CstKind::comment:
      return "comment";
    case CstKind::open_paren:
      return "open_paren";
    case CstKind::close_paren:
      return "close_paren";
    case CstKind::colon:
      return "colon";
    case CstKind::reference:
      return "reference";
  }
  return "unknown";
}

std::ostream& operator<<(std::ostream& out, CstKind kind) { return out << to_string(kind); }

CstNode CstNode::token(CstKind kind, std::string text, std::optional<std::string> value, std::optional<char> quote) {
  CstNode node(kind);
  node.text_ = std::move(text);
  node.value = std::move(value);
  node.quote = quote;
  return node;
}

bool CstNode::is_token() const { return kind != CstKind::document && kind != CstKind::line && kind != CstKind::group; }

std::string CstNode::text() const {
  if (is_token()) return text_;
  std::string out;
  append_text(out);
  return out;
}

void CstNode::append_text(std::string& out) const {
  if (is_token()) {
    out += text_;
    return;
  }
  for (const CstNode& child : children) child.append_text(out);
}

std::vector<CstNode> CstNode::tokens() const {
  std::vector<CstNode> out;
  append_tokens(out);
  return out;
}

void CstNode::append_tokens(std::vector<CstNode>& out) const {
  if (is_token()) {
    out.push_back(*this);
    return;
  }
  for (const CstNode& child : children) child.append_tokens(out);
}

std::string CstNode::to_s_expression() const {
  std::string out;
  append_s_expression(out);
  return out;
}

void CstNode::append_s_expression(std::string& out) const {
  if (is_token()) {
    out += links_notation::to_string(kind);
    out += ":\"";
    append_escaped(out, text_);
    out += '"';
    return;
  }
  out += '(';
  out += links_notation::to_string(kind);
  for (const CstNode& child : children) {
    out += ' ';
    child.append_s_expression(out);
  }
  out += ')';
}

std::ostream& operator<<(std::ostream& out, const CstNode& node) { return out << node.text(); }

CstNode Parser::parse_cst(std::string_view document) const {
  // Parsing first makes the tree refuse exactly what parse() refuses, with
  // the same errors and limits.
  static_cast<void>(parse(document));
  return build_cst(document, options_.comments);
}

}  // namespace links_notation
