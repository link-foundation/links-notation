package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Syntax metadata on parsed links: how each ID was written (issue #364). */
class SyntaxMetadataTest {

  private static List<String> raws(List<Link> links) {
    return links.stream().map(Link::getRawId).toList();
  }

  private static List<String> quotes(List<Link> links) {
    return links.stream().map(Link::getQuote).toList();
  }

  @Test
  void bareAndQuotedAreTheSameReferenceButKeepHowTheyWereWritten() throws Exception {
    Link link = new Parser().parse("(t 1 '1')").get(0);
    Link bare = link.getValues().get(1);
    Link quoted = link.getValues().get(2);
    assertEquals("1", bare.getId());
    assertEquals("1", quoted.getId());
    assertEquals("1", bare.getRawId());
    assertEquals("'1'", quoted.getRawId());
    assertNull(bare.getQuote());
    assertEquals("'", quoted.getQuote());
    // Equality, hashing and formatting ignore the metadata.
    assertEquals(bare, quoted);
    assertEquals(bare.hashCode(), quoted.hashCode());
    assertEquals("(t 1 1)", link.format(false));
  }

  @Test
  void recordsEveryQuoteKindAndRunLength() throws Exception {
    Link link = new Parser().parse("(\"a\": 'b' `c` \"\"d\"\" ~1{65} f)").get(0);
    assertEquals("\"a\"", link.getRawId());
    assertEquals("\"", link.getQuote());
    assertEquals(List.of("'b'", "`c`", "\"\"d\"\"", "~1{65}", "f"), raws(link.getValues()));
    assertEquals(Arrays.asList("'", "`", "\"", null, null), quotes(link.getValues()));
  }

  @Test
  void keepsRawTextFromTheSourceNotFromCommentStripping() throws Exception {
    Link link = new Parser().parse("(a 'b # c') # d").get(0);
    assertEquals("'b # c'", link.getValues().get(1).getRawId());
  }

  @Test
  void keepsLineBreaksOfMultiLineQuotedReferences() throws Exception {
    Link link = new Parser().parse("(note: \"line1\r\nline2\")").get(0);
    assertEquals("\"line1\r\nline2\"", link.getValues().get(0).getRawId());
  }

  @Test
  void leavesLinksWithoutWrittenIdsWithoutRawText() throws Exception {
    Link link = new Parser().parse("(a b)").get(0);
    assertNull(link.getRawId());
    assertNull(link.getQuote());
    assertNull(new Link("x").getRawId());
    assertNull(new Link("x").getQuote());
    List<Link> paths = new Parser().parse("a\n  b");
    assertNull(paths.get(1).getRawId());
    assertEquals("a", paths.get(1).getValues().get(0).getValues().get(0).getRawId());
  }

  @Test
  void doesNotChangeEqualityFormattingOrToString() throws Exception {
    List<Link> quoted = new Parser().parse("('a': 'b')");
    List<Link> bare = new Parser().parse("(a: b)");
    assertEquals(bare, quoted);
    assertEquals(bare.hashCode(), quoted.hashCode());
    assertEquals(Link.formatLinks(bare), Link.formatLinks(quoted));
    assertEquals(Link.formatLinks(bare, true), Link.formatLinks(quoted, true));
    assertEquals(bare.get(0).toString(), quoted.get(0).toString());
    assertEquals("(a: b)", quoted.get(0).toString());
  }

  @Test
  void astModeDropsTheMetadata() throws Exception {
    Parser ast = new Parser(true, false);
    assertEquals(false, ast.isSyntaxEnabled());
    assertEquals(true, new Parser().isSyntaxEnabled());
    Link link = ast.parse("('a': 'b')").get(0);
    assertNull(link.getRawId());
    assertNull(link.getValues().get(0).getRawId());
    assertNull(link.getValues().get(0).getQuote());
    assertEquals(new Parser().parse("('a': 'b')").get(0), link);
    Link limited = new Parser(1024, 8, true, false).parse("'a'").get(0);
    assertNull(limited.getValues().get(0).getRawId());
  }

  @Test
  void indentedIdsAndStreamParserKeepTheMetadata() throws Exception {
    Link root = new Parser().parse("'root':\n  \"child\"").get(0);
    assertEquals("'root'", root.getRawId());
    assertEquals("\"child\"", root.getValues().get(0).getRawId());

    StreamParser stream = new StreamParser();
    stream.write("(a '");
    stream.write("b')");
    Link link = stream.finish().get(0);
    assertEquals("'b'", link.getValues().get(1).getRawId());
    assertEquals("'", link.getValues().get(1).getQuote());

    Link ast = new StreamParser(new Parser(true, false)).finish("(a 'b')").get(0);
    assertNull(ast.getValues().get(1).getRawId());
  }

  @Test
  void rawIdCanBeSetOnLinksBuiltInCode() {
    Link link = new Link("a");
    link.setRawId("\"a\"");
    assertEquals("\"", link.getQuote());
    assertEquals(new Link("a"), link);
    assertEquals("(a)", link.toString());
    link.setRawId(null);
    assertNull(link.getQuote());
  }

  @Test
  void referenceQuoteReadsTheDelimiterOfOneCompleteReference() {
    assertEquals("'", Link.referenceQuote("'1'"));
    assertEquals("\"", Link.referenceQuote("\"\"a b\"\""));
    assertEquals("`", Link.referenceQuote("`x`"));
    assertEquals("'", Link.referenceQuote("''"));
    assertNull(Link.referenceQuote("1"));
    assertNull(Link.referenceQuote("~1{31}"));
    assertNull(Link.referenceQuote("'unclosed"));
    assertNull(Link.referenceQuote("'a' b"));
    assertNull(Link.referenceQuote(""));
    assertNull(Link.referenceQuote(null));
  }

  @Test
  void aQuoteThatOpensNoReferenceIsPartOfABareReference() throws Exception {
    Link link = new Parser().parse("('x y)").get(0);
    assertEquals(List.of(new Link("'x"), new Link("y")), link.getValues());
    assertEquals(List.of("'x", "y"), raws(link.getValues()));
    assertEquals(Arrays.asList(null, null), quotes(link.getValues()));
  }
}
