package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Port of `js/tests/ApiTests.test.js`. */
class ApiTest {
    private val parser = Parser()

    @Test
    fun isRef() {
        val simpleLink = Link("some_value")
        assertEquals("some_value", simpleLink.id)
        assertEquals(emptyList(), simpleLink.values)
    }

    @Test
    fun isLink() {
        val link = Link("id", listOf(Link("child")))
        assertEquals("id", link.id)
        assertEquals(1, link.values.size)
        assertEquals("child", link.values[0].id)
    }

    @Test
    fun isRefEquivalent() {
        val simpleLink = Link("some_value")
        assertEquals("some_value", simpleLink.id)
        assertTrue(simpleLink.values.isEmpty())
    }

    @Test
    fun isLinkEquivalent() {
        val link = Link("id", listOf(Link("child")))
        assertEquals("id", link.id)
        assertEquals(listOf(Link("child")), link.values)
    }

    @Test
    fun emptyLink() {
        assertEquals("()", Link(null, emptyList()).toString())
    }

    @Test
    fun simpleLink() {
        assertEquals("(1: 1 1)", parser.parse("(1: 1 1)")[0].format())
    }

    @Test
    fun linkWithSourceTarget() {
        val input = "(index: source target)"
        assertEquals(input, parser.parse(input)[0].format())
    }

    @Test
    fun linkWithSourceTypeTarget() {
        val input = "(index: source type target)"
        assertEquals(input, parser.parse(input)[0].format())
    }

    @Test
    fun singleLineFormat() {
        val output = parser.parse("id: value1 value2")[0].format(true)
        assertEquals("id: value1 value2", output)
    }

    @Test
    fun quotedReferences() {
        val output = parser.parse("(\"quoted id\": \"value with spaces\")")[0].format()
        assertTrue("quoted id" in output)
        assertTrue("value with spaces" in output)
    }

    @Test
    fun quotedReferencesParsing() {
        val output = formatLinks(parser.parse("(\"quoted id\": \"value with spaces\")"))
        assertEquals("('quoted id': 'value with spaces')", output)
    }

    @Test
    fun indentedIdSyntaxParsing() {
        val indentedOutput = formatLinks(parser.parse("id:\n  value1\n  value2"))
        assertEquals(formatLinks(parser.parse("(id: value1 value2)")), indentedOutput)
        assertEquals("(id: value1 value2)", indentedOutput)
    }

    @Test
    fun indentedIdSyntaxRoundtrip() {
        val input = "id:\n  value1\n  value2"
        assertEquals(input, formatLinks(parser.parse(input), FormatOptions(maxInlineRefs = 1, preferInline = false)))
    }

    @Test
    fun multipleIndentedIdSyntaxParsing() {
        val indentedOutput = formatLinks(parser.parse("id1:\n  a\n  b\nid2:\n  c\n  d"))
        assertEquals(formatLinks(parser.parse("(id1: a b)\n(id2: c d)")), indentedOutput)
        assertEquals("(id1: a b)\n(id2: c d)", indentedOutput)
    }

    @Test
    fun multipleIndentedIdSyntaxRoundtrip() {
        val input = "id1:\n  a\n  b\nid2:\n  c\n  d"
        assertEquals(input, formatLinks(parser.parse(input), FormatOptions(maxInlineRefs = 1, preferInline = false)))
    }
}
