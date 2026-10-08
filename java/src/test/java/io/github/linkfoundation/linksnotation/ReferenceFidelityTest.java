package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HexFormat;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(30)
class ReferenceFidelityTest {
  private List<String> fixtures() throws Exception {
    return Files.readAllLines(Path.of("../docs/protocol/reference-literals.txt")).stream()
        .filter(line -> !line.startsWith("#"))
        .map(
            line ->
                line.equals("-")
                    ? ""
                    : new String(HexFormat.of().parseHex(line), StandardCharsets.UTF_8))
        .toList();
  }

  @Test
  void nativeReferenceFidelity() throws Exception {
    for (String reference : fixtures()) {
      List<Link> original =
          List.of(
              new Link(
                  reference,
                  List.of(new Link(reference), new Link("nested", List.of(new Link(reference))))));
      for (boolean less : new boolean[] {false, true}) {
        assertEquals(original, new Parser().parse(original.getFirst().format(less)));
      }
    }
  }

  @Test
  void referenceLiteralsAtEveryChunkSplit() throws Exception {
    for (String reference : fixtures()) {
      assertEquals(reference, ReferenceLiteral.decode(ReferenceLiteral.encode(reference)));
      for (String literal :
          List.of(
              Link.escapeReference(reference),
              BinaryLinoCodec.formatReference(reference),
              ReferenceLiteral.encode(reference))) {
        String text = "(root: " + literal + ")\n(" + literal + ": fixture)";
        List<Link> expected =
            List.of(
                new Link("root", List.of(new Link(reference))),
                new Link(reference, List.of(new Link("fixture"))));
        assertEquals(expected, new Parser().parse(text));
        for (int split = 0; split <= text.length(); split++) {
          StreamParser stream = new StreamParser();
          stream.write(text.substring(0, split));
          stream.write(text.substring(split));
          assertEquals(expected, stream.finish());
        }
      }
    }
  }

  @Test
  void binaryReferenceFidelity() throws Exception {
    BinaryLinoCodec codec = new BinaryLinoCodec();
    for (String reference : fixtures()) {
      List<Link> original = List.of(new Link(reference, List.of(new Link(reference))));
      List<Link> decoded = codec.decode(codec.encode(original));
      assertEquals(original, decoded);
      assertEquals(original, codec.parseDocument(codec.formatDocument(decoded)));
    }
  }

  @Test
  void malformedReferenceLiteralsAreRejected() throws Exception {
    for (String literal :
        Files.readAllLines(Path.of("../docs/protocol/invalid-reference-literals.txt"))) {
      if (literal.startsWith("#")) continue;
      assertThrows(IllegalArgumentException.class, () -> ReferenceLiteral.decode(literal));
      assertThrows(Exception.class, () -> new Parser().parse(literal));
    }
    assertEquals("é", ReferenceLiteral.decode("~1{C3A9}"));
    assertThrows(IllegalArgumentException.class, () -> ReferenceLiteral.encode("\ud800"));
    assertThrows(IllegalArgumentException.class, () -> Link.escapeReference("\ud800"));
  }
}
