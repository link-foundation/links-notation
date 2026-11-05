package io.github.linkfoundation.linksnotation

/**
 * Write recursively nested lines in value order, without a final newline.
 * Read with `Parser.parseGroups`, appending children to their element's values.
 * Canonical `parse` retains its path-expansion semantics.
 */
fun formatNested(
    links: List<Link>,
    indent: String = "  ",
): String {
    require(indent.isNotEmpty() && indent.all { it == ' ' }) {
        "indent must contain only spaces and be nonempty"
    }
    return links.flatMap { nestedLines(it, "", indent) }.joinToString("\n")
}

private fun nestedAtom(link: Link): Boolean = link.id != null && link.values.isEmpty()

private fun nestedCanNest(link: Link): Boolean =
    !nestedAtom(link) && !(link.id == null && link.values.size == 1 && !nestedAtom(link.values[0]))

private fun nestedLineHolds(
    link: Link,
    count: Int,
): Boolean = link.id != null || count >= 2 || (count == 1 && nestedAtom(link.values[0]))

private fun nestedLines(
    link: Link,
    pad: String,
    indent: String,
    underName: Boolean = false,
): List<String> {
    if (!nestedLineHolds(link, link.values.size) || (underName && link.id == null && link.values.size == 1)) {
        return listOf(pad + link.format())
    }
    var count = link.values.size
    while (count > 0 && nestedCanNest(link.values[count - 1])) count--
    while (count < link.values.size && !nestedLineHolds(link, count)) count++
    val parts =
        link.values
            .take(count)
            .map { if (nestedAtom(it)) escapeReference(it.id) else it.format() }
            .toMutableList()
    if (link.id != null) parts.add(0, escapeReference(link.id) + ":")
    return listOf(pad + parts.joinToString(" ")) +
        link.values.drop(count).flatMap {
            nestedLines(it, pad + indent, indent, underName || (link.id != null && count == 0))
        }
}
