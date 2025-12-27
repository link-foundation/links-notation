package io.github.linkfoundation.linksnotation;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Represents a link in Links Notation (Lino).
 *
 * <p>A link can be:
 *
 * <ul>
 *   <li>A simple reference (ids only, no values)
 *   <li>A link with ids and values
 *   <li>A link with only values (no ids)
 * </ul>
 *
 * <p>For multi-reference IDs (e.g., "some example" before colon), use the {@link #getIds()} method.
 * The {@link #getId()} method will throw {@link MultiReferenceException} for multi-reference IDs.
 */
public class Link {

  private final List<String> ids;
  private final List<Link> values;
  private boolean isFromPathCombination = false;

  /** Creates an empty link with no ids and no values. */
  public Link() {
    this((List<String>) null, null);
  }

  /**
   * Creates a link with a single id but no values.
   *
   * @param id the link identifier
   */
  public Link(String id) {
    this(id != null ? Collections.singletonList(id) : null, null);
  }

  /**
   * Creates a link with multiple ids but no values.
   *
   * @param ids the list of link identifiers
   */
  public Link(List<String> ids) {
    this(ids, (List<Link>) null);
  }

  /**
   * Creates a link with a single id and values.
   *
   * @param id the link identifier (can be null)
   * @param values the list of child links (can be null)
   */
  public Link(String id, List<Link> values) {
    this(id != null ? Collections.singletonList(id) : null, values);
  }

  /**
   * Creates a link with multiple ids and values.
   *
   * @param ids the list of link identifiers (can be null)
   * @param values the list of child links (can be null)
   */
  public Link(List<String> ids, List<Link> values) {
    this.ids = ids != null ? new ArrayList<>(ids) : null;
    this.values = values != null ? new ArrayList<>(values) : new ArrayList<>();
  }

  /**
   * Gets the link identifier (backward compatible).
   *
   * <p>For multi-reference IDs (more than one element in ids), this method throws {@link
   * MultiReferenceException}. Use {@link #getIds()} for multi-reference access.
   *
   * @return the identifier, or null if not set
   * @throws MultiReferenceException if the link has a multi-reference ID
   */
  public String getId() throws MultiReferenceException {
    if (ids == null || ids.isEmpty()) {
      return null;
    }
    if (ids.size() > 1) {
      throw new MultiReferenceException(ids.size());
    }
    return ids.get(0);
  }

  /**
   * Gets the list of link identifiers.
   *
   * @return the list of identifiers, or null if not set
   */
  public List<String> getIds() {
    return ids;
  }

  /**
   * Gets the ID as a joined string for formatting purposes. Returns null if ids is null or empty.
   *
   * @return the joined ID string, or null
   */
  public String getIdString() {
    if (ids == null || ids.isEmpty()) {
      return null;
    }
    return String.join(" ", ids);
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
      return new Link(ids, newValues);
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
    return new Link((List<String>) null, combined);
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
    if (reference == null || reference.trim().isEmpty()) {
      return "";
    }

    boolean hasSingleQuote = reference.contains("'");
    boolean hasDoubleQuote = reference.contains("\"");

    boolean needsQuoting =
        reference.contains(":")
            || reference.contains("(")
            || reference.contains(")")
            || reference.contains(" ")
            || reference.contains("\t")
            || reference.contains("\n")
            || reference.contains("\r")
            || hasDoubleQuote
            || hasSingleQuote;

    // Handle edge case: reference contains both single and double quotes
    if (hasSingleQuote && hasDoubleQuote) {
      // Escape single quotes and wrap in single quotes
      return "'" + reference.replace("'", "\\'") + "'";
    }

    // Prefer single quotes if double quotes are present
    if (hasDoubleQuote) {
      return "'" + reference + "'";
    }

    // Use double quotes if single quotes are present
    if (hasSingleQuote) {
      return "\"" + reference + "\"";
    }

    // Use single quotes for special characters
    if (needsQuoting) {
      return "'" + reference + "'";
    }

    // No quoting needed
    return reference;
  }

  /**
   * Convert to string using either just ID or full format.
   *
   * @return string representation
   */
  public String toLinkOrIdString() {
    String idStr = getIdString();
    if (values.isEmpty()) {
      return idStr == null ? "" : escapeReference(idStr);
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
    return Objects.equals(ids, link.ids) && Objects.equals(values, link.values);
  }

  @Override
  public int hashCode() {
    return Objects.hash(ids, values);
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
    String idStr = getIdString();

    // Empty link
    if (idStr == null && values.isEmpty()) {
      return lessParentheses ? "" : "()";
    }

    // Link with only ID, no values
    if (values.isEmpty()) {
      String escapedId = escapeReference(idStr);
      // When used as a value in a compound link, wrap in parentheses
      if (isCompoundValue) {
        return "(" + escapedId + ")";
      }
      return lessParentheses && !needsParentheses(idStr) ? escapedId : "(" + escapedId + ")";
    }

    // Format values recursively
    String valuesStr = values.stream().map(this::formatValue).collect(Collectors.joining(" "));

    // Link with values only (null id)
    if (idStr == null) {
      if (lessParentheses) {
        // Check if all values are simple (no nested values)
        boolean allSimple = values.stream().allMatch(v -> v.values.isEmpty());
        if (allSimple) {
          // Format each value without extra wrapping
          return values.stream()
              .map(v -> escapeReference(v.getIdString()))
              .collect(Collectors.joining(" "));
        }
        // For mixed or complex values in lessParentheses mode
        return valuesStr;
      }
      // For normal mode, wrap in parentheses
      return "(" + valuesStr + ")";
    }

    // Link with ID and values
    String escapedId = escapeReference(idStr);
    String withColon = escapedId + ": " + valuesStr;
    return lessParentheses && !needsParentheses(idStr) ? withColon : "(" + withColon + ")";
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
      return escapeReference(value.getIdString());
    }

    // Complex value with its own structure - format it normally with parentheses
    return value.format(false, false);
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
