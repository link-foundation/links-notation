package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/** Port of `js/tests/IndentedIdSyntax.test.js`. */
class IndentedIdSyntaxTest {
    private val parser = Parser()

    @Test
    fun basicIndentedIdSyntax() {
        val indented = parser.parse("3:\n  papa\n  loves\n  mama")
        val inline = parser.parse("(3: papa loves mama)")
        assertEquals(inline, indented)
        assertEquals("(3: papa loves mama)", formatLinks(indented))
        assertEquals("(3: papa loves mama)", formatLinks(inline))
    }

    @Test
    fun indentedIdSyntaxWithSingleValue() {
        val result = parser.parse("greeting:\n  hello")
        assertEquals("(greeting: hello)", formatLinks(result))
        assertEquals(1, result.size)
        assertEquals("greeting", result[0].id)
        assertEquals(listOf("hello"), result[0].values.map { it.id })
    }

    @Test
    fun indentedIdSyntaxWithMultipleValues() {
        val result = parser.parse("action:\n  run\n  fast\n  now")
        assertEquals("(action: run fast now)", formatLinks(result))
        assertEquals(1, result.size)
        assertEquals("action", result[0].id)
        assertEquals(3, result[0].values.size)
    }

    @Test
    fun indentedIdSyntaxWithNumericId() =
        assertEquals("(42: answer to everything)", formatLinks(parser.parse("42:\n  answer\n  to\n  everything")))

    @Test
    fun indentedIdSyntaxWithQuotedId() =
        assertEquals("('complex id': value1 value2)", formatLinks(parser.parse("\"complex id\":\n  value1\n  value2")))

    @Test
    fun multipleIndentedIdLinks() {
        val result = parser.parse("first:\n  a\n  b\nsecond:\n  c\n  d")
        assertEquals(2, result.size)
        assertEquals("(first: a b)\n(second: c d)", formatLinks(result))
    }

    @Test
    fun mixedIndentedAndRegularSyntax() {
        val result = parser.parse("first:\n  a\n  b\n(second: c d)\nthird value")
        assertEquals(3, result.size)
        val formatted = formatLinks(result)
        assertTrue(formatted.contains("(first: a b)"))
        assertTrue(formatted.contains("(second: c d)"))
        assertTrue(formatted.contains("third value"))
    }

    @Test
    fun unsupportedColonOnlySyntaxShouldFail() {
        assertFailsWith<ParseException> { parser.parse(":\n  papa\n  loves\n  mama") }
    }

    @Test
    fun indentedIdWithDeeperNesting() {
        val result = parser.parse("root:\n  child1\n  child2\n    grandchild")
        assertTrue(result.isNotEmpty())
        assertEquals("root", result[0].id)
        assertEquals(2, result[0].values.size)
        assertEquals("(root: child1 (child2 grandchild))", formatLinks(result))
    }

    @Test
    fun emptyIndentedIdShouldWork() {
        val result = parser.parse("empty:")
        assertEquals(1, result.size)
        assertEquals("empty", result[0].id)
        assertEquals(0, result[0].values.size)
        assertEquals("(empty)", formatLinks(result))
    }

    @Test
    fun equivalenceTestComprehensive() {
        val cases = listOf(
            "test:\n  one" to "(test: one)",
            "x:\n  a\n  b\n  c" to "(x: a b c)",
            "\"quoted\":\n  value" to "(\"quoted\": value)",
        )
        for ((indented, inline) in cases) {
            val indentedResult = parser.parse(indented)
            val inlineResult = parser.parse(inline)
            assertEquals(inlineResult, indentedResult)
            assertEquals(formatLinks(inlineResult), formatLinks(indentedResult))
        }
    }
}
