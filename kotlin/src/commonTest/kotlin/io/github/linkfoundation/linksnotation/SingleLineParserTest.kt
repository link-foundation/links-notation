package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/** Port of `js/tests/SingleLineParser.test.js`. */
class SingleLineParserTest {
    private val parser = Parser()

    private fun roundTrips(
        source: String,
        target: String = source,
    ) = assertEquals(target, formatLinks(parser.parse(source)))

    private fun parses(input: String) = assertTrue(parser.parse(input).isNotEmpty())

    private fun refused(input: String) {
        assertFailsWith<ParseException> { parser.parse(input) }
    }

    /** One link of [input], with [id] and value references [values]. */
    private fun assertLink(
        input: String,
        id: String?,
        vararg values: String,
    ) {
        val result = parser.parse(input)
        assertEquals(1, result.size)
        assertEquals(id, result[0].id)
        assertEquals(values.toList(), result[0].values.map { it.id })
    }

    @Test
    fun singleLink() = roundTrips("(address: source target)")

    @Test
    fun tripletSingleLink() = roundTrips("(papa has car)")

    @Test
    fun bugTest1() = roundTrips("(ignore conan-center-index repository)")

    @Test
    fun quotedReferences() = roundTrips("(a: 'b' \"c\")", "(a: b c)")

    @Test
    fun quotedReferencesWithSpaces() = roundTrips("('a a': 'b b' \"c c\")", "('a a': 'b b' 'c c')")

    @Test
    fun parseSimpleReference() {
        assertLink("test", null, "test")
        assertEquals(emptyList(), parser.parse("test")[0].values[0].values)
    }

    @Test
    fun parseReferenceWithColonAndValues() = assertLink("parent: child1 child2", "parent", "child1", "child2")

    @Test
    fun parseMultilineLink() = assertLink("(parent: child1 child2)", "parent", "child1", "child2")

    @Test
    fun parseQuotedReferences() {
        val input = "\"has space\" 'has:colon'"
        assertLink(input, null, "has space", "has:colon")
        assertEquals("('has space' 'has:colon')", formatLinks(parser.parse(input)))
    }

    @Test
    fun parseValuesOnly() = refused(": value1 value2")

    @Test
    fun testSingleLineLinkWithId() = parses("id: value1 value2")

    @Test
    fun testMultiLineLinkWithId() = parses("(id: value1 value2)")

    @Test
    fun testLinkWithoutIdSingleLine() = refused(": value1 value2")

    @Test
    fun testLinkWithoutIdMultiLine() = refused("(: value1 value2)")

    @Test
    fun testSingletLink() {
        assertLink("(singlet)", null, "singlet")
        assertEquals(emptyList(), parser.parse("(singlet)")[0].values[0].values)
    }

    @Test
    fun testValueLink() = parses("(value1 value2 value3)")

    @Test
    fun parseQuotedReferencesValuesOnly() = assertLink("\"has space\" 'has:colon'", null, "has space", "has:colon")

    @Test
    fun testQuotedReferences() = parses("(\"id with spaces\": \"value with spaces\")")

    @Test
    fun testSingleQuotedReferences() = parses("('id': 'value')")

    @Test
    fun testNestedLinks() = parses("(outer: (inner: value))")

    @Test
    fun testSpecialCharactersInQuotes() {
        parses("(\"key:with:colons\": \"value(with)parens\")")
        parses("('key with spaces': 'value: with special chars')")
    }

    @Test
    fun testDeeplyNested() = parses("(a: (b: (c: (d: (e: value)))))")

    @Test
    fun testHyphenatedIdentifiers() = parses("(conan-center-index: repository info)")

    @Test
    fun testMultipleWordsInQuotes() {
        val result = parser.parse("(\"New York\": city state)")
        assertTrue(result.isNotEmpty())
        assertTrue(result.toString().contains("New York"))
    }

    @Test
    fun testSimpleRef() = parses("simple_ref")

    @Test
    fun testSimpleReferenceParser() = assertLink("hello", null, "hello")

    @Test
    fun testQuotedReferenceParser() = assertLink("\"hello world\"", null, "hello world")

    @Test
    fun testSingletLinkParser() {
        assertLink("(singlet)", null, "singlet")
        assertEquals(emptyList(), parser.parse("(singlet)")[0].values[0].values)
    }

    @Test
    fun testValueLinkParser() = assertLink("(a b c)", null, "a", "b", "c")

    @Test
    fun multilineWithoutId() = refused("(: value1 value2)")

    @Test
    fun parseValuesOnlyStandaloneColon() = refused(": value1 value2")

    @Test
    fun quotedReferencesWithSpacesInLink() = assertLink("(id: \"value with spaces\")", "id", "value with spaces")

    @Test
    fun singleLineWithoutId() = assertLink("(value1 value2)", null, "value1", "value2")

    @Test
    fun linkWithId() = assertLink("(id: a b c)", "id", "a", "b", "c")

    @Test
    fun quotedReference() = assertLink("\"quoted value\"", null, "quoted value")

    @Test
    fun quotedReferencesWithSpecialChars() = assertLink("(\"special:char\" \"another@char\")", null, "special:char", "another@char")

    @Test
    fun simpleReference() = parses("simplereference")

    @Test
    fun singleLineLink() = assertLink("id: value1 value2", "id", "value1", "value2")

    @Test
    fun singleLineWithId() {
        val result = parser.parse("myid: val1 val2")
        assertTrue(result.isNotEmpty())
        assertEquals("myid", result[0].id)
    }
}
