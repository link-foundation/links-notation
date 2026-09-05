package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Conformance tests for line comments.
 *
 * <p>https://github.com/link-foundation/links-notation/issues/301
 *
 * <p>{@code #} starts a comment that runs to the end of the line, unless it sits inside a token or
 * inside a delimited reference. Parsers read comments by default and can be told to treat {@code #}
 * as an ordinary character again. The table below is shared with the Rust, JavaScript, Python, Go,
 * C# and PHP suites, so a document written by one implementation reads the same in all of them.
 */
class CommentsTest {

  private Parser parser;

  @BeforeEach
  void setUp() {
    parser = new Parser();
  }

  /** Render a parsed node unambiguously: every reference is wrapped in angle brackets. */
  private static String render(Link node) {
    if (node.getValues() == null || node.getValues().isEmpty()) {
      return "<" + (node.getId() == null ? "" : node.getId()) + ">";
    }
    String head = node.getId() == null ? "" : "<" + node.getId() + ">: ";
    return "("
        + head
        + node.getValues().stream().map(CommentsTest::render).collect(Collectors.joining(" "))
        + ")";
  }

  private static String renderedWith(Parser parser, String source) throws ParseException {
    List<Link> links = parser.parse(source);
    return links.stream().map(CommentsTest::render).collect(Collectors.joining("\n"));
  }

  private String rendered(String source) throws ParseException {
    return renderedWith(parser, source);
  }

  private void assertParsesAs(String source, String expected) throws ParseException {
    assertEquals(expected, rendered(source), "Parsing " + source);
  }

  @Test
  void aLineThatStartsWithAHashIsAComment() throws ParseException {
    assertParsesAs("# a b\n", "");
  }

  @Test
  void aCommentMayHoldAColon() throws ParseException {
    // The document from #301: prose with a colon used to be read as a link.
    assertParsesAs("# a: b\n", "");
  }

  @Test
  void aCommentMayHoldAnythingAtAll() throws ParseException {
    assertParsesAs("# ) : ( \" ' ` #\n", "");
  }

  @Test
  void aCommentEndsAtTheEndOfItsLine() throws ParseException {
    assertParsesAs("# note\na: b\n", "(<a>: <b>)");
  }

  @Test
  void aCommentMayFollowALink() throws ParseException {
    assertParsesAs("a: b # why\n", "(<a>: <b>)");
  }

  @Test
  void aCommentMayFollowAGroup() throws ParseException {
    assertParsesAs("(a b) # why\n", "(<a> <b>)");
  }

  @Test
  void aCommentNeedsNoClosingNewline() throws ParseException {
    assertParsesAs("a: b # why", "(<a>: <b>)");
  }

  @Test
  void aCommentLineInsideAnIndentedBlockIsSkipped() throws ParseException {
    assertEquals(
        rendered("parent\n  child\n"), rendered("parent\n  # what the child is for\n  child\n"));
  }

  @Test
  void aCommentLineInsideAGroupIsSkipped() throws ParseException {
    assertEquals(rendered("(\n  a\n  b\n)\n"), rendered("(\n  a\n  # why\n  b\n)\n"));
  }

  @Test
  void aLineOfSpacesSeparatesLinksTheWayAnEmptyLineDoes() throws ParseException {
    // Blanking a comment leaves a line of spaces behind, so such a line has to
    // read the way an empty line does.
    assertEquals(rendered("a\n\nb\n"), rendered("a\n   \nb\n"));
  }

  @Test
  void aDocumentOfCommentsAloneHoldsNoLinks() throws ParseException {
    assertParsesAs("# one\n# two\n", "");
  }

  @Test
  void aHashInsideATokenIsAnOrdinaryCharacter() throws ParseException {
    assertParsesAs("issue#1047\n", "(<issue#1047>)");
  }

  @Test
  void aHashThatOpensATokenIsAnOrdinaryCharacter() throws ParseException {
    assertParsesAs("a: b#c\n", "(<a>: <b#c>)");
  }

  @Test
  void aHashInsideADelimitedReferenceIsContent() throws ParseException {
    assertParsesAs("\"# not a comment\" a\n", "(<# not a comment> <a>)");
  }

  @Test
  void aCommentMayFollowADelimitedReference() throws ParseException {
    assertParsesAs("\"a\" # why\n", "(<a>)");
  }

  @Test
  void aHashInsideAMultiLineDelimitedReferenceIsContent() throws ParseException {
    assertParsesAs("\"a # b\nc\" d\n", "(<a # b\nc> <d>)");
  }

  @Test
  void commentsAreOnByDefault() throws ParseException {
    assertParsesAs("# a b\n", "");
  }

  @Test
  void aParserWithoutCommentsKeepsTheHash() throws ParseException {
    assertEquals("(<#> <a> <b>)", renderedWith(new Parser(false), "# a b\n"));
  }

  @Test
  void blankingACommentKeepsTheLengthOfTheDocument() {
    assertEquals("a: b      \n", Comments.stripComments("a: b # why\n"));
    assertEquals("\"# kept\"\n", Comments.stripComments("\"# kept\"\n"));
    assertEquals("issue#1047\n", Comments.stripComments("issue#1047\n"));
    assertTrue(Comments.stripComments("# why\n").startsWith("     "));
  }

  @Test
  void aReferenceThatBeginsWithAHashIsWrittenQuoted() throws ParseException {
    // Without the quotes the document would read as `a` followed by a comment.
    String document =
        Link.formatLinks(List.of(new Link(null, List.of(new Link("a"), new Link("#tag")))));

    assertEquals("(a '#tag')", document);
    assertEquals("(<a> <#tag>)", rendered(document));
  }

  @Test
  void aHashThatCannotOpenACommentIsLeftUnquoted() {
    assertEquals("issue#1047", Link.escapeReference("issue#1047"));
    assertEquals("'#'", Link.escapeReference("#"));
    assertEquals("'#ff0000'", Link.escapeReference("#ff0000"));
  }
}
