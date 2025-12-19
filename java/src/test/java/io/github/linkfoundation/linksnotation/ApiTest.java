package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** API tests for common usage patterns. */
class ApiTest {

  private Parser parser;

  @BeforeEach
  void setUp() {
    parser = new Parser();
  }

  @Test
  void testReadmeExample() throws ParseException {
    String input = "papa (lovesMama: loves mama)";
    List<Link> links = parser.parse(input);
    assertTrue(links.size() >= 1);
  }

  @Test
  void testFullReadmeExample() throws ParseException {
    String input =
        "papa (lovesMama: loves mama)\nson lovesMama\ndaughter lovesMama\nall (love mama)";
    List<Link> links = parser.parse(input);
    assertTrue(links.size() >= 4);
  }

  @Test
  void testTripletExample() throws ParseException {
    String input = "papa has car\nmama has house\n(papa and mama) are happy";
    List<Link> links = parser.parse(input);
    assertEquals(3, links.size());
  }

  @Test
  void testEmptyInput() throws ParseException {
    List<Link> result = parser.parse("");
    assertTrue(result.isEmpty());
  }

  @Test
  void testWhitespaceOnly() throws ParseException {
    List<Link> result = parser.parse("   \n\t\n   ");
    assertTrue(result.isEmpty());
  }

  @Test
  void testNullInputThrowsException() {
    assertThrows(IllegalArgumentException.class, () -> parser.parse(null));
  }

  @Test
  void testInputSizeLimit() {
    Parser smallParser = new Parser(100, 1000);
    String largeInput = "x".repeat(200);
    assertThrows(IllegalArgumentException.class, () -> smallParser.parse(largeInput));
  }

  @Test
  void testParseAndFormatRoundTrip() throws ParseException {
    String original = "(id: value1 value2)";
    List<Link> links = parser.parse(original);
    String formatted = Link.formatLinks(links);
    assertEquals(original, formatted);
  }

  @Test
  void testParseAndFormatRoundTripMultiple() throws ParseException {
    String original = "(a: b c)\n(d: e f)";
    List<Link> links = parser.parse(original);
    String formatted = Link.formatLinks(links);
    assertEquals(original, formatted);
  }

  @Test
  void testCreateLinkProgrammatically() {
    Link child1 = new Link("child1");
    Link child2 = new Link("child2");
    Link parent = new Link("parent", Arrays.asList(child1, child2));

    assertEquals("(parent: child1 child2)", parent.toString());
  }

  @Test
  void testLinksGroupUsage() throws ParseException {
    String input = "(a: b)\n(c: d)";
    List<Link> links = parser.parse(input);
    LinksGroup group = new LinksGroup(links);

    assertEquals(2, group.size());
    assertEquals("(a: b)\n(c: d)", group.format());
  }

  @Test
  void testAccessLinkProperties() throws ParseException {
    String input = "(parent: child1 child2)";
    List<Link> links = parser.parse(input);

    assertEquals(1, links.size());
    Link link = links.get(0);
    assertEquals("parent", link.getId());
    assertEquals(2, link.getValues().size());
    assertEquals("child1", link.getValues().get(0).getId());
    assertEquals("child2", link.getValues().get(1).getId());
  }

  @Test
  void testNestedLinkAccess() throws ParseException {
    String input = "(outer: (inner: value))";
    List<Link> links = parser.parse(input);

    Link outer = links.get(0);
    assertEquals("outer", outer.getId());
    Link inner = outer.getValues().get(0);
    assertEquals("inner", inner.getId());
    assertEquals("value", inner.getValues().get(0).getId());
  }

  @Test
  void testFormatWithLessParentheses() throws ParseException {
    String input = "(id: value1 value2)";
    List<Link> links = parser.parse(input);
    String formatted = Link.formatLinks(links, true);
    assertEquals("id: value1 value2", formatted);
  }

  @Test
  void testLinkEquality() throws ParseException {
    String input = "(a: b c)";
    List<Link> links1 = parser.parse(input);
    List<Link> links2 = parser.parse(input);

    assertEquals(links1.get(0), links2.get(0));
  }

  @Test
  void testLinkSimplify() throws ParseException {
    String input = "(wrapper: (actual: value))";
    List<Link> links = parser.parse(input);
    Link wrapper = links.get(0);
    Link simplified = wrapper.simplify();
    // Simplify returns the inner value if there's only one
    assertNotNull(simplified);
  }

  @Test
  void testLinkCombine() {
    Link a = new Link("a");
    Link b = new Link("b");
    Link combined = a.combine(b);

    assertNull(combined.getId());
    assertEquals(2, combined.getValues().size());
    assertEquals(a, combined.getValues().get(0));
    assertEquals(b, combined.getValues().get(1));
  }
}
