package io.github.linkfoundation.linksnotation;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Parser for Links Notation (Lino).
 *
 * <p>This parser handles both inline and indented syntax for defining links. It supports:
 *
 * <ul>
 *   <li>Single-line links: {@code id: value1 value2}
 *   <li>Multi-line links: {@code (id: value1 value2)}
 *   <li>Indented syntax with colons: {@code id:\n value1\n value2}
 *   <li>Nested structures with parentheses
 *   <li>Quoted references (single, double, backtick)
 *   <li>Multi-quote strings (e.g., triple quotes)
 * </ul>
 */
public class Parser {

  private static final int DEFAULT_MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * How deep links may nest when nothing says otherwise.
   *
   * <p>Every parenthesized group and every indentation level is one level of nesting, and every
   * level is a level of recursion in the parser, so the limit is what keeps a deeply nested
   * document from overflowing the stack. It is set well below what fits in a small thread stack.
   * The same limit applies in every Links Notation implementation.
   */
  public static final int DEFAULT_MAX_DEPTH = 64;

  private final int maxInputSize;
  private final int maxDepth;
  private final boolean comments;

  private String source;
  private List<String> lines;
  private List<Integer> lineOffsets;
  private int pos;
  private Integer baseIndentation;

  /** Creates a parser with default options. */
  public Parser() {
    this(DEFAULT_MAX_INPUT_SIZE, DEFAULT_MAX_DEPTH);
  }

  /**
   * Creates a parser that reads comments.
   *
   * @param maxInputSize maximum input size in bytes
   * @param maxDepth how deep links may nest: every parenthesized group and every indentation level
   *     is one level, and a document nested deeper is refused with a {@link
   *     NestingTooDeepException}
   */
  public Parser(int maxInputSize, int maxDepth) {
    this(maxInputSize, maxDepth, true);
  }

  /**
   * Creates a parser with default limits that reads {@code #} the way the flag asks.
   *
   * @param comments if false, read {@code #} as an ordinary character instead of the start of a
   *     comment
   */
  public Parser(boolean comments) {
    this(DEFAULT_MAX_INPUT_SIZE, DEFAULT_MAX_DEPTH, comments);
  }

  /**
   * Creates a parser with custom options.
   *
   * @param maxInputSize maximum input size in bytes
   * @param maxDepth how deep links may nest: every parenthesized group and every indentation level
   *     is one level, and a document nested deeper is refused with a {@link
   *     NestingTooDeepException}
   * @param comments if false, read {@code #} as an ordinary character instead of the start of a
   *     comment
   */
  public Parser(int maxInputSize, int maxDepth, boolean comments) {
    this.maxInputSize = maxInputSize;
    this.maxDepth = maxDepth;
    this.comments = comments;
  }

  /** Return the maximum document size accepted by this parser. */
  public int getMaxInputSize() {
    return maxInputSize;
  }

  /** Return how deep links may nest before the document is refused. */
  public int getMaxDepth() {
    return maxDepth;
  }

  /** Return whether {@code #} starts comments. */
  public boolean isCommentsEnabled() {
    return comments;
  }

  /**
   * Parse Lino notation text into a list of Link objects.
   *
   * @param input text in Lino notation
   * @return list of parsed Link objects
   * @throws ParseException if parsing fails
   * @throws NestingTooDeepException if links nest deeper than the maximum depth
   * @throws IllegalArgumentException if input is null or exceeds maximum size
   */
  public List<Link> parse(String input) throws ParseException {
    if (input == null) {
      throw new IllegalArgumentException("Input must not be null");
    }

    if (input.length() > maxInputSize) {
      throw new IllegalArgumentException(
          "Input size exceeds maximum allowed size of " + maxInputSize + " bytes");
    }

    // Comments are blanked rather than removed, so every character keeps the
    // position it was written at.
    String prepared = comments ? Comments.stripComments(input) : input;

    if (prepared.trim().isEmpty()) {
      return new ArrayList<>();
    }

    this.source = input;
    this.lines = new ArrayList<>();
    this.lineOffsets = new ArrayList<>();
    splitLinesRespectingQuotes(prepared, 0, lines, lineOffsets);
    this.pos = 0;
    this.baseIndentation = null;

    try {
      List<Map<String, Object>> rawResult = parseDocument(0);
      return transformResult(rawResult);
    } finally {
      this.source = null;
      this.lines = null;
      this.lineOffsets = null;
    }
  }

