package io.github.linkfoundation.linksnotation;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Represents a link in Links Notation (Lino).
 *
 * <p>A link can be:
 *
 * <ul>
 *   <li>A simple reference (id only, no values)
 *   <li>A link with id and values
 *   <li>A link with only values (no id)
 * </ul>
 */
public class Link {

  private final String id;
  private final List<Link> values;
  private boolean isFromPathCombination = false;
  private String rawId;

  /** Creates an empty link with no id and no values. */
  public Link() {
    this(null, null);
  }

  /**
   * Creates a link with an id but no values.
   *
   * @param id the link identifier
   */
  public Link(String id) {
    this(id, null);
  }

  /**
   * Creates a link with an id and values.
   *
   * @param id the link identifier (can be null)
   * @param values the list of child links (can be null)
   */
  public Link(String id, List<Link> values) {
    this.id = id;
    this.values = values != null ? new ArrayList<>(values) : new ArrayList<>();
  }

  /**
   * Gets the link identifier.
   *
   * @return the identifier, or null if not set
   */
  public String getId() {
    return id;
  }

  /**
   * Gets the list of child values.
   *
   * @return the list of values (never null)
   */
  public List<Link> getValues() {
    return values;
  }

  /**
   * Checks if this link was created from a path combination.
   *
   * @return true if created from path combination
   */
  public boolean isFromPathCombination() {
    return isFromPathCombination;
  }

  /**
   * Sets whether this link was created from a path combination.
   *
   * @param fromPathCombination the flag value
   */
  public void setFromPathCombination(boolean fromPathCombination) {
    this.isFromPathCombination = fromPathCombination;
  }

  /**
   * Gets the ID exactly as the parsed document wrote it.
   *
   * <p>{@code '1'} for a quoted {@code 1}, {@code 1} for a bare one, {@code ~1{31}} for a versioned
   * literal, a multi-line quoted reference with its line breaks. Null for a link without an ID, a
   * link built in code, a link made by combining the lines of an indented document, and every link
   * read by a parser in AST mode. It takes no part in {@link #equals(Object)}, {@link #hashCode()},
   * {@link #toString()} or {@link #format(boolean)}.
   *
   * @return the ID as written, or null
   */
  public String getRawId() {
    return rawId;
  }

  /**
   * Sets the ID exactly as a document wrote it.
   *
   * @param rawId the ID as written, or null
   */
  public void setRawId(String rawId) {
    this.rawId = rawId;
  }

  /**
   * Gets the delimiter the ID was written between.
   *
   * <p>{@code '}, {@code "} or {@code `} when {@link #getRawId()} is one complete quoted reference
   * (however many delimiters open it), and null when it is bare, a versioned literal, or not read
   * from a document. {@code 1} and {@code '1'} stay equal links; this only says how each was
   * written.
   *
   * @return the delimiter, or null
   */
  public String getQuote() {
    return referenceQuote(rawId);
  }

  /**
   * Reads the delimiter a reference was written between.
   *
   * <p>Returns the first character of {@code raw} when it is a quote and the delimited reference
   * that starts there takes up all of {@code raw}; otherwise null. {@code 'unclosed} is a bare
   * reference, {@code 'a' b} is more than one reference, and {@code ~1{31}} is a literal, so all
   * three give null.
   *
   * @param raw one reference exactly as written, or null
   * @return {@code '}, {@code "} or {@code `}, or null
   */
  public static String referenceQuote(String raw) {
    if (raw == null || raw.isEmpty()) {
      return null;
    }
    char first = raw.charAt(0);
    if (first != '\'' && first != '"' && first != '`') {
      return null;
    }
    return Parser.quotedReferenceEnd(raw, 0) == raw.length() ? String.valueOf(first) : null;
  }

  /**
   * Gets the string representation of all values.
   *
   * @return space-separated string of values
   */
  public String getValuesString() {
    if (values.isEmpty()) {
      return "";
    }
    return values.stream().map(Link::getValueString).collect(Collectors.joining(" "));
  }

  /**
   * Simplify the link structure by unwrapping single-value containers.
   *
   * @return simplified link
   */
  public Link simplify() {
    if (values.isEmpty()) {
      return this;
    } else if (values.size() == 1) {
      return values.get(0);
    } else {
      List<Link> newValues = values.stream().map(Link::simplify).collect(Collectors.toList());
      return new Link(id, newValues);
    }
  }

  /**
   * Combine this link with another link.
   *
   * @param other the link to combine with
   * @return combined link
   */
  public Link combine(Link other) {
    List<Link> combined = new ArrayList<>();
    combined.add(this);
    combined.add(other);
    return new Link(null, combined);
  }

  /**
   * Get string representation of a value.
   *
   * @param value the value to stringify
   * @return string representation
   */
  public static String getValueString(Link value) {
    return value.toLinkOrIdString();
  }

