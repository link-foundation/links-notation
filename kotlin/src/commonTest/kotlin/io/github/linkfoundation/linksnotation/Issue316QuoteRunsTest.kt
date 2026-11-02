package io.github.linkfoundation.linksnotation

import kotlin.math.sqrt
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.TimeSource

/**
 * Port of `js/tests/Issue316QuoteRuns.test.js` (issue #316): a reference that
 * opens with a wide run of delimiters is read a run at a time, so documents
 * that took from seconds to tens of seconds take milliseconds.
 */
class Issue316QuoteRunsTest {
    private val bound = 2000.milliseconds
    private val size = 400000

    private fun q(count: Int) = "'".repeat(count)

    private fun <T> timed(read: () -> T): Pair<T, Duration> {
        val started = TimeSource.Monotonic.markNow()
        val result = read()
        return result to started.elapsedNow()
    }

    private fun wideQuoteOverALongRun(size: Int): String {
        val width = size / 4
        return "${q(width + 1)} a ${q(width - 4)} ${"x".repeat(2 * width)}"
    }

    private fun narrowingUnclosedQuotes(size: Int): String {
        val widths = ArrayList<Int>()
        var width = 2 * (sqrt(size / 2.0) / 2).toInt() + 1
        while (width >= 1) {
            widths.add(width)
            width -= 2
        }
        val head = widths.joinToString(" ") { "${q(it)}x" }
        return "$head ${"a' ".repeat((size - head.length) / 3)}"
    }

    private fun closedWideQuoteOverQuotes(size: Int): String {
        val width = size / 8
        return q(width) + "${q(width - 1)}x".repeat(6) + q(width)
    }

    private fun unclosedWidthsOverAnEvenRun(size: Int): String {
        val run = size / 4
        val widths = ArrayList<Int>()
        var width = sqrt(size.toDouble()).toInt()
        while (width >= 2) {
            if ((run / width) % 2 == 0) widths.add(width)
            width--
        }
        val head = widths.joinToString(" ") { "${q(it)}x" }
        val tail = "a' ".repeat((size - head.length - run) / 3)
        return "$head $tail${q(run)} b"
    }

    private fun assertParsedWithinBound(source: String) {
        assertTrue(timed { Parser().parse(source) }.second < bound)
        assertTrue(timed { stripComments(source) }.second < bound)
    }

    @Test
    fun aRunInsideABodyIsReadAsEscapesThenAClosingRun() {
        assertEquals("(<a>)", parsesAs("'''a'''"))
        assertEquals("(<a'''b>)", parsesAs("'''a''''''b'''"))
        assertEquals("(<a'>)", parsesAs("''a'''"))
        assertEquals("(<a'>)", parsesAs("'a'''"))
        assertEquals("(<a'''> <b>)", parsesAs("${q(3)}a${q(9)} b"))
        assertEquals("(<a${q(50)}b>)", parsesAs("${q(50)}a${q(100)}b${q(50)}"))
        assertEquals("(<a\"\"b>)", parsesAs("\"\"\"a\"\"b\"\"\""))
        assertEquals("(<a``b>)", parsesAs("``a````b``"))
    }

    @Test
    fun aRunThatNeverClosesTheReferenceLeavesItUnclosed() {
        assertEquals("(<${q(3)}a${q(7)}>)", parsesAs("${q(3)}a${q(7)}"))
        assertEquals("(<${q(5)}a${q(4)}>)", parsesAs("${q(5)}a${q(4)}"))
        assertEquals("(<> <a'''''>)", parsesAs("''a'''''"))
        assertEquals("(<> <x> <a>)", parsesAs("''''x a"))
    }

    @Test
    fun aReferenceCanOpenInsideARun() {
        val cases =
            listOf(
                Triple("x'''a'''", 1, 8),
                Triple("x'''a''", 2, 7),
                Triple("x'''a'", 3, 6),
                Triple("'''a", 0, null),
                Triple("''''a", 0, 4),
                Triple("a", 0, null),
                Triple("'a'", 3, null),
            )
        for ((document, start, end) in cases) {
            assertEquals(end, quotedReferenceEnd(document, start), document)
            assertEquals(end, DelimitedReferences(document).endAt(start), document)
        }
    }

    @Test
    fun aReferenceThatOpensWithAWideRunIsReadInLinearTime() {
        val width = size / 4
        val (result, elapsed) = timed { Parser().parse(wideQuoteOverALongRun(size)) }
        assertEquals(1, result.size)
        assertEquals(listOf(q(width + 1), "a", "", "x".repeat(2 * width)), result[0].values.map { it.id })
        assertTrue(elapsed < bound)
    }

    @Test
    fun wideQuoteOverALongRunIsParsedWithinTheTimeBound() = assertParsedWithinBound(wideQuoteOverALongRun(size))

    @Test
    fun narrowingUnclosedQuotesIsParsedWithinTheTimeBound() = assertParsedWithinBound(narrowingUnclosedQuotes(size))

    @Test
    fun closedWideQuoteOverQuotesIsParsedWithinTheTimeBound() = assertParsedWithinBound(closedWideQuoteOverQuotes(size))

    @Test
    fun unclosedWidthsOverAnEvenRunIsParsedWithinTheTimeBound() = assertParsedWithinBound(unclosedWidthsOverAnEvenRun(size))

    @Test
    fun aStreamOfWideQuotesIsReadWithinTheTimeBound() {
        val source = "${closedWideQuoteOverQuotes(size)}\nb"
        val links = ArrayList<Link>()
        val (_, elapsed) =
            timed {
                val stream = StreamParser()
                stream.onLink { links.add(it) }
                stream.write(source)
                stream.end()
            }
        assertEquals(2, links.size)
        assertTrue(elapsed < bound)
    }
}
