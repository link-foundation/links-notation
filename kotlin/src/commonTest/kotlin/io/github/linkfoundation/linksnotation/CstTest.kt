package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.time.TimeSource

/** Port of `js/tests/Cst.test.js`. */
class CstTest {
    private fun roundTrip(
        input: String,
        options: ParserOptions = ParserOptions(),
    ) = Parser(options).parseCst(input).toString()

    private fun references(input: String) = Parser().parseCst(input).tokens().filter { it.kind == CstKind.REFERENCE }

    @Test
    fun isTheDefaultLosslessViewOfADocument() {
        val input = "(t 1 '1')"
        val cst = Parser().parseCst(input)
        assertEquals(CstKind.DOCUMENT, cst.kind)
        assertEquals(input, cst.toString())
        assertEquals(
            "(document (line (group open_paren:\"(\" (line reference:\"t\" whitespace:\" \" reference:\"1\" " +
                "whitespace:\" \" reference:\"'1'\") close_paren:\")\")))",
            cst.toSExpression(),
        )
    }

    @Test
    fun referenceTokensCarryTheirValueAndDelimiter() {
        assertEquals(
            listOf(
                Triple("a", "a", null),
                Triple("\"b c\"", "b c", "\""),
                Triple("~1{64}", "d", null),
                Triple("''e''''f''", "e''f", "'"),
            ),
            references("(a \"b c\" ~1{64} ''e''''f'')").map { Triple(it.text, it.value, it.quote) },
        )
    }

    @Test
    fun recoversEachDocumentExactly() {
        for ((name, input) in listOf(
            "empty" to "",
            "only whitespace" to " \t ",
            "blank lines" to "\n\n",
            "CRLF and CR" to "a\r\nb\rc\r\n",
            "tabs and trailing spaces" to "a\t b  \n",
            "comments everywhere" to "# head\na: b # tail\n  # inner\n  c\n# end",
            "multiline quotes" to "(note: \"one\n  two\r\nthree\")",
            "nested groups over lines" to "(a (b\n  (c d)\n) e)\n",
            "indentation" to "root:\n  child:\n    leaf\n  tail",
            "literals" to "(~1{} ~1{e6a0b9})",
            "comment marks inside quotes" to "('#a' \"b # c\" `#`)",
            "unicode" to "(根: café 🙂)\n",
        )) {
            assertEquals(input, roundTrip(input), name)
        }
    }

    @Test
    fun withoutCommentSupportHashIsPartOfReferences() {
        val input = "a #b"
        val cst = Parser(ParserOptions(comments = false)).parseCst(input)
        assertEquals(input, cst.toString())
        assertEquals(listOf("reference", "whitespace", "reference"), cst.tokens().map { it.kind.value })
    }

    @Test
    fun aGroupBelongsToTheLineItOpensOn() {
        val cst = Parser().parseCst("a (b\nc)\nd")
        assertEquals(listOf("a (b\nc)\n", "d"), cst.children.map { it.toString() })
        val group = cst.children[0].children[2]
        assertEquals(CstKind.GROUP, group.kind)
        assertEquals(listOf("open_paren", "line", "line", "close_paren"), group.children.map { it.kind.toString() })
    }

    @Test
    fun readsVersionedLiteralsInLinearTime() {
        val input =
            listOf("~1{" + "61".repeat(50000) + "}", "~" + "1".repeat(50000) + "x", "~1{61} ".repeat(20000))
                .joinToString("\n")
        val started = TimeSource.Monotonic.markNow()
        val cst = Parser().parseCst(input)
        assertEquals(true, started.elapsedNow().inWholeMilliseconds < 5000)
        assertEquals(input, cst.toString())
        assertEquals(
            listOf("~1{64}" to "d", "~{}" to "~{}", "~a{b}" to "~a{b}", "~1x" to "~1x"),
            references("(~1{64} ~{} ~a{b} ~1x)").map { it.text to it.value },
        )
    }

    @Test
    fun rejectsWhatParseRejects() {
        assertFailsWith<ParseException> { Parser().parseCst("(a") }
        assertFailsWith<ParseException> { Parser().parseCst("a)") }
        assertFailsWith<ParseException> { Parser(ParserOptions(maxDepth = 1)).parseCst("((a))") }
    }
}
