package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** Port of `js/tests/MultilineQuotedString.test.js`. */
class MultilineQuotedStringTest {
    private val parser = Parser()

    @Test
    fun multilineDoubleQuotedReference() {
        val input = "(\n  \"long\nstring literal representing\nthe reference\"\n\n" +
            "  'another\nlong string literal\nas another reference'\n)"
        val result = parser.parse(input)
        assertEquals(1, result.size)
        val link = result[0]
        assertNull(link.id)
        assertEquals(2, link.values.size)
        assertEquals("long\nstring literal representing\nthe reference", link.values[0].values[0].id)
        assertEquals("another\nlong string literal\nas another reference", link.values[1].values[0].id)
    }

    @Test
    fun simpleMultilineDoubleQuoted() {
        val link = parser.parse("(\"line1\nline2\")").single()
        assertNull(link.id)
        assertEquals(1, link.values.size)
        assertEquals("line1\nline2", link.values[0].id)
    }

    @Test
    fun simpleMultilineSingleQuoted() {
        val link = parser.parse("('line1\nline2')").single()
        assertNull(link.id)
        assertEquals(1, link.values.size)
        assertEquals("line1\nline2", link.values[0].id)
    }

    @Test
    fun multilineQuotedAsId() {
        val link = parser.parse("(\"multi\nline\nid\": value1 value2)").single()
        assertEquals("multi\nline\nid", link.id)
        assertEquals(2, link.values.size)
    }
}
