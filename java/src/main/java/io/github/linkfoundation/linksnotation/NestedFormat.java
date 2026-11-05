package io.github.linkfoundation.linksnotation;

import java.util.ArrayList;
import java.util.List;

/** Recursive nested writer. Read by folding groups in a group-aware binding. */
public final class NestedFormat {
  private NestedFormat() {}

  public static String formatNested(List<Link> links) {
    return formatNested(links, "  ");
  }

  /** Writes nested lines in value order, without a final newline. */
  public static String formatNested(List<Link> links, String indent) {
    if (indent == null || !indent.matches(" +")) {
      throw new IllegalArgumentException("indent must contain only spaces and be nonempty");
    }
    List<String> lines = new ArrayList<>();
    for (Link link : links) write(link, "", indent, false, lines);
    return String.join("\n", lines);
  }

  private static boolean atom(Link link) {
    return link.getId() != null && link.getValues().isEmpty();
  }

  private static boolean canNest(Link link) {
    return !atom(link)
        && !(link.getId() == null
            && link.getValues().size() == 1
            && !atom(link.getValues().get(0)));
  }

  private static boolean lineHolds(Link link, int count) {
    return link.getId() != null || count >= 2 || (count == 1 && atom(link.getValues().get(0)));
  }

  private static void write(
      Link link, String pad, String indent, boolean underName, List<String> lines) {
    List<Link> values = link.getValues();
    if (!lineHolds(link, values.size())
        || (underName && link.getId() == null && values.size() == 1)) {
      lines.add(pad + link.format(false));
      return;
    }
    int count = values.size();
    while (count > 0 && canNest(values.get(count - 1))) count--;
    while (count < values.size() && !lineHolds(link, count)) count++;
    List<String> parts = new ArrayList<>();
    if (link.getId() != null) parts.add(Link.escapeReference(link.getId()) + ":");
    for (Link value : values.subList(0, count)) {
      parts.add(atom(value) ? Link.escapeReference(value.getId()) : value.format(false));
    }
    lines.add(pad + String.join(" ", parts));
    for (Link value : values.subList(count, values.size())) {
      write(value, pad + indent, indent, underName || (link.getId() != null && count == 0), lines);
    }
  }
}
