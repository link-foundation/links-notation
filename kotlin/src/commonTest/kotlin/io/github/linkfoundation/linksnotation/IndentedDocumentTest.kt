package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse

/**
 * Port of `js/tests/IndentedDocument.test.js`. Where JavaScript maps a parent
 * with one child to that child's text, [parseIndentedDocument] maps it to a
 * list of one, so the maps below hold lists. Tests JavaScript runs on values
 * of the wrong type (`42`, `null`, an unknown `multipleValues`) have nothing
 * to check here: the Kotlin signatures take no such values.
 */
class IndentedDocumentTest {
    private fun roundTrip(entries: Map<String, List<String>>) = parseIndentedDocument(formatIndentedDocument(entries))

    @Test
    fun mixedQuotesRoundTripThroughTheExistingLinkFormatter() {
        val text = "He said \"it's ready\""
        val formatted = Link(text).toString()
        assertEquals(text, Parser().parse(formatted)[0].values[0].id)
        assertFalse("\\'" in formatted)
        assertEquals("'He said \"it''s ready\"'", escapeReference(text, minimal = true))
    }

    @Test
    fun minimalEscapingLeavesOrdinaryProseUnquoted() {
        assertEquals("What is your experience?", escapeReference("What is your experience?", minimal = true))
        assertEquals("'What is your experience?'", escapeReference("What is your experience?"))
    }

    @Test
    fun publicGroupsPreserveImmediateChildrenAndDeeperIndentation() {
        val groups =
            Parser().parseGroups(
                "What is your experience?\n  JavaScript\n  Python\n    Django\nOther question\n  Answer",
            )
        assertEquals(2, groups.size)
        assertEquals(listOf("What", "is", "your", "experience?"), groups[0].element.values.map { it.id })
        assertEquals(2, groups[0].children.size)
        assertEquals(
            "Django",
            groups[0]
                .children[1]
                .children[0]
                .element.values[0]
                .id,
        )
        assertEquals(
            "Answer",
            groups[1]
                .children[0]
                .element.values[0]
                .id,
        )
    }

    @Test
    fun groupsRetainNamedAndNestedLinksAndShareParserDiagnostics() {
        val parser = Parser()
        val root = parser.parseGroups("root:\n  child: (one two)\n  branch\n    leaf")[0]
        assertEquals("root", root.element.id)
        assertEquals(emptyList(), root.element.values)
        assertEquals("(child: (one two))", root.children[0].element.toString())
        assertEquals(1, root.children[1].children.size)
        assertFailsWith<ParseException.Syntax> { parser.parseGroups("root: child: value") }
        assertFailsWith<ParseException.DepthExceeded> { Parser(ParserOptions(maxDepth = 0)).parseGroups("root\n  child") }
        val error =
            assertFailsWith<ParseException.InputTooLarge> {
                Parser(ParserOptions(maxInputSize = 2)).parseGroups("root")
            }
        assertEquals(true, error.message!!.startsWith("Input size exceeds"))
    }

    @Test
    fun parseTheIssueDocumentWithoutInspectingPrivatePathFlags() {
        val input =
            "What is your experience?\n  I have worked with JavaScript\n" +
                "'Question with \"quotes\": and colon'\n  Answer\n"
        assertEquals(
            mapOf(
                "What is your experience?" to listOf("I have worked with JavaScript"),
                "Question with \"quotes\": and colon" to listOf("Answer"),
            ),
            parseIndentedDocument(input),
        )
    }

    @Test
    fun multipleChildLinesHaveExplicitArrayOrJoinedTextBehavior() {
        val input = "Skills\n  JavaScript\n  Python\nUnanswered\nSkills\n  Go"
        assertEquals(
            mapOf("Skills" to listOf("JavaScript", "Python", "Go"), "Unanswered" to emptyList()),
            parseIndentedDocument(input),
        )
        assertEquals(
            mapOf("Skills" to listOf("JavaScript\nPython\nGo"), "Unanswered" to emptyList()),
            parseIndentedDocument(input, multipleValues = MultipleValues.JOIN),
        )
    }

    @Test
    fun formatTheIssueDocumentWithTwoSpaceIndentationAndAFinalNewline() {
        val entries =
            mapOf(
                "What is your experience?" to listOf("I have worked with JavaScript"),
                "Skills" to listOf("JavaScript", "Python"),
            )
        assertEquals(
            "What is your experience?\n  I have worked with JavaScript\nSkills\n  JavaScript\n  Python\n",
            formatIndentedDocument(entries),
        )
        assertEquals(entries, roundTrip(entries))
        assertEquals("", formatIndentedDocument(emptyMap()))
        assertEquals(emptyMap(), parseIndentedDocument(""))
    }

