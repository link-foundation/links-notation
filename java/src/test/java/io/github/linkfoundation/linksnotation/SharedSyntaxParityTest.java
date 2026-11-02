package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

/**
 * Shared syntax parity (issue #364): raw references, their quotes and concrete syntax trees, read
 * from {@code parity/syntax-vectors.tsv}, the generated twin of {@code
 * parity/syntax-fixtures.json}.
 */
@Timeout(30)
class SharedSyntaxParityTest {
  private static String decode(String hex) {
    return new String(HexFormat.of().parseHex(hex), StandardCharsets.UTF_8);
  }

  private static String hex(String text) {
    return text == null ? "~" : HexFormat.of().formatHex(text.getBytes(StandardCharsets.UTF_8));
  }

  /** The links as {@code (ID|RAW|QUOTE children...)}, each slot UTF-8 hex or {@code ~} for null. */
  private static String tree(List<Link> links) {
    return links.stream()
        .map(link ->
            "("
                + hex(link.getId())
                + "|"
                + hex(link.getRawId())
                + "|"
                + hex(link.getQuote())
                + (link.getValues().isEmpty() ? "" : " " + tree(link.getValues()))
                + ")")
        .collect(Collectors.joining(" "));
  }

  private static List<String[]> vectors(String name) throws Exception {
    List<String[]> rows = new ArrayList<>();
    for (String line : Files.readAllLines(Path.of("../parity/" + name))) {
      if (line.startsWith("#")) continue;
      rows.add(line.split("\t", -1));
    }
    assertTrue(!rows.isEmpty(), "empty fixture corpus " + name);
    return rows;
  }

  @Test
  void rawReferencesAndConcreteSyntaxTrees() throws Exception {
    for (String[] columns : vectors("syntax-vectors.tsv")) {
      assertEquals(4, columns.length);
      String id = columns[0];
      String input = decode(columns[1]);
      Parser parser = new Parser();
      assertEquals(columns[2], tree(parser.parse(input)), id);
      CstNode cst = parser.parseCst(input);
      assertEquals(decode(columns[3]), cst.toSExpression(), id);
      assertEquals(input, cst.toString(), id);
      StreamParser stream = new StreamParser();
      for (int character : input.codePoints().toArray()) {
        stream.write(new String(Character.toChars(character)));
      }
      assertEquals(columns[2], tree(stream.finish()), id);
    }
  }

  @Test
  void everySharedInputIsRecoveredFromItsConcreteSyntaxTree() throws Exception {
    List<String[]> rows = new ArrayList<>(vectors("text-vectors.tsv"));
    rows.addAll(vectors("syntax-vectors.tsv"));
    for (String[] columns : rows) {
      String input = decode(columns[1]);
      CstNode cst = new Parser().parseCst(input);
      assertEquals(input, cst.toString(), columns[0]);
      assertEquals(
          input,
          cst.tokens().stream().map(CstNode::getText).collect(Collectors.joining()),
          columns[0]);
    }
  }
}
