package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(30)
class SharedTextParityTest {
  private String decode(String hex) {
    return new String(HexFormat.of().parseHex(hex), StandardCharsets.UTF_8);
  }

  private String tree(List<Link> links) {
    return links.stream()
        .map(
            link -> {
              String reference =
                  link.getId() == null
                      ? "~"
                      : HexFormat.of().formatHex(link.getId().getBytes(StandardCharsets.UTF_8));
              return "("
                  + reference
                  + (link.getValues().isEmpty() ? "" : " " + tree(link.getValues()))
                  + ")";
            })
        .collect(Collectors.joining(" "));
  }

  @Test
  void sharedTextParity() throws Exception {
    int count = 0;
    for (String line : Files.readAllLines(Path.of("../parity/text-vectors.tsv"))) {
      if (line.startsWith("#")) continue;
      String[] columns = line.split("\t", -1);
      assertEquals(4, columns.length);
      String input = decode(columns[1]);
      String formatted = decode(columns[3]);
      List<Link> parsed = new Parser().parse(input);
      assertEquals(columns[2], tree(parsed), columns[0]);
      assertEquals(
          formatted,
          parsed.stream().map(link -> link.format(false)).collect(Collectors.joining()),
          columns[0]);
      assertEquals(columns[2], tree(new Parser().parse(formatted)), columns[0]);
      StreamParser stream = new StreamParser();
      for (int character : input.codePoints().toArray()) {
        stream.write(new String(Character.toChars(character)));
      }
      assertEquals(columns[2], tree(stream.finish()), columns[0]);
      count++;
    }
    assertTrue(count > 0, "empty fixture corpus");
  }
}
