package io.github.linkfoundation.linksnotation

/*
 * Comments: a port of `js/src/comments.js` of link-foundation/links-notation.
 *
 * `#` starts a comment when it opens a token and is not a value:
 *
 * - at the start of a line, after any indentation, a `#` always starts one;
 * - later on a line, after a space or a tab, a `#` starts one only when no
 *   character that could continue a bare reference follows it, that is when
 *   whitespace, the end of the document, `(`, `)` or `:` comes next. So
 *   `a: b # why` and `a: b #` hold a comment, while `tag #release` is the link
 *   of `tag` and `#release` (issue #444): a value is never silently dropped.
 *
 * A `#` inside a token (`issue#1047`) or inside a delimited reference
 * (`"# not a comment"`) is an ordinary character.
 */

/** What a comment may start after. */
private const val BEFORE_COMMENT = " \t\n\r"

/** Indentation: what may stand between the start of a line and a comment. */
private const val INDENTATION = " \t"

/**
 * Whether the `#` at [position] of [document] starts a comment: it opens a
 * token, and either only indentation stands before it on its line or no
 * character that could continue a bare reference follows it.
 *
 * ```
 * opensComment("# note", 0)        // true: the start of a line
 * opensComment("a #", 2)           // true: nothing follows it
 * opensComment("a # why", 2)       // true: a space follows it
 * opensComment("tag #release", 4)  // false: a value
 * opensComment("issue#1047", 5)    // false: inside a token
 * ```
 */
internal fun opensComment(
    document: String,
    position: Int,
): Boolean {
    if (position >= document.length || document[position] != '#') return false
    if (!follows(document, position, BEFORE_COMMENT)) return false
    var before = position - 1
    while (before >= 0 && document[before] in INDENTATION) before--
    if (before < 0 || document[before] == '\n' || document[before] == '\r') return true
    val next = position + 1
    return next >= document.length || document[next] in TOKEN_SEPARATORS
}

/**
 * [document] with every character of every comment replaced by a space, so
 * every other character keeps its offset and a parse error points at the
 * position the reader can see.
 *
 * ```
 * stripComments("a: b # why\n")   // "a: b      \n"
 * stripComments("tag #release\n") // "tag #release\n"
 * ```
 */
fun stripComments(document: String): String {
    var blanked: CharArray? = null
    var position = 0
    val references = DelimitedReferences(document)
    // Whether a token may start at `position`. The document is read token by
    // token, as the grammar reads it, so a `#` inside a reference that starts
    // right after a group, another reference or a literal stays content
    // (issue #377).
    var tokenStart = true

    while (position < document.length) {
        val character = document[position]

        if (character == '#' && opensComment(document, position)) {
            val chars = blanked ?: document.toCharArray().also { blanked = it }
            while (position < document.length && document[position] != '\n' && document[position] != '\r') {
                chars[position] = ' '
                position++
            }
            continue
        }

        if (character in TOKEN_SEPARATORS) {
            tokenStart = true
            position++
            continue
        }

        if (tokenStart) {
            val end = delimitedTokenEnd(document, position, references)
            if (end != null) {
                position = end
                continue
            }
        }

        // Anything else is part of a bare reference, which runs to a separator.
        tokenStart = false
        position++
    }

    return blanked?.concatToString() ?: document
}

/**
 * Where the versioned literal or delimited reference that starts the token at
 * [start] ends, or null when the token there is a bare reference: a delimiter
 * run that never closes is read as one, as the grammar reads it.
 */
private fun delimitedTokenEnd(
    document: String,
    start: Int,
    references: DelimitedReferences,
): Int? {
    val literal = referenceLiteralEnd(document, start)
    if (literal != -1) return literal
    return if (document[start] in QUOTES) references.endAt(start) else null
}

/** Whether the character before [position] is one of [allowed]; the document start counts as allowed. */
private fun follows(
    document: String,
    position: Int,
    allowed: String,
): Boolean = position == 0 || document[position - 1] in allowed

/** Position just past the delimited reference opened at [start] of [document], or null: `quotedReferenceEnd` of the JavaScript reference. */
internal fun quotedReferenceEnd(
    document: String,
    start: Int,
): Int? = readReference(document, start)?.let { start + it.length }
