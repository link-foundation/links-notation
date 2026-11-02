package io.github.linkfoundation.linksnotation

/** The bytes [hex] spells, two hexadecimal digits a byte, spaces ignored. */
internal fun hexBytes(hex: String): ByteArray {
    val digits = hex.replace(" ", "")
    return ByteArray(digits.length / 2) { digits.substring(2 * it, 2 * it + 2).toInt(16).toByte() }
}

/** The UTF-8 text [hex] spells. */
internal fun hexText(hex: String): String = hexBytes(hex).decodeToString(throwOnInvalidSequence = true)

/** The lines of a protocol file that are neither comments nor blank. */
internal fun dataLines(lines: List<String>): List<String> = lines.filter { it.isNotEmpty() && !it.startsWith("#") }

/** `docs/protocol/reference-literals.txt`: one reference a line, UTF-8 hex, `-` for the empty one. */
internal val REFERENCES: List<String> =
    dataLines(REFERENCE_LITERAL_LINES).map { if (it == "-") "" else hexText(it) }

/**
 * A parsed link written unambiguously, like the `render` helper of the
 * JavaScript suites: every reference in angle brackets, so an empty one shows
 * as `<>`.
 */
internal fun render(link: Link): String {
    if (link.values.isEmpty()) return "<${link.id ?: ""}>"
    val head = if (link.id == null) "" else "<${link.id}>: "
    return "($head${link.values.joinToString(" ") { render(it) }})"
}

/** Every link [input] reads as, [render]ed a line each. */
internal fun parsesAs(input: String, parser: Parser = Parser()): String =
    parser.parse(input).joinToString("\n") { render(it) }
