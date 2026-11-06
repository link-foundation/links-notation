import io.github.linkfoundation.linksnotation.Parser

fun main() {
    val parser = Parser()
    val links = parser.parse("(published: hello world)")
    check(links.single().format() == "(published: hello world)")
    check(parser.parse(links.single().format()) == links)
    println("Public Kotlin root-coordinate JVM parser/formatter consumer passed")
}
