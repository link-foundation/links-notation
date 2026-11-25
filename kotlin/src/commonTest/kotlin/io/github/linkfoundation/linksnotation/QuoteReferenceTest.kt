package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Port of `js/tests/QuoteReference.test.js` (issues #443 and #444): quoting a
 * reference, and reading every quoted reference back.
 *
 * [quoteReference] writes one reference so a parser reads it back as exactly
 * that text; [needsQuoting] says whether the text can be written bare. The
 * round trip feeds texts that broke a parser or a formatter before through
 * [quoteReference] and reads each back in the ID and the value position of
 * parenthesised, single-line and indented links.
 */
class QuoteReferenceTest {
    private val parser = Parser()

    private fun tree(link: Link): List<Any?> = listOf(link.id) + link.values.map { tree(it) }

    private fun readBack(document: String): List<Any?> = parser.parse(document).map { tree(it) }

    @Test
    fun quoteReferenceWritesTextThatNeedsNoDelimitersAsItIs() {
        for (text in listOf("plain", "issue#1047", "a-b_c.d", "π", "~1")) {
            assertEquals(text, quoteReference(text))
            assertFalse(needsQuoting(text), text)
        }
    }

    @Test
    fun quoteReferenceQuotesTextAParserWouldReadDifferently() {
        assertEquals("'has space'", quoteReference("has space"))
        assertEquals("'12:30'", quoteReference("12:30"))
        assertEquals("'#release'", quoteReference("#release"))
        assertEquals("'(a)'", quoteReference("(a)"))
        assertEquals("'\"'", quoteReference("\""))
        assertEquals("\"'\"", quoteReference("'"))
        assertEquals("~1{}", quoteReference(""))
        assertEquals("~1{610a62}", quoteReference("a\nb"))
        for (text in listOf("has space", "12:30", "#release", "", "\"", "a\nb")) {
            assertTrue(needsQuoting(text), text)
        }
    }

    @Test
    fun quoteReferenceIsEscapeReference() {
        for (text in listOf("a b", "a", "it's", "", "#x", "x:y")) {
            assertEquals(escapeReference(text), quoteReference(text))
            assertEquals(escapeReference(text, minimal = true), quoteReference(text, minimal = true))
            assertEquals(escapeReference(text, minimal = true) != text, needsQuoting(text, minimal = true))
        }
        assertEquals("", quoteReference(null))
    }

    @Test
    fun everyQuotedReferenceReadsBackInEveryPosition() {
        for (text in TRICKY) {
            val written = quoteReference(text)
            val message = "text <$text> written <$written>"
            assertEquals(text, unescapeReference(written), message)

            val link = listOf(listOf(text, listOf(text), listOf("x")))
            assertEquals(link, readBack("($written: $written x)"), message)
            assertEquals(link, readBack("$written: $written x"), message)
            assertEquals(link, readBack("$written: $written x\n"), message)
            assertEquals(link, readBack("$written:\n  $written\n  x\n"), message)
            // Two lines that each end with the reference: the shape of issue #443.
            assertEquals(
                listOf(listOf("root", listOf(null, listOf("a"), listOf(text)), listOf(null, listOf("b"), listOf(text)))),
                readBack("root:\n  a $written\n  b $written\n"),
                message,
            )
            assertEquals(
                listOf(listOf(null, listOf("a"), listOf(null, listOf(text), listOf(text)), listOf("b"))),
                readBack("(a ($written $written) b)"),
                message,
            )
        }
    }

    @Test
    fun everyFormattedLinkReadsBackAsTheSameLink() {
        var index = 0
        while (index + 2 < TRICKY.size) {
            val links =
                listOf(
                    Link(TRICKY[index], listOf(Link(TRICKY[index + 1]), Link("x"))),
                    Link(null, listOf(Link(TRICKY[index + 2]), Link(TRICKY[index]))),
                )
            val message = TRICKY.subList(index, index + 3).toString()
            for (document in listOf(formatLinks(links), formatLinks(links, lessParentheses = true))) {
                assertEquals(links, parser.parse(document), message + document)
            }
            // The nested writer puts every value on a line of its own.
            assertEquals(
                parser.parse(formatLinks(links)).map { tree(it) },
                parser.parse(formatNested(links)).map { tree(it) },
                message,
            )
            index += 3
        }
    }

    private companion object {
        /** Texts that broke a parser or a formatter before, or came close. */
        val TRICKY =
            listOf(
                "",
                " ",
                "\"",
                "'",
                "`",
                "\"\"",
                "''",
                "\"\"\"\"",
                "\"'",
                "'\"",
                "#",
                "#x",
                "a #b",
                ":",
                "a:",
                ":a",
                "12:30",
                "a: b",
                "(",
                ")",
                "~1{}",
                "~1{61}",
                "a\nb",
                "\"\" ",
                " \"\"",
                "\"\n",
                "it's",
                "say \"hi\"",
            )
    }
}
