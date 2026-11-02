package io.github.linkfoundation.linksnotation;

/**
 * The kinds of nodes and tokens of a concrete syntax tree.
 *
 * <p>{@link #DOCUMENT}, {@link #LINE} and {@link #GROUP} are nodes, which hold children; every
 * other kind is a token, which holds text. {@link #toString()} is the name an S-expression writes,
 * the same in every Links Notation implementation.
 */
public enum CstKind {
  /** The whole document: its lines. */
  DOCUMENT("document", false),
  /** One line: its tokens and groups, up to and including its line ending. */
  LINE("line", false),
  /** A parenthesized group: {@code (}, the lines inside it, and {@code )}. */
  GROUP("group", false),
  /** A run of spaces and tabs. */
  WHITESPACE("whitespace", true),
  /** One line ending: {@code \n}, {@code \r\n} or {@code \r}. */
  NEWLINE("newline", true),
  /** A comment, from {@code #} up to the line ending. */
  COMMENT("comment", true),
  /** {@code (} */
  OPEN_PAREN("open_paren", true),
  /** {@code )} */
  CLOSE_PAREN("close_paren", true),
  /** {@code :} */
  COLON("colon", true),
  /** A bare, quoted or versioned literal reference. */
  REFERENCE("reference", true);

  private final String sExpressionName;
  private final boolean token;

  CstKind(String sExpressionName, boolean token) {
    this.sExpressionName = sExpressionName;
    this.token = token;
  }

  /**
   * Return whether this kind is a token rather than a node with children.
   *
   * @return true for a token kind
   */
  public boolean isToken() {
    return token;
  }

  /**
   * Return the name an S-expression writes for this kind, such as {@code open_paren}.
   *
   * @return the lowercase name shared by every implementation
   */
  @Override
  public String toString() {
    return sExpressionName;
  }
}
