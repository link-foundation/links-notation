package io.github.linkfoundation.linksnotation

import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * Asserts that [case] reads as the JavaScript reference reads it: the same
 * links, the same formatted text, and the same links again from that text; or,
 * for an error case, the same error at the same line and column.
 */
internal fun assertCase(case: Case, options: ParserOptions = ParserOptions()) {
    val parser = Parser(options)
    if (case.error) {
        val error = assertFailsWith<ParseException.Syntax>("${case.id} must be refused") { parser.parse(case.input) }
        when (case.code) {
            "depth-exceeded" -> assertIs<ParseException.DepthExceeded>(error, case.id)
            "syntax-error" -> assertTrue(error !is ParseException.DepthExceeded, "${case.id}: ${error.message}")
            else -> fail("${case.id}: unknown diagnostic code ${case.code}")
        }
        assertEquals(case.line to case.column, error.line to error.column, "${case.id}: ${error.message}")
        case.message?.let { reason ->
            assertTrue(error.message.orEmpty().contains(reason), "${case.id}: \"${error.message}\" lacks \"$reason\"")
        }
        return
    }
    val expected = assertNotNull(case.expected, case.id)
    val links =
        try {
            parser.parse(case.input)
        } catch (error: ParseException) {
            fail("${case.id} must parse: ${error.message}")
        }
    assertEquals(expected, links, "${case.id}: parse(input)")
    assertEquals(case.format, formatLinks(links), "${case.id}: formatLinks(parse(input))")
    assertEquals(expected, parser.parse(case.format!!), "${case.id}: parse(format)")
}
