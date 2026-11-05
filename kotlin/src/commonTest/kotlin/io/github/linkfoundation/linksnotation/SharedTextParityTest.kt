package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Port of `js/tests/SharedTextParity.test.js`: the shared text corpus,
 * `parity/text-fixtures.json`, which `generateParityCases` turns into
 * [PARITY_CASES].
 */
class SharedTextParityTest {
    @Test
    fun sharedTextParity() {
        assertEquals(25, PARITY_CASES.size)
        for (case in PARITY_CASES) {
            assertCase(case)
        }
    }

    @Test
    fun sharedLessParenthesesRoundTrip() {
        val options = FormatOptions(lessParentheses = true)
        for (case in PARITY_CASES) {
            val parsed = Parser().parse(case.input)
            assertEquals(case.lessParentheses, formatLinks(parsed, lessParentheses = true), case.id)
            assertEquals(case.lessParentheses, formatLinks(parsed, options), case.id)
            assertEquals(case.expected, Parser().parse(case.lessParentheses!!), case.id)
        }
    }

    @Test
    fun everyCorpusCaseStreamedOneCharacterAtATimeReadsTheSame() {
        for (case in PARITY_CASES) {
            val stream = StreamParser()
            for (character in case.input) stream.write(character.toString())
            assertEquals(case.expected, stream.end(), case.id)
        }
    }
}