  /**
   * Report whether a body written between an even run of delimiters is substantive.
   *
   * <p>A substantive body holds at least one visible character and does not straddle a parenthesis.
   * An even run can always be read as delimiter pairs enclosing nothing, so the n-quote reading is
   * only taken when it carries something the pairs cannot.
   */
  private static boolean isSubstantiveBody(String content) {
    int depth = 0;
    boolean hasVisible = false;

    for (int i = 0; i < content.length(); i++) {
      char c = content.charAt(i);
      if (c == '(') {
        depth++;
      } else if (c == ')') {
        depth--;
        if (depth < 0) {
          return false;
        }
      }
      if (!Character.isWhitespace(c)) {
        hasVisible = true;
      }
    }

    return hasVisible && depth == 0;
  }

  /** The decoded value of a delimited reference and the position right after it. */
  private static final class QuotedString {
    final String value;
    final int end;

    QuotedString(String value, int end) {
      this.value = value;
      this.end = end;
    }
  }

  /**
   * Parse the delimited reference starting at start.
   *
   * <p>Any number N of quotes opens and closes the string, 2*N quotes are an escaped quote
   * sequence. A run of an even number of delimiters that does not open a reference with a
   * substantive body is the empty reference: the shortest reading, a bare delimiter pair enclosing
   * nothing, wins over a longer n-quote delimiter.
   *
   * <p>Returns null when text does not start a delimited reference.
   */
  private static QuotedString parseQuotedStringAt(String text, int start) {
    if (start >= text.length()) {
      return null;
    }

    char quoteChar = text.charAt(start);
    if (quoteChar != '"' && quoteChar != '\'' && quoteChar != '`') {
      return null;
    }

    int quoteCount = 0;
    int pos = start;
    while (pos < text.length() && text.charAt(pos) == quoteChar) {
      quoteCount++;
      pos++;
    }

    boolean isEvenRun = quoteCount % 2 == 0;
    QuotedString emptyReference = isEvenRun ? new QuotedString("", start + quoteCount) : null;

    String openClose = repeatChar(quoteChar, quoteCount);
    String escapeSeq = repeatChar(quoteChar, quoteCount * 2);
    StringBuilder content = new StringBuilder();

    while (pos < text.length()) {
      if (text.startsWith(escapeSeq, pos)) {
        content.append(openClose);
        pos += escapeSeq.length();
        continue;
      }
      if (text.startsWith(openClose, pos)) {
        int afterClose = pos + quoteCount;
        if (afterClose >= text.length() || text.charAt(afterClose) != quoteChar) {
          String value = content.toString();
          if (isEvenRun && !isSubstantiveBody(value)) {
            return emptyReference;
          }
          return new QuotedString(value, afterClose);
        }
      }
      content.append(text.charAt(pos));
      pos++;
    }

    return emptyReference;
  }

  /**
   * Skip over the quoted string starting at start.
   *
   * <p>Returns the position right after the closing quotes, or -1 when text does not start a
   * delimited reference.
   */
  private static int skipQuotedString(String text, int start) {
    return quotedReferenceEnd(text, start);
  }

  /**
   * Find where the delimited reference starting at start ends.
   *
   * <p>Returns the position right after the closing quotes, or -1 when text does not start a
   * delimited reference. Blanking comments reads this so that a {@code #} inside a delimited
   * reference is left as the content it is.
   */
  static int quotedReferenceEnd(String text, int start) {
    QuotedString parsed = parseQuotedStringAt(text, start);
    return parsed == null ? -1 : parsed.end;
  }

