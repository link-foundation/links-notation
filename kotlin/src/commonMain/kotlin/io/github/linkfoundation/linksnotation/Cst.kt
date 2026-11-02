package io.github.linkfoundation.linksnotation

/*
 * The concrete syntax tree of a Links Notation document: a port of
 * `js/src/Cst.js` of link-foundation/links-notation.
 *
 * Every character of a document belongs to exactly one token, so the text of
 * the tree is the document itself, comments, blank lines, indentation, quotes
 * and line endings included. A document is a list of `line` nodes; a line
 * holds the tokens up to and including its line ending, and a parenthesised
 * `group` node holds its own parentheses and the lines written between them. A
 * group is part of the line it opens on, however many lines it spans.
 */

/** The kinds of nodes and tokens of a concrete syntax tree. */
enum class CstKind(
    /** The name the S-expression and every other implementation use. */
    val value: String,
    /** Whether a node of this kind has children rather than text. */
    internal val isNode: Boolean = false,
) {
    /** The whole document: its lines. */
    DOCUMENT("document", isNode = true),

    /** One line: its tokens and groups, up to and including its line ending. */
    LINE("line", isNode = true),

    /** A parenthesised group: `(`, the lines inside it, and `)`. */
    GROUP("group", isNode = true),

    /** A run of spaces and tabs. */
    WHITESPACE("whitespace"),

    /** One line ending: `\n`, `\r\n` or `\r`. */
    NEWLINE("newline"),

    /** A comment, from `#` up to the line ending. */
    COMMENT("comment"),

    /** `(` */
    OPEN_PAREN("open_paren"),

    /** `)` */
    CLOSE_PAREN("close_paren"),

    /** `:` */
    COLON("colon"),

    /** A bare, quoted or versioned literal reference. */
    REFERENCE("reference"),
    ;

    override fun toString(): String = value
}

/**
 * One node or token of a concrete syntax tree, as [Parser.parseCst] returns it.
 *
 * @property kind What it is.
 * @property value What a reference token means, its delimiters and escapes
 *   resolved (the ID a parsed link has); null for every other node and token.
 * @property quote The delimiter a quoted reference token was written between
 *   (`'`, `"` or `` ` ``); null for a bare or literal reference and every
 *   other kind.
 */
class CstNode internal constructor(
    val kind: CstKind,
    private val tokenText: String = "",
    val value: String? = null,
    val quote: String? = null,
) {
    internal val mutableChildren = ArrayList<CstNode>()

    /** The children of a node, in document order; empty for a token. */
    val children: List<CstNode>
        get() = mutableChildren

    /** Whether this is a token rather than a node with children. */
    val isToken: Boolean
        get() = !kind.isNode

    /** The exact text this node or token was read from. */
    val text: String
        get() = if (isToken) tokenText else buildString { appendText(this) }

    private fun appendText(builder: StringBuilder) {
        if (isToken) {
            builder.append(tokenText)
        } else {
            for (child in mutableChildren) child.appendText(builder)
        }
    }

    /** The exact text this node or token was read from. */
    override fun toString(): String = text

    /** Every token of this subtree, in document order. */
    fun tokens(): List<CstNode> {
        val result = ArrayList<CstNode>()
        collectTokens(result)
        return result
    }

    private fun collectTokens(result: MutableList<CstNode>) {
        if (isToken) {
            result.add(this)
        } else {
            for (child in mutableChildren) child.collectTokens(result)
        }
    }

    /**
     * The tree as an S-expression: `(kind child ...)` for a node and
     * `kind:"text"` for a token, the text escaped as a JSON string would escape
     * `\`, `"`, line feeds, carriage returns and tabs. Two trees are the same
     * exactly when their S-expressions are.
     */
    fun toSExpression(): String = buildString { appendSExpression(this) }

    private fun appendSExpression(builder: StringBuilder) {
        if (isToken) {
            builder.append(kind.value).append(':').append('"')
            for (character in tokenText) {
                when (character) {
                    '\\' -> builder.append("\\\\")
                    '"' -> builder.append("\\\"")
                    '\n' -> builder.append("\\n")
                    '\r' -> builder.append("\\r")
                    '\t' -> builder.append("\\t")
                    else -> builder.append(character)
                }
            }
            builder.append('"')
            return
        }
        builder.append('(').append(kind.value)
        for (child in mutableChildren) {
            builder.append(' ')
            child.appendSExpression(builder)
        }
        builder.append(')')
    }
}

