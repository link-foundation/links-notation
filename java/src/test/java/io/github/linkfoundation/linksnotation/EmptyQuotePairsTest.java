package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Issue #443: an empty quoted value at the end of a line must not swallow the lines after it.
 *
 * <p>An even run of quotes ({@code ""}, {@code ''}, {@code """"}, ...) followed by whitespace up to
 * the end of its line is the empty reference, however later lines continue. A run followed directly
 * by text ({@code ""x}) still opens a reference that may reach across lines, so multiline
 * references keep working.
 */
class EmptyQuotePairsTest {

  private final Parser parser = new Parser();

  private String parses(String document) throws ParseException {
    return LinkTree.of(parser.parse(document));
  }

  private String formatted(String document) throws ParseException {
    return Link.formatLinks(parser.parse(document));
  }

  @Test
  void emptyValuesOnConsecutiveIndentedLinesStayOnTheirLines() throws ParseException {
    String expected = "[[\"root\",[null,[\"a\"],[\"\"]],[null,[\"b\"],[\"\"]]]]";
    assertEquals(expected, parses("root:\n  a \"\"\n  b \"\"\n"));
    assertEquals(expected, parses("root:\n  a ''\n  b ''\n"));
    assertEquals(expected, parses("root:\n  a \"\"\n  b \"\""));
  }

  @Test
  void anEmptyValueBeforeAQuotedValueKeepsBothValues() throws ParseException {
    assertEquals(
        "[[\"root\",[null,[\"a\"],[\"\"]],[null,[\"b\"],[\"x y\"]]]]",
        parses("root:\n  a \"\"\n  b \"x y\"\n"));
  }

  @Test
  void anEmptyValueAtTheEndOfATopLevelLineStaysOnItsLine() throws ParseException {
    assertEquals("(a ~1{})\n(b ~1{})", formatted("a \"\"\nb \"\"\n"));
    assertEquals("(a ~1{})\n(b ~1{})", formatted("a \"\" \nb \"\"\n"));
    assertEquals("(a ~1{})", formatted("a \"\""));
  }

  @Test
  void aLongerEvenRunAtTheEndOfALineIsEmptyToo() throws ParseException {
    assertEquals("(a ~1{})\n(b ~1{})", formatted("a \"\"\"\"\nb \"\"\"\"\n"));
  }

  @Test
  void doubledQuotesThatNothingClosesAreTheEmptyReference() throws ParseException {
    assertEquals("[[\"a\",[\"\"]]]", parses("(a: \"\"\"\")"));
    assertEquals("[[\"a\",[\"\"]]]", parses("(a: \"\"\"\"\"\")"));
  }

  @Test
  void aSingleQuoteCharacterIsWrittenBetweenTheOtherQuotes() throws ParseException {
    assertEquals("[[\"a\",[\"\\\"\"]]]", parses("(a: '\"')"));
    assertEquals("[[\"a\",[\"'\"]]]", parses("(a: \"'\")"));
    assertEquals("[[\"a\",[\"\\\"\"]]]", parses("(a: `\"`)"));
  }

  @Test
  void anEvenRunFollowedByTextStillOpensAMultilineReference() throws ParseException {
    assertEquals("[[null,[\"a\"],[\"x\\u000ay\"]]]", parses("a \"\"x\ny\"\"\n"));
  }

  @Test
  void anEvenRunStillHoldsWhatTheSameLineCloses() throws ParseException {
    assertEquals("[[null,[\"x\"],[\" \\\" \"]]]", parses("(x \"\" \" \"\")"));
    assertEquals("[[null,[\"a\"],[\" b \"]]]", parses("a \"\" b \"\""));
  }

  @Test
  void theStreamEmitsALineThatEndsWithAnEmptyValueAtOnce() throws ParseException {
    StreamParser stream = new StreamParser();
    List<Link> emitted = new ArrayList<>();
    String input = "a \"\"\nb \"\"\nc\n";
    for (int index = 0; index < input.length(); index++) {
      emitted.addAll(stream.write(input.substring(index, index + 1)));
    }
    assertEquals("(a ~1{})\n(b ~1{})", Link.formatLinks(emitted));
    assertEquals("(a ~1{})\n(b ~1{})\n(c)", Link.formatLinks(stream.finish()));
  }
}
