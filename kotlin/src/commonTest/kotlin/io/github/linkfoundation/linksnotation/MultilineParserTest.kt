package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Port of `js/tests/MultilineParser.test.js`. */
class MultilineParserTest {
    private val parser = Parser()

    @Test
    fun twoLinks() {
        val source = "(first: x y)\n(second: a b)"
        assertEquals(source, formatLinks(parser.parse(source)))
    }

    @Test
    fun parseAndStringify() {
        val source = "(papa (lovesMama: loves mama))\n(son lovesMama)\n(daughter lovesMama)\n(all (love mama))"
        assertEquals(source, formatLinks(parser.parse(source)))
    }

    @Test
    fun parseAndStringifyTest2() {
        val source = "father (lovesMom: loves mom)\nson lovesMom\ndaughter lovesMom\nall (love mom)"
        assertEquals(source, formatLinks(parser.parse(source), true))
    }

    @Test
    fun parseAndStringifyWithLessParentheses() {
        val source = "lovesMama: loves mama\npapa lovesMama\nson lovesMama\ndaughter lovesMama\nall (love mama)"
        assertEquals(source, formatLinks(parser.parse(source), true))
    }

    @Test
    fun duplicateIdentifiers() {
        val source = "(a: a b)\n(a: b c)"
        assertEquals("(a: a b)\n(a: b c)", formatLinks(parser.parse(source)))
    }

    @Test
    fun complexStructure() {
        val input = "(Type: Type Type)\n  Number\n  String\n  Array\n  Value\n" +
            "    (property: name type)\n    (method: name params return)"
        assertTrue(parser.parse(input).isNotEmpty())
    }

    @Test
    fun mixedFormats() {
        val input = "id1: value1\n(id2: value2 value3)\nsimple_ref\n(complex: \n  nested1\n  nested2\n)"
        assertTrue(parser.parse(input).isNotEmpty())
    }

    @Test
    fun multilineWithId() {
        assertTrue(parser.parse("(id: value1 value2)").isNotEmpty())
    }

    @Test
    fun multipleTopLevelElements() {
        assertTrue(parser.parse("(elem1: val1)\n(elem2: val2)").isNotEmpty())
    }

    @Test
    fun multilineSimpleLinks() {
        val input = "(1: 1 1)\n(2: 2 2)"
        val parsed = parser.parse(input)
        assertTrue(parsed.isNotEmpty())
        val output = formatLinks(parsed)
        assertTrue(output.contains("(1: 1 1)"))
        assertTrue(output.contains("(2: 2 2)"))
        assertEquals(input, formatLinks(parsed))
    }

    @Test
    fun indentedChildren() {
        assertTrue(parser.parse("parent\n  child1\n  child2").isNotEmpty())
    }
}