  /**
   * Find the parenthesis closing the one at start.
   *
   * <p>Quoted strings are skipped, so parentheses inside them are ignored. Returns -1 when the
   * group is not closed.
   */
  private int findMatchingParen(String text, int start) {
    int depth = 0;
    int i = start;

    while (i < text.length()) {
      char c = text.charAt(i);
      if (c == '"' || c == '\'' || c == '`') {
        int end = skipQuotedString(text, i);
        if (end > i) {
          i = end;
          continue;
        }
      } else if (c == '(') {
        depth++;
      } else if (c == ')') {
        depth--;
        if (depth == 0) {
          return i;
        }
      }
      i++;
    }

    return -1;
  }

  /**
   * Split text into lines, preserving newlines inside quoted strings and handling multiline
   * parenthesized expressions.
   *
   * <p>Each line goes to {@code result}, and where it starts in the document, {@code textOffset}
   * being where {@code text} starts, goes to {@code offsets}.
   */
  private static void splitLinesRespectingQuotes(
      String text, int textOffset, List<String> result, List<Integer> offsets) {
    StringBuilder currentLine = new StringBuilder();
    int lineStart = 0;
    int parenDepth = 0;
    int i = 0;

    while (i < text.length()) {
      char c = text.charAt(i);

      if (c == '"' || c == '\'' || c == '`') {
        int end = skipQuotedString(text, i);
        if (end > i) {
          // A quoted string is opaque: newlines inside it are content
          currentLine.append(text, i, end);
          i = end;
          continue;
        }
        currentLine.append(c);
      } else if (c == '(') {
        parenDepth++;
        currentLine.append(c);
      } else if (c == ')') {
        parenDepth--;
        currentLine.append(c);
      } else if (c == '\n') {
        if (parenDepth > 0) {
          // Inside unclosed parens: preserve the newline
          currentLine.append(c);
        } else {
          result.add(currentLine.toString());
          offsets.add(textOffset + lineStart);
          currentLine = new StringBuilder();
          lineStart = i + 1;
        }
      } else {
        currentLine.append(c);
      }

      i++;
    }

    // Add the last line if non-empty
    if (currentLine.length() > 0) {
      result.add(currentLine.toString());
      offsets.add(textOffset + lineStart);
    }
  }

  /**
   * Parse the entire document, or the body of a group.
   *
   * @param depth nesting depth of the lines at indentation level zero: the number of groups that
   *     enclose them
   */
  private List<Map<String, Object>> parseDocument(int depth) throws ParseException {
    pos = 0;
    List<Map<String, Object>> links = new ArrayList<>();

    while (pos < lines.size()) {
      String line = lines.get(pos);
      if (!line.trim().isEmpty()) {
        Map<String, Object> element = parseElement(0, depth);
        if (element != null) {
          links.add(element);
        }
      } else {
        pos++;
      }
    }

    return links;
  }

