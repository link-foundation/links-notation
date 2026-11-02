package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Port of `js/tests/MultiQuoteParser.test.js`: references delimited by runs
 * of one to ten `"`, `'` or `` ` ``. The single-reference cases were written
 * by `experiments/port-multi-quote-test.mjs`.
 */
class MultiQuoteParserTest {
    private val parser = Parser()

    /** The reference [input] holds: the only value of an anonymous link, or the id of the first link. */
    private fun singleReferenceId(result: List<Link>): String? =
        if (result.size == 1 && result[0].id == null && result[0].values.size == 1) {
            result[0].values[0].id
        } else {
            result.firstOrNull()?.id
        }

    private fun assertSingleReference(expected: String, input: String) {
        val result = parser.parse(input)
        assertEquals(1, result.size)
        assertEquals(expected, singleReferenceId(result))
    }

    @Test
    fun testBacktickQuotedReference() = assertSingleReference("backtick quoted", "`backtick quoted`")

    @Test
    fun testBacktickQuotedWithSpaces() = assertSingleReference("text with spaces", "`text with spaces`")

    @Test
    fun testBacktickQuotedWithEscapedBacktick() = assertSingleReference("text with ` escaped backtick", "`text with `` escaped backtick`")

    @Test
    fun testSingleQuoteWithEscapedSingleQuote() = assertSingleReference("text with ' escaped quote", "'text with '' escaped quote'")

    @Test
    fun testDoubleQuoteWithEscapedDoubleQuote() = assertSingleReference("text with \" escaped quote", "\"text with \"\" escaped quote\"")

    @Test
    fun testDoubleDoubleQuotes() = assertSingleReference("double double quotes", "\"\"double double quotes\"\"")

    @Test
    fun testDoubleDoubleQuotesWithSingleQuoteInside() = assertSingleReference("text with \" inside", "\"\"text with \" inside\"\"")

    @Test
    fun testDoubleDoubleQuotesWithEscape() = assertSingleReference("text with \"\" escaped double", "\"\"text with \"\"\"\" escaped double\"\"")

    @Test
    fun testDoubleSingleQuotes() = assertSingleReference("double single quotes", "''double single quotes''")

    @Test
    fun testDoubleSingleQuotesWithSingleQuoteInside() = assertSingleReference("text with ' inside", "''text with ' inside''")

    @Test
    fun testDoubleSingleQuotesWithEscape() = assertSingleReference("text with '' escaped single", "''text with '''' escaped single''")

    @Test
    fun testDoubleBacktickQuotes() = assertSingleReference("double backtick quotes", "``double backtick quotes``")

    @Test
    fun testDoubleBacktickQuotesWithBacktickInside() = assertSingleReference("text with ` inside", "``text with ` inside``")

    @Test
    fun testDoubleBacktickQuotesWithEscape() = assertSingleReference("text with `` escaped backtick", "``text with ```` escaped backtick``")

    @Test
    fun testTripleDoubleQuotes() = assertSingleReference("triple double quotes", "\"\"\"triple double quotes\"\"\"")

    @Test
    fun testTripleDoubleQuotesWithDoubleQuoteInside() = assertSingleReference("text with \"\" inside", "\"\"\"text with \"\" inside\"\"\"")

    @Test
    fun testTripleDoubleQuotesWithEscape() = assertSingleReference("text with \"\"\" escaped triple", "\"\"\"text with \"\"\"\"\"\" escaped triple\"\"\"")

    @Test
    fun testTripleSingleQuotes() = assertSingleReference("triple single quotes", "'''triple single quotes'''")

    @Test
    fun testTripleSingleQuotesWithDoubleQuoteInside() = assertSingleReference("text with '' inside", "'''text with '' inside'''")

    @Test
    fun testTripleSingleQuotesWithEscape() = assertSingleReference("text with ''' escaped triple", "'''text with '''''' escaped triple'''")

    @Test
    fun testTripleBacktickQuotes() = assertSingleReference("triple backtick quotes", "```triple backtick quotes```")

    @Test
    fun testTripleBacktickQuotesWithDoubleBacktickInside() = assertSingleReference("text with `` inside", "```text with `` inside```")

    @Test
    fun testTripleBacktickQuotesWithEscape() = assertSingleReference("text with ``` escaped triple", "```text with `````` escaped triple```")

    @Test
    fun testQuadrupleDoubleQuotes() = assertSingleReference("quadruple double quotes", "\"\"\"\"quadruple double quotes\"\"\"\"")

    @Test
    fun testQuadrupleDoubleQuotesWithTripleQuoteInside() = assertSingleReference("text with \"\"\" inside", "\"\"\"\"text with \"\"\" inside\"\"\"\"")

    @Test
    fun testQuadrupleDoubleQuotesWithEscape() = assertSingleReference("text with \"\"\"\" escaped quad", "\"\"\"\"text with \"\"\"\"\"\"\"\" escaped quad\"\"\"\"")

    @Test
    fun testQuadrupleSingleQuotes() = assertSingleReference("quadruple single quotes", "''''quadruple single quotes''''")

    @Test
    fun testQuadrupleBacktickQuotes() = assertSingleReference("quadruple backtick quotes", "````quadruple backtick quotes````")

    @Test
    fun testQuintupleDoubleQuotes() = assertSingleReference("quintuple double quotes", "\"\"\"\"\"quintuple double quotes\"\"\"\"\"")

    @Test
    fun testQuintupleDoubleQuotesWithQuadQuoteInside() = assertSingleReference("text with \"\"\"\" inside", "\"\"\"\"\"text with \"\"\"\" inside\"\"\"\"\"")

    @Test
    fun testQuintupleDoubleQuotesWithEscape() = assertSingleReference("text with \"\"\"\"\" escaped quint", "\"\"\"\"\"text with \"\"\"\"\"\"\"\"\"\" escaped quint\"\"\"\"\"")

    @Test
    fun testQuintupleSingleQuotes() = assertSingleReference("quintuple single quotes", "'''''quintuple single quotes'''''")

    @Test
    fun testQuintupleBacktickQuotes() = assertSingleReference("quintuple backtick quotes", "`````quintuple backtick quotes`````")

    @Test
    fun testCodeBlockLikeContent() = assertSingleReference("const x = 1;", "```const x = 1;```")

    @Test
    fun testNestedQuotesInMarkdown() = assertSingleReference("Use `code` in markdown", "``Use `code` in markdown``")

    @Test
    fun testSQLWithQuotes() = assertSingleReference("SELECT * FROM users WHERE name = ''John''", "''SELECT * FROM users WHERE name = ''''John''''''")

    @Test
    fun testJSONStringWithQuotes() = assertSingleReference("{\"key\": \"value\"}", "\"\"{\"key\": \"value\"}\"\"")

    @Test
    fun testWhitespacePreservedInQuotes() = assertSingleReference("  spaces  ", "\"  spaces  \"")

    @Test
    fun testUnlimitedQuotes6() = assertSingleReference("hello", "\"\"\"\"\"\"hello\"\"\"\"\"\"")

    @Test
    fun testUnlimitedQuotes10() = assertSingleReference("very deeply quoted", "\"\"\"\"\"\"\"\"\"\"very deeply quoted\"\"\"\"\"\"\"\"\"\"")

    @Test
    fun testUnlimitedQuotes6WithInnerQuotes() = assertSingleReference("hello with \"\"\"\"\" five quotes inside", "\"\"\"\"\"\"hello with \"\"\"\"\" five quotes inside\"\"\"\"\"\"")

    @Test
    fun testUnlimitedSingleQuotes7() = assertSingleReference("seven single quotes", "'''''''seven single quotes'''''''")

    @Test
    fun testUnlimitedBackticks8() = assertSingleReference("eight backticks", "````````eight backticks````````")

    @Test
    fun testBacktickQuotedMultiline() {
        val result = parser.parse("(`line1\nline2`)")
        assertEquals(1, result.size)
        assertEquals("line1\nline2", result[0].values[0].id)
    }

    @Test
    fun testMixedQuotesInLink() {
        val result = parser.parse("(\"double\" 'single' `backtick`)")
        assertEquals(1, result.size)
        assertEquals(listOf("double", "single", "backtick"), result[0].values.map { it.id })
    }

    @Test
    fun testBacktickAsIdInLink() {
        val result = parser.parse("(`myId`: value1 value2)")
        assertEquals(1, result.size)
        assertEquals("myId", result[0].id)
        assertEquals(2, result[0].values.size)
    }

    /** The JavaScript test accepts either outcome; `''` is the empty reference in every implementation. */
    @Test
    fun testEmptySingleQuotedReference() {
        assertEquals("(<>)", parsesAs("''"))
    }

    @Test
    fun testMultilineInDoubleDoubleQuotes() {
        val result = parser.parse("(\"\"line1\nline2\"\")")
        assertEquals(1, result.size)
        assertEquals("line1\nline2", result[0].values[0].id)
    }
}
