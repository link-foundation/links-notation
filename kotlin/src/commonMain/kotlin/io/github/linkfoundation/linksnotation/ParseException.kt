package io.github.linkfoundation.linksnotation

/**
 * Why a document could not be read.
 *
 * Line and column numbers count from 1. Columns count UTF-16 code units, the
 * unit `String.length` counts in Kotlin and in the JavaScript reference parser,
 * so a position reported here is the position the JavaScript parser reports.
 */
sealed class ParseException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    /**
     * The document cannot be read at [line] and [column]: the furthest
     * position the parser reached, exactly as the JavaScript reference reports
     * it. Every refusal of a document that was read is a [Syntax] error; the
     * one for links nested too deep is the more specific [DepthExceeded].
     *
     * @property offset The same position as a UTF-16 offset into the document.
     * @property lineText The line the position is on, without its line ending.
     * @property snippet [lineText] with a caret under the position, as the
     *   message quotes it.
     * @property found The character at the position, or null at the end of the
     *   document, as `ParseError.found` of the JavaScript reference.
     */
    open class Syntax(
        val line: Int,
        val column: Int,
        message: String,
        val offset: Int = 0,
        val lineText: String = "",
        val snippet: String = "",
        val found: String? = null,
    ) : ParseException(message)

    /**
     * Links nest deeper than [limit] levels: every parenthesised group and
     * every indentation level is one level. [line] and [column] point at the
     * group or line that went too deep (0 when unknown). Like the JavaScript
     * reference, which refuses such a document with the same `ParseError` as
     * any other, this is a [Syntax] error too.
     */
    class DepthExceeded(
        val limit: Int,
        line: Int = 0,
        column: Int = 0,
        message: String = "nesting depth exceeds the maximum of $limit",
        offset: Int = 0,
        lineText: String = "",
        snippet: String = "",
        found: String? = null,
    ) : Syntax(line, column, message, offset, lineText, snippet, found)

    /** The document is longer than [limit] UTF-16 code units; it was not read. */
    class InputTooLarge(val limit: Int) :
        ParseException("Input size exceeds maximum allowed size of $limit bytes")
}

/**
 * A streamed document could not be read: a port of `StreamParseError` of
 * `js/src/StreamParser.js`. The [cause] reports a position in the record being
 * buffered; this one reports it in the whole stream.
 *
 * @property offset The UTF-16 offset of the position in the whole stream.
 * @property line The line of the position in the whole stream.
 * @property column The column of the position.
 * @property lineText The line the position is on, as the cause quotes it.
 * @property snippet The line with a caret under the position, as the cause
 *   quotes it.
 */
class StreamParseException(
    override val cause: ParseException,
    val offset: Int,
    val line: Int,
    val column: Int,
    val lineText: String,
    val snippet: String,
) : ParseException("Stream parse error at line $line, column $column: ${cause.message}", cause) {
    internal companion object {
        /** [error], a refusal of the record that starts at [startOffset] and [startLine] of the stream. */
        fun of(error: ParseException, startOffset: Int, startLine: Int): StreamParseException {
            val syntax = error as? ParseException.Syntax
            val localLine = syntax?.line ?: 1
            val line = startLine + localLine - 1
            return StreamParseException(
                error,
                startOffset + (syntax?.offset ?: 0),
                line,
                syntax?.column ?: 1,
                syntax?.lineText ?: "",
                syntax?.snippet ?: "",
            )
        }
    }
}