  /**
   * Parse a single element at given indentation.
   *
   * @param depth nesting depth of the line: every enclosing group and every indentation level
   *     counts as one
   */
  @SuppressWarnings("unchecked")
  private Map<String, Object> parseElement(int currentIndent, int depth) throws ParseException {
    if (pos >= lines.size()) {
      return null;
    }

    String line = lines.get(pos);
    int rawIndent = line.length() - line.stripLeading().length();

    // Set base indentation from first content line
    if (baseIndentation == null && !line.trim().isEmpty()) {
      baseIndentation = rawIndent;
    }

    // Normalize indentation relative to base
    int indent = Math.max(0, rawIndent - (baseIndentation != null ? baseIndentation : 0));

    if (indent < currentIndent) {
      return null;
    }

    String content = line.trim();
    if (content.isEmpty()) {
      pos++;
      return null;
    }

    int contentOffset = lineOffsets.get(pos) + leadingTrimmed(line);
    pos++;

    // Try to parse the line
    Map<String, Object> element = parseLineContent(content, contentOffset, depth);
    // Only a line that parsed counts, so a group too deep on it is reported at
    // the group, the way the other implementations report it.
    checkDepth(depth, contentOffset);

    // Check for children (indented lines that follow)
    List<Map<String, Object>> children = new ArrayList<>();

    while (pos < lines.size()) {
      // A line holding nothing does not close a block: it is the next line that
      // carries something which says whether the block goes on. Blanking a
      // comment leaves such a line behind, so this is also what lets a comment
      // stand on a line of its own inside an indented block.
      int following = pos;
      while (following < lines.size() && lines.get(following).trim().isEmpty()) {
        following++;
      }
      if (following >= lines.size()) {
        break;
      }

      String nextLine = lines.get(following);
      int rawNextIndent = nextLine.length() - nextLine.stripLeading().length();
      // Normalize next line's indentation
      int nextIndent = Math.max(0, rawNextIndent - (baseIndentation != null ? baseIndentation : 0));

      if (nextIndent <= indent) {
        break;
      }

      // This is a child: any line indented further than this one is, however
      // many spaces further it goes, and it is one level deeper.
      pos = following;
      Map<String, Object> child = parseElement(indent + 1, depth + 1);
      if (child != null) {
        children.add(child);
      }
    }

    if (!children.isEmpty()) {
      element.put("children", children);
    }

    return element;
  }

  /**
   * Parse the content of a single line.
   *
   * @param offset where the content starts in the document
   * @param depth nesting depth of the line
   */
  private Map<String, Object> parseLineContent(String content, int offset, int depth)
      throws ParseException {
    Map<String, Object> result = new HashMap<>();

    // A whole parenthesized group: (id: values), (values) or a nested document
    if (content.startsWith("(") && findMatchingParen(content, 0) == content.length() - 1) {
      return parseParenthesized(content.substring(1, content.length() - 1), offset, depth);
    }

    // Try indented ID syntax: id:
    if (content.endsWith(":")) {
      String idPart = content.substring(0, content.length() - 1).trim();
      String ref = extractReference(idPart);
      result.put("id", ref);
      result.put("values", new ArrayList<>());
      result.put("isIndentedId", true);
      return result;
    }

    // Try single-line link: id: values
    int colonPos = findColonOutsideQuotes(content);
    if (colonPos >= 0) {
      String idPart = content.substring(0, colonPos).trim();
      String afterColon = content.substring(colonPos + 1);
      String valuesPart = afterColon.trim();
      int valuesOffset = offset + colonPos + 1 + leadingTrimmed(afterColon);
      String ref = extractReference(idPart);
      List<Map<String, Object>> values = parseValues(valuesPart, valuesOffset, depth);
      result.put("id", ref);
      result.put("values", values);
      return result;
    }

    // Simple value list
    List<Map<String, Object>> values = parseValues(content, offset, depth);
    result.put("values", values);
    return result;
  }

  /**
   * Parse the content of a parenthesized group.
   *
   * <p>The group opens a nested context that starts fresh at indentation level zero and follows
   * exactly the rules used at the root of the document, so line breaks separate links and
   * indentation nests them. The group is one level deeper than the line it is written on.
   *
   * @param inner the text between the parentheses
   * @param open where the opening parenthesis is in the document
   * @param depth nesting depth of the line the group is written on
   */
  private Map<String, Object> parseParenthesized(String inner, int open, int depth)
      throws ParseException {
    int groupDepth = depth + 1;
    checkDepth(groupDepth, open);
    Map<String, Object> result = new HashMap<>();
    result.put("nested", parseNestedDocument(inner, open + 1, groupDepth));
    return result;
  }

