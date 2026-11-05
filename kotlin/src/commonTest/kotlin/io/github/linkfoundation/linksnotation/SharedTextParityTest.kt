package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/**
 * Port of `js/tests/SharedTextParity.test.js`: the shared text corpus,
 * `parity/text-fixtures.json`, which `generateParityCases` turns into
 * [PARITY_CASES].
 */
class SharedTextParityTest {
    private fun unindent(group: LinksGroup): Link =
        if (group.children.isEmpty()) {
            group.element
        } else {
            Link(group.element.id, group.element.values + group.children.map(::unindent))
        }

    @Test
    fun indentedIdGroupsAgreeWithParse() {
        val cases = PARITY_CASES.filter { it.id.startsWith("indented-id-") }
        assertEquals(6, cases.size)
        for (case in cases) {
            val groups = Parser().parseGroups(case.input)
            assertEquals(Parser().parse(case.input), groups.map(::unindent), case.id)
            assertEquals("x", groups[0].element.id, case.id)
            assertEquals(emptyList(), groups[0].element.values, case.id)
        }
        for (input in listOf("id:", "(id:)")) {
            assertEquals(Link("id", emptyList()), Parser().parseGroups(input)[0].element)
        }
        val ordinary = Parser().parseGroups("x: kind\n  a\n  b")[0]
        assertEquals(Link(null, listOf(Link("a"))), ordinary.children[0].element)
        assertEquals(Link(null, listOf(Link("b"))), ordinary.children[1].element)
        val ast = Parser(ParserOptions(syntax = false)).parseGroups("x:\n  'a'")[0]
        assertEquals("a", ast.children[0].element.id)
        assertNull(ast.children[0].element.rawId)
    }

    @Test
    fun sharedTextParity() {
        assertEquals(31, PARITY_CASES.size)
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

    @Test
    fun sharedNestedFormat() {
        fun decode(hex: String): String =
            hex
                .chunked(2)
                .map { it.toInt(16).toByte() }
                .toByteArray()
                .decodeToString()
        var count = 0
        for (line in NESTED_VECTOR_LINES.filter { !it.startsWith("#") && it.isNotEmpty() }) {
            val columns = line.split('\t')
            assertEquals(3, columns.size)
            val links = Parser().parse(decode(columns[1]))
            val text = formatNested(links)
            assertEquals(decode(columns[2]), text, columns[0])
            assertEquals(links, Parser().parseGroups(text).map(::unindent), columns[0])
            assertEquals(links, Parser().parseGroups(formatNested(links, "    ")).map(::unindent), columns[0])
            count++
        }
        kotlin.test.assertTrue(count > 0)
    }

    @Test
    fun anonymousThresholdRoundTrip() {
        for (input in listOf("a b c", "((b c))", "(a (b c))")) {
            val links = Parser().parse(input)
            for (options in listOf(
                FormatOptions(maxInlineRefs = 0, preferInline = false),
                FormatOptions(maxLineLength = 1, indentLongLines = true, preferInline = false),
            )) {
                assertEquals(links, Parser().parse(formatLinks(links, options)), input)
            }
        }
    }
}
