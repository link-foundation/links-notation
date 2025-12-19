package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Tests for multi-quote string parsing. */
class MultiQuoteParserTest {

  private Parser parser;

  @BeforeEach
  void setUp() {
    parser = new Parser();
  }

  @Test
  void testSingleQuoteString() throws ParseException {
    String input = "'hello world'";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("hello world", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testDoubleQuoteString() throws ParseException {
    String input = "\"hello world\"";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("hello world", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testBacktickQuoteString() throws ParseException {
    String input = "`hello world`";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("hello world", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testDoubleQuoteWithDoubleInside() throws ParseException {
    String input = "\"\"inside double\"\"";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("inside double", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testTripleQuoteString() throws ParseException {
    String input = "'''triple quoted'''";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("triple quoted", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testTripleDoubleQuoteString() throws ParseException {
    String input = "\"\"\"triple double quoted\"\"\"";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("triple double quoted", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testQuadrupleQuoteString() throws ParseException {
    String input = "''''quad quoted''''";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("quad quoted", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testEscapedQuotesInDoubleQuote() throws ParseException {
    // For N=1, escape is 2 quotes which become 1 quote
    String input = "\"say \"\"hello\"\"\"";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("say \"hello\"", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testQuotedInLinkContext() throws ParseException {
    String input = "(id: 'value with spaces')";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("id", result.get(0).getId());
    assertEquals("value with spaces", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testMixedQuotesInLink() throws ParseException {
    String input = "(id: 'single' \"double\" `backtick`)";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals(3, result.get(0).getValues().size());
    assertEquals("single", result.get(0).getValues().get(0).getId());
    assertEquals("double", result.get(0).getValues().get(1).getId());
    assertEquals("backtick", result.get(0).getValues().get(2).getId());
  }

  @Test
  void testQuotedIdInLink() throws ParseException {
    String input = "('id with spaces': value)";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("id with spaces", result.get(0).getId());
  }

  @Test
  void testQuotedWithColonInside() throws ParseException {
    String input = "'key:value'";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("key:value", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testQuotedWithParenthesesInside() throws ParseException {
    String input = "'(test)'";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("(test)", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testEmptyQuotes() throws ParseException {
    // Empty quotes are treated as literal strings (consistent with Python)
    String input = "''";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("''", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testEmptyDoubleQuotes() throws ParseException {
    // Empty quotes are treated as literal strings (consistent with Python)
    String input = "\"\"";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("\"\"", result.get(0).getValues().get(0).getId());
  }
}
