package io.github.linkfoundation.linksnotation

/*
 * Comments: a port of `js/src/comments.js` of link-foundation/links-notation.
 *
 * `#` starts a comment when it opens a token: at the start of the document or
 * after a space, a tab or a line break. A `#` inside a token (`issue#1047`) or
 * inside a delimited reference (`"# not a comment"`) is an ordinary character.
 */

/** What a delimited reference may start after. */
private const val BEFORE_REFERENCE = " \t\n\r(:"

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

    while (position < document.length) {
        val character = document[position]

        if (character in QUOTES && follows(document, position, BEFORE_REFERENCE)) {
            position = references.endAt(position) ?: (position + 1)
            continue
        }

        if (character == '#' && follows(document, position, BEFORE_COMMENT)) {
            val chars = blanked ?: document.toCharArray().also { blanked = it }
            while (position < document.length && document[position] != '\n' && document[position] != '\r') {
                chars[position] = ' '
                position++
            }
            continue
        }

        position++
    }

    return blanked?.concatToString() ?: document
}

/** Whether the character before [position] is one of [allowed]; the document start counts as allowed. */
private fun follows(document: String, position: Int, allowed: String): Boolean =
    position == 0 || document[position - 1] in allowed
