package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * Port of `js/tests/NestingDepth.test.js` (issue #314): reading nested groups
 * takes time that grows with the size of the document, not with two to the
 * power of its nesting depth. The JavaScript suite runs each case on a worker
 * with a time budget; here a regression makes the suite time out instead.
 */
class NestingDepthTest {
    private val deep = 32
    private val veryDeep = 256

    private fun closed(depth: Int) = "(".repeat(depth) + "a" + ")".repeat(depth)

    private fun valueAfter(depth: Int) = "(".repeat(depth) + "a" + ") b".repeat(depth)

    private fun unclosed(depth: Int) = "(".repeat(depth) + "a"

    private fun indentedUnclosed(depth: Int) = (0 until depth).joinToString("\n") { " ".repeat(it) + "(a" }

    /** Like the JavaScript worker, which reads with `maxDepth: Infinity`. */
    private val parser = Parser(ParserOptions(maxDepth = Int.MAX_VALUE))

    private fun formatted(source: String) = formatLinks(parser.parse(source))

    @Test
    fun closedGroupsReadInLinearTime() {
        val source = closed(deep)
        assertEquals(source, formatted(source))
    }

    @Test
    fun valuesAfterGroupsReadInLinearTime() {
        val source = valueAfter(deep)
        assertEquals("($source)", formatted(source))
    }

    @Test
    fun unclosedGroupsFailInLinearTime() {
        assertFailsWith<ParseException.Syntax> { parser.parse(unclosed(deep)) }
    }

    @Test
    fun unclosedGroupsOnIndentedLinesFailInLinearTime() {
        assertFailsWith<ParseException.Syntax> { parser.parse(indentedUnclosed(deep)) }
    }

    @Test
    fun valuesAfterVeryDeepGroupsReadInLinearTime() {
        val source = valueAfter(veryDeep)
        assertEquals("($source)", formatted(source))
    }

    @Test
    fun groupFollowedByValuesKeepsItsStructure() {
        val cases =
            listOf(
                "(a) b" to "((a) b)",
                "(a) (b) c" to "((a) (b) c)",
                "((a) b) c" to "(((a) b) c)",
                "(a: b) c" to "((a: b) c)",
                "(a)\n(b) c" to "(a)\n((b) c)",
                "x\n  (a) b\n  (c)" to "(x)\n((x) ((a) b))\n((x) (c))",
            )
        for ((source, expected) in cases) {
            assertEquals(expected, formatted(source))
        }
    }
}
