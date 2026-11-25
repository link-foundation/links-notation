package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * Port of `js/tests/BareReferenceColons.test.js` (issue #444): colons inside a
 * bare reference.
 *
 * A run of colons between two characters of a bare reference belongs to the
 * reference, so times, URLs and qualified names need no quotes. A colon that
 * is followed by whitespace, a parenthesis, a quote or a versioned literal
 * still separates an ID from its values, and a bare reference never starts or
 * ends with a colon.
 */
class BareReferenceColonsTest {
    private val parser = Parser()

    private fun tree(link: Link): List<Any?> = listOf(link.id) + link.values.map { tree(it) }

    private fun parses(document: String): List<Any?> = parser.parse(document).map { tree(it) }

    private fun same(
        document: String,
        expected: String,
    ) = assertEquals(parses(expected), parses(document), document)

    @Test
    fun aTimeIsOneReference() {
        same("time 12:30\n", "time '12:30'\n")
        same("root:\n  time 12:30\n", "root:\n  time '12:30'\n")
    }

    @Test
    fun aUrlIsOneReference() = same("url https://example.com/a#b\n", "url 'https://example.com/a#b'\n")

    @Test
    fun aQualifiedNameIsOneReference() = same("type std::string\n", "type 'std::string'\n")

    @Test
    fun anIdMayHoldAColon() {
        same("a:b: c\n", "'a:b': c\n")
        same("(a:b: c)", "('a:b': c)")
        same("a:b\n", "'a:b'\n")
    }

    @Test
    fun aColonBeforeAValueThatCannotContinueAReferenceSeparates() {
        same("a: b\n", "(a: b)")
        same("a:\"b c\"\n", "(a: 'b c')")
        same("a:'b'\n", "(a: b)")
        same("a:(b c)\n", "(a: (b c))")
        same("a:~1{62}\n", "(a: b)")
        same("a :b\n", "(a: b)")
    }

    @Test
    fun aValueOfTheLinkMayHoldAColon() = same("a: b:c\n", "(a: 'b:c')")

    @Test
    fun aSecondIdOnALineIsStillAnError() {
        assertFailsWith<ParseException.Syntax> { parser.parse("stage: rust: nextest\n") }
        assertFailsWith<ParseException.Syntax> { parser.parse(": a\n") }
    }

    @Test
    fun aReferenceWithColonsIsWrittenWithQuotes() = assertEquals("(time '12:30')", formatLinks(parser.parse("time 12:30\n")))
}
