package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class LimitsTest {
    private fun nested(levels: Int): String = "(".repeat(levels) + "a" + ")".repeat(levels)

    @Test
    fun sixtyFourLevelsOfParenthesesAreRead() {
        val links = Parser().parse(nested(64))
        var link = links.single()
        var depth = 1
        while (link.values.isNotEmpty()) {
            link = link.values.single()
            depth++
        }
        assertEquals("a", link.id)
    }

    @Test
    fun sixtyFiveLevelsOfParenthesesAreRefused() {
        val error = assertFailsWith<ParseException.DepthExceeded> { Parser().parse(nested(65)) }
        assertEquals(64, error.limit)
        // The 65th "(" is where the nesting went too deep.
        assertEquals(1, error.line)
        assertEquals(65, error.column)
    }

    @Test
    fun sixtyFiveLevelsOfIndentationAreRefused() {
        val text = (0..65).joinToString("\n") { level -> " ".repeat(level) + "a$level" }
        val error = assertFailsWith<ParseException.DepthExceeded> { Parser().parse(text) }
        assertEquals(64, error.limit)
        assertEquals(66, error.line)
        assertEquals(66, error.column)
        // One level less is read.
        Parser().parse((0..64).joinToString("\n") { level -> " ".repeat(level) + "a$level" })
    }

    @Test
    fun aLowerLimitIsHonoured() {
        Parser(ParserOptions(maxDepth = 2)).parse(nested(2))
        val error = assertFailsWith<ParseException.DepthExceeded> { Parser(ParserOptions(maxDepth = 2)).parse(nested(3)) }
        assertEquals(2, error.limit)
    }

    @Test
    fun anInputOverMaxInputSizeIsRefusedUnread() {
        val parser = Parser(ParserOptions(maxInputSize = 8))
        assertEquals(listOf(Link(null, listOf(Link("abcdefgh")))), parser.parse("abcdefgh"))
        val error = assertFailsWith<ParseException.InputTooLarge> { parser.parse("abcdefghi") }
        assertEquals(8, error.limit)
        // Not read at all: text that does not parse is refused for its size.
        assertFailsWith<ParseException.InputTooLarge> { parser.parse("(((((((((") }
    }

    @Test
    fun theSizeIsCountedInUtf16Units() {
        val parser = Parser(ParserOptions(maxInputSize = 2))
        assertEquals("😀", parser.parse("😀").single().values.single().id)
        assertFailsWith<ParseException.InputTooLarge> { parser.parse("😀a") }
    }

    @Test
    fun theDefaultSizeLimitIsTenMebibytes() {
        assertEquals(10 * 1024 * 1024, ParserOptions.DEFAULT_MAX_INPUT_SIZE)
        val error = assertFailsWith<ParseException.InputTooLarge> {
            Parser().parse("a".repeat(ParserOptions.DEFAULT_MAX_INPUT_SIZE + 1))
        }
        assertEquals(ParserOptions.DEFAULT_MAX_INPUT_SIZE, error.limit)
    }
}
