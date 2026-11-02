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

/** What a delimited reference holds, and how many UTF-16 units it takes. */
internal class Reading(val value: String, val length: Int)

/**
 * Every delimited reference of one document, read on demand, each at most once.
 * Finding where a reference closes skips every run too short to close it, so
 * reading takes time linear in the body however wide the opening run is.
 */
internal class DelimitedReferences(private val document: String) {
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
internal fun readReference(document: String, start: Int): Reading? {
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
private fun reading(document: String, start: Int, quote: Char, count: Int, end: Int?): Reading? {
    val emptyReference = if (count % 2 == 0) Reading("", count) else null
    if (end == null) {
        return emptyReference
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
private fun runLength(text: String, start: Int, quote: Char): Int {
    var end = start
    while (end < text.length && text[end] == quote) {
        end++
    }
    return end - start
}

/** The maximal runs of one delimiter in a document, each linked to the next longer run. */
private class DelimiterRuns(document: String, quote: Char) {
    val starts = ArrayList<Int>()
    val lengths = ArrayList<Int>()
    val count: Int
    val nextLonger: IntArray

    init {
        var position = document.indexOf(quote)
        while (position != -1) {
            val length = runLength(document, position, quote)
            starts.add(position)
            lengths.add(length)
            position = document.indexOf(quote, position + length)
        }
        count = starts.size

        nextLonger = IntArray(count)
        val longer = ArrayList<Int>()
        for (run in count - 1 downTo 0) {
            while (longer.isNotEmpty() && lengths[longer.last()] <= lengths[run]) {
                longer.removeAt(longer.size - 1)
            }
            nextLonger[run] = if (longer.isNotEmpty()) longer.last() else count
            longer.add(run)
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
