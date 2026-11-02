package io.github.linkfoundation.linksnotation

/*
 * Delimited references, and how far each one reaches: a port of
 * `js/src/quotes.js` of link-foundation/links-notation.
 *
 * A reference opened by a run of N delimiters (`"`, `'` or `` ` ``) closes at
 * the next run whose length R has an odd `R / N`, and a run of 2N inside it is
 * that delimiter escaped. An even run that encloses nothing substantive is the
 * empty reference.
 */

/** The characters a reference can be written between. */
internal const val QUOTES = "\"'`"

/**
 * What a delimited reference holds, how many UTF-16 units it takes and whether
 * a run of delimiters closes it. An even run nothing closes is the empty
 * reference, until a closing run is written after it, which turns it into one
 * holding what follows: a stream must wait for that run.
 */
internal class Reading(
    val value: String,
    val length: Int,
    val closed: Boolean = true,
)

/**
 * What ends a bare reference. A token starts after one of these, at the start
 * of the document, and right after a delimited reference or a versioned
 * literal: the places the grammar reads a reference from.
 */
internal const val TOKEN_SEPARATORS = " \t\n\r(:)"

/** What a versioned literal's payload cannot contain. */
private const val LITERAL_PAYLOAD_END = "} \t\r\n()"

/**
 * Where the versioned literal `~<digits>{<payload>}` that starts at [start]
 * ends, or -1 if none starts there. A single forward scan, so it stays linear.
 */
internal fun referenceLiteralEnd(
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

/**
 * Every delimited reference of one document, read on demand, each at most once.
 * Finding where a reference closes skips every run too short to close it, so
 * reading takes time linear in the body however wide the opening run is.
 */
internal class DelimitedReferences(
    private val document: String,
) {
    private val runsByQuote = HashMap<Char, DelimiterRuns>()
    private val readings = HashMap<Int, Reading?>()

    /** The reference opened at [start], or null when nothing opens there. */
    fun readAt(start: Int): Reading? {
        if (!readings.containsKey(start)) {
            readings[start] = read(start)
        }
        return readings[start]
    }

    /** The position just past the reference opened at [start], or null. */
    fun endAt(start: Int): Int? = readAt(start)?.let { start + it.length }

    private fun read(start: Int): Reading? {
        if (start >= document.length || document[start] !in QUOTES) {
            return null
        }
        val quote = document[start]
        val runs = runsByQuote.getOrPut(quote) { DelimiterRuns(document, quote) }
        val opening = runs.indexOf(start)
        val count = runs.end(opening) - start

        // The first run after the opening one that closes the reference.
        var closing = opening + 1
        while (closing < runs.count) {
            val length = runs.lengths[closing]
            if (length < count) {
                closing = runs.nextLonger[closing]
            } else if ((length / count) % 2 == 1) {
                break
            } else {
                closing++
            }
        }
        val end = if (closing < runs.count) runs.end(closing) else null
        return reading(document, start, quote, count, end)
    }
}

/** The reference opened at [start] of [document], read without a list of runs. */
internal fun readReference(
    document: String,
    start: Int,
): Reading? {
    if (start >= document.length || document[start] !in QUOTES) {
        return null
    }
    val quote = document[start]
    val count = runLength(document, start, quote)

    var end: Int? = null
    var position = document.indexOf(quote, start + count)
    while (position != -1) {
        val length = runLength(document, position, quote)
        if (length >= count && (length / count) % 2 == 1) {
            end = position + length
            break
        }
        position = document.indexOf(quote, position + length)
    }
    return reading(document, start, quote, count, end)
}

/** The reading of a reference opened by [count] delimiters at [start], closed by the run ending at [end]. */
private fun reading(
    document: String,
    start: Int,
    quote: Char,
    count: Int,
    end: Int?,
): Reading? {
    val emptyReference = if (count % 2 == 0) Reading("", count) else null
    if (end == null) {
        // Nothing closes the run: an even one is the empty reference, which a
        // later closing run would still turn into one holding what follows.
        return if (count % 2 == 0) Reading("", count, closed = false) else null
    }

    val value = StringBuilder()
    var position = start + count
    var run = document.indexOf(quote, position)
    while (run != -1 && run < end) {
        val length = runLength(document, run, quote)
        val escaped = (length / (2 * count)) * count
        // The closing run is the last one of the body.
        val closes = if (run + length == end) count else 0
        value.append(document, position, run)
        repeat(length - escaped - closes) { value.append(quote) }
        position = run + length
        run = document.indexOf(quote, position)
    }
    val text = value.toString()

    if (emptyReference != null && !isSubstantiveBody(text)) {
        return emptyReference
    }
    return Reading(text, end - start)
}

/** The number of [quote] delimiters in a row from [start] of [text]. */
private fun runLength(
    text: String,
    start: Int,
    quote: Char,
): Int {
    var end = start
    while (end < text.length && text[end] == quote) {
        end++
    }
    return end - start
}

/**
 * The maximal runs of one delimiter in a document, each linked to the next longer run.
 *
 * Primitive arrays rather than lists of Int: Kotlin/JS boxes every Int added
 * to a list, which made a document of a hundred thousand quotes several times
 * slower to scan in Node.js than on the JVM.
 */
private class DelimiterRuns(
    document: String,
    quote: Char,
) {
    val count: Int
    val starts: IntArray
    val lengths: IntArray
    val nextLonger: IntArray

    init {
        var starts = IntArray(16)
        var lengths = IntArray(16)
        var count = 0
        val delimiter = quote.toString()
        var position = document.indexOf(delimiter)
        while (position != -1) {
            val length = runLength(document, position, quote)
            if (count == starts.size) {
                starts = starts.copyOf(2 * count)
                lengths = lengths.copyOf(2 * count)
            }
            starts[count] = position
            lengths[count] = length
            count++
            position = document.indexOf(delimiter, position + length)
        }
        this.count = count
        this.starts = starts
        this.lengths = lengths

        // A stack of runs, longest at the bottom, scanned from the last run.
        nextLonger = IntArray(count)
        val longer = IntArray(count)
        var depth = 0
        for (run in count - 1 downTo 0) {
            while (depth > 0 && lengths[longer[depth - 1]] <= lengths[run]) {
                depth--
            }
            nextLonger[run] = if (depth > 0) longer[depth - 1] else count
            longer[depth++] = run
        }
    }

    /** Position just past the given run. */
    fun end(run: Int): Int = starts[run] + lengths[run]

    /** The run that holds the given position of a delimiter. */
    fun indexOf(position: Int): Int {
        var low = 0
        var high = count - 1
        while (low < high) {
            val middle = (low + high + 1) ushr 1
            if (starts[middle] <= position) {
                low = middle
            } else {
                high = middle - 1
            }
        }
        return low
    }
}

/**
 * Whether a body written between an even run of delimiters carries something a
 * pair of delimiters enclosing nothing cannot: at least one visible character,
 * and no parenthesis it straddles.
 */
internal fun isSubstantiveBody(content: String): Boolean {
    var depth = 0
    var hasVisible = false
    for (character in content) {
        if (character == '(') {
            depth++
        } else if (character == ')') {
            depth--
            if (depth < 0) {
                return false
            }
        }
        if (character != ' ' && character != '\t' && character != '\n' && character != '\r') {
            hasVisible = true
        }
    }
    return hasVisible && depth == 0
}
