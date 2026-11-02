package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Port of `js/tests/NestedParser.test.js`. */
class NestedParserTest {
    private val parser = Parser()

    private fun format(source: String) = formatLinks(parser.parse(source))

    @Test
    fun significantWhitespaceTest() {
        val source =
            """
            |
            |users
            |    user1
            |        id
            |            43
            |        name
            |            first
            |                John
            |            last
            |                Williams
            |        location
            |            New York
            |        age
            |            23
            |    user2
            |        id
            |            56
            |        name
            |            first
            |                Igor
            |            middle
            |                Petrovich
            |            last
            |                Ivanov
            |        location
            |            Moscow
            |        age
            |            20
            """.trimMargin()
        val target =
            """
            |(users)
            |((users) (user1))
            |(((users) (user1)) (id))
            |((((users) (user1)) (id)) (43))
            |(((users) (user1)) (name))
            |((((users) (user1)) (name)) (first))
            |(((((users) (user1)) (name)) (first)) (John))
            |((((users) (user1)) (name)) (last))
            |(((((users) (user1)) (name)) (last)) (Williams))
            |(((users) (user1)) (location))
            |((((users) (user1)) (location)) (New York))
            |(((users) (user1)) (age))
            |((((users) (user1)) (age)) (23))
            |((users) (user2))
            |(((users) (user2)) (id))
            |((((users) (user2)) (id)) (56))
            |(((users) (user2)) (name))
            |((((users) (user2)) (name)) (first))
            |(((((users) (user2)) (name)) (first)) (Igor))
            |((((users) (user2)) (name)) (middle))
            |(((((users) (user2)) (name)) (middle)) (Petrovich))
            |((((users) (user2)) (name)) (last))
            |(((((users) (user2)) (name)) (last)) (Ivanov))
            |(((users) (user2)) (location))
            |((((users) (user2)) (location)) (Moscow))
            |(((users) (user2)) (age))
            |((((users) (user2)) (age)) (20))
            """.trimMargin()
        assertEquals(target, format("\n" + source.removePrefix("\n")))
    }

    @Test
    fun simpleSignificantWhitespaceTest() = assertEquals("(a)\n((a) (b))\n((a) (c))", format("a\n    b\n    c"))

    @Test
    fun twoSpacesSizedWhitespaceTest() = assertEquals("(users)\n((users) (user1))", format("\nusers\n  user1"))

    @Test
    fun parseNestedStructureWithIndentation() {
        val result = parser.parse("parent\n  child1\n  child2")
        assertEquals(3, result.size)
        assertNull(result[0].id)
        assertEquals("parent", result[0].values[0].id)
        assertNull(result[1].id)
        assertEquals(2, result[1].values.size)
        assertNull(result[2].id)
        assertEquals(2, result[2].values.size)
    }

    @Test
    fun indentationConsistency() {
        assertTrue(parser.parse("parent\n  child1\n   child2").isNotEmpty())
    }

    @Test
    fun indentationBasedChildren() = assertEquals(4, parser.parse("parent\n  child1\n  child2\n    grandchild").size)

    @Test
    fun complexIndentation() = assertEquals(6, parser.parse("root\n  level1a\n    level2a\n    level2b\n  level1b\n    level2c").size)

    @Test
    fun nestedLinks() {
        val parsed = parser.parse("(1: (2: (3: 3)))")
        assertTrue(formatLinks(parsed).isNotEmpty())
        assertEquals(1, parsed.size)
    }

    @Test
    fun indentationParser() {
        val result = parser.parse("parent\n  child1\n  child2")
        assertTrue(result.isNotEmpty())
        assertTrue(result.any { link -> link.values.any { it.id == "parent" } })
    }

    @Test
    fun nestedIndentationParser() {
        assertTrue(parser.parse("parent\n  child\n    grandchild").isNotEmpty())
    }

    @Test
    fun threeLevelNestingRoundtrip() = assertEquals("(1: (2: (3: 3)))", format("(1: (2: (3: 3)))"))

    @Test
    fun deepNestedStructureRoundtrip() = assertEquals("(a: (b: (c: (d: d))))", format("(a: (b: (c: (d: d))))"))

    @Test
    fun multipleNestedLinksRoundtrip() =
        assertEquals(
            "(parent: (child1: value1) (child2: value2))",
            format("(parent: (child1: value1) (child2: value2))"),
        )
}
