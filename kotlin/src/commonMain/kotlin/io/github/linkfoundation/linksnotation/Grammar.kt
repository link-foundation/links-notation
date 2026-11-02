package io.github.linkfoundation.linksnotation

/**
 * A recursive-descent port of `js/src/grammar.pegjs` of
 * link-foundation/links-notation, as Peggy compiles it.
 *
 * Every rule mirrors the generated JavaScript parser: an ordered choice tries
 * its alternatives in order and restores the position between them, actions
 * run as soon as their rule matches and their effects on the indentation state
 * are not undone, and every character test that fails outside a predicate
 * records what it expected at the furthest position reached. That furthest
 * position is where a syntax error is reported, so this parser fails at the
 * same line and column as the JavaScript reference, with the same message.
 *
 * [input] is the document the grammar reads, its comments blanked; [source]
 * is the document as written, which a reference's raw text is sliced from.
 */
internal class Grammar(
    private val input: String,
    private val maxDepth: Int,
    private val source: String = input,
) {
    private var pos = 0

    // Failure tracking, as Peggy's peg$fail. Predicates (`&`, `!`, `&{}`)
    // never record a failure, so they test characters directly.
    private var maxFailPos = 0
    private val maxFailExpected = ArrayList<String>()

    // Indentation state, as the initializer of grammar.pegjs.
    private var indentationStack = mutableListOf(0)
    private var baseIndentation: Int? = null
    private val contextStack = ArrayList<SavedContext>()
    private var contextDepth = 0
    private val unreadableLines = HashSet<Int>()

    // Delimited references are read in the document as written, so blanking a
    // comment never changes what a reference holds or how far it reaches
    // (issue #377). A delimiter is never blanked, so one in [input] opens the
    // same reference in [source].
    private val delimitedReferences = DelimitedReferences(source)

    private class SavedContext(
        val indentationStack: MutableList<Int>,
        val baseIndentation: Int?,
        val contextDepth: Int,
    )

    /** Read the document, or throw [GrammarError]. */
    fun parse(): List<RawItem> {
        val result = document()
        if (result != null && pos == input.length) {
            return result
        }
        if (result != null) {
            fail(END_OF_INPUT)
        }
        throw GrammarError(maxFailPos, syntaxMessage(), depthLimit = null)
    }

    // ---- state helpers ---------------------------------------------------

    private fun resetState() {
        indentationStack = mutableListOf(0)
        baseIndentation = null
        contextStack.clear()
        contextDepth = 0
        unreadableLines.clear()
    }

    private fun lineKey(position: Int): Int = if (contextStack.isNotEmpty()) -1 - position else position

    private fun enterNestedContext() {
        contextStack.add(SavedContext(indentationStack, baseIndentation, contextDepth))
        contextDepth = depth() + 1
        indentationStack = mutableListOf(0)
        baseIndentation = null
    }

    private fun exitNestedContext() {
        if (contextStack.isNotEmpty()) {
            val saved = contextStack.removeAt(contextStack.size - 1)
            indentationStack = saved.indentationStack
            baseIndentation = saved.baseIndentation
            contextDepth = saved.contextDepth
        }
    }

    private fun depth(): Int = contextDepth + indentationStack.size - 1

    private fun checkDepth(
        levels: Int,
        where: Int,
    ) {
        if (levels > maxDepth) {
            throw GrammarError(where, "nesting depth exceeds the maximum of $maxDepth", depthLimit = maxDepth)
        }
    }

    private fun normalizeIndentation(spaces: Int): Int {
        val base = baseIndentation ?: return spaces
        return maxOf(0, spaces - base)
    }

    // ---- terminals -------------------------------------------------------

    private fun fail(expected: String) {
        if (pos < maxFailPos) return
        if (pos > maxFailPos) {
            maxFailPos = pos
            maxFailExpected.clear()
        }
        maxFailExpected.add(expected)
    }

    private fun at(character: Char): Boolean = pos < input.length && input[pos] == character

    /** A literal of one character; records [expected] when it does not match. */
    private fun literal(
        character: Char,
        expected: String,
    ): Boolean {
        if (at(character)) {
            pos++
            return true
        }
        fail(expected)
        return false
    }

    /** `[...]*` (or `+` with [atLeastOne]): how many characters it matched, or -1 when it failed. */
    private inline fun repeatClass(
        expected: String,
        atLeastOne: Boolean = false,
        test: (Char) -> Boolean,
    ): Int {
        val start = pos
        while (pos < input.length && test(input[pos])) {
            pos++
        }
        fail(expected)
        if (atLeastOne && pos == start) return -1
        return pos - start
    }

    // ---- rules -----------------------------------------------------------

    // document = &{ resetState } skipEmptyLines links _ eof / &{ resetState } _ eof
    private fun document(): List<RawItem>? {
        val start = pos
        resetState()
        skipEmptyLines()
        val links = links()
        if (links != null) {
            whitespace()
            if (eof()) return links
        }
        pos = start
        resetState()
        whitespace()
        if (eof()) return emptyList()
        pos = start
        return null
    }

    // skipEmptyLines = ([ \t]* [\r\n])*
    private fun skipEmptyLines() {
        while (true) {
            val start = pos
            spacesAndTabs()
            if (!lineBreakCharacter()) {
                pos = start
                return
            }
        }
    }

    private fun lineBreakCharacter(): Boolean {
        if (pos < input.length && (input[pos] == '\r' || input[pos] == '\n')) {
            pos++
            return true
        }
        fail(LINE_BREAK)
        return false
    }

    // links = firstLine line* { popIndentation() }
    private fun links(): List<RawItem>? {
        val first = firstLine() ?: return null
        val list = mutableListOf(first)
        while (true) {
            list.add(line() ?: break)
        }
        if (indentationStack.size > 1) {
            indentationStack.removeAt(indentationStack.size - 1)
        }
        return list
    }

    // firstLine = SET_BASE_INDENTATION element
    private fun firstLine(): RawItem? {
        val start = pos
        val spaces = repeatClass(SPACE) { it == ' ' }
        if (baseIndentation == null) baseIndentation = spaces
        return element() ?: run {
            pos = start
            null
        }
    }

    // line = CHECK_INDENTATION element
    private fun line(): RawItem? {
        val start = pos
        val spaces = repeatClass(SPACE) { it == ' ' }
        if (normalizeIndentation(spaces) >= indentationStack.last()) {
            element()?.let { return it }
        }
        pos = start
        return null
    }

    // element = &{ readable } HERE anyLink &{ checkDepth } SAVE_INDENTATION (PUSH_INDENTATION links)?
    //         / &{ remember unreadable; false } .
    private fun element(): RawItem? {
        val start = pos
        if (lineKey(pos) !in unreadableLines) {
            val link = anyLink()
            if (link != null) {
                checkDepth(depth(), start)
                val saved = indentationStack.toMutableList()
                val beforeChildren = pos
                var children: List<RawItem>? = null
                if (pushIndentation()) {
                    children = links()
                }
                if (children == null) {
                    pos = beforeChildren
                    // No child line followed the indentation. Forget what
                    // looking for one pushed.
                    indentationStack = saved
                    return link
                }
                return link.withChildren(children)
            }
            pos = start
        }
        unreadableLines.add(lineKey(pos))
        return null
    }

    // PUSH_INDENTATION = " "* &{ deeper } { push }
    private fun pushIndentation(): Boolean {
        val start = pos
        val spaces = repeatClass(SPACE) { it == ' ' }
        val normalized = normalizeIndentation(spaces)
        if (normalized > indentationStack.last()) {
            indentationStack.add(normalized)
            return true
        }
        pos = start
        return false
    }

    // referenceOrLink = multiLineAnyLink / reference
    private fun referenceOrLink(): RawItem? {
        nestedGroup()?.let { return it }
        return reference()?.let { RawItem(id = it.value, rawId = it.raw) }
    }

    // anyLink = &"(" groupLink / !"(" (indentedIdLink / singleLineAnyLink)
    private fun anyLink(): RawItem? {
        if (at('(')) return groupLink()
        return indentedIdLink() ?: singleLineAnyLink()
    }

    // groupLink = multiLineAnyLink groupLinkRest
    private fun groupLink(): RawItem? {
        val start = pos
        val group = nestedGroup() ?: return null
        val rest = groupLinkRest()
        if (rest == null) {
            pos = start
            return null
        }
        return if (rest.values == null) group else RawItem(values = listOf(group) + rest.values)
    }

    private class Rest(
        val values: List<RawItem>?,
    )

    // groupLinkRest = eol { null } / singleLineValueAndWhitespace* eol
    private fun groupLinkRest(): Rest? {
        if (eol()) return Rest(null)
        val start = pos
        val values = ArrayList<RawItem>()
        while (true) {
            values.add(singleLineValueAndWhitespace() ?: break)
        }
        if (eol()) return Rest(values)
        pos = start
        return null
    }

    // singleLineAnyLink = singleLineLink eol / singleLineValueLink eol
    private fun singleLineAnyLink(): RawItem? {
        val start = pos
        singleLineLink()?.let { if (eol()) return it }
        pos = start
        singleLineValueLink()?.let { if (eol()) return it }
        pos = start
        return null
    }

    // nestedGroup = HERE "(" &{ checkDepth } ENTER_NESTED_CONTEXT nestedGroupBody { exit }
    //             / "(" &{ exit; false }
    private fun nestedGroup(): RawItem? {
        val start = pos
        if (literal('(', OPEN)) {
            checkDepth(depth() + 1, start)
            enterNestedContext()
            val body = nestedGroupBody()
            if (body != null) {
                exitNestedContext()
                return body
            }
        }
        pos = start
        if (literal('(', OPEN)) {
            exitNestedContext()
        }
        pos = start
        return null
    }

    // nestedGroupBody = skipEmptyLines links _ ")" / _ ")"
    private fun nestedGroupBody(): RawItem? {
        val start = pos
        skipEmptyLines()
        val links = links()
        if (links != null) {
            whitespace()
            if (literal(')', CLOSE)) return RawItem(nested = links)
        }
        pos = start
        whitespace()
        if (literal(')', CLOSE)) return RawItem(nested = emptyList())
        pos = start
        return null
    }

    // singleLineValueAndWhitespace = __ referenceOrLink
    private fun singleLineValueAndWhitespace(): RawItem? {
        val start = pos
        spacesAndTabs()
        return referenceOrLink() ?: run {
            pos = start
            null
        }
    }

    // singleLineValues = singleLineValueAndWhitespace+
    private fun singleLineValues(): List<RawItem>? {
        val values = ArrayList<RawItem>()
        while (true) {
            values.add(singleLineValueAndWhitespace() ?: break)
        }
        return values.ifEmpty { null }
    }

    // singleLineLink = __ reference __ ":" singleLineValues
    private fun singleLineLink(): RawItem? {
        val start = pos
        spacesAndTabs()
        val id = reference()
        if (id != null) {
            spacesAndTabs()
            if (literal(':', COLON)) {
                val values = singleLineValues()
                if (values != null) return RawItem(id = id.value, rawId = id.raw, values = values)
            }
        }
        pos = start
        return null
    }

    // singleLineValueLink = singleLineValues
    private fun singleLineValueLink(): RawItem? = singleLineValues()?.let { RawItem(values = it) }

    // indentedIdLink = reference __ ":" eol
    private fun indentedIdLink(): RawItem? {
        val start = pos
        val id = reference()
        if (id != null) {
            spacesAndTabs()
            if (literal(':', COLON) && eol()) return RawItem(id = id.value, rawId = id.raw, values = emptyList())
        }
        pos = start
        return null
    }

    /** What a reference means, and the text it was written as. */
    private class Reference(
        val value: String,
        val raw: String,
    )

    // reference = HERE value:(referenceLiteral / quotedReference / simpleReference) HERE
    //             { return { value, raw: source.slice(start, end) } }
    private fun reference(): Reference? {
        val start = pos
        val value = referenceLiteral() ?: quotedReference() ?: simpleReference() ?: return null
        return Reference(value, source.substring(start, pos))
    }

    // referenceLiteral = &'~' &{ prefix } $('~' [0-9]+ '{' [^} \t\r\n()]* '}')
    private fun referenceLiteral(): String? {
        if (!at('~') || !hasReferenceLiteralPrefix(input, pos)) return null
        val start = pos
        pos++ // '~'
        repeatClass(DIGIT, atLeastOne = true) { it in '0'..'9' }
        pos++ // '{', guaranteed by the prefix
        repeatClass(LITERAL_BODY) { it != '}' && it != ' ' && it != '\t' && it != '\r' && it != '\n' && it != '(' && it != ')' }
        if (!literal('}', CLOSE_BRACE)) {
            pos = start
            return null
        }
        val literal = input.substring(start, pos)
        return try {
            decodeReferenceLiteral(literal)
        } catch (invalid: IllegalArgumentException) {
            throw GrammarError(start, invalid.message ?: "Invalid reference literal", depthLimit = null)
        }
    }

    // quotedReference = doubleQuotedUniversal / singleQuotedUniversal / backtickQuotedUniversal
    // Each one peeks at its quote, reads the reference procedurally, and
    // consumes exactly the characters it takes; none of that records a failure.
    private fun quotedReference(): String? {
        if (pos >= input.length || input[pos] !in QUOTES) return null
        val reading = delimitedReferences.readAt(pos) ?: return null
        pos += reading.length
        return reading.value
    }

    // simpleReference = &{ no literal prefix } referenceSymbol+
    private fun simpleReference(): String? {
        if (hasReferenceLiteralPrefix(input, pos)) return null
        val start = pos
        val length =
            repeatClass(REFERENCE_SYMBOL, atLeastOne = true) {
                it != ' ' && it != '\t' && it != '\n' && it != '\r' && it != '(' && it != ':' && it != ')'
            }
        return if (length < 0) null else input.substring(start, pos)
    }

    // eol = __ (lineBreaks / eof / nestedGroupEnd)
    private fun eol(): Boolean {
        val start = pos
        spacesAndTabs()
        if (lineBreaks() || eof() || (contextStack.isNotEmpty() && at(')'))) return true
        pos = start
        return false
    }

    // lineBreaks = [\r\n]+ ([ \t]+ [\r\n]+)*
    private fun lineBreaks(): Boolean {
        if (repeatClass(LINE_BREAK, atLeastOne = true, ::isLineBreak) < 0) return false
        while (true) {
            val start = pos
            if (repeatClass(SPACE_OR_TAB, atLeastOne = true, ::isSpaceOrTab) < 0 ||
                repeatClass(LINE_BREAK, atLeastOne = true, ::isLineBreak) < 0
            ) {
                pos = start
                return true
            }
        }
    }

    // eof = !.
    private fun eof(): Boolean = pos >= input.length

    // __ = [ \t]*
    private fun spacesAndTabs() {
        repeatClass(SPACE_OR_TAB, test = ::isSpaceOrTab)
    }

    // _ = [ \t\n\r]*
    private fun whitespace() {
        repeatClass(WHITESPACE) { isSpaceOrTab(it) || isLineBreak(it) }
    }

    // ---- messages --------------------------------------------------------

    /** Peggy's message: `Expected <what> but <found> found.` */
    private fun syntaxMessage(): String {
        val descriptions = maxFailExpected.distinct().sorted()
        val expected =
            when (descriptions.size) {
                0 -> "nothing"
                1 -> descriptions[0]
                2 -> "${descriptions[0]} or ${descriptions[1]}"
                else -> descriptions.dropLast(1).joinToString(", ") + ", or " + descriptions.last()
            }
        val found =
            if (maxFailPos < input.length) {
                val end =
                    if (input[maxFailPos].isHighSurrogate() && maxFailPos + 1 < input.length &&
                        input[maxFailPos + 1].isLowSurrogate()
                    ) {
                        maxFailPos + 2
                    } else {
                        maxFailPos + 1
                    }
                "\"" + literalEscape(input.substring(maxFailPos, end)) + "\""
            } else {
                END_OF_INPUT
            }
        return "Expected $expected but $found found."
    }

    private companion object {
        const val SPACE_OR_TAB = "[ \\t]"
        const val LINE_BREAK = "[\\r\\n]"
        const val OPEN = "\"(\""
        const val CLOSE = "\")\""
        const val COLON = "\":\""
        const val DIGIT = "[0-9]"
        const val LITERAL_BODY = "[^} \\t\\r\\n()]"
        const val CLOSE_BRACE = "\"}\""
        const val SPACE = "\" \""
        const val WHITESPACE = "[ \\t\\n\\r]"
        const val REFERENCE_SYMBOL = "[^ \\t\\n\\r(:)]"
        const val END_OF_INPUT = "end of input"

        fun isSpaceOrTab(character: Char): Boolean = character == ' ' || character == '\t'

        fun isLineBreak(character: Char): Boolean = character == '\r' || character == '\n'

        /** Peggy's literalEscape, for the characters it names. */
        fun literalEscape(text: String): String {
            val escaped = StringBuilder()
            for (character in text) {
                when {
                    character == '\\' -> {
                        escaped.append("\\\\")
                    }

                    character == '"' -> {
                        escaped.append("\\\"")
                    }

                    character == '\u0000' -> {
                        escaped.append("\\0")
                    }

                    character == '\t' -> {
                        escaped.append("\\t")
                    }

                    character == '\n' -> {
                        escaped.append("\\n")
                    }

                    character == '\r' -> {
                        escaped.append("\\r")
                    }

                    character < '\u0010' -> {
                        escaped.append("\\x0").append(character.code.toString(16).uppercase())
                    }

                    character < ' ' || character in '\u007f'..'\u009f' -> {
                        escaped.append("\\x").append(character.code.toString(16).uppercase())
                    }

                    else -> {
                        escaped.append(character)
                    }
                }
            }
            return escaped.toString()
        }
    }
}

/**
 * Where and why the grammar stopped: [offset] into the document, and, for a
 * document nested too deep, the [depthLimit] it went past.
 */
internal class GrammarError(
    val offset: Int,
    message: String,
    val depthLimit: Int?,
) : RuntimeException(message)
