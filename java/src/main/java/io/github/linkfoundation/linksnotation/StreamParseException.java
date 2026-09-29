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

  private StreamParseException(
      NestingTooDeepException cause, int offset, int line, int column, String message) {
    super(message, cause);
    this.offset = offset;
    this.line = line;
    this.column = column;
  }

  /**
   * Locate an error the canonical parser reported for the record starting at {@code segmentOffset},
   * on line {@code segmentLine} of the stream, at column 1.
   *
   * <p>A record nested too deeply is reported at the group or line that is one level too deep;
   * every other error is reported at the start of the record.
   */
  static StreamParseException locate(ParseException cause, int segmentOffset, int segmentLine) {
    if (cause instanceof NestingTooDeepException nesting) {
      int line = segmentLine + nesting.getLine() - 1;
      int column = nesting.getColumn();
      return new StreamParseException(
          nesting,
          segmentOffset + nesting.getOffset(),
          line,
          column,
          "Stream parse error at line "
              + line
              + ", column "
              + column
              + ": nesting depth exceeds the maximum of "
              + nesting.getMaxDepth());
    }
    return new StreamParseException(cause, segmentOffset, segmentLine, 1);
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
