package io.github.linkfoundation.linksnotation;

/**
 * Thrown when a document nests links deeper than the parser allows.
 *
 * <p>Every parenthesized group and every indentation level is one level of nesting, and the lines
 * of a document start at level 0. The parser recurses once per level, so the limit is what turns a
 * document that would overflow the stack into an error the caller can handle. The exception says
 * where the level that is one too deep opens: the {@code (} of a group, or the first character of
 * an indented line.
 *
 * <pre>
 * Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3
 * 1 | ((((a))))
 *   |    ^
 * </pre>
 */
public class NestingTooDeepException extends ParseException {

  private static final long serialVersionUID = 1L;

  /** Lines longer than this are quoted as a window around the offending column. */
  private static final int QUOTED_LINE_WIDTH = 80;

  /** Marks where a quoted line was cut. */
  private static final String ELLIPSIS = "...";

  private final int maxDepth;
  private final int offset;
  private final int line;
  private final int column;
  private final String lineText;

  /**
   * Creates the exception for the given position in a document.
   *
   * @param maxDepth the deepest nesting the parser was configured to accept
   * @param offset offset of the offending position from the start of the document, in chars
   * @param line line of the offending position, counted from 1
   * @param column column of the offending position, in characters, counted from 1
   * @param lineText the offending line, as written, without its line ending
   */
  public NestingTooDeepException(int maxDepth, int offset, int line, int column, String lineText) {
    super(
        "Nesting too deep at "
            + summary(maxDepth, line, column)
            + "\n"
            + snippet(line, lineText, column));
    this.maxDepth = maxDepth;
    this.offset = offset;
    this.line = line;
    this.column = column;
    this.lineText = lineText;
  }

  /**
   * Locates {@code offset} in {@code document} and creates the exception for that position.
   *
   * @param document the document being parsed
   * @param offset offset of the offending position, in chars
   * @param maxDepth the deepest nesting the parser was configured to accept
   * @return the exception
   */
  static NestingTooDeepException at(String document, int offset, int maxDepth) {
    int end = Math.max(0, Math.min(offset, document.length()));
    int line = 1;
    int lineStart = 0;
    int cursor = 0;
    while (cursor < end) {
      char c = document.charAt(cursor);
      if (c == '\r') {
        line++;
        cursor++;
        if (cursor < end && document.charAt(cursor) == '\n') {
          cursor++;
        }
        lineStart = cursor;
      } else if (c == '\n') {
        line++;
        cursor++;
        lineStart = cursor;
      } else {
        cursor++;
      }
    }
    int column = document.codePointCount(lineStart, end) + 1;
    int lineEnd = lineStart;
    while (lineEnd < document.length()
        && document.charAt(lineEnd) != '\r'
        && document.charAt(lineEnd) != '\n') {
      lineEnd++;
    }
    return new NestingTooDeepException(
        maxDepth, end, line, column, document.substring(lineStart, lineEnd));
  }

  /** The deepest nesting the parser was configured to accept. */
  public int getMaxDepth() {
    return maxDepth;
  }

  /** Offset of the offending position from the start of the document, in chars. */
  public int getOffset() {
    return offset;
  }

  /** Line the offending position is on, counted from 1. */
  public int getLine() {
    return line;
  }

  /** Column the offending position is at, in characters, counted from 1. */
  public int getColumn() {
    return column;
  }

  /** The offending line, as written, without its line ending. */
  public String getLineText() {
    return lineText;
  }

  /** The one-line summary: where the nesting got too deep and how deep it may go. */
  public String getSummary() {
    return summary(maxDepth, line, column);
  }

  /** The offending line with a caret under the offending column. */
  public String getSnippet() {
    return snippet(line, lineText, column);
  }

  private static String summary(int maxDepth, int line, int column) {
    return "line "
        + line
        + ", column "
        + column
        + ": nesting depth exceeds the maximum of "
        + maxDepth;
  }

  /** Quotes line {@code number} with a caret under {@code column}, the way the Rust port does. */
  private static String snippet(int number, String lineText, int column) {
    int[] characters = lineText.codePoints().toArray();
    String quoted = lineText;
    int caret = column;
    if (characters.length > QUOTED_LINE_WIDTH) {
      int target = column - 1;
      int lastStart = characters.length - QUOTED_LINE_WIDTH;
      int start = Math.min(Math.max(0, target - QUOTED_LINE_WIDTH / 2), lastStart);
      int end = start + QUOTED_LINE_WIDTH;
      StringBuilder window = new StringBuilder();
      if (start > 0) {
        window.append(ELLIPSIS);
      }
      window.append(new String(characters, start, end - start));
      if (end < characters.length) {
        window.append(ELLIPSIS);
      }
      quoted = window.toString();
      caret = target - start + (start > 0 ? ELLIPSIS.length() : 0) + 1;
    }
    String gutter = " ".repeat(String.valueOf(number).length());
    return number + " | " + quoted + "\n" + gutter + " | " + " ".repeat(caret - 1) + "^";
  }
}
