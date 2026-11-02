package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue

/**
 * Port of `js/tests/NestingLimit.test.js` (issue #315): links nested too
 * deeply are refused with an error rather than recursed into until the stack
 * overflows.
 */
class NestingLimitTest {
    private fun parens(depth: Int) = "(".repeat(depth) + "a" + ")".repeat(depth)

    private fun values(depth: Int) = "(a ".repeat(depth) + "b" + ")".repeat(depth)

    private fun indentation(depth: Int) = (0..depth).joinToString("") { " ".repeat(it) + "a\n" }

    private fun tooDeep(
        document: String,
        maxDepth: Int,
    ): ParseException.DepthExceeded {
        val error =
            assertFailsWith<ParseException.DepthExceeded> {
                Parser(ParserOptions(maxDepth = maxDepth)).parse(document)
            }
        assertEquals(maxDepth, error.limit)
        return error
    }

    private fun accepted(
        document: String,
        maxDepth: Int = ParserOptions.DEFAULT_MAX_DEPTH,
    ) = Parser(ParserOptions(maxDepth = maxDepth)).parse(document).isNotEmpty()

    @Test
    fun theDefaultLimitIsSharedByEveryImplementation() {
        assertEquals(64, ParserOptions.DEFAULT_MAX_DEPTH)
        assertEquals(ParserOptions.DEFAULT_MAX_DEPTH, Parser().options.maxDepth)
    }

    @Test
    fun parenthesesUpToTheLimitAreAccepted() {
        assertTrue(accepted(parens(3), 3))
        assertTrue(accepted(values(3), 3))
    }

    @Test
    fun parenthesesPastTheLimitAreRefusedAtTheGroupThatIsTooDeep() {
        val error = tooDeep(parens(4), 3)
        assertEquals(listOf(1, 4, 3), listOf(error.line, error.column, error.offset))
        assertEquals(
            "Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3\n" +
                "1 | ((((a))))\n" +
                "  |    ^",
            error.message,
        )
    }

    @Test
    fun groupsInValuePositionCountLikeAnyOtherGroup() {
        val error = tooDeep(values(4), 3)
        assertEquals(listOf(1, 10), listOf(error.line, error.column))
    }

    @Test
    fun indentationUpToTheLimitIsAccepted() {
        assertTrue(accepted(indentation(3), 3))
        assertTrue(accepted(indentation(ParserOptions.DEFAULT_MAX_DEPTH)))
    }

    @Test
    fun indentationPastTheLimitIsRefusedAtTheLineThatIsTooDeep() {
        val error = tooDeep(indentation(4), 3)
        assertEquals(listOf(5, 5), listOf(error.line, error.column))
        assertEquals("    a", error.lineText)
    }

    @Test
    fun groupsAndIndentationAddUp() {
        assertTrue(accepted("a\n  (b)\n", 2))
        val error = tooDeep("a\n  (b)\n", 1)
        assertEquals(listOf(2, 3), listOf(error.line, error.column))
    }

    @Test
    fun trailingSpacesOnADeepLineAreNotADeeperLine() {
        assertTrue(accepted("a\n  b\n    c   \n", 2))
    }

    @Test
    fun aSyntaxErrorIsNotMistakenForNestingThatIsTooDeep() {
        val error = assertFailsWith<ParseException.Syntax> { Parser().parse("a: b: c") }
        assertFalse(error is ParseException.DepthExceeded)
        assertTrue(error.message!!.startsWith("Syntax error at "))
    }

    @Test
    fun refusesADocumentFarPastTheLimitInsteadOfOverflowingTheStack() {
        for (document in listOf(parens(100_000), values(100_000), indentation(2_000))) {
            val error = tooDeep(document, ParserOptions.DEFAULT_MAX_DEPTH)
            assertTrue(error.message!!.startsWith("Nesting too deep at "))
        }
    }

    @Test
    fun theStreamParserReportsWhereTheNestingIsTooDeep() {
        val stream = StreamParser(ParserOptions(maxDepth = 1))
        stream.onError { }
        stream.write("a\nb ((c))\n")
        val error = assertFailsWith<StreamParseException> { stream.end() }
        assertEquals(1, assertIs<ParseException.DepthExceeded>(error.cause).limit)
        assertEquals(listOf(2, 4, 5), listOf(error.line, error.column, error.offset))
    }
}