  /**
   * Parse the text of a parenthesized group as a document of its own.
   *
   * @param inner the text between the parentheses
   * @param offset where {@code inner} starts in the document
   * @param depth nesting depth of the group
   */
  private List<Map<String, Object>> parseNestedDocument(String inner, int offset, int depth)
      throws ParseException {
    List<String> savedLines = lines;
    List<Integer> savedLineOffsets = lineOffsets;
    int savedPos = pos;
    Integer savedBaseIndentation = baseIndentation;
    try {
      lines = new ArrayList<>();
      lineOffsets = new ArrayList<>();
      splitLinesRespectingQuotes(inner, offset, lines, lineOffsets);
      pos = 0;
      baseIndentation = null;
      return parseDocument(depth);
    } finally {
      lines = savedLines;
      lineOffsets = savedLineOffsets;
      pos = savedPos;
      baseIndentation = savedBaseIndentation;
    }
  }

  /**
   * Refuse a level of nesting deeper than the parser allows.
   *
   * <p>The refusal is final: the parser does not try another reading, which could recurse further.
   *
   * @param depth nesting depth of the group or line
   * @param at where the group or line starts in the document
   */
  private void checkDepth(int depth, int at) throws NestingTooDeepException {
    if (depth > maxDepth) {
      throw NestingTooDeepException.at(source, at, maxDepth);
    }
  }

  /** Count the characters {@link String#trim()} removes from the start of {@code text}. */
  private static int leadingTrimmed(String text) {
    int count = 0;
    while (count < text.length() && text.charAt(count) <= ' ') {
      count++;
    }
    return count;
  }

  /** Find position of colon that's not inside quotes or parentheses. */
  private int findColonOutsideQuotes(String text) {
    int parenDepth = 0;
    int i = 0;

    while (i < text.length()) {
      char c = text.charAt(i);
      if (c == '"' || c == '\'' || c == '`') {
        int end = skipQuotedString(text, i);
        if (end > i) {
          i = end;
          continue;
        }
      } else if (c == '(') {
        parenDepth++;
      } else if (c == ')') {
        parenDepth--;
      } else if (c == ':' && parenDepth == 0) {
        return i;
      }
      i++;
    }

    return -1;
  }

  /**
   * Parse a space-separated list of values.
   *
   * @param offset where {@code text} starts in the document
   * @param depth nesting depth of the line the values are written on
   */
  private List<Map<String, Object>> parseValues(String text, int offset, int depth)
      throws ParseException {
    if (text == null || text.isEmpty()) {
      return new ArrayList<>();
    }

    List<Map<String, Object>> values = new ArrayList<>();
    int i = 0;

    while (i < text.length()) {
      // Skip whitespace
      while (i < text.length() && isWhitespace(text.charAt(i))) {
        i++;
      }
      if (i >= text.length()) {
        break;
      }

      // Extract next value
      int[] result = extractNextValue(text, i);
      int valueEnd = result[0];
      String valueText = text.substring(i, valueEnd);

      if (!valueText.trim().isEmpty()) {
        values.add(parseValue(valueText, offset + i, depth));
      }

      if (valueEnd == i) {
        // No progress made - skip this character to avoid infinite loop
        i++;
      } else {
        i = valueEnd;
      }
    }

    return values;
  }

  private boolean isWhitespace(char c) {
    return c == ' ' || c == '\t' || c == '\n' || c == '\r';
  }

  /** Extract the next value from text starting at start position. */
  private int[] extractNextValue(String text, int start) {
    if (start >= text.length()) {
      return new int[] {start};
    }

    // Check if this starts with a delimited reference
    QuotedString quoted = parseQuotedStringAt(text, start);
    if (quoted != null) {
      return new int[] {quoted.end};
    }

    // Check if this starts with a parenthesized expression
    if (text.charAt(start) == '(') {
      int end = findMatchingParen(text, start);
      return new int[] {end >= 0 ? end + 1 : text.length()};
    }

    // Regular value - read until space or end
    boolean inSingle = false;
    boolean inDouble = false;
    boolean inBacktick = false;
    int i = start;

    while (i < text.length()) {
      char c = text.charAt(i);
      if (c == '\'' && !inDouble && !inBacktick) {
        inSingle = !inSingle;
      } else if (c == '"' && !inSingle && !inBacktick) {
        inDouble = !inDouble;
      } else if (c == '`' && !inSingle && !inDouble) {
        inBacktick = !inBacktick;
      } else if (c == ' ' && !inSingle && !inDouble && !inBacktick) {
        break;
      }
      i++;
    }

    return new int[] {i};
  }