/** What a versioned literal's payload cannot contain. */
private const val LITERAL_PAYLOAD_END = "} \t\r\n()"

/** What ends a bare reference. */
private const val BARE_REFERENCE_END = " \t\r\n(:)"

/**
 * Where the versioned literal `~<digits>{<payload>}` that starts at [start]
 * ends, or -1 if none starts there. A single forward scan, so it stays linear.
 */
private fun literalEnd(
    text: String,
    start: Int,
): Int {
    if (start >= text.length || text[start] != '~') return -1
    var index = start + 1
    while (index < text.length && text[index] in '0'..'9') index++
    if (index == start + 1 || index >= text.length || text[index] != '{') return -1
    index++
    while (index < text.length && text[index] !in LITERAL_PAYLOAD_END) index++
    return if (index < text.length && text[index] == '}') index + 1 else -1
}

/** Where the reference that starts at [start] ends, read as the grammar reads it. */
private fun referenceEnd(
    prepared: String,
    start: Int,
    references: DelimitedReferences,
): Int {
    val literal = literalEnd(prepared, start)
    if (literal != -1) return literal
    if (prepared[start] in QUOTES) {
        val end = references.endAt(start)
        if (end != null) return end
    }
    var end = start + 1
    while (end < prepared.length && prepared[end] !in BARE_REFERENCE_END) end++
    return end
}

/** An open container of the tree, and the line of it being filled. */
private class Container(
    val node: CstNode,
) {
    var line: CstNode? = null
}

/**
 * The concrete syntax tree of [input], a document that has already been
 * parsed with the same [comments] option.
 *
 * @throws IllegalArgumentException when the parentheses of [input] do not
 *   balance, which a parsed document never does.
 */
internal fun buildCst(
    input: String,
    comments: Boolean = true,
): CstNode {
    // References are read in the document the grammar reads: the one with its
    // comments blanked, which keeps every position of the one written.
    val prepared = if (comments) stripComments(input) else input
    val references = DelimitedReferences(prepared)
    val document = CstNode(CstKind.DOCUMENT)
    // The open containers, innermost last.
    val containers = ArrayList<Container>()
    containers.add(Container(document))

    fun add(token: CstNode) {
        val container = containers.last()
        val line =
            container.line ?: CstNode(CstKind.LINE).also {
                container.line = it
                container.node.mutableChildren.add(it)
            }
        line.mutableChildren.add(token)
    }

    var position = 0
    while (position < input.length) {
        val character = input[position]
        var end = position + 1

        if (comments && character == '#' && prepared[position] != '#') {
            // A blanked `#` opens a comment, which runs to the line ending.
            while (end < input.length && input[end] != '\n' && input[end] != '\r') end++
            add(CstNode(CstKind.COMMENT, input.substring(position, end)))
        } else if (character == '\r' || character == '\n') {
            if (character == '\r' && end < input.length && input[end] == '\n') end++
            add(CstNode(CstKind.NEWLINE, input.substring(position, end)))
            containers.last().line = null
        } else if (character == ' ' || character == '\t') {
            while (end < input.length && (input[end] == ' ' || input[end] == '\t')) end++
            add(CstNode(CstKind.WHITESPACE, input.substring(position, end)))
        } else if (character == '(') {
            val group = CstNode(CstKind.GROUP)
            group.mutableChildren.add(CstNode(CstKind.OPEN_PAREN, "("))
            add(group)
            containers.add(Container(group))
        } else if (character == ')') {
            require(containers.size > 1) { "Unbalanced \")\" at offset $position" }
            containers
                .removeAt(containers.size - 1)
                .node.mutableChildren
                .add(CstNode(CstKind.CLOSE_PAREN, ")"))
        } else if (character == ':') {
            add(CstNode(CstKind.COLON, ":"))
        } else {
            end = referenceEnd(prepared, position, references)
            val text = input.substring(position, end)
            val quoted = if (character in QUOTES) references.readAt(position) else null
            val value =
                when {
                    quoted != null -> quoted.value
                    character == '~' && literalEnd(prepared, position) == end -> decodeReferenceLiteral(text)
                    else -> text
                }
            add(CstNode(CstKind.REFERENCE, text, value, if (quoted != null) character.toString() else null))
        }
        position = end
    }

    require(containers.size == 1) { "Unbalanced \"(\" at the end of the document" }
    return document
}
