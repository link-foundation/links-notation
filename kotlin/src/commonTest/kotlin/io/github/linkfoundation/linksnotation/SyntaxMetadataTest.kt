package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** Port of `js/tests/SyntaxMetadata.test.js`. */
class SyntaxMetadataTest {
    @Test
    fun oneAndQuotedOneAreTheSameReferenceButKeepHowTheyWereWritten() {
        val link = Parser().parse("(t 1 '1')").single()
        val bare = link.values[1]
        val quoted = link.values[2]
        assertEquals("1", bare.id)
        assertEquals("1", quoted.id)
        assertEquals("1", bare.rawId)
        assertEquals("'1'", quoted.rawId)
        assertNull(bare.quote)
        assertEquals("'", quoted.quote)
        assertEquals(bare, quoted)
        assertEquals("(t 1 1)", link.format())
    }

    @Test
    fun recordsEveryQuoteKindAndRunLength() {
        val link = Parser().parse("(\"a\": 'b' `c` \"\"d\"\" ~1{65} f)").single()
        assertEquals("\"a\"", link.rawId)
        assertEquals("\"", link.quote)
        assertEquals(
            listOf("'b'" to "'", "`c`" to "`", "\"\"d\"\"" to "\"", "~1{65}" to null, "f" to null),
            link.values.map { it.rawId to it.quote },
        )
    }

    @Test
    fun keepsRawTextFromTheSourceNotFromCommentStripping() {
        assertEquals(
            "'b # c'",
            Parser()
                .parse("(a 'b # c') # d")
                .single()
                .values[1]
                .rawId,
        )
    }

    @Test
    fun leavesLinksWithoutWrittenIdsWithoutRawText() {
        val link = Parser().parse("(a b)").single()
        assertNull(link.rawId)
        assertNull(link.quote)
        assertNull(Link("x").rawId)
        assertNull(Link("x").quote)
    }

    @Test
    fun doesNotChangeEqualityFormattingOrSerialization() {
        val quoted = Parser().parse("('a': 'b')")
        val bare = Parser().parse("(a: b)")
        assertEquals(bare[0], quoted[0])
        assertEquals(bare[0].hashCode(), quoted[0].hashCode())
        assertEquals(formatLinks(bare), formatLinks(quoted))
        assertEquals(bare[0].toString(), quoted[0].toString())
        assertEquals(bare, quoted)
    }

    @Test
    fun astModeSyntaxFalseDropsTheMetadata() {
        val link = Parser(ParserOptions(syntax = false)).parse("('a': 'b')").single()
        assertNull(link.rawId)
        assertNull(link.values[0].rawId)
        assertNull(link.values[0].quote)
        assertEquals(Parser().parse("('a': 'b')")[0], link)
    }

    @Test
    fun parseGroupsAndStreamParserKeepTheMetadata() {
        val groups = Parser().parseGroups("'root':\n  \"child\"")
        assertEquals("'root'", groups[0].element.rawId)
        assertEquals(
            "\"child\"",
            groups[0]
                .children[0]
                .element
                .rawId,
        )
        val stream = StreamParser()
        stream.write("(a '")
        stream.write("b')")
        val link = stream.end().single()
        assertEquals("'b'", link.values[1].rawId)
        assertEquals("'", link.values[1].quote)
    }

    /** The JavaScript test also checks that a number is refused; a Kotlin `String?` takes nothing else. */
    @Test
    fun rawIdCanBeSetOnLinksBuiltInCodeAndMustBeTextOrNull() {
        val link = Link("a")
        link.rawId = "\"a\""
        assertEquals("\"", link.quote)
        link.rawId = null
        assertNull(link.quote)
    }

    @Test
    fun referenceQuoteReadsTheDelimiterOfOneCompleteReference() {
        assertEquals("'", referenceQuote("'1'"))
        assertEquals("\"", referenceQuote("\"\"a b\"\""))
        assertEquals("`", referenceQuote("`x`"))
        assertNull(referenceQuote("1"))
        assertNull(referenceQuote("~1{31}"))
        assertNull(referenceQuote("'unclosed"))
        assertNull(referenceQuote("'a' b"))
        assertNull(referenceQuote(null))
    }
}
