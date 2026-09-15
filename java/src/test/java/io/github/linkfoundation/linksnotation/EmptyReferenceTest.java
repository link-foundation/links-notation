package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Conformance tests for the empty reference.
 *
 * <p>https://github.com/link-foundation/links-notation/issues/288
 *
 * <p>A bare delimiter pair is the empty reference. The three delimiters {@code "}, {@code '} and
 * {@code `} behave identically, and every longer n-quote run keeps the meaning it already had. The
 * table below is shared with the Rust, JavaScript, Python, Go, C# and PHP suites, so a document
 * written by one implementation reads the same in all of them.
 */
class EmptyReferenceTest {

  private Parser parser;

  @BeforeEach
  void setUp() {
    parser = new Parser();
  }

  /**
   * Render a parsed node unambiguously: every reference is wrapped in angle brackets so an empty
   * one is visible as {@code <>}.
   */
  private static String render(Link node) {
    if (node.getValues() == null || node.getValues().isEmpty()) {
      return "<" + (node.getId() == null ? "" : node.getId()) + ">";
    }
    String head = node.getId() == null ? "" : "<" + node.getId() + ">: ";
    return "("
        + head
        + node.getValues().stream().map(EmptyReferenceTest::render).collect(Collectors.joining(" "))
        + ")";
  }

  private String rendered(String source) throws ParseException {
    List<Link> links = parser.parse(source);
    return links.stream().map(EmptyReferenceTest::render).collect(Collectors.joining("\n"));
  }

  private void assertParsesAs(String source, String expected) throws ParseException {
    assertEquals(expected, rendered(source), "Parsing " + source);
  }

  @Test
  void bareDelimiterPairIsTheEmptyReference() throws ParseException {
    assertParsesAs("(a \"\" b)", "(<a> <> <b>)");
  }

  @Test
  void everyDelimiterStyleYieldsTheSameEmptyReference() throws ParseException {
    assertParsesAs("(a \"\" b)", "(<a> <> <b>)");
    assertParsesAs("(a '' b)", "(<a> <> <b>)");
    assertParsesAs("(a `` b)", "(<a> <> <b>)");
  }

  @Test
  void adjacentEmptyReferencesStaySeparate() throws ParseException {
    assertParsesAs("(a \"\" \"\" b)", "(<a> <> <> <b>)");
    assertParsesAs("(a '' '' b)", "(<a> <> <> <b>)");
    assertParsesAs("(a `` `` b)", "(<a> <> <> <b>)");
    assertParsesAs("(a \"\"  \"\" b)", "(<a> <> <> <b>)");
  }

  @Test
  void nestedEmptyReferencesParse() throws ParseException {
    assertParsesAs("(\"\" (\"\" 1))", "(<> (<> <1>))");
    assertParsesAs("(\"\" ('' 1))", "(<> (<> <1>))");
    assertParsesAs("(\"x\" (\"\" 1))", "(<x> (<> <1>))");
    assertParsesAs("(\"\" (\"x\" 1))", "(<> (<x> <1>))");
    assertParsesAs("(\"\" x (\"\" 1))", "(<> <x> (<> <1>))");
    assertParsesAs("(\"\" 1 (\"\" 1))", "(<> <1> (<> <1>))");
  }

  @Test
  void emptyReferenceIsValidAsAnId() throws ParseException {
    assertParsesAs("(\"\": 1)", "(<>: <1>)");
    assertParsesAs("(o: (\"\" (o: (\"\" 1))))", "(<o>: (<> (<o>: (<> <1>))))");
  }

  @Test
  void nQuoteDelimitedBodiesAreUnchanged() throws ParseException {
    // A run that encloses a substantive body keeps its n-quote meaning.
    assertParsesAs("(a \"\"x\"\" b)", "(<a> <x> <b>)");
    assertParsesAs("(x \"\" \" \"\")", "(<x> < \" >)");
    assertParsesAs("(x ' \" ')", "(<x> < \" >)");
    // An n-quote-delimited empty is still empty.
    assertParsesAs("(a \"\"\"\" b)", "(<a> <> <b>)");
  }

  @Test
  void aSingleSpaceStillReadsAsASpace() throws ParseException {
    assertParsesAs("(a \" \" b)", "(<a> < > <b>)");
  }

  @Test
  void emptyReferenceSurvivesARoundTrip() throws ParseException {
    String[] sources = {
      "(a \"\" b)", "(a \"\" \"\" b)", "(\"\" (\"\" 1))", "(\"\": 1)", "(o: (\"\" (o: (\"\" 1))))",
    };
    for (String source : sources) {
      String formatted = Link.formatLinks(parser.parse(source));
      assertEquals(formatted, Link.formatLinks(parser.parse(formatted)), source);
    }
  }

  @Test
  void emptyReferenceIsWrittenAsADelimiterPair() throws ParseException {
    assertEquals("(a \"\" b)", Link.formatLinks(parser.parse("(a \"\" b)")));
  }
}
