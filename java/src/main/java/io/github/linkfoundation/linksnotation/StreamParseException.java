package io.github.linkfoundation.linksnotation;

/** A canonical parser error located relative to the complete input stream. */
public final class StreamParseException extends ParseException {
  private static final long serialVersionUID = 1L;

  private final int offset;
  private final int line;
  private final int column;

  StreamParseException(ParseException cause, int offset, int line, int column) {
    super(
        "Stream parse error at line " + line + ", column " + column + ": " + cause.getMessage(),
        cause);
    this.offset = offset;
    this.line = line;
    this.column = column;
  }

  /** Absolute character offset from the start of the stream. */
  public int getOffset() {
    return offset;
  }

  /** One-based line number in the complete stream. */
  public int getLine() {
    return line;
  }

  /** One-based column number in the complete stream. */
  public int getColumn() {
    return column;
  }
}
