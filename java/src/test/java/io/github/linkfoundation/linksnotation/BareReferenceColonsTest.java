package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/**
 * Issue #444: colons inside a bare reference.
 *
 * <p>A run of colons between two characters of a bare reference belongs to the reference, so times,
 * URLs and qualified names need no quotes. A colon that is followed by whitespace, a parenthesis, a
 * quote or a versioned literal still separates an ID from its values, and a bare reference never
 * starts or ends with a colon.
 */
class BareReferenceColonsTest {

  private final Parser parser = new Parser();

  private String parses(String document) throws ParseException {
    return LinkTree.of(parser.parse(document));
  }

  private void same(String document, String expected) throws ParseException {
    assertEquals(parses(expected), parses(document), "Parsing " + document);
  }

  @Test
  void aTimeIsOneReference() throws ParseException {
    same("time 12:30\n", "time '12:30'\n");
    same("root:\n  time 12:30\n", "root:\n  time '12:30'\n");
  }

  @Test
  void aUrlIsOneReference() throws ParseException {
    same("url https://example.com/a#b\n", "url 'https://example.com/a#b'\n");
  }

  @Test
  void aQualifiedNameIsOneReference() throws ParseException {
    same("type std::string\n", "type 'std::string'\n");
  }

  @Test
  void anIdMayHoldAColon() throws ParseException {
    same("a:b: c\n", "'a:b': c\n");
    same("(a:b: c)", "('a:b': c)");
    same("a:b\n", "'a:b'\n");
  }

  @Test
  void aColonBeforeAValueThatCannotContinueAReferenceSeparates() throws ParseException {
    same("a: b\n", "(a: b)");
    same("a:\"b c\"\n", "(a: 'b c')");
    same("a:'b'\n", "(a: b)");
    same("a:(b c)\n", "(a: (b c))");
    same("a:~1{62}\n", "(a: b)");
    same("a :b\n", "(a: b)");
  }

  @Test
  void aValueOfTheLinkMayHoldAColon() throws ParseException {
    same("a: b:c\n", "(a: 'b:c')");
  }

  @Test
  void aReferenceWithColonsIsWrittenWithQuotes() throws ParseException {
    assertEquals("(time '12:30')", Link.formatLinks(parser.parse("time 12:30\n")));
  }

  @Test
  void theReadmeExampleReadsTimesUrlsAndQualifiedNames() throws ParseException {
    assertEquals(
        "(time '12:30')\n(url 'https://example.com/a#b')\n('std::string': type)",
        Link.formatLinks(
            parser.parse("time 12:30\nurl https://example.com/a#b\nstd::string: type\n")));
  }

  @Test
  void theConcreteSyntaxTreeKeepsInnerColonsInTheReference() throws ParseException {
    assertEquals(
        "(document (line reference:\"time\" whitespace:\" \" reference:\"12:30\" newline:\"\\n\"))",
        parser.parseCst("time 12:30\n").toSExpression());
  }
}
