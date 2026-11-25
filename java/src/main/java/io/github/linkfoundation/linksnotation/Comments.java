package io.github.linkfoundation.linksnotation;

/**
 * Comments, and the rule that decides where one starts.
 *
 * <p>{@code #} starts a comment when it opens a token and is not a value:
 *
 * <ul>
 *   <li>at the start of a line, after any indentation, a {@code #} always starts one;
 *   <li>later on a line, after a space or a tab, a {@code #} starts one only when no character that
 *       could continue a bare reference follows it, that is when whitespace, the end of the
 *       document, {@code (}, {@code )} or {@code :} comes next. So {@code a: b # why} and {@code a:
 *       b #} hold a comment, while {@code tag #release} is the link of {@code tag} and {@code
 *       #release} (issue #444): a value is never silently dropped.
 * </ul>
 *
 * <p>A {@code #} written inside a token ({@code issue#1047}) or inside a delimited reference
 * ({@code "# not a comment"}) is an ordinary character.
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

  /** Indentation: what may stand between the start of a line and a comment. */
  private static final String INDENTATION = " \t";

  private Comments() {}

  /**
   * Report whether the {@code #} at position starts a comment: it opens a token, and either only
   * indentation stands before it on its line or no character that could continue a bare reference
   * follows it.
   *
   * <pre>{@code
   * opensComment("# note", 0);       // true: the start of a line
   * opensComment("a #", 2);          // true: nothing follows it
   * opensComment("a # why", 2);      // true: a space follows it
   * opensComment("tag #release", 4); // false: a value
   * opensComment("issue#1047", 5);   // false: inside a token
   * }</pre>
   *
   * @param document the document being read
   * @param position position of the character being judged
   * @return true when a comment starts at position
   */
  static boolean opensComment(String document, int position) {
    if (position < 0 || position >= document.length() || document.charAt(position) != COMMENT) {
      return false;
    }
    if (!follows(document, position, BEFORE_COMMENT)) {
      return false;
    }
    int before = position - 1;
    while (before >= 0 && INDENTATION.indexOf(document.charAt(before)) >= 0) {
      before--;
    }
    if (before < 0 || document.charAt(before) == '\n' || document.charAt(before) == '\r') {
      return true;
    }
    int next = position + 1;
    return next >= document.length() || SEPARATORS.indexOf(document.charAt(next)) >= 0;
  }

  /**
   * Return the document with every comment blanked out.
   *
   * <p>The result has the same length as the document it was given. The document is read token by
   * token, the way the parser reads it, so a {@code #} inside a delimited reference that starts
   * right after a group, another reference or a literal is content, as it is in one that starts
   * after a space (issue #377). Where a comment starts is decided by {@link #opensComment(String,
   * int)}, so {@code stripComments("tag #release # note\n")} keeps {@code #release} and blanks
   * {@code # note}.
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

      if (character == COMMENT && opensComment(document, position)) {
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
