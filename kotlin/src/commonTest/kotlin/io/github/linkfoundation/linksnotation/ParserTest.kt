package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Behaviour the corpora do not pin down on their own. Every expected value
 * here is what the JavaScript reference parser (links-notation 0.27.1) gives
 * for the same input.
 */
class ParserTest {
    private fun ref(id: String) = Link(id)

    private fun parse(text: String, options: ParserOptions = ParserOptions()) = Parser(options).parse(text)

    @Test
    fun quotedReferencesAreUnquoted() {
        assertEquals(listOf(Link("a b", listOf(ref("c")))), parse("\"a b\": c"))
        assertEquals(listOf(Link(null, listOf(ref("it's"), ref("x")))), parse("'it''s' x"))
        assertEquals(listOf(Link(null, listOf(ref("a ` b")))), parse("```a ` b```"))
    }

    @Test
    fun referencesAreQuotedWhenFormatted() {
        assertEquals("('a b': c)", formatLinks(parse("\"a b\": c")))
        assertEquals("(\"it's\" x)", formatLinks(parse("'it''s' x")))
        assertEquals("('a ` b')", formatLinks(parse("```a ` b```")))
    }

    @Test
    fun indentedLinesAreValuesOfTheLineAbove() {
        val links = parse("a:\n  b\n  c")
        assertEquals(listOf(Link("a", listOf(ref("b"), ref("c")))), links)
        assertEquals("(a: b c)", formatLinks(links))
    }

    @Test
    fun formatLinksLeavesOutParenthesesThatAreNotNeeded() {
        val links = parse("(a: b c)\n(d e)\npapa (lovesMama: loves mama)")
        assertEquals("(a: b c)\n(d e)\n(papa (lovesMama: loves mama))", formatLinks(links))
        assertEquals("a: b c\nd e\npapa (lovesMama: loves mama)", formatLinks(links, lessParentheses = true))
        val built = listOf(Link("has space", listOf(ref("x"))), Link(null, listOf(ref("y"), ref("z"))))
        assertEquals("('has space': x)\n(y z)", formatLinks(built))
        assertEquals("('has space': x)\ny z", formatLinks(built, lessParentheses = true))
        assertEquals("()", Link(null).format())
        assertEquals("", Link(null).format(lessParentheses = true))
    }

    @Test
    fun hashStartsACommentOnlyAtTheStartOfAToken() {
        assertEquals(listOf(Link(null, listOf(ref("a"))), Link(null, listOf(ref("b")))), parse("a # note\nb"))
        assertEquals(listOf(Link(null, listOf(ref("issue#1"), ref("# x")))), parse("issue#1 \"# x\""))
        assertEquals(
            listOf(Link(null, listOf(ref("a"), ref("#"), ref("note")))),
            parse("a # note", ParserOptions(comments = false)),
        )
    }

    @Test
    fun referenceLiteralsAreDecoded() {
        assertEquals(listOf(Link(null, listOf(ref("Hi")))), parse("~1{4869}"))
    }

    @Test
    fun malformedReferenceLiteralsAreSyntaxErrors() {
        // The JavaScript parser refuses these too, with a message but no position.
        for (text in listOf("x ~1{zz}", "~1{ff}", "~2{41}")) {
            val error = assertFailsWith<ParseException.Syntax>(text) { parse(text) }
            assertFalse(error is ParseException.DepthExceeded)
        }
    }

    @Test
    fun syntaxErrorsCarryTheJavaScriptMessage() {
        val error = assertFailsWith<ParseException.Syntax> { parse("(a: b: c)") }
        assertEquals(1, error.line)
        assertEquals(6, error.column)
        assertEquals(
            "Syntax error at line 1, column 6: " +
                "Expected \"(\", [ \\t], [\\r\\n], or [^ \\t\\n\\r(:)] but \":\" found.\n" +
                "1 | (a: b: c)\n" +
                "  |      ^",
            error.message,
        )
    }

    @Test
    fun linksCompareByIdAndValues() {
        val parsed = parse("a:\n  b").single()
        assertEquals(Link("a", listOf(ref("b"))), parsed)
        assertTrue(parsed.hashCode() == Link("a", listOf(ref("b"))).hashCode())
    }

    @Test
    fun optionsRefuseNegativeLimits() {
        assertFailsWith<IllegalArgumentException> { ParserOptions(maxDepth = -1) }
        assertFailsWith<IllegalArgumentException> { ParserOptions(maxInputSize = -1) }
    }
}
