package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Port of `js/tests/MixedIndentationModes.test.js`. */
class MixedIndentationModesTest {
    private val parser = Parser()

    private val heroVersion1 = """
        |empInfo
        |  employees:
        |    (
        |      name (James Kirk)
        |      age 40
        |    )
        |    (
        |      name (Jean-Luc Picard)
        |      age 45
        |    )
        |    (
        |      name (Wesley Crusher)
        |      age 27
        |    )
    """.trimMargin()

    private val heroVersion2 = """
        |empInfo
        |  (
        |    employees:
        |      (
        |        name (James Kirk)
        |        age 40
        |      )
        |      (
        |        name (Jean-Luc Picard)
        |        age 45
        |      )
        |      (
        |        name (Wesley Crusher)
        |        age 27
        |      )
        |  )
    """.trimMargin()

    /** Parses [input] and checks the formatted links contain every one of [parts]. */
    private fun assertFormattedContains(input: String, vararg parts: String): List<Link> {
        val result = parser.parse(input)
        assertTrue(result.isNotEmpty())
        val formatted = formatLinks(result)
        for (part in parts) {
            assertTrue(formatted.contains(part), "expected '$part' in:\n$formatted")
        }
        return result
    }

    @Test
    fun heroExampleMixedModes() {
        assertFormattedContains(heroVersion1, "empInfo", "employees:", "James Kirk", "Jean-Luc Picard", "Wesley Crusher")
    }

    @Test
    fun heroExampleAlternativeFormat() {
        assertFormattedContains(heroVersion2, "empInfo", "employees:", "James Kirk", "Jean-Luc Picard", "Wesley Crusher")
    }

    @Test
    fun heroExampleEquivalence() {
        assertEquals(formatLinks(parser.parse(heroVersion2)), formatLinks(parser.parse(heroVersion1)))
    }

    @Test
    fun setContextWithoutColon() {
        assertFormattedContains("empInfo\n  employees", "empInfo", "employees")
    }

    @Test
    fun sequenceContextWithColon() {
        val result = assertFormattedContains(
            "employees:\n  James Kirk\n  Jean-Luc Picard\n  Wesley Crusher",
            "employees:", "James Kirk", "Jean-Luc Picard", "Wesley Crusher",
        )
        assertEquals(1, result.size)
    }

    @Test
    fun sequenceContextWithComplexValues() {
        val result = assertFormattedContains(
            "employees:\n  (\n    name (James Kirk)\n    age 40\n  )\n  (\n    name (Jean-Luc Picard)\n    age 45\n  )",
            "employees:", "James Kirk", "Jean-Luc Picard",
        )
        assertEquals(1, result.size)
    }

    @Test
    fun nestedSetAndSequenceContexts() {
        assertFormattedContains(
            "company\n  departments:\n    engineering\n    sales\n  employees:\n    (name John)\n    (name Jane)",
            "company", "departments:", "employees:",
        )
    }

    @Test
    fun deeplyNestedMixedModes() {
        assertFormattedContains(
            "root\n  level1\n    level2:\n      value1\n      value2\n    level2b\n      level3",
            "root", "level2:",
        )
    }
}
