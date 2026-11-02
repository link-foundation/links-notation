package io.github.linkfoundation.linksnotation

/*
 * Indented text documents: a port of `js/src/IndentedDocument.js` of
 * link-foundation/links-notation. A document is a list of text parents, each
 * with the text lines indented directly under it.
 */

/** What [parseIndentedDocument] does with a parent that has several children. */
enum class MultipleValues {
    /** Keep every child as its own value. */
    ARRAY,

    /** Join the children into one value, a line each. */
    JOIN,
}

// A text line can be a single quoted reference or a flat list of words. Named
// links and nested values have more structure than this document format holds.
private fun lineText(link: Link): String {
    if (link.id != null && link.values.isEmpty()) return link.id
    if (link.id == null && link.values.isNotEmpty() && link.values.all { it.id != null && it.values.isEmpty() }) {
        return link.values.joinToString(" ") { it.id!! }
    }
    throw IllegalArgumentException("Indented document lines must contain only text references")
}

/**
 * The text parents of [input] and their immediate text children, in document
 * order, like JavaScript `parseIndentedDocument`. Repeated parents accumulate
 * their children. With [MultipleValues.JOIN], a parent with several children
 * has one value: the children joined with line feeds.
 *
 * Where JavaScript gives a parent with one child that child's text, this gives
 * a list of one; a parent without children has an empty list in both.
 *
 * @throws ParseException when [input] is not Links Notation.
 * @throws IllegalArgumentException when a line holds more than text, or a
 *   child has children of its own.
 */
fun parseIndentedDocument(
    input: String,
    options: ParserOptions = ParserOptions(),
    multipleValues: MultipleValues = MultipleValues.ARRAY,
): Map<String, List<String>> {
    val collected = LinkedHashMap<String, MutableList<String>>()
    for (group in Parser(options).parseGroups(input)) {
        val values = collected.getOrPut(lineText(group.element)) { ArrayList() }
        for (child in group.children) {
            require(child.children.isEmpty()) { "Indented documents support only immediate children" }
            values.add(lineText(child.element))
        }
    }
    val result = LinkedHashMap<String, List<String>>()
    for ((parent, values) in collected) {
        result[parent] =
            if (values.size > 1 && multipleValues == MultipleValues.JOIN) listOf(values.joinToString("\n")) else values
    }
    return result
}

/**
 * [entries] as an indented text document, like JavaScript
 * `formatIndentedDocument`: each parent on its own line and each of its values
 * on a line indented by two spaces, quoted only where the text would not read
 * back the same. A value with line breaks stays one quoted reference. Text that
 * is not empty ends with a line feed.
 */
fun formatIndentedDocument(entries: Map<String, List<String>>): String {
    val lines = ArrayList<String>()
    for ((parent, values) in entries) {
        lines.add(escapeReference(parent, minimal = true))
        for (child in values) {
            lines.add("  " + escapeReference(child, minimal = true))
        }
    }
    return if (lines.isEmpty()) "" else lines.joinToString("\n") + "\n"
}
