package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Port of `js/tests/ParseErrorPosition.test.js` (issue #302): a parse error
 * says where the document stopped making sense, at the position every
 * implementation reports.
 */
class ParseErrorPositionTest {
    private val parser = Parser()

    private fun syntaxError(document: String): ParseException.Syntax =
        assertFailsWith<ParseException.Syntax> { parser.parse(document) }

    @Test
    fun reportsTheLineAndColumnOfTheDefect() {
        val error = syntaxError("ci_gate x\nstage: rust: nextest\nnext stage\n  clippy")
        assertEquals(2, error.line)
        assertEquals(12, error.column)
        assertEquals(":", error.found)
    }

    @Test
    fun offsetAgreesWithTheOtherImplementations() {
        val error = syntaxError("ci_gate x\nstage: rust: nextest\n")
        assertEquals(21, error.offset)
        assertEquals(2, error.line)
        assertEquals(12, error.column)
    }

    @Test
    fun reportsTheLineALateDefectIsOn() {
        val error = syntaxError("a\nb\nc\nd\ne: f: g\nh\n")
        assertEquals(5, error.line)
        assertEquals(5, error.column)
        assertEquals("e: f: g", error.lineText)
    }

    @Test
    fun loneCrCountsAsOneLineBreakInDiagnostics() {
        val error = syntaxError("a\rb: c: d")
        assertEquals(2, error.line)
        assertEquals(5, error.column)
        assertEquals("b: c: d", error.lineText)
    }

    @Test
    fun reportsTheEndOfTheDocumentWhenAGroupIsNeverClosed() {
        val error = syntaxError("a (b\n")
        assertEquals(5, error.offset)
        assertEquals(2, error.line)
        assertEquals(1, error.column)
        assertNull(error.found)
        assertTrue(error.message!!.contains("end of input"))
    }

    @Test
    fun reportsAnUnmatchedClosingParenthesis() {
        val error = syntaxError("a b)\n")
        assertEquals(3, error.offset)
        assertEquals(1, error.line)
        assertEquals(4, error.column)
        assertEquals(")", error.found)
    }

    @Test
    fun messageSaysWhereTheDocumentBroke() {
        val error = syntaxError("ci_gate x\nstage: rust: nextest\n")
        assertTrue(error.message!!.startsWith("Syntax error at line 2, column 12:"))
        assertEquals("2 | stage: rust: nextest\n  |            ^", error.snippet)
    }

    @Test
    fun messageQuotesOneLineRatherThanTheRestOfTheDocument() {
        val error = syntaxError("ci_gate x\nstage: rust: nextest\n" + "trailing line\n".repeat(500))
        val message = error.message!!
        assertTrue(message.contains("line 2, column 12"))
        assertFalse(message.contains("trailing line"))
        assertTrue(message.length < 200)
    }

    @Test
    fun messageOfALongLineStaysAMessage() {
        val error = syntaxError("a".repeat(400) + ": " + "b".repeat(400) + ": c")
        assertEquals(1, error.line)
        assertEquals(803, error.column)
        assertTrue(error.message!!.contains("..."))
        assertTrue(error.message!!.length < 300)
    }

    /** JS reports the old Peggy `location` too; Kotlin keeps the same three numbers on the error. */
    @Test
    fun theLocationTheParserUsedToReportIsStillThere() {
        val error = syntaxError("a: b: c")
        assertEquals(listOf(4, 1, 5), listOf(error.offset, error.line, error.column))
    }

    @Test
    fun aDocumentThatParsesReportsNothing() {
        assertEquals(2, parser.parse("a: b\n  c: d\n").size)
    }
}
