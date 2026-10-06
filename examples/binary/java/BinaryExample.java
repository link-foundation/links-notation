import io.github.linkfoundation.linksnotation.BinaryLinoCodec;
import io.github.linkfoundation.linksnotation.BinaryLinoCodec.*;
import java.util.HexFormat;
import java.util.List;

class BinaryExample {
  public static void main(String[] args) throws Exception {
    var corpus = java.nio.file.Files.readString(java.nio.file.Path.of("examples/binary/corpus.txt")).split("\n");
    for (var source : corpus) {
      var text = source.replace("\\n", "\n");
      var document = new BinaryLinoCodec().parseDocument(text);
      for (boolean external : List.of(false, true))
        for (var arity : List.of("2", "2..3", "1.."))
          for (boolean packed : List.of(false, true)) {
            var codec =
                new BinaryLinoCodec(
                    new Options(external, ArityRange.parse(arity), packed), new Limits());
            byte[] data = codec.encode(document);
            var decoded = codec.decode(data);
            if (!document.equals(decoded)) throw new IllegalStateException("Document changed");
            System.out.println(
                HexFormat.ofDelimiter(" ").formatHex(data)
                    + "\t"
                    + BinaryLinoCodec.formatDocument(decoded).replace("\n", "\\n"));
          }
    }
  }
}
