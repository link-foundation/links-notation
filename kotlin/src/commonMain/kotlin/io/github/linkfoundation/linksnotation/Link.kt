package io.github.linkfoundation.linksnotation

/**
 * A link: an optional [id] and the links it holds, its [values].
 *
 * `id == null` marks an anonymous link, and a link without values is a
 * reference. Two links are equal when their ids and values are equal; how a
 * link was read ([rawId], [quote]) does not take part in equality.
 */
data class Link(
    val id: String?,
    val values: List<Link> = emptyList(),
) {
    /**
     * Set on the links the parser builds from an indentation path (a line and
     * the lines indented under it). Such a link writes every value in
     * parentheses, exactly like the JavaScript `Link`.
     */
    internal var isFromPathCombination: Boolean = false

    /**
     * The ID exactly as the parsed document wrote it: `'1'` for a quoted `1`,
     * `1` for a bare one, `~1{31}` for a versioned literal. Null for a link
     * without an ID, a link built in code, a link made by combining the lines
     * of an indented document, and every link read with
     * [ParserOptions.syntax] off. It takes no part in [equals] or [format].
     */
    var rawId: String? = null

    /**
     * The delimiter the ID was written between: `'`, `"` or `` ` `` when it was
     * quoted, and null when it was bare, a versioned literal, or not read from
     * a document (see [rawId]). `1` and `'1'` stay equal links; this only says
     * how each was written.
     */
    val quote: String?
        get() = referenceQuote(rawId)

    /** The link as Links Notation text, the same text as JavaScript `Link.format()`. */
    fun format(): String = format(lessParentheses = false)

    /**
     * The link as Links Notation text. With [lessParentheses], the outer
     * parentheses are left out where the text still reads back the same,
     * like JavaScript `Link.format(true)`.
     */
    fun format(lessParentheses: Boolean): String = formatLink(this, lessParentheses, isCompoundValue = false)

    /**
     * The link as Links Notation text written as [options] say, like
     * JavaScript `Link.format(formatOptions)`.
     */
    fun format(options: FormatOptions): String = formatLinkWithOptions(this, options, isCompoundValue = false)

    /** The same text as [format], like JavaScript `Link.toString()`. */
    override fun toString(): String = format()

    /** The values written one after another, like JavaScript `getValuesString()`. */
    fun valuesString(): String = values.joinToString(" ") { it.toLinkOrIdString() }

    /** The escaped ID of a reference, and the formatted link otherwise. */
    fun toLinkOrIdString(): String = if (values.isEmpty()) escapeReference(id) else format()

    /**
     * The link with single-value containers unwrapped, like JavaScript
     * `Link.simplify()`: a link with one value is that value, and a link with
     * several values simplifies each of them.
     */
    fun simplify(): Link =
        when (values.size) {
            0 -> this
            1 -> values[0]
            else -> Link(id, values.map { it.simplify() })
        }

    /** An anonymous link of this link and [other], like JavaScript `Link.combine()`. */
    fun combine(other: Link): Link = Link(null, listOf(this, other))
}
