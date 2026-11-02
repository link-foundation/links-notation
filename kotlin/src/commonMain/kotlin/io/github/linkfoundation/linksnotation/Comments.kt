package io.github.linkfoundation.linksnotation

/*
 * Comments: a port of `js/src/comments.js` of link-foundation/links-notation.
 *
 * `#` starts a comment when it opens a token: at the start of the document or
 * after a space, a tab or a line break. A `#` inside a token (`issue#1047`) or
 * inside a delimited reference (`"# not a comment"`) is an ordinary character.
 */

/** What a comment may start after. */
private const val BEFORE_COMMENT = " \t\n\r"

/**
 * [document] with every character of every comment replaced by a space, so
 * every other character keeps its offset and a parse error points at the
 * position the reader can see.
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

        if (character == '#' && follows(document, position, BEFORE_COMMENT)) {
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
