package io.github.linkfoundation.linksnotation;

import java.util.List;

/**
 * Links written as the JSON the JavaScript tests compare: every link is an array of its ID (a
 * string, or null) followed by its values, so two documents read the same exactly when their trees
 * are equal.
 */
final class LinkTree {

  private LinkTree() {}

  /** The links as a JSON array of trees. */
  static String of(List<Link> links) {
    StringBuilder out = new StringBuilder("[");
    for (int index = 0; index < links.size(); index++) {
      if (index > 0) {
        out.append(',');
      }
      Link link = links.get(index);
      out.append('[').append(string(link.getId()));
      for (Link value : link.getValues()) {
        String child = of(List.of(value));
        out.append(',').append(child, 1, child.length() - 1);
      }
      out.append(']');
    }
    return out.append(']').toString();
  }

  /** The text as a JSON string, or {@code null}. */
  private static String string(String text) {
    if (text == null) {
      return "null";
    }
    StringBuilder out = new StringBuilder("\"");
    for (int index = 0; index < text.length(); index++) {
      char character = text.charAt(index);
      if (character == '"' || character == '\\') {
        out.append('\\').append(character);
      } else if (character < 0x20) {
        out.append(String.format("\\u%04x", (int) character));
      } else {
        out.append(character);
      }
    }
    return out.append('"').toString();
  }
}
