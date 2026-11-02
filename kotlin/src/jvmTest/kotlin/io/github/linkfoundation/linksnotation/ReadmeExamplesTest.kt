package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * The examples of kotlin/README.md, with the results the README states for
 * them, so the documentation cannot drift from the library.
 */
class ReadmeExamplesTest {
    @Test
    fun basicParsing() {
        val links =
            Parser().parse(
                """
                papa (lovesMama: loves mama)
                son lovesMama
                daughter lovesMama
                all (love mama)
                """.trimIndent(),
            )
        assertEquals(4, links.size)
        assertEquals("(papa (lovesMama: loves mama))", links[0].format())
        assertEquals("papa (lovesMama: loves mama)", links[0].format(lessParentheses = true))
        assertEquals(
            "(papa (lovesMama: loves mama))\n(son lovesMama)\n(daughter lovesMama)\n(all (love mama))",
            formatLinks(links),
        )
    }

    @Test
    fun buildingLinks() {
        val parent = Link("parent", listOf(Link("child1"), Link("child2")))
        assertEquals("(parent: child1 child2)", parent.format())
        assertEquals("(parent: child1 child2)", parent.toString())
        assertEquals(parent, Parser().parse("(parent: child1 child2)").single())
        assertEquals("(a b)", Link("a").combine(Link("b")).format())
        assertEquals("'has space'", escapeReference("has space"))
    }

    @Test
    fun formatOptions() {
        val link = Link("id", listOf(Link("value1"), Link("value2"), Link("value3")))
        val options = FormatOptions(maxInlineRefs = 2, preferInline = false)
        assertEquals("id:\n  value1\n  value2\n  value3", link.format(options))
    }

    @Test
    fun limitsAndErrors() {
        val parser = Parser(ParserOptions(maxDepth = 1))
        assertEquals(1, parser.parse("(a)").size)
        val error = assertFailsWith<ParseException.DepthExceeded> { parser.parse("((a))") }
        assertEquals(1, error.limit)
        assertEquals(1, error.line)
        assertEquals(2, error.column)
        assertFailsWith<ParseException.InputTooLarge> { Parser(ParserOptions(maxInputSize = 3)).parse("abcd") }
        val syntax = assertFailsWith<ParseException.Syntax> { Parser().parse("(a b") }
        assertEquals(1, syntax.line)
    }

    @Test
    fun syntaxMetadataAndCst() {
        val link = Parser().parse("(t 1 '1')").single()
        val bare = link.values[1]
        val quoted = link.values[2]
        assertEquals(bare, quoted)
        assertEquals("1", bare.rawId)
        assertNull(bare.quote)
        assertEquals("'1'", quoted.rawId)
        assertEquals("'", quoted.quote)
        assertEquals("(t 1 1)", link.format())
        assertNull(
            Parser(ParserOptions(syntax = false))
                .parse("('1')")
                .single()
                .values
                .single()
                .rawId,
        )

        val cst = Parser().parseCst("(t 1 '1') # note\n")
        assertEquals("(t 1 '1') # note\n", cst.toString())
        assertTrue(cst.toSExpression().startsWith("(document (line (group open_paren:\"(\""))
    }

    @Test
    fun streaming() {
        val seen = ArrayList<String>()
        val stream = StreamParser(collect = false).onLink { seen.add(it.format()) }
        stream.write("profile:\n  name Ada\n")
        assertEquals(emptyList(), seen)
        stream.end("next link")
        assertEquals(listOf("(profile: (name Ada))", "(next link)"), seen)

        val lazy = StreamParser.parse(listOf("a b\n", "c d"))
        assertEquals(listOf("(a b)", "(c d)"), lazy.map { it.format() }.toList())
    }

    @Test
    fun groupsAndIndentedDocuments() {
        val groups = Parser().parseGroups("parent\n  child1\n  child2")
        val group = groups.single()
        assertEquals("((parent)) ((child1)) ((child2))", group.toString())
        assertEquals(listOf("(parent)", "(child1)", "(child2)"), group.toList().map { it.format() })
        assertEquals(2, group.children.size)

        val document = parseIndentedDocument("fruits\n  apple\n  pear\n")
        assertEquals(mapOf("fruits" to listOf("apple", "pear")), document)
        assertEquals("fruits\n  apple\n  pear\n", formatIndentedDocument(document))
    }

    @Test
    fun binaryCodec() {
        val codec = BinaryLinoCodec()
        val bytes = codec.encodeText("(papa loves mama)")
        assertEquals("papa loves mama", codec.decodeText(bytes))
        assertEquals(codec.parseDocument("(papa loves mama)"), codec.decode(bytes))
    }
}
