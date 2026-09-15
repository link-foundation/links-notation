package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class StreamParserTest {
  private static final String DOCUMENT =
      """
      first loves data
      # streamed comment
      profile:
        name Ada
        note "line one
      line two"
      (nested:
        child value)
      last sees first""";

  private static List<String> render(List<Link> links) {
    return links.stream().map(Link::toString).toList();
  }

  @Test
  void matchesCanonicalParserOneSymbolAtATime() throws Exception {
    StreamParser stream = new StreamParser();
    DOCUMENT.chars().forEachOrdered(character -> write(stream, Character.toString(character)));

    assertEquals(render(new Parser().parse(DOCUMENT)), render(stream.finish()));
  }

  @Test
  void emitsOnlyCompleteRecords() throws Exception {
    List<Link> seen = new ArrayList<>();
    StreamParser stream = new StreamParser().onLink(seen::add);

    assertEquals(List.of(), stream.write("profile:\n  name Ada\n  note \"first\nsecond\"\n"));
    List<Link> emitted = stream.write("n");

    assertEquals(1, emitted.size());
    assertEquals(emitted, seen);
  }

  @Test
  void supportsLineChunksFinalRecordAndPosition() throws Exception {
    StreamParser stream = new StreamParser();
    for (String line : DOCUMENT.split("(?<=\\n)")) {
      stream.write(line);
    }

    assertEquals(render(new Parser().parse(DOCUMENT)), render(stream.finish()));
    assertEquals(DOCUMENT.length(), stream.position().offset());
    assertEquals(0, stream.position().buffered());
  }

  @Test
  void supportsDrainResetAndBoundedMemory() throws Exception {
    List<Link> seen = new ArrayList<>();
    StreamParser stream = new StreamParser().collect(false).maxBufferSize(8).onLink(seen::add);
    for (int index = 0; index < 100; index++) {
      stream.write("a\n");
    }
    assertEquals(List.of(), stream.drain());
    assertEquals(1, stream.finish().size());
    assertEquals(100, seen.size());

    stream.reset();
    assertThrows(IllegalArgumentException.class, () -> stream.write("123456789"));
  }

  @Test
  void providesLazyAdapters() {
    List<String> links =
        StreamParser.parseChunks(Arrays.asList("one link\n", "two link"))
            .map(Link::toString)
            .toList();

    assertEquals(List.of("(one link)", "(two link)"), links);
  }

  @Test
  void rejectsWritesAfterFinish() throws Exception {
    StreamParser stream = new StreamParser();
    stream.finish("one");

    assertThrows(IllegalStateException.class, () -> stream.write("two"));
  }

  private static void write(StreamParser parser, String chunk) {
    try {
      parser.write(chunk);
    } catch (ParseException exception) {
      throw new AssertionError(exception);
    }
  }
}
