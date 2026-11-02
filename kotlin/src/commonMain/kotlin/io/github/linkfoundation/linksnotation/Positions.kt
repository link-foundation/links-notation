package io.github.linkfoundation.linksnotation

/*
 * Where an error is, said the way `js/src/ParseError.js` of
 * link-foundation/links-notation says it.
 */

/** The number of characters a quoted line is cut down to. */
private const val QUOTED_LINE_WIDTH = 80

/** What a message writes in place of the part of a long line it left out. */
private const val ELLIPSIS = "..."

internal class Position(
    val offset: Int,
    val line: Int,
    val column: Int,
)

/** The line and column of [offset], counting CR, LF and CRLF as one line break each. */
internal fun positionAt(
    input: String,
    offset: Int,
): Position {
    val at = offset.coerceIn(0, input.length)
    var line = 1
    var column = 1
    var index = 0
    while (index < at) {
        when (input[index]) {
            '\r' -> {
                line++
                column = 1
                if (index + 1 < at && input[index + 1] == '\n') index++
            }

            '\n' -> {
                line++
                column = 1
            }

            else -> {
                column++
            }
        }
        index++
    }
    return Position(at, line, column)
}

/** The line [offset] falls on, without its line ending. */
internal fun lineAt(
    input: String,
    offset: Int,
): String {
    val at = offset.coerceIn(0, input.length)
    val start = maxOf(input.lastIndexOf('\n', at - 1), input.lastIndexOf('\r', at - 1)) + 1
    var end = start
    while (end < input.length && input[end] != '\n' && input[end] != '\r') end++
    return input.substring(start, end)
}

/** The offending line with a caret under the offending column. */
internal fun quoteLine(
    number: Int,
    lineText: String,
    column: Int,
): String {
    var quoted = lineText
    var at = column
    if (lineText.length > QUOTED_LINE_WIDTH) {
        val target = column - 1
        val lastStart = lineText.length - QUOTED_LINE_WIDTH
        val start = minOf(maxOf(target - QUOTED_LINE_WIDTH / 2, 0), lastStart)
        val end = start + QUOTED_LINE_WIDTH
        quoted = (if (start > 0) ELLIPSIS else "") + lineText.substring(start, end) +
            (if (end < lineText.length) ELLIPSIS else "")
        at = target - start + (if (start > 0) ELLIPSIS.length else 0) + 1
    }
    val gutter = " ".repeat(number.toString().length)
    return "$number | $quoted\n$gutter | ${" ".repeat(at - 1)}^"
}
