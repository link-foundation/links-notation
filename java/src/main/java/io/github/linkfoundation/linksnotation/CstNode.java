package io.github.linkfoundation.linksnotation;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * One node or token of the concrete syntax tree of a Links Notation document.
 *
 * <p>Every character of a document belongs to exactly one token, so the text of the tree is the
 * document itself, comments, blank lines, indentation, quotes and line endings included. A document
 * is a list of {@link CstKind#LINE} nodes; a line holds the tokens up to and including its line
 * ending, and a parenthesized {@link CstKind#GROUP} node holds its own parentheses and the lines
 * written between them. A group is part of the line it opens on, however many lines it spans.
 *
 * <p>The tree records how a document was written; {@link Parser#parse(String)} reads what it means.
 * Read one with {@link Parser#parseCst(String)}.
 */
public final class CstNode {

  private final CstKind kind;
  private final String text;
  private final List<CstNode> children = new ArrayList<>();
  private final String value;
  private final String quote;

  /** Creates a node, which starts without children. */
  CstNode(CstKind kind) {
    this(kind, "", null, null);
  }

  /** Creates a token. */
  CstNode(CstKind kind, String text, String value, String quote) {
    this.kind = kind;
    this.text = text;
    this.value = value;
    this.quote = quote;
  }

  /** Append a child to a node. */
  void add(CstNode child) {
    children.add(child);
  }

  /**
   * Return what this node or token is.
   *
   * @return the kind
   */
  public CstKind getKind() {
    return kind;
  }

  /**
   * Return the children of a node, in document order.
   *
   * @return an unmodifiable list, empty for a token
   */
  public List<CstNode> getChildren() {
    return Collections.unmodifiableList(children);
  }

  /**
   * Return what a reference token means, its delimiters and escapes resolved: the ID a parsed link
   * has.
   *
   * @return the decoded value of a reference token; null for every other node and token
   */
  public String getValue() {
    return value;
  }

  /**
   * Return the delimiter a quoted reference token was written between.
   *
   * @return {@code '}, {@code "} or {@code `} for a quoted reference token; null for a bare or
   *     literal reference and every other kind
   */
  public String getQuote() {
    return quote;
  }

  /**
   * Return whether this is a token rather than a node with children.
   *
   * @return true for a token
   */
  public boolean isToken() {
    return kind.isToken();
  }

  /**
   * Return the exact text this node or token was read from: a token's own text, or the
   * concatenation of a node's children's text.
   *
   * @return the text as written
   */
  public String getText() {
    if (isToken()) {
      return text;
    }
    StringBuilder builder = new StringBuilder();
    appendText(builder);
    return builder.toString();
  }

  private void appendText(StringBuilder builder) {
    if (isToken()) {
      builder.append(text);
      return;
    }
    for (CstNode child : children) {
      child.appendText(builder);
    }
  }

  /**
   * Return every token of this subtree, in document order.
   *
   * @return the tokens; just this one for a token
   */
  public List<CstNode> tokens() {
    List<CstNode> tokens = new ArrayList<>();
    collectTokens(tokens);
    return tokens;
  }

  private void collectTokens(List<CstNode> tokens) {
    if (isToken()) {
      tokens.add(this);
      return;
    }
    for (CstNode child : children) {
      child.collectTokens(tokens);
    }
  }

  /**
   * Return the tree as an S-expression: {@code (kind child ...)} for a node and {@code kind:"text"}
   * for a token, the text escaped as a JSON string escapes {@code \}, {@code "}, line feeds,
   * carriage returns and tabs, and every other character written as it is. Two trees are the same
   * exactly when their S-expressions are.
   *
   * <p>{@code new Parser().parseCst("a '1'").toSExpression()} is {@code (document (line
   * reference:"a" whitespace:" " reference:"'1'"))}.
   *
   * @return the S-expression
   */
  public String toSExpression() {
    StringBuilder builder = new StringBuilder();
    appendSExpression(builder);
    return builder.toString();
  }

  private void appendSExpression(StringBuilder builder) {
    if (isToken()) {
      builder.append(kind).append(":\"");
      for (int i = 0; i < text.length(); i++) {
        char c = text.charAt(i);
        switch (c) {
          case '\\' -> builder.append("\\\\");
          case '"' -> builder.append("\\\"");
          case '\n' -> builder.append("\\n");
          case '\r' -> builder.append("\\r");
          case '\t' -> builder.append("\\t");
          default -> builder.append(c);
        }
      }
      builder.append('"');
      return;
    }
    builder.append('(').append(kind);
    for (CstNode child : children) {
      builder.append(' ');
      child.appendSExpression(builder);
    }
    builder.append(')');
  }

  /**
   * Return the exact text this node or token was read from, the same as {@link #getText()}.
   *
   * @return the text as written
   */
  @Override
  public String toString() {
    return getText();
  }
}
