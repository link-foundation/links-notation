package io.github.linkfoundation.linksnotation;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Container for grouping related links.
 *
 * <p>Provides functionality to manage and format a collection of links.
 */
public class LinksGroup {

  private final List<Link> links;

  /**
   * Creates a new LinksGroup with the given links.
   *
   * @param links the list of links (can be null)
   */
  public LinksGroup(List<Link> links) {
    this.links = links != null ? new ArrayList<>(links) : new ArrayList<>();
  }

  /** Creates an empty LinksGroup. */
  public LinksGroup() {
    this.links = new ArrayList<>();
  }

  /**
   * Gets the list of links in this group.
   *
   * @return unmodifiable list of links
   */
  public List<Link> getLinks() {
    return Collections.unmodifiableList(links);
  }

  /**
   * Adds a link to this group.
   *
   * @param link the link to add
   */
  public void add(Link link) {
    if (link != null) {
      links.add(link);
    }
  }

  /**
   * Gets the number of links in this group.
   *
   * @return the size of the group
   */
  public int size() {
    return links.size();
  }

  /**
   * Checks if this group is empty.
   *
   * @return true if the group contains no links
   */
  public boolean isEmpty() {
    return links.isEmpty();
  }

  /**
   * Formats the group as a string.
   *
   * @return formatted string representation
   */
  public String format() {
    return format(false);
  }

  /**
   * Formats the group as a string.
   *
   * @param lessParentheses if true, omit parentheses where safe
   * @return formatted string representation
   */
  public String format(boolean lessParentheses) {
    return Link.formatLinks(links, lessParentheses);
  }

  @Override
  public String toString() {
    return format();
  }
}
