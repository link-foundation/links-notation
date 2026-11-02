package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/** The lossless concrete syntax tree of a document (issue #364). */
class CstTest {

  @Test
  void isTheLosslessViewOfADocument() throws Exception {
    String input = "(t 1 '1')";
    CstNode cst = new Parser().parseCst(input);
    assertEquals(CstKind.DOCUMENT, cst.getKind());
    assertFalse(cst.isToken());
    assertEquals(input, cst.toString());
    assertEquals(input, cst.getText());
    assertEquals(
        "(document (line (group open_paren:\"(\" (line reference:\"t\" whitespace:\" \""
            + " reference:\"1\" whitespace:\" \" reference:\"'1'\") close_paren:\")\")))",
        cst.toSExpression());
  }

  @Test
  void referenceTokensCarryTheirValueAndDelimiter() throws Exception {
    List<List<String>> references =
        new Parser()
            .parseCst("(a \"b c\" ~1{64} ''e''''f'')").tokens().stream()
                .filter(token -> token.getKind() == CstKind.REFERENCE)
                .map(token -> Arrays.asList(token.getText(), token.getValue(), token.getQuote()))
                .toList();
    assertEquals(
        List.of(
            Arrays.asList("a", "a", null),
            Arrays.asList("\"b c\"", "b c", "\""),
            Arrays.asList("~1{64}", "d", null),
            Arrays.asList("''e''''f''", "e''f", "'")),
        references);
  }

  static Stream<Arguments> documents() {
    return Stream.of(
        Arguments.of("empty", ""),
        Arguments.of("only whitespace", " \t "),
        Arguments.of("blank lines", "\n\n"),
        Arguments.of("CRLF and CR", "a\r\nb\rc\r\n"),
        Arguments.of("tabs and trailing spaces", "a\t b  \n"),
        Arguments.of("comments everywhere", "# head\na: b # tail\n  # inner\n  c\n# end"),
        Arguments.of("multiline quotes", "(note: \"one\n  two\r\nthree\")"),
        Arguments.of("nested groups over lines", "(a (b\n  (c d)\n) e)\n"),
        Arguments.of("indentation", "root:\n  child:\n    leaf\n  tail"),
        Arguments.of("literals", "(~1{} ~1{e6a0b9})"),
        Arguments.of("comment marks inside quotes", "('#a' \"b # c\" `#`)"),
        Arguments.of("unicode", "(根: café 🙂)\n"));
  }

  @ParameterizedTest(name = "recovers {0} exactly")
  @MethodSource("documents")
  void recoversDocumentsExactly(String name, String input) throws Exception {
    CstNode cst = new Parser().parseCst(input);
    assertEquals(input, cst.toString(), name);
    assertEquals(
        input, cst.tokens().stream().map(CstNode::getText).reduce("", String::concat), name);
  }

  @Test
  void anEmptyDocumentHasNoLines() throws Exception {
    assertEquals("(document)", new Parser().parseCst("").toSExpression());
  }

  @Test
  void writesNonAsciiAsIsAndEscapesControlCharacters() throws Exception {
    assertEquals(
        "(document (line reference:\"🙂\" whitespace:\"\\t\" comment:\"# \\\"\\\\\""
            + " newline:\"\\r\\n\"))",
        new Parser().parseCst("🙂\t# \"\\\r\n").toSExpression());
  }

  @Test
  void withoutCommentSupportHashIsPartOfReferences() throws Exception {
    String input = "a #b";
    CstNode cst = new Parser(false).parseCst(input);
    assertEquals(input, cst.toString());
    assertEquals(
        List.of(CstKind.REFERENCE, CstKind.WHITESPACE, CstKind.REFERENCE),
        cst.tokens().stream().map(CstNode::getKind).toList());
    assertEquals(
        List.of(CstKind.REFERENCE, CstKind.WHITESPACE, CstKind.COMMENT),
        new Parser().parseCst(input).tokens().stream().map(CstNode::getKind).toList());
  }

  @Test
  void aGroupBelongsToTheLineItOpensOn() throws Exception {
    CstNode cst = new Parser().parseCst("a (b\nc)\nd");
    assertEquals(
        List.of("a (b\nc)\n", "d"), cst.getChildren().stream().map(CstNode::toString).toList());
    CstNode group = cst.getChildren().get(0).getChildren().get(2);
    assertEquals(CstKind.GROUP, group.getKind());
    assertEquals(
        List.of(CstKind.OPEN_PAREN, CstKind.LINE, CstKind.LINE, CstKind.CLOSE_PAREN),
        group.getChildren().stream().map(CstNode::getKind).toList());
    assertTrue(group.getChildren().get(0).isToken());
    assertEquals(List.of(), group.getChildren().get(0).getChildren());
  }

  @Test
  void kindsHaveTheSharedSExpressionNames() {
    assertEquals(
        List.of(
            "document",
            "line",
            "group",
            "whitespace",
            "newline",
            "comment",
            "open_paren",
            "close_paren",
            "colon",
            "reference"),
        Arrays.stream(CstKind.values()).map(CstKind::toString).toList());
  }

  @Test
  void rejectsWhatParseRejectsAndUnbalancedParentheses() {
    assertThrows(ParseException.class, () -> new Parser().parseCst("(a"));
    assertThrows(ParseException.class, () -> new Parser().parseCst("a)"));
    assertThrows(NestingTooDeepException.class, () -> new Parser(1024, 1, true).parseCst("((a))"));
    assertThrows(IllegalArgumentException.class, () -> new Parser().parseCst(null));
  }
}
