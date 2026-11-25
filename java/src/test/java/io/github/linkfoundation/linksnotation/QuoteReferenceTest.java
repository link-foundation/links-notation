package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Quoting a reference, and reading every quoted reference back (issues #443 and #444).
 *
 * <p>{@link Link#quoteReference(String)} writes one reference so a parser reads it back as exactly
 * that text; {@link Link#needsQuoting(String)} says whether the text can be written bare. The round
 * trip below feeds texts built from the characters that matter to the grammar through it and reads
 * them back in the ID and the value position of parenthesised, single-line and indented links.
 */
class QuoteReferenceTest {

  private final Parser parser = new Parser();

  @Test
  void quoteReferenceWritesTextThatNeedsNoDelimitersAsItIs() {
    for (String text : List.of("plain", "issue#1047", "a-b_c.d", "π", "~1")) {
      assertEquals(text, Link.quoteReference(text));
      assertFalse(Link.needsQuoting(text), text);
    }
  }

  @Test
  void quoteReferenceQuotesTextAParserWouldReadDifferently() {
    assertEquals("'has space'", Link.quoteReference("has space"));
    assertEquals("'12:30'", Link.quoteReference("12:30"));
    assertEquals("'#release'", Link.quoteReference("#release"));
    assertEquals("'(a)'", Link.quoteReference("(a)"));
    assertEquals("'\"'", Link.quoteReference("\""));
    assertEquals("\"'\"", Link.quoteReference("'"));
    assertEquals("~1{}", Link.quoteReference(""));
    assertEquals("~1{610a62}", Link.quoteReference("a\nb"));
    for (String text : List.of("has space", "12:30", "#release", "", "\"", "a\nb")) {
      assertTrue(Link.needsQuoting(text), text);
    }
  }

  @Test
  void quoteReferenceIsEscapeReference() {
    for (String text : List.of("a b", "a", "it's", "", "#x", "x:y")) {
      assertEquals(Link.escapeReference(text), Link.quoteReference(text));
    }
    assertEquals("", Link.quoteReference(null));
  }

  @Test
  void needsQuotingRefusesNull() {
    assertThrows(IllegalArgumentException.class, () -> Link.needsQuoting(null));
  }

  /** Texts that broke a parser or a formatter before, or came close. */
  private static final List<String> TRICKY =
      List.of(
          "",
          " ",
          "\"",
          "'",
          "`",
          "\"\"",
          "''",
          "\"\"\"\"",
          "\"'",
          "'\"",
          "#",
          "#x",
          "a #b",
          ":",
          "a:",
          ":a",
          "12:30",
          "a: b",
          "(",
          ")",
          "~1{}",
          "~1{61}",
          "a\nb",
          "\"\" ",
          " \"\"",
          "\"\n",
          "it's",
          "say \"hi\"");

  /** The characters that matter to the grammar, for the seeded texts. */
  private static final String[] ALPHABET = {
    "a", "b", "1", " ", " ", "\t", "\n", "\r", "\"", "\"", "'", "'", "`", "#", ":", "(", ")", "~",
    "{", "}", "é", "😀"
  };

  /** A few seeded texts, so a failure names the text that broke and every run tries the same. */
  private static List<String> texts(int count, long seed) {
    Random random = new Random(seed);
    List<String> result = new ArrayList<>();
    for (int index = 0; index < count; index++) {
      int length = random.nextInt(9);
      StringBuilder text = new StringBuilder();
      for (int position = 0; position < length; position++) {
        text.append(ALPHABET[random.nextInt(ALPHABET.length)]);
      }
      result.add(text.toString());
    }
    return result;
  }

  private String readBack(String document) throws ParseException {
    return LinkTree.of(parser.parse(document));
  }

  @Test
  void everyQuotedReferenceReadsBackInEveryPosition() throws ParseException {
    List<String> pool = new ArrayList<>(TRICKY);
    pool.addAll(texts(500, 443444));
    for (String text : pool) {
      String written = Link.quoteReference(text);
      String message = "text " + LinkTree.of(List.of(new Link(text))) + " written as " + written;
      String id = LinkTree.of(List.of(new Link(text)));
      String reference = id.substring(1, id.length() - 1);
      String link = LinkTree.of(List.of(new Link(text, List.of(new Link(text), new Link("x")))));

      assertEquals(link, readBack("(" + written + ": " + written + " x)"), message);
      assertEquals(link, readBack(written + ": " + written + " x"), message);
      assertEquals(link, readBack(written + ": " + written + " x\n"), message);
      assertEquals(link, readBack(written + ":\n  " + written + "\n  x\n"), message);
      // Two lines that each end with the reference: the shape of issue #443.
      assertEquals(
          "[[\"root\",[null,[\"a\"]," + reference + "],[null,[\"b\"]," + reference + "]]]",
          readBack("root:\n  a " + written + "\n  b " + written + "\n"),
          message);
      assertEquals(
          "[[null,[\"a\"],[null," + reference + "," + reference + "],[\"b\"]]]",
          readBack("(a (" + written + " " + written + ") b)"),
          message);
    }
  }
}
