package io.github.linkfoundation.linksnotation

/**
 * Reads a Links Notation document written to it in chunks, publishing each
 * top-level record as soon as it is complete: a port of `StreamParser` of
 * `js/src/StreamParser.js`.
 *
 * A line can acquire indented children, so its line ending alone does not
 * prove that the record is complete. A buffered record is published as soon as
 * the first non-indented character of the next record arrives. Every record is
 * read by a [Parser], so a streamed document reads exactly as [Parser.parse]
 * reads it whole.
 *
 * @param parser What reads each record; its [ParserOptions.comments] says
 *   whether `#` starts a comment.
 * @param maxBufferSize The longest record buffered, in UTF-16 code units; the
 *   stream as a whole may be longer. It defaults to the parser's
 *   [ParserOptions.maxInputSize], or 10 MiB.
 * @param collect Whether the links are kept until [drain] or [end]; with
 *   false, only listeners and the return values of [write] and [end] see them.
 */
class StreamParser(
    val parser: Parser = Parser(),
    val maxBufferSize: Int = parser.options.maxInputSize ?: DEFAULT_MAX_BUFFER_SIZE,
    val collect: Boolean = true,
) {
    /** A stream read with [options]. */
    constructor(options: ParserOptions, collect: Boolean = true) :
        this(Parser(options), options.maxInputSize ?: DEFAULT_MAX_BUFFER_SIZE, collect)

    init {
        require(maxBufferSize > 0) { "Maximum buffer size must be positive" }
    }

    /** Where a stream is: just after the last character written. */
    data class Position(
        /** How many UTF-16 code units were written. */
        val offset: Int,
        /** The line of the next character, from 1. */
        val line: Int,
        /** The column of the next character, from 1. */
        val column: Int,
        /** How many UTF-16 code units are buffered, not yet read. */
        val buffered: Int,
    )

    private val comments = parser.options.comments
    private val linkListeners = ArrayList<(Link) -> Unit>()
    private val errorListeners = ArrayList<(Throwable) -> Unit>()
    private val endListeners = ArrayList<(List<Link>) -> Unit>()

    private val buffer = StringBuilder()
    private val currentLine = StringBuilder()
    private var baseIndentation: Int? = null
    private var lineClassified = false
    private var links = ArrayList<Link>()
    private var offset = 0
    private var line = 1
    private var column = 1
    private var segmentOffset = 0
    private var segmentLine = 1
    private var ended = false

    /** Call [listener] with every link as soon as it is read, like the JavaScript `link` event. */
    fun onLink(listener: (Link) -> Unit): StreamParser = apply { linkListeners.add(listener) }

    /** Call [listener] with every error before it is thrown, like the JavaScript `error` event. */
    fun onError(listener: (Throwable) -> Unit): StreamParser = apply { errorListeners.add(listener) }

    /** Call [listener] with what [end] returns, like the JavaScript `end` event. */
    fun onEnd(listener: (List<Link>) -> Unit): StreamParser = apply { endListeners.add(listener) }

    /**
     * Write [chunk] to the stream, and return the links it completed.
     *
     * @throws IllegalStateException after [end].
     * @throws IllegalArgumentException when the record being buffered grows
     *   longer than [maxBufferSize].
     */
    fun write(chunk: String): List<Link> {
        if (ended) fail(IllegalStateException("Cannot write after end()"))
        val emitted = ArrayList<Link>()
        for (character in chunk) {
            currentLine.append(character)
            offset++

            if (character == '\n') {
                buffer.append(currentLine)
                currentLine.clear()
                lineClassified = false
                line++
                column = 1
            } else {
                if (!lineClassified && character != ' ' && character != '\t' && character != '\r') {
                    lineClassified = true
                    val isComment = comments && character == '#'
                    if (!isComment) {
                        startContentLine(leadingSpaces(currentLine), emitted)
                    }
                }
                column++
            }

            if (buffer.length + currentLine.length > maxBufferSize) {
                fail(IllegalArgumentException("Buffered record exceeds maximum size of $maxBufferSize characters"))
            }
        }
        return emitted
    }

    /**
     * Write [chunk], then finish the stream: read what is buffered as the last
     * record. With [collect] (the default), returns every link not drained;
     * otherwise returns only the links this call completed.
     *
     * @throws StreamParseException when the last record is not Links Notation,
     *   with its position in the whole stream.
     */
    fun end(chunk: String = ""): List<Link> {
        val emitted = if (chunk.isEmpty()) ArrayList() else ArrayList(write(chunk))
        if (ended) {
            return if (collect) links.toList() else emitted
        }

        val document = buffer.toString() + currentLine.toString()
        if (document.isNotEmpty()) {
            val read =
                try {
                    parser.parse(document)
                } catch (error: ParseException) {
                    fail(StreamParseException.of(error, segmentOffset, segmentLine))
                }
            publish(read, emitted)
            advanceSegment(document)
        }

        buffer.clear()
        currentLine.clear()
        baseIndentation = null
        ended = true
        val result = if (collect) links.toList() else emitted
        for (listener in endListeners) listener(result)
        return result
    }

    /** Return and forget the links kept since the previous drain. */
    fun drain(): List<Link> {
        val drained = links
        links = ArrayList()
        return drained
    }

    /** Start a new stream, keeping the listeners and options. */
    fun reset(): StreamParser {
        buffer.clear()
        currentLine.clear()
        baseIndentation = null
        lineClassified = false
        links = ArrayList()
        offset = 0
        line = 1
        column = 1
        segmentOffset = 0
        segmentLine = 1
        ended = false
        return this
    }

    /** Where the stream is: just after the last character written. */
    fun position(): Position = Position(offset, line, column, buffer.length + currentLine.length)

    private fun startContentLine(
        indentation: Int,
        emitted: MutableList<Link>,
    ) {
        val base = baseIndentation
        if (buffer.isNotEmpty() && base != null && indentation <= base) {
            val record = buffer.toString()
            if (structurallyComplete(record, comments)) {
                val read =
                    try {
                        parser.parse(record)
                    } catch (_: ParseException) {
                        null
                    }
                if (read != null) {
                    publish(read, emitted)
                    advanceSegment(record)
                    buffer.clear()
                    baseIndentation = null
                }
            }
        }
        if (baseIndentation == null) {
            baseIndentation = indentation
        }
    }

    private fun publish(
        read: List<Link>,
        emitted: MutableList<Link>,
    ) {
        for (link in read) {
            emitted.add(link)
            if (collect) links.add(link)
            for (listener in linkListeners) listener(link)
        }
    }

    private fun advanceSegment(document: String) {
        segmentOffset += document.length
        segmentLine += document.count { it == '\n' }
    }

    private fun fail(error: Throwable): Nothing {
        for (listener in errorListeners) listener(error)
        throw error
    }

    companion object {
        /** The longest record buffered when nothing says otherwise: 10 MiB. */
        const val DEFAULT_MAX_BUFFER_SIZE: Int = 10 * 1024 * 1024

        /**
         * The links of [chunks], read lazily, like JavaScript
         * `StreamParser.parse`: each link is produced as soon as the chunks
         * that complete it are read.
         */
        fun parse(
            chunks: Iterable<String>,
            options: ParserOptions = ParserOptions(),
        ): Sequence<Link> = parse(chunks.asSequence(), options)

        /** The links of [chunks], read lazily; see the [Iterable] overload. */
        fun parse(
            chunks: Sequence<String>,
            options: ParserOptions = ParserOptions(),
        ): Sequence<Link> =
            sequence {
                val stream = StreamParser(options, collect = false)
                for (chunk in chunks) {
                    yieldAll(stream.write(chunk))
                }
                yieldAll(stream.end())
            }
    }
}

private fun leadingSpaces(line: CharSequence): Int {
    var indentation = 0
    while (indentation < line.length && line[indentation] == ' ') indentation++
    return indentation
}

/**
 * Whether [document] closes every quote and parenthesis it opens, so that the
 * next non-indented line may start a new record.
 */
private fun structurallyComplete(
    document: String,
    comments: Boolean,
): Boolean {
    val references = DelimitedReferences(document)
    var depth = 0
    var position = 0
    while (position < document.length) {
        val character = document[position]
        val previous = if (position == 0) null else document[position - 1]

        if (character in QUOTES && (previous == null || previous in " \t\n\r(:")) {
            val end = references.endAt(position) ?: return false
            position = end
            continue
        }

        if (comments && character == '#' && (previous == null || previous in " \t\n\r")) {
            val newline = document.indexOf('\n', position)
            if (newline == -1) return true
            position = newline + 1
            continue
        }

        if (character == '(') depth++
        if (character == ')') depth--
        position++
    }
    return depth == 0
}
