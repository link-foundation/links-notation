package io.github.linkfoundation.linksnotation

/**
 * Reads Links Notation text into [Link]s, exactly as the JavaScript reference
 * parser (`links-notation` on npm) does: the same links for every document it
 * reads, and the same line and column for every document it refuses.
 */
class Parser(val options: ParserOptions = ParserOptions()) {
    /**
     * The links of [text].
     *
     * @throws ParseException.InputTooLarge when [text] is longer than the
     *   options allow; it is not read.
     * @throws ParseException.DepthExceeded when links nest deeper than
     *   [ParserOptions.maxDepth].
     * @throws ParseException.Syntax when [text] is not Links Notation.
     */
    fun parse(text: String): List<Link> {
        val links = ArrayList<Link>()
        for (item in read(text)) {
            collectLinks(item, emptyList(), links)
        }
        return links
    }

    /**
     * The indentation tree of [text] before it is expanded into path
     * combinations, like JavaScript `Parser.parseGroups`: each group's element
     * is the link on that line, and its children are the groups of the lines
     * indented directly under it. Parenthesised values stay links.
     *
     * @throws ParseException when [parse] would.
     */
    fun parseGroups(text: String): List<LinksGroup> = read(text).map(::transformGroup)

    /**
     * [text] as a lossless concrete syntax tree, like JavaScript
     * `Parser.parseCst`: every character, comments and whitespace included,
     * belongs to exactly one token, so `parseCst(text).toString() == text`.
     *
     * @throws ParseException when [parse] would; the document is parsed with
     *   these options first.
     */
    fun parseCst(text: String): CstNode {
        parse(text)
        return buildCst(text, options.comments)
    }

    private fun transformGroup(item: RawItem): LinksGroup =
        LinksGroup(transformLink(item), item.children.orEmpty().map(::transformGroup))

    private fun read(text: String): List<RawItem> {
        val limit = options.maxInputSize ?: ParserOptions.DEFAULT_MAX_INPUT_SIZE
        if (text.length > limit) {
            throw ParseException.InputTooLarge(limit)
        }

        // Comments are blanked rather than removed, so a position in the
        // prepared document is the same position in the document as written.
        val prepared = if (options.comments) stripComments(text) else text
        try {
            return Grammar(prepared, options.maxDepth, source = text).parse()
        } catch (error: GrammarError) {
            throw toParseException(text, error)
        }
    }

    private fun collectLinks(item: RawItem, parentPath: List<Link>, result: MutableList<Link>) {
        val children = item.children
        if (children.isNullOrEmpty()) {
            result.add(combinePathElements(parentPath, transformLink(item)))
            return
        }
        if (item.id != null && item.values.isNullOrEmpty()) {
            // An ID with indented lines under it: those lines are its values.
            val link = withRawId(Link(item.id, children.map(::transformIndentedValue)), item)
            result.add(combinePathElements(parentPath, link))
            return
        }
        val current = transformLink(item)
        result.add(combinePathElements(parentPath, current))
        val path = parentPath + current
        for (child in children) {
            collectLinks(child, path, result)
        }
    }

    // A line below an indented ID is a value in its own right. Bare single
    // references unwrap, but named links and descendants keep their structure.
    private fun transformIndentedValue(item: RawItem): Link {
        val children = item.children.orEmpty()
        if (children.isNotEmpty() && item.id != null && item.values.isNullOrEmpty()) {
            return withRawId(Link(item.id, children.map(::transformIndentedValue)), item)
        }
        val current = transformLink(item)
        if (children.isNotEmpty()) {
            return withRawId(Link(current.id, current.values + children.map(::transformIndentedValue)), item)
        }
        if (item.id == null && item.nested == null && current.values.size == 1) {
            return current.values[0]
        }
        return current
    }

    private fun combinePathElements(path: List<Link>, current: Link): Link {
        if (path.isEmpty()) return current
        val parent = if (path.size == 1) path[0] else combinePathElements(path.dropLast(1), path.last())
        return Link(null, listOf(parent, current)).also { it.isFromPathCombination = true }
    }

    // A group holding one link is that link; a group holding several, or one
    // group, is an anonymous link of them, so `((a b))` stays apart from `(a b)`.
    private fun transformNested(nested: List<RawItem>): Link {
        val links = ArrayList<Link>()
        for (item in nested) {
            collectLinks(item, emptyList(), links)
        }
        val wrapsSingleGroup = nested.size == 1 && nested[0].nested != null
        if (links.size == 1 && !wrapsSingleGroup) {
            return links[0]
        }
        return Link(null, links)
    }

    private fun transformLink(item: RawItem): Link {
        val nested = item.nested
        if (nested != null) return transformNested(nested)
        val values = item.values ?: return withRawId(Link(item.id), item)
        return withRawId(Link(item.id, values.map(::transformLink)), item)
    }

    // Record how the item wrote its ID, unless these options read a bare
    // abstract syntax tree.
    private fun withRawId(link: Link, item: RawItem): Link {
        if (options.syntax && link.id != null && item.rawId != null) {
            link.rawId = item.rawId
        }
        return link
    }

    private fun toParseException(text: String, error: GrammarError): ParseException {
        val position = positionAt(text, error.offset)
        val lineText = lineAt(text, position.offset)
        val summary = "line ${position.line}, column ${position.column}: ${error.message}"
        val snippet = quoteLine(position.line, lineText, position.column)
        val found = if (position.offset < text.length) text[position.offset].toString() else null
        val depthLimit = error.depthLimit
        if (depthLimit != null) {
            return ParseException.DepthExceeded(
                depthLimit,
                position.line,
                position.column,
                "Nesting too deep at $summary\n$snippet",
                position.offset,
                lineText,
                snippet,
                found,
            )
        }
        return ParseException.Syntax(
            position.line,
            position.column,
            "Syntax error at $summary\n$snippet",
            position.offset,
            lineText,
            snippet,
            found,
        )
    }
}
