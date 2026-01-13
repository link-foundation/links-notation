package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Tests for Link class. */
class LinkTest {

  @Test
  void testCreateEmptyLink() {
    Link link = new Link();
    assertNull(link.getId());
    assertTrue(link.getValues().isEmpty());
  }

  @Test
  void testCreateLinkWithId() {
    Link link = new Link("test");
    assertEquals("test", link.getId());
    assertTrue(link.getValues().isEmpty());
  }

  @Test
  void testCreateLinkWithIdAndValues() {
    List<Link> values = Arrays.asList(new Link("child1"), new Link("child2"));
    Link link = new Link("parent", values);
    assertEquals("parent", link.getId());
    assertEquals(2, link.getValues().size());
  }

  @Test
  void testFormatSimpleLink() {
    Link link = new Link("test");
    assertEquals("(test)", link.toString());
  }

  @Test
  void testFormatLinkWithValues() {
    List<Link> values = Arrays.asList(new Link("child1"), new Link("child2"));
    Link link = new Link("parent", values);
    assertEquals("(parent: child1 child2)", link.toString());
  }

  @Test
  void testFormatLinkWithValuesOnly() {
    List<Link> values = Arrays.asList(new Link("a"), new Link("b"), new Link("c"));
    Link link = new Link((String) null, values);
    assertEquals("(a b c)", link.toString());
  }

  @Test
  void testFormatWithLessParentheses() {
    List<Link> values = Arrays.asList(new Link("child1"), new Link("child2"));
    Link link = new Link("parent", values);
    assertEquals("parent: child1 child2", link.format(true));
  }

  @Test
  void testEscapeReferenceWithSpace() {
    assertEquals("'hello world'", Link.escapeReference("hello world"));
  }

  @Test
  void testEscapeReferenceWithColon() {
    assertEquals("'key:value'", Link.escapeReference("key:value"));
  }

  @Test
  void testEscapeReferenceWithParentheses() {
    assertEquals("'(test)'", Link.escapeReference("(test)"));
  }

  @Test
  void testEscapeReferenceSimple() {
    assertEquals("simple", Link.escapeReference("simple"));
  }

  @Test
  void testEscapeReferenceWithSingleQuote() {
    assertEquals("\"it's\"", Link.escapeReference("it's"));
  }

  @Test
  void testEscapeReferenceWithDoubleQuote() {
    assertEquals("'say \"hello\"'", Link.escapeReference("say \"hello\""));
  }

  @Test
  void testEquality() {
    Link link1 = new Link("test");
    Link link2 = new Link("test");
    assertEquals(link1, link2);
  }

  @Test
  void testInequalityDifferentId() {
    Link link1 = new Link("test1");
    Link link2 = new Link("test2");
    assertNotEquals(link1, link2);
  }

  @Test
  void testInequalityDifferentValues() {
    Link link1 = new Link("parent", Arrays.asList(new Link("child1")));
    Link link2 = new Link("parent", Arrays.asList(new Link("child2")));
    assertNotEquals(link1, link2);
  }

  @Test
  void testSimplify() {
    Link link = new Link((String) null, Arrays.asList(new Link("only")));
    Link simplified = link.simplify();
    assertEquals("only", simplified.getId());
  }

  @Test
  void testCombine() {
    Link link1 = new Link("a");
    Link link2 = new Link("b");
    Link combined = link1.combine(link2);
    assertNull(combined.getId());
    assertEquals(2, combined.getValues().size());
  }

  @Test
  void testGetValuesString() {
    List<Link> values = Arrays.asList(new Link("a"), new Link("b"), new Link("c"));
    Link link = new Link("parent", values);
    assertEquals("a b c", link.getValuesString());
  }

  @Test
  void testToLinkOrIdString() {
    Link simpleLink = new Link("test");
    assertEquals("test", simpleLink.toLinkOrIdString());

    List<Link> values = Arrays.asList(new Link("a"), new Link("b"));
    Link linkWithValues = new Link("parent", values);
    assertEquals("(parent: a b)", linkWithValues.toLinkOrIdString());
  }

  @Test
  void testFormatLinks() {
    List<Link> links =
        Arrays.asList(new Link("link1"), new Link("link2", Arrays.asList(new Link("child"))));
    String formatted = Link.formatLinks(links);
    assertEquals("(link1)\n(link2: child)", formatted);
  }

  @Test
  void testFormatLinksEmpty() {
    assertEquals("", Link.formatLinks(null));
    assertEquals("", Link.formatLinks(Arrays.asList()));
  }

  @Test
  void testHashCode() {
    Link link1 = new Link("test");
    Link link2 = new Link("test");
    assertEquals(link1.hashCode(), link2.hashCode());
  }
}
