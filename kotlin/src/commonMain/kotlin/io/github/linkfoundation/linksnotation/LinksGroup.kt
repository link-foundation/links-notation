package io.github.linkfoundation.linksnotation

/**
 * A line of a document and the groups of the lines indented under it, before
 * the indentation is expanded into path combinations: a port of `LinksGroup`
 * of `js/src/LinksGroup.js`, as [Parser.parseGroups] returns it.
 *
 * @property element The link on the line.
 * @property children The groups of the lines indented directly under it.
 */
data class LinksGroup(
    val element: Link,
    val children: List<LinksGroup> = emptyList(),
) {
    /** The element and then every descendant's element, depth first. */
    fun toList(): List<Link> {
        val result = ArrayList<Link>()
        appendTo(result)
        return result
    }

    private fun appendTo(result: MutableList<Link>) {
        result.add(element)
        for (child in children) {
            child.appendTo(result)
        }
    }

    /**
     * Every link of [toList] in parentheses, its ID when it has one and its
     * text otherwise, like JavaScript `LinksGroup.toString()`.
     */
    override fun toString(): String =
        toList().joinToString(" ") { link ->
            val id = link.id
            "(" + (if (id.isNullOrEmpty()) link.format() else id) + ")"
        }
}
