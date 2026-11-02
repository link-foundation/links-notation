package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** Port of `js/tests/FormatConfig.test.js`. */
class FormatConfigTest {
    private val parser = Parser()

    private fun refs(vararg ids: String) = ids.map { Link(it) }

    @Test
    fun formatConfigBasic() {
        val config = FormatConfig()
        assertFalse(config.lessParentheses)
        assertEquals(80, config.maxLineLength)
        assertFalse(config.indentLongLines)
    }

    @Test
    fun formatWithLineLengthLimit() {
        val link = Link("sequence", refs("1", "2", "3", "4", "5", "6", "7", "8", "9", "10"))
        val output = link.format(FormatConfig(indentLongLines = true, maxLineLength = 30, preferInline = false))
        assertTrue("sequence:" in output)
        assertTrue("\n" in output)
    }

    @Test
    fun formatWithMaxInlineRefs() {
        val output = Link("id", refs("1", "2", "3", "4")).format(FormatConfig(maxInlineRefs = 3, preferInline = false))
        assertTrue("id:" in output)
        assertTrue("\n" in output)
    }

    @Test
    fun formatWithConsecutiveGrouping() {
        val links = listOf(Link("SetA", refs("a")), Link("SetA", refs("b")), Link("SetA", refs("c")))
        val output = formatLinks(links, FormatConfig(groupConsecutive = true))
        for (part in listOf("SetA", "a", "b", "c")) assertTrue(part in output)
        assertEquals(1, Regex("SetA").findAll(output).count())
    }

    @Test
    fun formatConfigLessParentheses() {
        assertEquals("id: value", Link("id", refs("value")).format(FormatConfig(lessParentheses = true)))
    }

    @Test
    fun formatConfigCustomIndent() {
        val output =
            Link("id", refs("1", "2", "3", "4"))
                .format(FormatConfig(maxInlineRefs = 3, preferInline = false, indentString = "    "))
        assertTrue("    " in output)
    }

    @Test
    fun roundtripWithLineLengthFormatting() {
        val original = Link("test", refs("a", "b", "c"))
        val formatted = original.format(FormatConfig(maxInlineRefs = 2, preferInline = false))
        val parsed = parser.parse(formatted)
        assertTrue(parsed.isNotEmpty())
        assertEquals(listOf(original), parsed)
    }

    @Test
    fun shouldIndentByLength() {
        val config = FormatConfig(indentLongLines = true, maxLineLength = 80)
        assertFalse(config.shouldIndentByLength("short"))
        assertTrue(config.shouldIndentByLength("a".repeat(100)))
    }

    @Test
    fun shouldIndentByRefCount() {
        val config = FormatConfig(maxInlineRefs = 3)
        assertFalse(config.shouldIndentByRefCount(2))
        assertFalse(config.shouldIndentByRefCount(3))
        assertTrue(config.shouldIndentByRefCount(4))
    }
}
