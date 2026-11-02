package io.github.linkfoundation.linksnotation;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Builds the concrete syntax tree of a document that has already been parsed.
 *
 * <p>The tokens are read with the same rules the parser uses: comments are found by {@link
 * Comments#stripComments(String)}, delimited references by the parser's own reader and versioned
 * literals by the same pattern, so the tree and the parsed links agree on what each character is.
 */
final class CstBuilder {

  /** A versioned literal, matched at the position a reference starts. */
  private static final Pattern LITERAL = Pattern.compile("~[0-9]+\\{[^} \\t\\r\\n()]*\\}");

  /** What ends a bare reference. */
  private static final String BARE_REFERENCE_END = " \t\r\n(:)";

  /** An open document or group, with the line being filled. */
  private static final class Container {
    final CstNode node;
    CstNode line;

    Container(CstNode node) {
      this.node = node;
    }
  }

  private CstBuilder() {}

  /**
   * Build the tree of a document.
   *
   * @param input the document as written
   * @param comments whether {@code #} starts a comment
   * @return the {@link CstKind#DOCUMENT} node
   * @throws ParseException if the parentheses do not balance
   */
  static CstNode build(String input, boolean comments) throws ParseException {
    // References are read in the document the parser reads: the one with its
    // comments blanked, which keeps every position of the one written.
    String prepared = comments ? Comments.stripComments(input) : input;
    CstNode document = new CstNode(CstKind.DOCUMENT);
    // The open containers, innermost first.
    Deque<Container> containers = new ArrayDeque<>();
    containers.push(new Container(document));
    Matcher literal = LITERAL.matcher(prepared);

    int position = 0;
    while (position < input.length()) {
      char character = input.charAt(position);
      int end = position + 1;

      if (comments && character == Comments.COMMENT && prepared.charAt(position) != '#') {
        // A blanked # opens a comment, which runs to the line ending.
        while (end < input.length() && input.charAt(end) != '\n' && input.charAt(end) != '\r') {
          end++;
        }
        add(containers, token(CstKind.COMMENT, input, position, end));
      } else if (character == '\r' || character == '\n') {
        if (character == '\r' && end < input.length() && input.charAt(end) == '\n') {
          end++;
        }
        add(containers, token(CstKind.NEWLINE, input, position, end));
        containers.peek().line = null;
      } else if (character == ' ' || character == '\t') {
        while (end < input.length() && (input.charAt(end) == ' ' || input.charAt(end) == '\t')) {
          end++;
        }
        add(containers, token(CstKind.WHITESPACE, input, position, end));
      } else if (character == '(') {
        CstNode group = new CstNode(CstKind.GROUP);
        group.add(token(CstKind.OPEN_PAREN, input, position, end));
        add(containers, group);
        containers.push(new Container(group));
      } else if (character == ')') {
        if (containers.size() == 1) {
          throw new ParseException("Unbalanced \")\" at offset " + position);
        }
        containers.pop().node.add(token(CstKind.CLOSE_PAREN, input, position, end));
      } else if (character == ':') {
        add(containers, token(CstKind.COLON, input, position, end));
      } else {
        String value = null;
        String quote = null;
        char first = prepared.charAt(position);
        Parser.QuotedString quoted = null;
        if (first == '~' && literal.region(position, prepared.length()).lookingAt()) {
          end = literal.end();
          value = ReferenceLiteral.decode(input.substring(position, end));
        } else if ((first == '\'' || first == '"' || first == '`')
            && (quoted = Parser.parseQuotedStringAt(prepared, position)) != null) {
          end = quoted.end;
          value = quoted.value;
          quote = String.valueOf(first);
        } else {
          while (end < prepared.length() && BARE_REFERENCE_END.indexOf(prepared.charAt(end)) < 0) {
            end++;
          }
          value = input.substring(position, end);
        }
        add(
            containers,
            new CstNode(CstKind.REFERENCE, input.substring(position, end), value, quote));
      }
      position = end;
    }

    if (containers.size() != 1) {
      throw new ParseException("Unbalanced \"(\" at the end of the document");
    }
    return document;
  }

  /** Add a token or group to the line being filled in the innermost container. */
  private static void add(Deque<Container> containers, CstNode node) {
    Container container = containers.peek();
    if (container.line == null) {
      container.line = new CstNode(CstKind.LINE);
      container.node.add(container.line);
    }
    container.line.add(node);
  }

  /** A token whose text is sliced from the document as written. */
  private static CstNode token(CstKind kind, String input, int start, int end) {
    return new CstNode(kind, input.substring(start, end), null, null);
  }
}
