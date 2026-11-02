package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/**
 * Port of `js/tests/NestedIndentation.test.js` (issue #282): a parenthesised
 * group opens a nested context that follows the root's indentation rules.
 */
class NestedIndentationTest {
    private val parser = Parser()

    private fun format(source: String) = formatLinks(parser.parse(source), false)

    @Test
    fun parenthesesReproduceRootIndentation() {
        assertEquals("(a)\n((a) (b))\n(c)\n((c) (d))", format("a\n  b\nc\n  d"))
        assertEquals("(array ((a) ((a) (b)) (c) ((c) (d))))", format("array (\n  a\n    b\n  c\n    d\n)"))
    }

    @Test
    fun parenthesesKeepRecordBoundaries() {
        val source = "value (\n  id \"1\"\n  label \"one\"\n)"
        assertEquals("(value ((id 1) (label one)))", format(source))
        val links = parser.parse(source)
        assertEquals(1, links.size)
        val group = links[0].values[1]
        assertNull(group.id)
        assertEquals(2, group.values.size)
        assertEquals(listOf("id", "1"), group.values[0].values.map { it.id })
        assertEquals(listOf("label", "one"), group.values[1].values.map { it.id })
    }

    @Test
    fun parenthesesKeepSeveralRecordsSeparate() {
        assertEquals(
            "(value ((id 1 label one) (id 2 label two)))",
            format("value (\n  (id \"1\" label \"one\")\n  (id \"2\" label \"two\")\n)"),
        )
    }

    @Test
    fun parenthesesNestDeeply() {
        assertEquals(
            "(outer ((inner ((x 1) (y 2))) (z 3)))",
            format("outer (\n  inner (\n    x 1\n    y 2\n  )\n  z 3\n)"),
        )
    }

    @Test
    fun singleLineParenthesesAreUnchanged() {
        for (text in listOf("(a b c)", "(1: 2 3)", "(a: b c)", "((a b))", "(a)", "()")) {
            assertEquals(text, format(text))
        }
    }

    @Test
    fun parenthesesWithIndentedIdSyntax() {
        assertEquals("(a: b c)", format("(\n  a:\n    b\n    c\n)"))
    }

    @Test
    fun employeeRecordsKeepTheirFields() {
        assertEquals(
            "(empInfo)\n((empInfo) (employees: ((name (James Kirk)) (age 40)) ((name (Jean-Luc Picard)) (age 45))))",
            format(
                "empInfo\n  employees:\n    (\n      name (James Kirk)\n      age 40\n    )\n" +
                    "    (\n      name (Jean-Luc Picard)\n      age 45\n    )",
            ),
        )
    }
}
