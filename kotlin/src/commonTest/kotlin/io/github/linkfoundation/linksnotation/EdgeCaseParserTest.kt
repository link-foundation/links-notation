package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Port of `js/tests/EdgeCaseParser.test.js`. */
class EdgeCaseParserTest {
    private val parser = Parser()

    private fun assertRefused(input: String) {
        assertFailsWith<ParseException> { parser.parse(input) }
    }

    private fun assertReferences(
        input: String,
        vararg ids: String,
    ) {
        val result = parser.parse(input)
        assertEquals(1, result.size)
        assertNull(result[0].id)
        assertEquals(ids.toList(), result[0].values.map { it.id })
        result[0].values.forEach { assertEquals(emptyList(), it.values) }
    }

    @Test
    fun emptyLink() = assertRefused(":")

    @Test
    fun emptyLinkWithParentheses() = assertEquals("()", formatLinks(parser.parse("()")))

    @Test
    fun emptyLinkWithEmptySelfReference() = assertRefused("(:)")

    @Test
    fun allFeatures() {
        assertTrue(parser.parse("id: value1 value2").isNotEmpty())
        assertTrue(parser.parse("(id: value1 value2)").isNotEmpty())
        assertRefused(": value1 value2")
        assertRefused("(: value1 value2)")
        assertReferences("(singlet)", "singlet")
        assertTrue(parser.parse("(value1 value2 value3)").isNotEmpty())
        assertTrue(parser.parse("(\"id with spaces\": \"value with spaces\")").isNotEmpty())
        assertTrue(parser.parse("('id': 'value')").isNotEmpty())
        assertTrue(parser.parse("(outer: (inner: value))").isNotEmpty())
    }

    @Test
    fun emptyDocument() = assertEquals(emptyList(), parser.parse(""))

    @Test
    fun whitespaceOnly() = assertEquals(emptyList(), parser.parse("   \n   \n   "))

    @Test
    fun emptyLinks() {
        val empty = parser.parse("()")
        assertEquals(1, empty.size)
        assertNull(empty[0].id)
        assertEquals(emptyList(), empty[0].values)
        assertRefused("(:)")
        val withId = parser.parse("(id:)")
        assertEquals(1, withId.size)
        assertEquals("id", withId[0].id)
        assertEquals(emptyList(), withId[0].values)
    }

    @Test
    fun singletLinks() {
        assertReferences("(1)", "1")
        assertReferences("(1 2)", "1", "2")
        assertReferences("(1 2 3)", "1", "2", "3")
        assertReferences("(1 2 3 4)", "1", "2", "3", "4")
    }

    @Test
    fun invalidInput() = assertRefused("(invalid")
}