  /**
   * Parse a single value (could be a reference or nested link).
   *
   * @param offset where {@code value} starts in the document
   * @param depth nesting depth of the line the value is written on
   */
  private Map<String, Object> parseValue(String value, int offset, int depth)
      throws ParseException {
    Map<String, Object> result = new HashMap<>();

    // Nested link in parentheses
    if (value.startsWith("(") && findMatchingParen(value, 0) == value.length() - 1) {
      return parseParenthesized(value.substring(1, value.length() - 1), offset, depth);
    }

    // Simple reference
    String ref = extractReference(value);
    result.put("id", ref);
    return result;
  }

  /** Extract reference, handling quoted strings with escaping support. */
  private String extractReference(String text) {
    text = text.trim();

    QuotedString quoted = parseQuotedStringAt(text, 0);
    if (quoted != null) {
      return quoted.value;
    }

    // Unquoted
    return text;
  }

  private static String repeatChar(char c, int count) {
    StringBuilder sb = new StringBuilder(count);
    for (int i = 0; i < count; i++) {
      sb.append(c);
    }
    return sb.toString();
  }

  /** Transform raw parse result into Link objects. */
  private List<Link> transformResult(List<Map<String, Object>> rawResult) {
    List<Link> links = new ArrayList<>();

    for (Map<String, Object> item : rawResult) {
      if (item != null) {
        collectLinks(item, new ArrayList<>(), links);
      }
    }

    return links;
  }

  /** Recursively collect links from parse tree. */
  @SuppressWarnings("unchecked")
  private void collectLinks(Map<String, Object> item, List<Link> parentPath, List<Link> result) {
    if (item == null) {
      return;
    }

    List<Map<String, Object>> children =
        (List<Map<String, Object>>) item.getOrDefault("children", new ArrayList<>());

    // Special case: indented ID syntax (id: followed by children)
    Boolean isIndentedId = (Boolean) item.get("isIndentedId");
    if (Boolean.TRUE.equals(isIndentedId)
        && item.get("id") != null
        && ((List<?>) item.getOrDefault("values", new ArrayList<>())).isEmpty()
        && !children.isEmpty()) {

      List<Link> childValues = new ArrayList<>();
      for (Map<String, Object> child : children) {
        childValues.add(transformIndentedValue(child));
      }

      Map<String, Object> linkWithChildren = new HashMap<>();
      linkWithChildren.put("id", item.get("id"));
      linkWithChildren.put("values", childValues);
      Link currentLink = transformLinkFromValues(linkWithChildren, childValues);

      if (parentPath.isEmpty()) {
        result.add(currentLink);
      } else {
        result.add(combinePathElements(parentPath, currentLink));
      }

    } else if (!children.isEmpty()) {
      // Regular indented structure
      Link currentLink = transformLink(item);

      // Add the link combined with parent path
      if (parentPath.isEmpty()) {
        result.add(currentLink);
      } else {
        result.add(combinePathElements(parentPath, currentLink));
      }

      // Process each child with this item in the path
      List<Link> newPath = new ArrayList<>(parentPath);
      newPath.add(currentLink);

      for (Map<String, Object> child : children) {
        collectLinks(child, newPath, result);
      }

    } else {
      // Leaf item or item with inline values
      Link currentLink = transformLink(item);

      if (parentPath.isEmpty()) {
        result.add(currentLink);
      } else {
        result.add(combinePathElements(parentPath, currentLink));
      }
    }
  }

