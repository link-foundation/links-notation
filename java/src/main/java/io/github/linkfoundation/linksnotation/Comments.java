package io.github.linkfoundation.linksnotation;

/**
 * Comments, and the rule that decides where one starts.
 *
 * <p>{@code #} starts a comment when it opens a token: at the start of the document or after a
 * space, a tab or a line break. A {@code #} written inside a token ({@code issue#1047}) or inside a
 * delimited reference ({@code "# not a comment"}) is an ordinary character.
 *
 * <p>{@link #stripComments(String)} replaces every character of every comment with a space rather
 * than removing it, so every later character keeps the position it had in the document the caller
 * wrote, and anything the parser reports about a position still points at what the reader can see.
 */
public final class Comments {

  /** The character that starts a comment. */
  public static final char COMMENT = '#';

  /** What a delimited reference may start after. */
  private static final String BEFORE_REFERENCE = " \t\n\r(:";

  /** What a comment may start after. */
  private static final String BEFORE_COMMENT = " \t\n\r";

  private Comments() {}

  /**
   * Return the document with every comment blanked out.
   *
   * <p>The result has the same length as the document it was given.
   *
   * @param document text in Lino notation
   * @return the same text with the characters of every comment replaced by spaces
   */
  public static String stripComments(String document) {
    char[] blanked = null;
    int position = 0;

    while (position < document.length()) {
      char character = document.charAt(position);

      if (isQuote(character) && follows(document, position, BEFORE_REFERENCE)) {
        int end = Parser.quotedReferenceEnd(document, position);
        position = end < 0 ? position + 1 : end;
        continue;
      }

      if (character == COMMENT && follows(document, position, BEFORE_COMMENT)) {
        if (blanked == null) {
          blanked = document.toCharArray();
        }
        while (position < document.length()
            && document.charAt(position) != '\n'
            && document.charAt(position) != '\r') {
          blanked[position] = ' ';
          position++;
        }
        continue;
      }

      position++;
    }

    return blanked == null ? document : new String(blanked);
  }

  /** Report whether character is one of the delimiters a reference can be written between. */
  private static boolean isQuote(char character) {
    return character == '"' || character == '\'' || character == '`';
  }

  /**
   * Report whether the character before position is one of allowed, the start of the document
   * counting as allowed.
   */
  private static boolean follows(String document, int position, String allowed) {
    return position == 0 || allowed.indexOf(document.charAt(position - 1)) >= 0;
  }
}
