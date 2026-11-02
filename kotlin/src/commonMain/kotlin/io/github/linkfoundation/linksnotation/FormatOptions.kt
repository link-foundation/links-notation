package io.github.linkfoundation.linksnotation

/**
 * How [formatLinks] and [Link.format] write links: a port of `FormatOptions`
 * of `js/src/FormatOptions.js`, with the same defaults.
 *
 * @property lessParentheses Leave out the outer parentheses where the text
 *   still reads back the same.
 * @property maxLineLength The longest line [indentLongLines] keeps inline.
 * @property indentLongLines Write a link longer than [maxLineLength] with its
 *   values on indented lines.
 * @property maxInlineRefs The most values a link keeps inline; null means no
 *   limit.
 * @property groupConsecutive Merge consecutive links with the same ID into one
 *   link holding all of their values.
 * @property indentString What an indented value starts with.
 * @property preferInline Keep links inline even when a limit says to indent
 *   them; set it to false for the limits to take effect.
 */
data class FormatOptions(
    val lessParentheses: Boolean = false,
    val maxLineLength: Int = 80,
    val indentLongLines: Boolean = false,
    val maxInlineRefs: Int? = null,
    val groupConsecutive: Boolean = false,
    val indentString: String = "  ",
    val preferInline: Boolean = true,
) {
    /** Whether [line] is long enough to be indented. */
    fun shouldIndentByLength(line: String): Boolean = indentLongLines && line.length > maxLineLength

    /** Whether a link with [refCount] values holds too many to stay inline. */
    fun shouldIndentByRefCount(refCount: Int): Boolean = maxInlineRefs != null && refCount > maxInlineRefs
}

/** The name JavaScript, Python and the other implementations also use for [FormatOptions]. */
typealias FormatConfig = FormatOptions