    @Test
    fun emptyTextExactWhitespaceCommentsQuotesAndMultilineTextSurvive() {
        for (text in listOf(
            "",
            " ",
            "  leading",
            "trailing  ",
            "two  spaces",
            "a\tb",
            "# question",
            "text # literal",
            "issue#333",
            "Question: (details)",
            "`backticks`",
            "\"double\" and 'single'",
            "'starts with both \"quotes\"",
            "\"starts with both 'quotes'",
            "ends with both '\"",
            "repeated ''' and \"\"\"",
            "literal \\n and \\'",
            "line one\n  line two",
            "carriage\rreturn",
            "Windows\r\nline",
            "Привет 🌍",
        )) {
            assertEquals(text, unescapeReference(escapeReference(text, minimal = true)), text)
            val entries = mapOf(text to listOf(text))
            assertEquals(entries, roundTrip(entries), text)
        }
    }

    @Test
    fun unescapingUsesTheGrammarAndNeverDecodesAlreadyParsedIdsAgain() {
        assertEquals("He said \"hello\"", unescapeReference("\"He said \"\"hello\"\"\""))
        assertEquals("it's ready", unescapeReference("'it''s ready'"))
        assertEquals("text with ` inside", unescapeReference("``text with ` inside``"))
        assertEquals("plain text", unescapeReference("plain text"))
        assertEquals("literal \\n", unescapeReference("literal \\n"))
        assertFailsWith<IllegalArgumentException> { unescapeReference("\"unfinished") }
        assertFailsWith<IllegalArgumentException> { unescapeReference("\"value\" extra") }
        assertEquals(mapOf("Question" to listOf("two '' quotes")), parseIndentedDocument("Question\n  \"two '' quotes\""))
    }

    @Test
    fun documentHelpersRejectDeeperOrNamedValueStructuresInsteadOfLosingData() {
        assertFailsWith<IllegalArgumentException> { parseIndentedDocument("Question\n  Answer\n    Detail") }
        assertFailsWith<IllegalArgumentException> { parseIndentedDocument("Question\n  answer: value") }
    }

    @Test
    fun documentParsingRespectsCommentsAndExistingParserOptions() {
        assertEquals(
            mapOf("Question" to listOf("Answer")),
            parseIndentedDocument("# comment\nQuestion\n  Answer # comment"),
        )
        assertEquals(
            mapOf("# question" to listOf("Answer")),
            parseIndentedDocument("# question\n  Answer", ParserOptions(comments = false)),
        )
    }

    @Test
    fun oneElementArraysNormalizeToStringsAndUnansweredParentsRemainDistinct() {
        val entries = mapOf("One option" to listOf("only"), "No options" to emptyList(), "Empty answer" to listOf(""))
        assertEquals(entries, roundTrip(entries))
    }

    @Test
    fun documentHelpersPreserveTheSharedUnicodeReferenceCorpusAndReservedPrefixes() {
        for (
        text in REFERENCES +
            listOf(
                "~1{61}",
                "~2{00}",
                "~1{invalid}",
                "text ~1{61} after",
                "text ~2{00}",
                "text ~1{invalid}",
            )
        ) {
            assertEquals(formatBinaryReference(text), escapeReference(text))
            assertEquals(text, unescapeReference(escapeReference(text)))
            assertEquals(text, unescapeReference(escapeReference(text, minimal = true)))
            val entries = mapOf(text to listOf(text))
            assertEquals(entries, roundTrip(entries))
        }
    }

    @Test
    fun unescapingDecodesVersionedLiteralsWithoutDecodingParsedDocumentIdsTwice() {
        assertEquals("", unescapeReference("~1{}"))
        assertEquals("\u0000", unescapeReference("~1{00}"))
        assertEquals("é", unescapeReference("~1{C3A9}"))
        for (literal in listOf("~2{61}", "~1{0}", "~1{gg}", "~1{ff}")) {
            assertFailsWith<IllegalArgumentException>(literal) { unescapeReference(literal) }
        }
        val entries = mapOf("~1{61}" to listOf("~1{62}"))
        assertEquals(entries, roundTrip(entries))
        assertFailsWith<IllegalArgumentException> { escapeReference(LONE_SURROGATE, minimal = true) }
    }
}
