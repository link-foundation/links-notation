package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

/**
 * Links nested too deeply are refused with an error rather than recursed into until the stack
 * overflows (<a href="https://github.com/link-foundation/links-notation/issues/315">#315</a>).
 *
 * <p>Every parenthesized group and every indentation level is one level, and the lines of a
 * document start at level 0. The positions asserted here are the ones the Rust port reports for the
 * same input.
 */
public class NestingDepthTest {

  private static String parens(int depth) {
    return "(".repeat(depth) + "a" + ")".repeat(depth);
  }

  private static String values(int depth) {
    return "(a ".repeat(depth) + "b" + ")".repeat(depth);
  }

  private static String indentation(int depth) {
    StringBuilder document = new StringBuilder();
    for (int level = 0; level <= depth; level++) {
      document.append(" ".repeat(level)).append("a\n");
    }
    return document.toString();
  }

  private static Parser parser(int maxDepth) {
    return new Parser(10 * 1024 * 1024, maxDepth);
  }

  private static NestingTooDeepException tooDeep(String document, int maxDepth) {
    NestingTooDeepException error =
        assertThrows(NestingTooDeepException.class, () -> parser(maxDepth).parse(document));
    assertEquals(maxDepth, error.getMaxDepth());
    return error;
  }

  private static boolean accepted(String document, int maxDepth) throws ParseException {
    return !parser(maxDepth).parse(document).isEmpty();
  }

  @Test
  public void testDefaultLimitIsSharedByEveryImplementation() {
    assertEquals(64, Parser.DEFAULT_MAX_DEPTH);
    assertEquals(Parser.DEFAULT_MAX_DEPTH, new Parser().getMaxDepth());
    assertEquals(Parser.DEFAULT_MAX_DEPTH, new Parser(false).getMaxDepth());
  }

  @Test
  public void testParenthesesUpToTheLimitAreAccepted() throws ParseException {
    assertTrue(accepted(parens(3), 3));
    assertTrue(accepted(values(3), 3));
    assertFalse(new Parser().parse(parens(Parser.DEFAULT_MAX_DEPTH)).isEmpty());
    assertFalse(new Parser().parse(values(Parser.DEFAULT_MAX_DEPTH)).isEmpty());
  }

  @Test
  public void testParenthesesPastTheLimitAreRefusedAtTheGroupThatIsTooDeep() {
    NestingTooDeepException error = tooDeep(parens(4), 3);

    assertEquals(3, error.getMaxDepth());
    assertEquals(List.of(1, 4, 3), List.of(error.getLine(), error.getColumn(), error.getOffset()));
    assertEquals("line 1, column 4: nesting depth exceeds the maximum of 3", error.getSummary());
    assertEquals("1 | ((((a))))\n  |    ^", error.getSnippet());
    assertEquals(
        "Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3\n"
            + "1 | ((((a))))\n"
            + "  |    ^",
        error.getMessage());
  }

  @Test
  public void testTheRefusalIsAParseException() {
    ParseException error = assertThrows(ParseException.class, () -> parser(1).parse("((a))"));

    assertInstanceOf(NestingTooDeepException.class, error);
  }

  @Test
  public void testGroupsInValuePositionCountLikeAnyOtherGroup() {
    NestingTooDeepException error = tooDeep(values(4), 3);

    assertEquals(List.of(1, 10), List.of(error.getLine(), error.getColumn()));
  }

  @Test
  public void testIndentationUpToTheLimitIsAccepted() throws ParseException {
    assertTrue(accepted(indentation(3), 3));
    assertFalse(new Parser().parse(indentation(Parser.DEFAULT_MAX_DEPTH)).isEmpty());
  }

  @Test
  public void testIndentationPastTheLimitIsRefusedAtTheLineThatIsTooDeep() {
    NestingTooDeepException error = tooDeep(indentation(4), 3);

    assertEquals(List.of(5, 5), List.of(error.getLine(), error.getColumn()));
    assertEquals("    a", error.getLineText());
  }

  @Test
  public void testGroupsAndIndentationAddUp() throws ParseException {
    // `(b)` on the line indented once is at level 2.
    assertTrue(accepted("a\n  (b)\n", 2));
    NestingTooDeepException error = tooDeep("a\n  (b)\n", 1);

    assertEquals(List.of(2, 3), List.of(error.getLine(), error.getColumn()));
  }

  @Test
  public void testLimitOfOne() throws ParseException {
    assertTrue(accepted("(a)", 1));
    tooDeep("((a))", 1);
    tooDeep("(a (b))", 1);
    tooDeep("a\n  (b)\n", 1);
  }

  @Test
  public void testTrailingSpacesOnADeepLineAreNotADeeperLine() throws ParseException {
    assertTrue(accepted("a\n  b\n    c   \n", 2));
  }

  @Test
  public void testRefusesADocumentFarPastTheLimitWithoutOverflowingTheStack() throws Exception {
    // Before the limit existed each of these overflowed the stack. Without a
    // limit a 512 KiB thread stack holds a few hundred levels (see
    // experiments/issue-315/java-depth.java), well past the default of 64.
    List<String> documents = List.of(parens(100_000), values(100_000), indentation(2_000));
    List<Object> outcome = new ArrayList<>();
    AtomicReference<Throwable> unexpected = new AtomicReference<>();
    Thread thread =
        new Thread(
            null,
            () -> {
              for (String document : documents) {
                try {
                  new Parser().parse(document);
                  outcome.add("accepted");
                } catch (NestingTooDeepException error) {
                  outcome.add(error.getMaxDepth());
                } catch (Throwable error) {
                  unexpected.set(error);
                  return;
                }
              }
            },
            "nesting-depth",
            512 * 1024);
    thread.start();
    thread.join();

    if (unexpected.get() != null) {
      fail("expected the nesting to be too deep", unexpected.get());
    }
    assertEquals(
        List.of(Parser.DEFAULT_MAX_DEPTH, Parser.DEFAULT_MAX_DEPTH, Parser.DEFAULT_MAX_DEPTH),
        outcome);
  }

  @Test
  public void testAGroupThatFailedLeavesTheParserUsable() throws ParseException {
    Parser parser = parser(1);
    assertThrows(NestingTooDeepException.class, () -> parser.parse("a\n  ((b))\n"));

    assertEquals(2, parser.parse("a\n  b\n").size());
  }

  @Test
  public void testStreamParserReportsWhereTheNestingIsTooDeep() throws ParseException {
    StreamParser stream = new StreamParser(parser(1));
    stream.write("a\nb ((c))\n");

    StreamParseException error = assertThrows(StreamParseException.class, stream::finish);

    assertInstanceOf(NestingTooDeepException.class, error.getCause());
    assertEquals(1, ((NestingTooDeepException) error.getCause()).getMaxDepth());
    assertEquals(List.of(2, 4, 5), List.of(error.getLine(), error.getColumn(), error.getOffset()));
    assertEquals(
        "Stream parse error at line 2, column 4: nesting depth exceeds the maximum of 1",
        error.getMessage());
  }
}
