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
  private static final int DEFAULT_MAX_DEPTH = 1000;

  private final int maxInputSize;
  private final int maxDepth;

  private String text;
  private List<String> lines;
  private int pos;
  private Integer baseIndentation;

  /** Creates a parser with default options. */
  public Parser() {
    this(DEFAULT_MAX_INPUT_SIZE, DEFAULT_MAX_DEPTH);
  }

  /**
   * Creates a parser with custom options.
   *
   * @param maxInputSize maximum input size in bytes
   * @param maxDepth maximum nesting depth
   */
  public Parser(int maxInputSize, int maxDepth) {
    this.maxInputSize = maxInputSize;
    this.maxDepth = maxDepth;
  }

  /**
   * Parse Lino notation text into a list of Link objects.
   *
   * @param input text in Lino notation
   * @return list of parsed Link objects
   * @throws ParseException if parsing fails
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

    if (input.trim().isEmpty()) {
      return new ArrayList<>();
    }

    this.text = input;
    this.lines = splitLinesRespectingQuotes(input);
    this.pos = 0;
    this.baseIndentation = null;

    List<Map<String, Object>> rawResult = parseDocument();
    return transformResult(rawResult);
  }

  /**
   * Split text into lines, preserving newlines inside quoted strings and handling multiline
   * parenthesized expressions.
   */
  private List<String> splitLinesRespectingQuotes(String text) {
    List<String> result = new ArrayList<>();
    StringBuilder currentLine = new StringBuilder();
    boolean inSingle = false;
    boolean inDouble = false;
    boolean inBacktick = false;
    int parenDepth = 0;

    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);

      // Handle quote toggling
      if (c == '"' && !inSingle && !inBacktick) {
        inDouble = !inDouble;
        currentLine.append(c);
      } else if (c == '\'' && !inDouble && !inBacktick) {
        inSingle = !inSingle;
        currentLine.append(c);
      } else if (c == '`' && !inSingle && !inDouble) {
        inBacktick = !inBacktick;
        currentLine.append(c);
      } else if (c == '(' && !inSingle && !inDouble && !inBacktick) {
        parenDepth++;
        currentLine.append(c);
      } else if (c == ')' && !inSingle && !inDouble && !inBacktick) {
        parenDepth--;
        currentLine.append(c);
      } else if (c == '\n') {
        if (inSingle || inDouble || inBacktick || parenDepth > 0) {
          // Inside quotes or unclosed parens: preserve the newline
          currentLine.append(c);
        } else {
          // Outside quotes and parens balanced: this is a line break
          result.add(currentLine.toString());
          currentLine = new StringBuilder();
        }
      } else {
        currentLine.append(c);
      }
    }

    // Add the last line if non-empty
    if (currentLine.length() > 0) {
      result.add(currentLine.toString());
    }

    return result;
  }

  /** Parse the entire document. */
  private List<Map<String, Object>> parseDocument() throws ParseException {
    pos = 0;
    List<Map<String, Object>> links = new ArrayList<>();

    while (pos < lines.size()) {
      String line = lines.get(pos);
      if (!line.trim().isEmpty()) {
        Map<String, Object> element = parseElement(0);
        if (element != null) {
          links.add(element);
        }
      } else {
        pos++;
      }
    }

    return links;
  }

  /** Parse a single element at given indentation. */
  @SuppressWarnings("unchecked")
  private Map<String, Object> parseElement(int currentIndent) throws ParseException {
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

    pos++;

    // Try to parse the line
    Map<String, Object> element = parseLineContent(content);

    // Check for children (indented lines that follow)
    List<Map<String, Object>> children = new ArrayList<>();
    int childIndent = indent + 2; // Expect at least 2 spaces for child

    while (pos < lines.size()) {
      String nextLine = lines.get(pos);
      int rawNextIndent = nextLine.length() - nextLine.stripLeading().length();
      // Normalize next line's indentation
      int nextIndent = Math.max(0, rawNextIndent - (baseIndentation != null ? baseIndentation : 0));

      if (!nextLine.trim().isEmpty() && nextIndent > indent) {
        // This is a child
        Map<String, Object> child = parseElement(children.isEmpty() ? childIndent : indent + 2);
        if (child != null) {
          children.add(child);
        }
      } else {
        break;
      }
    }

    if (!children.isEmpty()) {
      element.put("children", children);
    }

    return element;
  }

  /** Parse the content of a single line. */
  private Map<String, Object> parseLineContent(String content) throws ParseException {
    Map<String, Object> result = new HashMap<>();

    // Try multiline link format: (id: values) or (values)
    if (content.startsWith("(") && content.endsWith(")")) {
      String inner = content.substring(1, content.length() - 1).trim();
      return parseParenthesized(inner);
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
    if (content.contains(":") && !content.startsWith("\"") && !content.startsWith("'")) {
      int colonPos = findColonOutsideQuotes(content);
      if (colonPos >= 0) {
        String idPart = content.substring(0, colonPos).trim();
        String valuesPart = content.substring(colonPos + 1).trim();
        String ref = extractReference(idPart);
        List<Map<String, Object>> values = parseValues(valuesPart);
        result.put("id", ref);
        result.put("values", values);
        return result;
      }
    }

    // Simple value list
    List<Map<String, Object>> values = parseValues(content);
    result.put("values", values);
    return result;
  }

  /** Parse content within parentheses. */
  private Map<String, Object> parseParenthesized(String inner) throws ParseException {
    Map<String, Object> result = new HashMap<>();

    // Check for id: values format
    int colonPos = findColonOutsideQuotes(inner);
    if (colonPos >= 0) {
      String idPart = inner.substring(0, colonPos).trim();
      String valuesPart = inner.substring(colonPos + 1).trim();
      String ref = extractReference(idPart);
      List<Map<String, Object>> values = parseValues(valuesPart);
      result.put("id", ref);
      result.put("values", values);
      return result;
    }

    // Just values
    List<Map<String, Object>> values = parseValues(inner);
    result.put("values", values);
    return result;
  }

  /** Find position of colon that's not inside quotes or parentheses. */
  private int findColonOutsideQuotes(String text) {
    boolean inSingle = false;
    boolean inDouble = false;
    boolean inBacktick = false;
    int parenDepth = 0;

    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);

      if (c == '\'' && !inDouble && !inBacktick) {
        inSingle = !inSingle;
      } else if (c == '"' && !inSingle && !inBacktick) {
        inDouble = !inDouble;
      } else if (c == '`' && !inSingle && !inDouble) {
        inBacktick = !inBacktick;
      } else if (c == '(' && !inSingle && !inDouble && !inBacktick) {
        parenDepth++;
      } else if (c == ')' && !inSingle && !inDouble && !inBacktick) {
        parenDepth--;
      } else if (c == ':' && !inSingle && !inDouble && !inBacktick && parenDepth == 0) {
        return i;
      }
    }

    return -1;
  }

  /** Parse a space-separated list of values. */
  private List<Map<String, Object>> parseValues(String text) throws ParseException {
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
        values.add(parseValue(valueText));
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

    // Check if this starts with a multi-quote string
    char[] quoteChars = {'"', '\'', '`'};
    for (char quoteChar : quoteChars) {
      if (text.charAt(start) == quoteChar) {
        // Count opening quotes dynamically
        int quoteCount = 0;
        int pos = start;
        while (pos < text.length() && text.charAt(pos) == quoteChar) {
          quoteCount++;
          pos++;
        }

        if (quoteCount >= 1) {
          // Parse this multi-quote string
          String openClose = repeatChar(quoteChar, quoteCount);
          String escapeSeq = repeatChar(quoteChar, quoteCount * 2);

          int innerPos = start + quoteCount;
          while (innerPos < text.length()) {
            // Check for escape sequence (2*N quotes)
            if (text.substring(innerPos).startsWith(escapeSeq)) {
              innerPos += escapeSeq.length();
              continue;
            }
            // Check for closing quotes
            if (text.substring(innerPos).startsWith(openClose)) {
              int afterClosePos = innerPos + quoteCount;
              // Make sure this is exactly N quotes (not more)
              if (afterClosePos >= text.length() || text.charAt(afterClosePos) != quoteChar) {
                // Found the end
                return new int[] {afterClosePos};
              }
            }
            innerPos++;
          }
          // No closing found, treat as regular text
          break;
        }
      }
    }

    // Check if this starts with a parenthesized expression
    if (text.charAt(start) == '(') {
      int parenDepth = 1;
      boolean inSingle = false;
      boolean inDouble = false;
      boolean inBacktick = false;
      int i = start + 1;

      while (i < text.length() && parenDepth > 0) {
        char c = text.charAt(i);
        if (c == '\'' && !inDouble && !inBacktick) {
          inSingle = !inSingle;
        } else if (c == '"' && !inSingle && !inBacktick) {
          inDouble = !inDouble;
        } else if (c == '`' && !inSingle && !inDouble) {
          inBacktick = !inBacktick;
        } else if (c == '(' && !inSingle && !inDouble && !inBacktick) {
          parenDepth++;
        } else if (c == ')' && !inSingle && !inDouble && !inBacktick) {
          parenDepth--;
        }
        i++;
      }

      return new int[] {i};
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

  /** Parse a single value (could be a reference or nested link). */
  private Map<String, Object> parseValue(String value) throws ParseException {
    Map<String, Object> result = new HashMap<>();

    // Nested link in parentheses
    if (value.startsWith("(") && value.endsWith(")")) {
      String inner = value.substring(1, value.length() - 1).trim();
      return parseParenthesized(inner);
    }

    // Simple reference
    String ref = extractReference(value);
    result.put("id", ref);
    return result;
  }

  /** Extract reference, handling quoted strings with escaping support. */
  private String extractReference(String text) {
    text = text.trim();

    // Try multi-quote strings
    char[] quoteChars = {'"', '\'', '`'};
    for (char quoteChar : quoteChars) {
      if (!text.isEmpty() && text.charAt(0) == quoteChar) {
        // Count opening quotes dynamically
        int quoteCount = 0;
        while (quoteCount < text.length() && text.charAt(quoteCount) == quoteChar) {
          quoteCount++;
        }

        if (quoteCount >= 1 && text.length() > quoteCount) {
          String result = parseMultiQuoteString(text, quoteChar, quoteCount);
          if (result != null) {
            return result;
          }
        }
      }
    }

    // Unquoted
    return text;
  }

  /** Parse a multi-quote string. */
  private String parseMultiQuoteString(String text, char quoteChar, int quoteCount) {
    String openClose = repeatChar(quoteChar, quoteCount);
    String escapeSeq = repeatChar(quoteChar, quoteCount * 2);
    String escapeVal = repeatChar(quoteChar, quoteCount);

    // Check for opening quotes
    if (!text.startsWith(openClose)) {
      return null;
    }

    String remaining = text.substring(openClose.length());
    StringBuilder content = new StringBuilder();

    while (!remaining.isEmpty()) {
      // Check for escape sequence (2*N quotes)
      if (remaining.startsWith(escapeSeq)) {
        content.append(escapeVal);
        remaining = remaining.substring(escapeSeq.length());
        continue;
      }

      // Check for closing quotes (N quotes not followed by more quotes)
      if (remaining.startsWith(openClose)) {
        String afterClose = remaining.substring(openClose.length());
        // Make sure this is exactly N quotes (not more)
        if (afterClose.isEmpty() || afterClose.charAt(0) != quoteChar) {
          return content.toString();
        }
      }

      // Take the next character
      content.append(remaining.charAt(0));
      remaining = remaining.substring(1);
    }

    // No closing quotes found
    return null;
  }

  private String repeatChar(char c, int count) {
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
        List<Map<String, Object>> childVals =
            (List<Map<String, Object>>) child.getOrDefault("values", new ArrayList<>());
        if (childVals.size() == 1) {
          childValues.add(transformLink(childVals.get(0)));
        } else {
          childValues.add(transformLink(child));
        }
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

  /** Transform a parsed item into a Link object. */
  @SuppressWarnings("unchecked")
  private Link transformLink(Map<String, Object> item) {
    if (item == null) {
      return null;
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
