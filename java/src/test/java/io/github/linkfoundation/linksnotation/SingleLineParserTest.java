package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Tests for single-line parsing functionality. */
class SingleLineParserTest {

  private Parser parser;

  @BeforeEach
  void setUp() {
    parser = new Parser();
  }

  @Test
  void testSingleLink() throws ParseException {
    String source = "(address: source target)";
    List<Link> links = parser.parse(source);
    String target = Link.formatLinks(links);
    assertEquals(source, target);
  }

  @Test
  void testTripletSingleLink() throws ParseException {
    String source = "(papa has car)";
    List<Link> links = parser.parse(source);
    String target = Link.formatLinks(links);
    assertEquals(source, target);
  }

  @Test
  void testBugTest1() throws ParseException {
    String source = "(ignore conan-center-index repository)";
    List<Link> links = parser.parse(source);
    String target = Link.formatLinks(links);
    assertEquals(source, target);
  }

  @Test
  void testQuotedReferences() throws ParseException {
    String source = "(a: 'b' \"c\")";
    String expected = "(a: b c)";
    List<Link> links = parser.parse(source);
    String formattedLinks = Link.formatLinks(links);
    assertEquals(expected, formattedLinks);
  }

  @Test
  void testQuotedReferencesWithSpaces() throws ParseException {
    String source = "('a a': 'b b' \"c c\")";
    // Multi-word IDs are formatted without quotes in parenthesized form (issue #184)
    String expected = "(a a: 'b b' 'c c')";
    List<Link> links = parser.parse(source);
    String formattedLinks = Link.formatLinks(links);
    assertEquals(expected, formattedLinks);
  }

  @Test
  void testParseSimpleReference() throws ParseException {
    String input = "test";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertNull(result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
    assertEquals("test", result.get(0).getValues().get(0).getId());
    assertTrue(result.get(0).getValues().get(0).getValues().isEmpty());
  }

  @Test
  void testParseReferenceWithColonAndValues() throws ParseException {
    String input = "parent: child1 child2";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("parent", result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
    assertEquals("child1", result.get(0).getValues().get(0).getId());
    assertEquals("child2", result.get(0).getValues().get(1).getId());
  }

  @Test
  void testParseMultilineLink() throws ParseException {
    String input = "(parent: child1 child2)";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("parent", result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
  }

  @Test
  void testParseQuotedReferencesValues() throws ParseException {
    String input = "\"has space\" 'has:colon'";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertNull(result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
    assertEquals("has space", result.get(0).getValues().get(0).getId());
    assertEquals("has:colon", result.get(0).getValues().get(1).getId());
    // Ensure formatting matches C# expectation
    assertEquals("('has space' 'has:colon')", Link.formatLinks(result));
  }

  @Test
  void testSingleLineWithId() throws ParseException {
    String input = "id: value1 value2";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
  }

  @Test
  void testMultiLineLinkWithId() throws ParseException {
    String input = "(id: value1 value2)";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
  }

  @Test
  void testSingletLink() throws ParseException {
    String input = "(singlet)";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertNull(result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
    assertEquals("singlet", result.get(0).getValues().get(0).getId());
    assertTrue(result.get(0).getValues().get(0).getValues().isEmpty());
  }

  @Test
  void testValueLink() throws ParseException {
    String input = "(value1 value2 value3)";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
  }

  @Test
  void testQuotedReferencesInLink() throws ParseException {
    String input = "(\"id with spaces\": \"value with spaces\")";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
  }

  @Test
  void testSingleQuotedReferences() throws ParseException {
    String input = "('id': 'value')";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
  }

  @Test
  void testNestedLinks() throws ParseException {
    String input = "(outer: (inner: value))";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
  }

  @Test
  void testSpecialCharactersInQuotes() throws ParseException {
    String input = "(\"key:with:colons\": \"value(with)parens\")";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);

    input = "('key with spaces': 'value: with special chars')";
    result = parser.parse(input);
    assertTrue(result.size() > 0);
  }

  @Test
  void testDeeplyNested() throws ParseException {
    String input = "(a: (b: (c: (d: (e: value)))))";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
  }

  @Test
  void testHyphenatedIdentifiers() throws ParseException {
    String input = "(conan-center-index: repository info)";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
  }

  @Test
  void testMultipleWordsInQuotes() throws ParseException {
    String input = "(\"New York\": city state)";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
    assertEquals("New York", result.get(0).getId());
  }

  @Test
  void testSimpleRef() throws ParseException {
    String input = "simple_ref";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
  }

  @Test
  void testSimpleReferenceParser() throws ParseException {
    String input = "hello";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertNull(result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
    assertEquals("hello", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testQuotedReferenceParser() throws ParseException {
    String input = "\"hello world\"";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertNull(result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
    assertEquals("hello world", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testSingletLinkParser() throws ParseException {
    String input = "(singlet)";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertNull(result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
    assertEquals("singlet", result.get(0).getValues().get(0).getId());
    assertTrue(result.get(0).getValues().get(0).getValues().isEmpty());
  }

  @Test
  void testValueLinkParser() throws ParseException {
    String input = "(a b c)";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertNull(result.get(0).getId());
    assertEquals(3, result.get(0).getValues().size());
  }

  @Test
  void testQuotedReferencesWithSpacesInLink() throws ParseException {
    String input = "(id: \"value with spaces\")";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("id", result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
    assertEquals("value with spaces", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testSingleLineWithoutId() throws ParseException {
    String input = "(value1 value2)";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertNull(result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
  }

  @Test
  void testLinkWithId() throws ParseException {
    String input = "(id: a b c)";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("id", result.get(0).getId());
    assertEquals(3, result.get(0).getValues().size());
  }

  @Test
  void testQuotedReference() throws ParseException {
    String input = "\"quoted value\"";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertNull(result.get(0).getId());
    assertEquals(1, result.get(0).getValues().size());
    assertEquals("quoted value", result.get(0).getValues().get(0).getId());
  }

  @Test
  void testQuotedReferencesWithSpecialChars() throws ParseException {
    String input = "(\"special:char\" \"another@char\")";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertNull(result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
    assertEquals("special:char", result.get(0).getValues().get(0).getId());
    assertEquals("another@char", result.get(0).getValues().get(1).getId());
  }

  @Test
  void testSimpleReference() throws ParseException {
    String input = "simplereference";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
  }

  @Test
  void testSingleLineLink() throws ParseException {
    String input = "id: value1 value2";
    List<Link> result = parser.parse(input);
    assertEquals(1, result.size());
    assertEquals("id", result.get(0).getId());
    assertEquals(2, result.get(0).getValues().size());
  }

  @Test
  void testSingleLineWithIdField() throws ParseException {
    String input = "myid: val1 val2";
    List<Link> result = parser.parse(input);
    assertTrue(result.size() > 0);
    assertEquals("myid", result.get(0).getId());
  }
}
