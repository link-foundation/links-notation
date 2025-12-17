package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Tests for nested structure parsing. */
class NestedParserTest {

  private Parser parser;

  @BeforeEach
  void setUp() {
    parser = new Parser();
  }

  @Test
  void testNestedLink() throws ParseException {
    String input = "(outer: (inner: value))";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("outer", result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
    Link inner = result.get(0).getValues().get(0);
    assertEquals("inner", inner.getId());
    assertEquals(1, inner.getValues().size());
    assertEquals("value", inner.getValues().get(0).getId());
  }

  @Test
  void testDoubleNestedLink() throws ParseException {
    String input = "(a: (b: (c: d)))";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("a", result.get(0).getId());
    Link b = result.get(0).getValues().get(0);
    assertEquals("b", b.getId());
    Link c = b.getValues().get(0);
    assertEquals("c", c.getId());
    assertEquals("d", c.getValues().get(0).getId());
  }

  @Test
  void testNestedLinkNoId() throws ParseException {
    String input = "((a b) (c d))";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertNull(result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
  }

  @Test
  void testDeeplyNestedStructure() throws ParseException {
    String input = "(a: (b: (c: (d: (e: f)))))";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    Link current = result.get(0);
    assertEquals("a", current.getId());
    current = current.getValues().get(0);
    assertEquals("b", current.getId());
    current = current.getValues().get(0);
    assertEquals("c", current.getId());
    current = current.getValues().get(0);
    assertEquals("d", current.getId());
    current = current.getValues().get(0);
    assertEquals("e", current.getId());
    assertEquals("f", current.getValues().get(0).getId());
  }

  @Test
  void testMixedNestedAndSimple() throws ParseException {
    String input = "(outer: simple (nested: value))";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("outer", result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
    assertEquals("simple", result.get(0).getValues().get(0).getId());
    Link nested = result.get(0).getValues().get(1);
    assertEquals("nested", nested.getId());
  }

  @Test
  void testNestedLinkWithQuotedValues() throws ParseException {
    String input = "(outer: (inner: \"value with spaces\"))";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    Link inner = result.get(0).getValues().get(0);
    assertEquals("value with spaces", inner.getValues().get(0).getId());
  }

  @Test
  void testMultipleTopLevelLinks() throws ParseException {
    String input = "(a: b)\n(c: d)";
    List<Link> result = parser.parse(input);
    assertEquals(2, result.size());
    assertEquals("a", result.get(0).getId());
    assertEquals("c", result.get(1).getId());
  }

  @Test
  void testComplexStructure() throws ParseException {
    String input =
        "(config: (database: (host: localhost) (port: 5432)) (cache: enabled))";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("config", result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());

    Link database = result.get(0).getValues().get(0);
    assertEquals("database", database.getId());
    assertEquals(2, database.getValues().size());

    Link cache = result.get(0).getValues().get(1);
    assertEquals("cache", cache.getId());
    assertEquals("enabled", cache.getValues().get(0).getId());
  }
}