  /**
   * Escape a reference string by adding quotes if necessary.
   *
   * @param reference the reference to escape
   * @return escaped reference
   */
  public static String escapeReference(String reference) {
    if (reference == null) {
      return "";
    }
    return ReferenceLiteral.format(reference);
  }

  /**
   * Convert to string using either just ID or full format.
   *
   * @return string representation
   */
  public String toLinkOrIdString() {
    if (values.isEmpty()) {
      return id == null ? "" : escapeReference(id);
    }
    return toString();
  }

  /**
   * Check equality with another Link.
   *
   * @param other object to compare with
   * @return true if links are equal
   */
  @Override
  public boolean equals(Object other) {
    if (this == other) return true;
    if (!(other instanceof Link)) return false;
    Link link = (Link) other;
    return Objects.equals(id, link.id) && Objects.equals(values, link.values);
  }

  @Override
  public int hashCode() {
    return Objects.hash(id, values);
  }

  /**
   * Format the link as a string.
   *
   * @return formatted string
   */
  @Override
  public String toString() {
    return format(false);
  }

  /**
   * Format the link as a string.
   *
   * @param lessParentheses if true, omit parentheses where safe
   * @return formatted string
   */
  public String format(boolean lessParentheses) {
    return format(lessParentheses, false);
  }

  /**
   * Format the link as a string.
   *
   * @param lessParentheses if true, omit parentheses where safe
   * @param isCompoundValue if true, this is a value in a compound link
   * @return formatted string
   */
  public String format(boolean lessParentheses, boolean isCompoundValue) {
    // Empty link
    if (id == null && values.isEmpty()) {
      return "()";
    }

    // Link with only ID, no values
    if (values.isEmpty()) {
      String escapedId = escapeReference(id);
      // When used as a value in a compound link, wrap in parentheses
      if (isCompoundValue) {
        return "(" + escapedId + ")";
      }
      return lessParentheses && !needsParentheses(id) ? escapedId : "(" + escapedId + ")";
    }

    // Format values recursively
    String valuesStr = values.stream().map(this::formatValue).collect(Collectors.joining(" "));

    // Link with values only (null id)
    if (id == null) {
      if (lessParentheses && !hasLoneNestedValue()) {
        // Check if all values are simple (no nested values)
        boolean allSimple = values.stream().allMatch(v -> v.values.isEmpty());
        if (allSimple) {
          // Format each value without extra wrapping
          return values.stream().map(v -> escapeReference(v.id)).collect(Collectors.joining(" "));
        }
        // For mixed or complex values in lessParentheses mode
        return valuesStr;
      }
      // For normal mode, wrap in parentheses
      return "(" + valuesStr + ")";
    }

    // Link with ID and values
    String idStr = escapeReference(id);
    String withColon = idStr + ": " + valuesStr;
    return lessParentheses && !needsParentheses(id) ? withColon : "(" + withColon + ")";
  }

  /**
   * Format a value within this link.
   *
   * @param value the value to format
   * @return formatted value string
   */
  private String formatValue(Link value) {
    // Check if we're in a compound link that was created from path combinations
    boolean isCompoundFromPaths = this.isFromPathCombination;

    // For compound links from paths, format values with parentheses
    if (isCompoundFromPaths) {
      return value.format(false, true);
    }

    // Simple link with just an ID - don't wrap in parentheses when used as a value
    if (value.values.isEmpty()) {
      return escapeReference(value.id);
    }

    // Complex value with its own structure - format it normally with parentheses
    return value.format(false, false);
  }

  /**
   * Check whether this link holds exactly one link that has values. The parentheses of an anonymous
   * link are what nest such a value: {@code ((b c))} without them is {@code (b c)}, a different
   * link, so lessParentheses has to keep them.
   *
   * @return true if the only value has values of its own
   */
  private boolean hasLoneNestedValue() {
    return values.size() == 1 && !values.get(0).values.isEmpty();
  }

  /**
   * Check if a string needs to be wrapped in parentheses.
   *
   * @param str the string to check
   * @return true if parentheses are needed
   */
  private boolean needsParentheses(String str) {
    return str != null
        && (str.contains(" ") || str.contains(":") || str.contains("(") || str.contains(")"));
  }

  /**
   * Format a list of links into a string.
   *
   * @param links the list of links to format
   * @return formatted string
   */
  public static String formatLinks(List<Link> links) {
    return formatLinks(links, false);
  }

  /**
   * Format a list of links into a string.
   *
   * @param links the list of links to format
   * @param lessParentheses if true, omit parentheses where safe
   * @return formatted string
   */
  public static String formatLinks(List<Link> links, boolean lessParentheses) {
    if (links == null || links.isEmpty()) {
      return "";
    }
    return links.stream()
        .map(link -> link.format(lessParentheses))
        .collect(Collectors.joining("\n"));
  }
}
