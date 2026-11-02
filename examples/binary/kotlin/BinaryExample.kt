// Encodes every document of examples/binary/corpus.txt with all twelve option
// combinations and prints each packet as hexadecimal beside its decoded text,
// in the format run-interop.sh compares across languages.
//
// Run from the repository root: kotlin/gradlew -q -p kotlin binaryExample

import io.github.linkfoundation.linksnotation.ArityRange
import io.github.linkfoundation.linksnotation.BinaryLinoCodec
import io.github.linkfoundation.linksnotation.BinaryLinoOptions
import java.io.File

fun main(args: Array<String>) {
    val corpus = File(args.firstOrNull() ?: "examples/binary/corpus.txt").readText().removeSuffix("\n").split("\n")
    val out = StringBuilder()
    for (source in corpus) {
        val text = source.replace("\\n", "\n")
        val document = BinaryLinoCodec().parseDocument(text)
        for (external in listOf(false, true)) {
            for (arity in listOf("2", "2..3", "1..")) {
                for (packed in listOf(false, true)) {
                    val codec = BinaryLinoCodec(BinaryLinoOptions(external, ArityRange.parse(arity), packed))
                    val data = codec.encode(document)
                    val decoded = codec.decode(data)
                    check(decoded == document) { "Document changed" }
                    val formatted = codec.formatDocument(decoded)
                    check(codec.parseDocument(formatted) == document) { "Text model changed" }
                    data.joinTo(out, " ") { (it.toInt() and 0xff).toString(16).padStart(2, '0') }
                    out.append('\t').append(formatted.replace("\n", "\\n")).append('\n')
                }
            }
        }
    }
    // UTF-8 whatever the locale of the host, like the other languages.
    System.out.write(out.toString().toByteArray(Charsets.UTF_8))
    System.out.flush()
}