  /** Convert a child line and its descendants to a value of an indented ID. */
  @SuppressWarnings("unchecked")
  private Link transformIndentedValue(Map<String, Object> item) {
    List<Map<String, Object>> children =
        (List<Map<String, Object>>) item.getOrDefault("children", new ArrayList<>());
    if (!children.isEmpty()
        && item.get("id") != null
        && ((List<?>) item.getOrDefault("values", new ArrayList<>())).isEmpty()) {
      List<Link> values = new ArrayList<>();
      for (Map<String, Object> child : children) {
        values.add(transformIndentedValue(child));
      }
      return new Link((String) item.get("id"), values);
    }

    Link current = transformLink(item);
    if (!children.isEmpty()) {
      List<Link> values = new ArrayList<>(current.getValues());
      for (Map<String, Object> child : children) {
        values.add(transformIndentedValue(child));
      }
      return new Link(current.getId(), values);
    }
    if (item.get("id") == null && !item.containsKey("nested") && current.getValues().size() == 1) {
      return current.getValues().get(0);
    }
    return current;
  }

  /** Combine path elements into a single link. */
  private Link combinePathElements(List<Link> pathElements, Link current) {
    if (pathElements.isEmpty()) {
      return current;
    }

    if (pathElements.size() == 1) {
      List<Link> combined = new ArrayList<>();
      combined.add(pathElements.get(0));
      combined.add(current);
      Link link = new Link(null, combined);
      link.setFromPathCombination(true);
      return link;
    }

    // For multiple path elements, build proper nesting
    List<Link> parentPath = pathElements.subList(0, pathElements.size() - 1);
    Link lastElement = pathElements.get(pathElements.size() - 1);

    // Build the parent structure
    Link parent = combinePathElements(new ArrayList<>(parentPath), lastElement);

    // Add current element to the built structure
    List<Link> combined = new ArrayList<>();
    combined.add(parent);
    combined.add(current);
    Link link = new Link(null, combined);
    link.setFromPathCombination(true);
    return link;
  }

  /**
   * Transform the links of a nested (parenthesized) context into one Link.
   *
   * <p>The nested context is parsed with the same rules as the root, so it yields a list of links;
   * a single link is used as is, several links become the values of one anonymous link. An already
   * parenthesized single link keeps its own group, so {@code ((a b))} stays distinct from {@code (a
   * b)}.
   */
  private Link transformNested(List<Map<String, Object>> nested) {
    List<Link> nestedLinks = new ArrayList<>();
    for (Map<String, Object> item : nested) {
      if (item != null) {
        collectLinks(item, new ArrayList<>(), nestedLinks);
      }
    }

    boolean wrapsSingleGroup =
        nested.size() == 1 && nested.get(0) != null && nested.get(0).containsKey("nested");
    if (nestedLinks.size() == 1 && !wrapsSingleGroup) {
      return nestedLinks.get(0);
    }

    return new Link(null, nestedLinks);
  }

  /** Transform a parsed item into a Link object. */
  @SuppressWarnings("unchecked")
  private Link transformLink(Map<String, Object> item) {
    if (item == null) {
      return null;
    }

    // Parenthesized group parsed as a nested context
    if (item.containsKey("nested")) {
      return transformNested((List<Map<String, Object>>) item.get("nested"));
    }

    // Simple reference
    if (item.containsKey("id") && !item.containsKey("values")) {
      return new Link((String) item.get("id"));
    }

    // Link with values
    if (item.containsKey("values")) {
      String linkId = (String) item.get("id");
      List<Object> rawValues = (List<Object>) item.get("values");
      List<Link> values = new ArrayList<>();

      for (Object v : rawValues) {
        if (v instanceof Link) {
          values.add((Link) v);
        } else if (v instanceof Map) {
          values.add(transformLink((Map<String, Object>) v));
        }
      }

      return new Link(linkId, values);
    }

    // Default
    return new Link((String) item.get("id"));
  }

  /** Transform link with already-transformed values. */
  private Link transformLinkFromValues(Map<String, Object> item, List<Link> values) {
    String linkId = (String) item.get("id");
    return new Link(linkId, values);
  }
}
