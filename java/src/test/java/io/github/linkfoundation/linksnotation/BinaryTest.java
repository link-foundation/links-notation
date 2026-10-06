package io.github.linkfoundation.linksnotation;

import static org.junit.jupiter.api.Assertions.*;

import io.github.linkfoundation.linksnotation.BinaryLinoCodec.*;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class BinaryTest {
  @Test
  void unicodeWhitespaceIsQuoted() {
    for (String text : List.of("\u0085", "x\u00a0y", "x\u2028y"))
      assertEquals("'" + text + "'", BinaryLinoCodec.formatReference(text));
  }

  @Test
  void sharedVectors() throws Exception {
    int count = 0;
    for (String line :
        Files.readAllLines(Path.of("../docs/protocol/binary-links-notation-vectors.txt"))) {
      if (line.isEmpty() || line.startsWith("#")) continue;
      String[] f = line.split("\t", -1);
      byte[] bytes = HexFormat.of().parseHex(f[f.length - 1].replace(" ", ""));
      if (f[0].equals("document")) {
        var codec =
            new BinaryLinoCodec(
                new Options(f[2].equals("external"), ArityRange.parse(f[3]), f[4].equals("packed")),
                new Limits());
        var document = codec.parseDocument(f[1].replace("\\n", "\n"));
        assertArrayEquals(bytes, codec.encode(document), line);
        assertEquals(document, codec.decode(bytes), line);
      } else {
        var links = Packet.parseLinks(f[1]);
        var packet = Packet.pack(f[2].equals("external"), links, f[3].equals("packed"));
        assertArrayEquals(bytes, packet.toBytes(), line);
        assertEquals(links, Packet.fromBytes(bytes, new Limits()).links(), line);
      }
      count++;
    }
    assertEquals(96, count);
  }

  @Test
  void nativeTextModels() throws Exception {
    for (String source :
        List.of(
            "",
            "()",
            "\"\"",
            "a",
            "(a)",
            "((a))",
            "(a b c)",
            "(\"\": () \"\" (b))",
            "a:\n  b\n  c",
            "\"#x\" \"λ😀\" \"007\" \"18446744073709551615\"",
            "# comment\n(a # tail\n b)")) {
      var model = new Parser().parse(source);
      for (boolean external : List.of(false, true))
        for (String arity : List.of("2", "2..3", "1.."))
          for (boolean packed : List.of(false, true)) {
            var codec =
                new BinaryLinoCodec(
                    new Options(external, ArityRange.parse(arity), packed), new Limits());
            assertEquals(model, codec.decode(codec.encode(model)), source);
          }
    }
  }

  @Test
  void limitsAndMalformed() {
    var model = List.of(new Link(null, List.of(new Link("abcdef"))));
    byte[] bytes = new BinaryLinoCodec().encode(model);
    for (var limits :
        List.of(
            new Limits(1, 1 << 24, 1 << 22, 64 << 20, 64),
            new Limits(1 << 22, 1, 1 << 22, 64 << 20, 64),
            new Limits(1 << 22, 1 << 24, 1, 64 << 20, 64),
            new Limits(1 << 22, 1 << 24, 1 << 22, 2, 64),
            new Limits(1 << 22, 1 << 24, 1 << 22, 64 << 20, 1))) {
      var codec = new BinaryLinoCodec(new Options(), limits);
      assertThrows(IllegalArgumentException.class, () -> codec.decode(bytes));
      assertThrows(IllegalArgumentException.class, () -> codec.encode(model));
    }
    for (String hex : List.of("", "20", "1e00", "1001", "100000", "10ffffffffffffffffffff"))
      assertThrows(
          IllegalArgumentException.class,
          () -> new BinaryLinoCodec().decode(HexFormat.of().parseHex(hex)));
  }

  @Test
  void packetStreamsUint64AndTruncation() throws Exception {
    for (boolean external : List.of(false, true)) {
      var links =
          Packet.parseLinks(
              "6:" + (external ? "#0 #9223372036854775807" : "0 18446744073709551615"));
      byte[] bytes = Packet.pack(external, links, true).toBytes();
      var stream =
          new java.io.ByteArrayInputStream(
              java.util.stream.IntStream.range(0, bytes.length * 2)
                  .collect(
                      java.io.ByteArrayOutputStream::new,
                      (out, i) -> out.write(bytes[i % bytes.length]),
                      (a, b) -> a.writeBytes(b.toByteArray()))
                  .toByteArray());
      assertEquals(links, Packet.readFrom(stream, new Limits()).links());
      assertEquals(bytes.length, stream.available());
      assertEquals(links, Packet.readFrom(stream, new Limits()).links());
      assertNull(Packet.readFrom(stream, new Limits()));
      for (int end = 0; end < bytes.length; end++) {
        byte[] truncated = Arrays.copyOf(bytes, end);
        assertThrows(
            IllegalArgumentException.class, () -> Packet.fromBytes(truncated, new Limits()));
      }
    }
    var model = List.of(new Link("leaf"));
    for (int i = 0; i < 70; i++) model = List.of(new Link(null, model));
    var deep = model;
    assertThrows(IllegalArgumentException.class, () -> new BinaryLinoCodec().encode(deep));
    var codec =
        new BinaryLinoCodec(new Options(), new Limits(1 << 22, 1 << 24, 1 << 22, 64 << 20, 80));
    assertEquals(deep, codec.decode(codec.encode(deep)));
  }
}
