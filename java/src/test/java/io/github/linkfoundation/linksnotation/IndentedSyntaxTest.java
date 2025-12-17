package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Tests for indented syntax parsing. */
class IndentedSyntaxTest {

  private Parser parser;

  @BeforeEach
  void setUp() {
    parser = new Parser();
  }

  @Test
  void testIndentedIdWithValues() throws ParseException {
    String input = "parent:\n  child1\n  child2";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("parent", result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
    assertEquals("child1", result.get(0).getValues().get(0).getId());
    assertEquals("child2", result.get(0).getValues().get(1).getId());
  }

  @Test
  void testIndentedIdWithThreeValues() throws ParseException {
    String input = "triplet:\n  papa\n  loves\n  mama";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("triplet", result.get(0).getId());
    assertEquals(3, result.get(0).getValues().size());
    assertEquals("papa", result.get(0).getValues().get(0).getId());
    assertEquals("loves", result.get(0).getValues().get(1).getId());
    assertEquals("mama", result.get(0).getValues().get(2).getId());
  }

  @Test
  void testIndentedIdWithNumberId() throws ParseException {
    String input = "3:\n  papa\n  loves\n  mama";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("3", result.get(0).getId());
    assertEquals(3, result.get(0).getValues().size());
  }

  @Test
  void testBasicIndentation() throws ParseException {
    String input = "parent\n  child1\n  child2";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() >= 1);
  }

  @Test
  void testNestedIndentation() throws ParseException {
    String input = "grandparent\n  parent\n    child";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() >= 1);
  }

  @Test
  void testMixedIndentedAndInline() throws ParseException {
    // When a parenthesized link is used as a child in indented syntax,
    // the innermost value is extracted as the value (consistent with Python)
    String input = "parent:\n  (child: value)";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("parent", result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
    // The child is the innermost reference "value"
    Link childLink = result.get(0).getValues().get(0);
    assertEquals("value", childLink.getId());
  }

  @Test
  void testMultipleIndentedLinks() throws ParseException {
    String input = "first:\n  a\n  b\nsecond:\n  c\n  d";
    List<Link> result = parser.parse(input);
    assertEquals(2, result.size());
    assertEquals("first", result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
    assertEquals("second", result.get(1).getId());
    assertEquals(2, result.get(1).getValues().size());
  }

  @Test
  void testIndentedWithQuotedValues() throws ParseException {
    String input = "parent:\n  \"value with spaces\"\n  'another value'";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("parent", result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
    assertEquals("value with spaces", result.get(0).getValues().get(0).getId());
    assertEquals("another value", result.get(0).getValues().get(1).getId());
  }

  @Test
  void testIndentedSingleValue() throws ParseException {
    String input = "parent:\n  single";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("parent", result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
    assertEquals("single", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testPreservesReadmeExample() throws ParseException {
    // Example from README: 3:\n  papa\n  loves\n  mama is equivalent to (3: papa loves mama)
    String indented = "3:\n  papa\n  loves\n  mama";
    String inline = "(3: papa loves mama)";

    List<Link> indentedResult = parser.parse(indented);
    List<Link> inlineResult = parser.parse(inline);

    assertEquals(1, indentedResult.size());
    assertEquals(1, inlineResult.size());
    assertEquals(inlineResult.get(0).getId(), indentedResult.get(0).getId());
    assertEquals(inlineResult.get(0).getValues().size(), indentedResult.get(0).getValues().size());
  }
}
