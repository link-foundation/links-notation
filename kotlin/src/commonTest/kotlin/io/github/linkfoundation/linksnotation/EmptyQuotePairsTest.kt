package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Port of `js/tests/EmptyQuotePairs.test.js` (issue #443): an empty quoted
 * value at the end of a line must not swallow the lines after it.
 *
 * An even run of quotes (`""`, `''`, `""""`, ...) followed by whitespace up to
 * the end of its line is the empty reference, however later lines continue. A
 * run followed directly by text (`""x`) still opens a reference that may reach
 * across lines, so multiline references keep working.
 */
class EmptyQuotePairsTest {
    private val parser = Parser()

    private fun tree(link: Link): List<Any?> = listOf(link.id) + link.values.map { tree(it) }

    private fun parses(document: String): List<Any?> = parser.parse(document).map { tree(it) }

    @Test
    fun emptyValuesOnConsecutiveIndentedLinesStayOnTheirLines() {
        val expected = listOf(listOf("root", listOf(null, listOf("a"), listOf("")), listOf(null, listOf("b"), listOf(""))))
        assertEquals(expected, parses("root:\n  a \"\"\n  b \"\"\n"))
        assertEquals(expected, parses("root:\n  a ''\n  b ''\n"))
        assertEquals(expected, parses("root:\n  a \"\"\n  b \"\""))
    }

    @Test
    fun anEmptyValueBeforeAQuotedValueKeepsBothValues() {
        val root = parser.parse("root:\n  a \"\"\n  b \"x y\"\n").single()
        assertEquals(listOf(listOf("a", ""), listOf("b", "x y")), root.values.map { link -> link.values.map { it.id } })
    }

    @Test
    fun anEmptyValueAtTheEndOfATopLevelLineStaysOnItsLine() {
        assertEquals("(a ~1{})\n(b ~1{})", formatLinks(parser.parse("a \"\"\nb \"\"\n")))
        assertEquals("(a ~1{})\n(b ~1{})", formatLinks(parser.parse("a \"\" \nb \"\"\n")))
        assertEquals("(a ~1{})", formatLinks(parser.parse("a \"\"")))
    }

    @Test
    fun aLongerEvenRunAtTheEndOfALineIsEmptyToo() =
        assertEquals("(a ~1{})\n(b ~1{})", formatLinks(parser.parse("a \"\"\"\"\nb \"\"\"\"\n")))

    @Test
    fun doubledQuotesThatNothingClosesAreTheEmptyReference() {
        assertEquals(listOf(listOf("a", listOf(""))), parses("(a: \"\"\"\")"))
        assertEquals(listOf(listOf("a", listOf(""))), parses("(a: \"\"\"\"\"\")"))
    }

    @Test
    fun aSingleQuoteCharacterIsWrittenBetweenTheOtherQuotes() {
        assertEquals(listOf(listOf("a", listOf("\""))), parses("(a: '\"')"))
        assertEquals(listOf(listOf("a", listOf("'"))), parses("(a: \"'\")"))
        assertEquals(listOf(listOf("a", listOf("\""))), parses("(a: `\"`)"))
    }

    @Test
    fun anEvenRunFollowedByTextStillOpensAMultilineReference() =
        assertEquals(listOf(listOf(null, listOf("a"), listOf("x\ny"))), parses("a \"\"x\ny\"\"\n"))

    @Test
    fun anEvenRunStillHoldsWhatTheSameLineCloses() {
        assertEquals(listOf(listOf(null, listOf("x"), listOf(" \" "))), parses("(x \"\" \" \"\")"))
        assertEquals(listOf(listOf(null, listOf("a"), listOf(" b "))), parses("a \"\" b \"\""))
    }

    @Test
    fun theStreamEmitsALineThatEndsWithAnEmptyValueAtOnce() {
        val stream = StreamParser()
        val emitted = mutableListOf<Link>()
        for (character in "a \"\"\nb \"\"\nc\n") {
            emitted += stream.write(character.toString())
        }
        assertEquals("(a ~1{})\n(b ~1{})", formatLinks(emitted))
        assertEquals("(a ~1{})\n(b ~1{})\n(c)", formatLinks(stream.end()))
    }
}
