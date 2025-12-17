package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Tests for LinksGroup class. */
class LinksGroupTest {

  @Test
  void testCreateEmptyGroup() {
    LinksGroup group = new LinksGroup();
    assertTrue(group.isEmpty());
    assertEquals(0, group.size());
  }

  @Test
  void testCreateGroupWithLinks() {
    List<Link> links = Arrays.asList(new Link("a"), new Link("b"));
    LinksGroup group = new LinksGroup(links);
    assertFalse(group.isEmpty());
    assertEquals(2, group.size());
  }

  @Test
  void testCreateGroupWithNull() {
    LinksGroup group = new LinksGroup(null);
    assertTrue(group.isEmpty());
  }

  @Test
  void testAddLink() {
    LinksGroup group = new LinksGroup();
    group.add(new Link("test"));
    assertEquals(1, group.size());
    assertFalse(group.isEmpty());
  }

  @Test
  void testAddNullLink() {
    LinksGroup group = new LinksGroup();
    group.add(null);
    assertTrue(group.isEmpty());
  }

  @Test
  void testGetLinks() {
    List<Link> links = Arrays.asList(new Link("a"), new Link("b"));
    LinksGroup group = new LinksGroup(links);
    assertEquals(2, group.getLinks().size());
  }

  @Test
  void testGetLinksIsUnmodifiable() {
    LinksGroup group = new LinksGroup(Arrays.asList(new Link("a")));
    assertThrows(UnsupportedOperationException.class, () -> group.getLinks().add(new Link("b")));
  }

  @Test
  void testFormat() {
    List<Link> links = Arrays.asList(new Link("a"), new Link("b"));
    LinksGroup group = new LinksGroup(links);
    String formatted = group.format();
    assertEquals("(a)\n(b)", formatted);
  }

  @Test
  void testFormatWithLessParentheses() {
    List<Link> links =
        Arrays.asList(
            new Link("parent", Arrays.asList(new Link("child"))),
            new Link("simple"));
    LinksGroup group = new LinksGroup(links);
    String formatted = group.format(true);
    assertTrue(formatted.contains("parent: child"));
  }

  @Test
  void testToString() {
    List<Link> links = Arrays.asList(new Link("test"));
    LinksGroup group = new LinksGroup(links);
    assertEquals("(test)", group.toString());
  }

  @Test
  void testEmptyGroupFormat() {
    LinksGroup group = new LinksGroup();
    assertEquals("", group.format());
  }
}
