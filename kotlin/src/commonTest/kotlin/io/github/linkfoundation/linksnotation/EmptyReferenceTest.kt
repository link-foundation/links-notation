package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Port of `js/tests/EmptyReference.test.js`, the conformance table of the
 * empty reference (issue #288) every implementation shares.
 */
class EmptyReferenceTest {
    private val parser = Parser()

    @Test
    fun bareDelimiterPairIsTheEmptyReference() {
        assertEquals("(<a> <> <b>)", parsesAs("(a \"\" b)"))
    }

    @Test
    fun everyDelimiterStyleYieldsTheSameEmptyReference() {
        assertEquals("(<a> <> <b>)", parsesAs("(a \"\" b)"))
        assertEquals("(<a> <> <b>)", parsesAs("(a '' b)"))
        assertEquals("(<a> <> <b>)", parsesAs("(a `` b)"))
    }

    @Test
    fun adjacentEmptyReferencesStaySeparate() {
        assertEquals("(<a> <> <> <b>)", parsesAs("(a \"\" \"\" b)"))
        assertEquals("(<a> <> <> <b>)", parsesAs("(a '' '' b)"))
        assertEquals("(<a> <> <> <b>)", parsesAs("(a `` `` b)"))
        assertEquals("(<a> <> <> <b>)", parsesAs("(a \"\"  \"\" b)"))
    }

    @Test
    fun nestedEmptyReferencesParse() {
        assertEquals("(<> (<> <1>))", parsesAs("(\"\" (\"\" 1))"))
        assertEquals("(<> (<> <1>))", parsesAs("(\"\" ('' 1))"))
        assertEquals("(<x> (<> <1>))", parsesAs("(\"x\" (\"\" 1))"))
        assertEquals("(<> (<x> <1>))", parsesAs("(\"\" (\"x\" 1))"))
        assertEquals("(<> <x> (<> <1>))", parsesAs("(\"\" x (\"\" 1))"))
        assertEquals("(<> <1> (<> <1>))", parsesAs("(\"\" 1 (\"\" 1))"))
    }

    @Test
    fun emptyReferenceIsValidAsAnId() {
        assertEquals("(<>: <1>)", parsesAs("(\"\": 1)"))
        assertEquals("(<o>: (<> (<o>: (<> <1>))))", parsesAs("(o: (\"\" (o: (\"\" 1))))"))
    }

    @Test
    fun nQuoteDelimitedBodiesAreUnchanged() {
        assertEquals("(<a> <x> <b>)", parsesAs("(a \"\"x\"\" b)"))
        assertEquals("(<x> < \" >)", parsesAs("(x \"\" \" \"\")"))
        assertEquals("(<x> < \" >)", parsesAs("(x ' \" ')"))
        assertEquals("(<a> <> <b>)", parsesAs("(a \"\"\"\" b)"))
    }

    @Test
    fun singleSpaceStillReadsAsASpace() {
        assertEquals("(<a> < > <b>)", parsesAs("(a \" \" b)"))
    }

    @Test
    fun emptyReferenceSurvivesARoundTrip() {
        for (input in listOf("(a \"\" b)", "(a \"\" \"\" b)", "(\"\" (\"\" 1))", "(\"\": 1)", "(o: (\"\" (o: (\"\" 1))))")) {
            val links = parser.parse(input)
            assertEquals(links, parser.parse(formatLinks(links)), input)
        }
    }

    @Test
    fun emptyReferenceIsWrittenAsAVersionedLiteral() {
        assertEquals("(a ~1{} b)", formatLinks(parser.parse("(a \"\" b)")))
    }
}
