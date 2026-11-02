package io.github.linkfoundation.linksnotation

/**
 * The links as Links Notation text, one link per line: the same text as
 * JavaScript `formatLinks(links)`. Parsing the result gives the same links back.
 */
fun formatLinks(links: List<Link>): String = formatLinks(links, lessParentheses = false)

/** The links as Links Notation text, like JavaScript `formatLinks(links, lessParentheses)`. */
fun formatLinks(links: List<Link>, lessParentheses: Boolean): String =
    links.joinToString("\n") { it.format(lessParentheses) }

/**
 * The links as Links Notation text written as [options] say, one link per
 * line, like JavaScript `formatLinks(links, formatOptions)`.
 */
fun formatLinks(links: List<Link>, options: FormatOptions): String {
    val toFormat = if (options.groupConsecutive) groupConsecutiveLinks(links) else links
    return toFormat.joinToString("\n") { it.format(options) }
}

/** Port of `Link.format(lessParentheses, isCompoundValue)` of `js/src/Link.js`. */
internal fun formatLink(link: Link, lessParentheses: Boolean, isCompoundValue: Boolean): String {
    val id = link.id
    val values = link.values

    // Empty link
    if (id == null && values.isEmpty()) {
        return if (lessParentheses) "" else "()"
    }

    // Link with only an ID
    if (values.isEmpty()) {
        val escapedId = escapeReference(id)
        if (isCompoundValue) {
            return "($escapedId)"
        }
        return if (lessParentheses && !needsParentheses(id)) escapedId else "($escapedId)"
    }

    val valuesText = values.joinToString(" ") { formatValue(link, it) }

    // Link with values only
    if (id == null) {
        if (lessParentheses) {
            if (values.all { it.values.isEmpty() }) {
                return values.joinToString(" ") { escapeReference(it.id) }
            }
            return valuesText
        }
        return "($valuesText)"
    }

    // Link with an ID and values
    val withColon = "${escapeReference(id)}: $valuesText"
    return if (lessParentheses && !needsParentheses(id)) withColon else "($withColon)"
}

/** Port of `Link._formatWithOptions(options, isCompoundValue)` of `js/src/Link.js`. */
internal fun formatLinkWithOptions(link: Link, options: FormatOptions, isCompoundValue: Boolean): String {
    val id = link.id
    val values = link.values

    // Empty link
    if (id == null && values.isEmpty()) {
        return if (options.lessParentheses) "" else "()"
    }

    // Link with only an ID
    if (values.isEmpty()) {
        val escapedId = escapeReference(id)
        if (isCompoundValue) {
            return "($escapedId)"
        }
        return if (options.lessParentheses && !needsParentheses(id)) escapedId else "($escapedId)"
    }

    val valuesText = values.joinToString(" ") { formatValue(link, it) }
    val shouldIndent =
        options.shouldIndentByRefCount(values.size) ||
            options.shouldIndentByLength(
                if (id != null) {
                    val idText = escapeReference(id)
                    if (options.lessParentheses) "$idText: $valuesText" else "($idText: $valuesText)"
                } else {
                    if (options.lessParentheses) valuesText else "($valuesText)"
                },
            )
    if (shouldIndent && !options.preferInline) {
        return formatIndented(link, options)
    }

    // Link with values only
    if (id == null) {
        if (options.lessParentheses) {
            if (values.all { it.values.isEmpty() }) {
                return values.joinToString(" ") { escapeReference(it.id) }
            }
            return valuesText
        }
        return "($valuesText)"
    }

    // Link with an ID and values
    val withColon = "${escapeReference(id)}: $valuesText"
    return if (options.lessParentheses && !needsParentheses(id)) withColon else "($withColon)"
}

/** Port of `Link._formatIndented(options)`: the values on indented lines. */
private fun formatIndented(link: Link, options: FormatOptions): String {
    val lines = ArrayList<String>()
    if (link.id != null) {
        lines.add("${escapeReference(link.id)}:")
    }
    for (value in link.values) {
        lines.add(options.indentString + formatValue(link, value))
    }
    return lines.joinToString("\n")
}

/**
 * Port of `_groupConsecutiveLinks` of `js/src/Link.js`: consecutive links with
 * the same ID and values become one link holding all of their values.
 */
private fun groupConsecutiveLinks(links: List<Link>): List<Link> {
    val grouped = ArrayList<Link>()
    var index = 0
    while (index < links.size) {
        val current = links[index]
        if (current.id != null && current.values.isNotEmpty()) {
            val sameIdValues = ArrayList(current.values)
            var next = index + 1
            while (next < links.size && links[next].id == current.id && links[next].values.isNotEmpty()) {
                sameIdValues.addAll(links[next].values)
                next++
            }
            if (next > index + 1) {
                grouped.add(Link(current.id, sameIdValues))
                index = next
                continue
            }
        }
        grouped.add(current)
        index++
    }
    return grouped
}

/** Port of `Link.formatValue(value)`: how [value] is written inside [parent]. */
private fun formatValue(parent: Link, value: Link): String {
    if (parent.isFromPathCombination) {
        return formatLink(value, lessParentheses = false, isCompoundValue = true)
    }
    if (value.values.isEmpty()) {
        return escapeReference(value.id)
    }
    return formatLink(value, lessParentheses = false, isCompoundValue = false)
}

/** Port of `Link.needsParentheses(str)`. */
private fun needsParentheses(text: String?): Boolean =
    !text.isNullOrEmpty() &&
        (text.contains(' ') || text.contains(':') || text.contains('(') || text.contains(')'))
