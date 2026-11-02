// The Kotlin side of differential.mjs, carried over from link-foundation/ui
// (experiments/kotlin-differential), where this port was first vendored.
// Reads hex-encoded documents, one per line, from the file given as the first
// argument and prints what the Kotlin parser makes of each, in the format
// differential.mjs compares with the JavaScript parser.
import io.github.linkfoundation.linksnotation.Link
import io.github.linkfoundation.linksnotation.ParseException
import io.github.linkfoundation.linksnotation.Parser
import io.github.linkfoundation.linksnotation.ParserOptions
import io.github.linkfoundation.linksnotation.formatLinks
import java.io.File

private fun hex(text: String): String = text.map { "%04x".format(it.code) }.joinToString("")

private fun unhex(line: String): String =
    String(CharArray(line.length / 4) { line.substring(4 * it, 4 * it + 4).toInt(16).toChar() })

private fun tree(link: Link): String =
    "[" + (link.id?.let { hex(it) } ?: "null") + link.values.joinToString("") { "," + tree(it) } + "]"

fun main(args: Array<String>) {
    val maxDepth = args.getOrNull(1)?.toInt() ?: 64
    val parser = Parser(ParserOptions(maxDepth = maxDepth))
    val out = StringBuilder()
    for (line in File(args[0]).readLines()) {
        val input = unhex(line)
        try {
            val links = parser.parse(input)
            val formatted =
                try {
                    hex(formatLinks(links))
                } catch (e: IllegalArgumentException) {
                    "FORMATERR"
                }
            out.append("OK ").append(links.joinToString("") { tree(it) }).append(' ').append(formatted).append('\n')
        } catch (e: ParseException.DepthExceeded) {
            out.append("DEPTH ${e.line} ${e.column} ${hex(e.message!!)}\n")
        } catch (e: ParseException.Syntax) {
            out.append("SYNTAX ${e.line} ${e.column} ${hex(e.message!!)}\n")
        }
    }
    print(out)
}
