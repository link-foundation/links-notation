package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Multi-Reference Feature Tests (Issue #184)
 *
 * <p>Tests for multi-word references without quotes:
 *
 * <ul>
 *   <li>(some example: some example is a link)
 *   <li>ID as multi-word string: "some example"
 * </ul>
 */
public class MultiRefTest {

  @Test
  public void testParsesTwoWordMultiReferenceId() throws ParseException {
    Parser parser = new Parser();
    List<Link> result = parser.parse("(some example: value)");
    assertEquals(1, result.size());
    // Multi-word ID should be joined with space
    assertEquals("some example", result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
  }

  @Test
  public void testParsesThreeWordMultiReferenceId() throws ParseException {
    Parser parser = new Parser();
    List<Link> result = parser.parse("(new york city: value)");
    assertEquals(1, result.size());
    assertEquals("new york city", result.get(0).getId());
  }

  @Test
  public void testSingleWordIdBackwardCompatible() throws ParseException {
    Parser parser = new Parser();
    List<Link> result = parser.parse("(papa: value)");
    assertEquals(1, result.size());
    assertEquals("papa", result.get(0).getId());
  }

  @Test
  public void testQuotedMultiWordIdBackwardCompatible() throws ParseException {
    Parser parser = new Parser();
    List<Link> result = parser.parse("('some example': value)");
    assertEquals(1, result.size());
    // Quoted ID should be preserved as-is
    assertEquals("some example", result.get(0).getId());
  }

  @Test
  public void testFormatMultiReferenceId() throws ParseException {
    Parser parser = new Parser();
    List<Link> result = parser.parse("(some example: value)");
    String formatted = Link.formatLinks(result);
    // Multi-reference IDs are formatted with quotes (normalized form)
    assertEquals("('some example': value)", formatted);
  }

  @Test
  public void testRoundTripMultiReference() throws ParseException {
    Parser parser = new Parser();
    String input = "(new york city: great)";
    List<Link> result = parser.parse(input);
    String formatted = Link.formatLinks(result);
    // Round-trip normalizes multi-word ID to quoted form
    assertEquals("('new york city': great)", formatted);
  }

  @Test
  public void testIndentedSyntaxMultiReference() throws ParseException {
    Parser parser = new Parser();
    String input = "some example:\n  value1\n  value2";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("some example", result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
  }

  @Test
  public void testValuesIncludeMultiReferenceContext() throws ParseException {
    // When the same multi-word pattern appears in values,
    // they are parsed as separate words (no context-aware grouping)
    Parser parser = new Parser();
    String input = "(some example: some example is a link)";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("some example", result.get(0).getId());
    // Values should be separate: "some", "example", "is", "a", "link"
    assertEquals(5, result.get(0).getValues().size());
  }

  @Test
  public void testBackwardCompatibilitySingleLine() throws ParseException {
    Parser parser = new Parser();
    List<Link> result = parser.parse("papa: loves mama");
    assertEquals(1, result.size());
    assertEquals("papa", result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
  }

  @Test
  public void testBackwardCompatibilityParenthesized() throws ParseException {
    Parser parser = new Parser();
    List<Link> result = parser.parse("(papa: loves mama)");
    assertEquals(1, result.size());
    assertEquals("papa", result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
  }

  @Test
  public void testBackwardCompatibilityNested() throws ParseException {
    Parser parser = new Parser();
    List<Link> result = parser.parse("(outer: (inner: value))");
    assertEquals(1, result.size());
    assertEquals("outer", result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
    assertEquals("inner", result.get(0).getValues().get(0).getId());
  }

  @Test
  public void testMultiRefWithMultipleValues() throws ParseException {
    Parser parser = new Parser();
    List<Link> result = parser.parse("(some example: one two three)");
    assertEquals(1, result.size());
    assertEquals("some example", result.get(0).getId());
    assertEquals(3, result.get(0).getValues().size());
    assertEquals("one", result.get(0).getValues().get(0).getId());
    assertEquals("two", result.get(0).getValues().get(1).getId());
    assertEquals("three", result.get(0).getValues().get(2).getId());
  }
}
