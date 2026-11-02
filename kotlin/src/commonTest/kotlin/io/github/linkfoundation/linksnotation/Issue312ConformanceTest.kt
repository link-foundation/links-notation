package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals

/** Port of `js/tests/Issue312Conformance.test.js`. */
class Issue312ConformanceTest {
    private val spaces = listOf("\u0085", " ", " ", "　", "﻿")

    @Test
    fun crIsALineBreak() {
        assertEquals("(<a>)\n(<b>)", parsesAs("a\rb"))
        assertEquals("(<a>)\n(<b>)", parsesAs("a\r\nb"))
    }

    @Test
    fun onlyGrammarWhitespaceMakesAnEmptyDocument() {
        assertEquals("", parsesAs(" \t\n\r"))
        for (character in spaces) assertEquals("(<$character>)", parsesAs(character))
    }

    @Test
    fun unicodeSpacesAreSubstantiveEvenQuoteBodies() {
        for (character in spaces) assertEquals("(<$character>)", parsesAs("''$character''"))
    }

    @Test
    fun trailingIndentationIsDocumentWhitespace() {
        assertEquals("(<a>)", parsesAs("a\n  "))
        assertEquals("(<a>)", parsesAs("a\n  \t"))
    }

    @Test
    fun aSingleReferenceIsALinkValueAtEveryDepth() {
        assertEquals("(<1>)", parsesAs("1"))
        assertEquals("(<1>)", parsesAs("(1)"))
        assertEquals("((<1>))", parsesAs("((1))"))
    }
}
