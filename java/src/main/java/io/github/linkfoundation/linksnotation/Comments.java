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

  /**
   * What ends a bare reference. A token starts after one of these, at the start of the document,
   * and right after a delimited reference or a versioned literal: the places the parser reads a
   * reference from.
   */
  static final String SEPARATORS = " \t\n\r(:)";

  /** What a comment may start after. */
  private static final String BEFORE_COMMENT = " \t\n\r";

  private Comments() {}

  /**
   * Return the document with every comment blanked out.
   *
   * <p>The result has the same length as the document it was given. The document is read token by
   * token, the way the parser reads it, so a {@code #} inside a delimited reference that starts
   * right after a group, another reference or a literal is content, as it is in one that starts
   * after a space (issue #377).
   *
   * @param document text in Lino notation
   * @return the same text with the characters of every comment replaced by spaces
   */
  public static String stripComments(String document) {
    char[] blanked = null;
    int position = 0;
    // Whether a token may start at position.
    boolean tokenStart = true;

    while (position < document.length()) {
      char character = document.charAt(position);

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

      if (SEPARATORS.indexOf(character) >= 0) {
        tokenStart = true;
        position++;
        continue;
      }

      if (tokenStart) {
        int end = delimitedTokenEnd(document, position);
        if (end >= 0) {
          position = end;
          continue;
        }
      }

      // Anything else is part of a bare reference, which runs to a separator.
      tokenStart = false;
      position++;
    }

    return blanked == null ? document : new String(blanked);
  }

  /**
   * Find where the versioned literal or delimited reference that starts the token at start ends.
   *
   * @return the position right after it, or -1 when the token there is a bare reference: a
   *     delimiter run that never closes is read as one, as the parser reads it
   */
  private static int delimitedTokenEnd(String document, int start) {
    int end = ReferenceLiteral.end(document, start);
    if (end >= 0) {
      return end;
    }
    if (isQuote(document.charAt(start))) {
      return Parser.quotedReferenceEnd(document, start);
    }
    return -1;
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
