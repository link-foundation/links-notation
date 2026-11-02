package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/**
 * Port of `js/tests/Comments.test.js` (issue #301): `#` starts a comment that
 * runs to the end of the line, unless it sits inside a token or inside a
 * delimited reference.
 */
class CommentsTest {
    private val parser = Parser()

    @Test
    fun aLineThatStartsWithAHashIsAComment() = assertEquals("", parsesAs("# a b\n"))

    @Test
    fun aCommentMayHoldAColon() = assertEquals("", parsesAs("# a: b\n"))

    @Test
    fun aCommentMayHoldAnythingAtAll() = assertEquals("", parsesAs("# ) : ( \" ' ` #\n"))

    @Test
    fun aCommentEndsAtTheEndOfItsLine() = assertEquals("(<a>: <b>)", parsesAs("# note\na: b\n"))

    @Test
    fun aCommentMayFollowALink() = assertEquals("(<a>: <b>)", parsesAs("a: b # why\n"))

    @Test
    fun aCommentMayFollowAGroup() = assertEquals("(<a> <b>)", parsesAs("(a b) # why\n"))

    @Test
    fun aCommentNeedsNoClosingNewline() = assertEquals("(<a>: <b>)", parsesAs("a: b # why"))

    @Test
    fun aCommentLineInsideAnIndentedBlockIsSkipped() =
        assertEquals(parsesAs("parent\n  child\n"), parsesAs("parent\n  # what the child is for\n  child\n"))

    @Test
    fun aCommentLineInsideAGroupIsSkipped() = assertEquals(parsesAs("(\n  a\n  b\n)\n"), parsesAs("(\n  a\n  # why\n  b\n)\n"))

    @Test
    fun aLineOfSpacesSeparatesLinksTheWayAnEmptyLineDoes() = assertEquals(parsesAs("a\n\nb\n"), parsesAs("a\n   \nb\n"))

    @Test
    fun aDocumentOfCommentsAloneHoldsNoLinks() = assertEquals("", parsesAs("# one\n# two\n"))

    @Test
    fun aHashInsideATokenIsAnOrdinaryCharacter() = assertEquals("(<issue#1047>)", parsesAs("issue#1047\n"))

    @Test
    fun aHashThatOpensATokenIsAnOrdinaryCharacter() = assertEquals("(<a>: <b#c>)", parsesAs("a: b#c\n"))

    @Test
    fun aHashInsideADelimitedReferenceIsContent() = assertEquals("(<# not a comment> <a>)", parsesAs("\"# not a comment\" a\n"))

    @Test
    fun aCommentMayFollowADelimitedReference() = assertEquals("(<a>)", parsesAs("\"a\" # why\n"))

    @Test
    fun aHashInsideAMultilineDelimitedReferenceIsContent() = assertEquals("(<a # b\nc> <d>)", parsesAs("\"a # b\nc\" d\n"))

    @Test
    fun aParserWithoutCommentsKeepsTheHash() = assertEquals("(<#> <a> <b>)", parsesAs("# a b\n", Parser(ParserOptions(comments = false))))

    @Test
    fun aParserWithoutCommentsStillRejectsTheDocumentFromTheIssue() {
        assertFailsWith<ParseException.Syntax> { Parser(ParserOptions(comments = false)).parse("# a: b\n") }
    }

    @Test
    fun commentsAreOnByDefault() {
        assertTrue(Parser().options.comments)
        assertTrue(ParserOptions().comments)
    }

    @Test
    fun aCommentDoesNotMoveThePositionALaterErrorIsReportedAt() {
        val error = assertFailsWith<ParseException.Syntax> { parser.parse("# a comment\nstage: rust: nextest\n") }
        assertEquals(2, error.line)
        assertEquals(12, error.column)
        assertEquals("stage: rust: nextest", error.lineText)
    }

    @Test
    fun blankingACommentKeepsTheLengthOfTheDocument() {
        assertEquals("a: b      \n", stripComments("a: b # why\n"))
        assertEquals("\"# kept\"\n", stripComments("\"# kept\"\n"))
        assertEquals("issue#1047\n", stripComments("issue#1047\n"))
        assertEquals(5, stripComments("a: b\n").length)
    }

    @Test
    fun aReferenceThatBeginsWithAHashIsWrittenQuoted() {
        val document = formatLinks(listOf(Link(null, listOf(Link("a"), Link("#tag")))))
        assertEquals("(a '#tag')", document)
        assertEquals("(<a> <#tag>)", parsesAs(document))
    }

    @Test
    fun aHashThatCannotOpenACommentIsLeftUnquoted() {
        assertEquals("issue#1047", escapeReference("issue#1047"))
        assertEquals("'#'", escapeReference("#"))
        assertEquals("'#ff0000'", escapeReference("#ff0000"))
    }

    // Issue #377: the comment reader and the parser must agree on where every
    // delimited reference starts and how far it reaches, or a comment is
    // blanked inside what the parser then reads as a reference.

    @Test
    fun aHashInsideAReferenceThatFollowsAGroupIsContent() = assertEquals("((<a>) < #b>)", parsesAs("(a)\" #b\"\n"))

    @Test
    fun aHashInsideAReferenceThatFollowsAnotherReferenceIsContent() {
        assertEquals("(<x> < #y>)", parsesAs("\"x\"' #y'\n"))
        assertEquals("(<q> < #c\n\">)", parsesAs("```q```\"\" #c\n\"\"\"\n"))
    }

    @Test
    fun aHashInsideAReferenceThatFollowsALiteralIsContent() = assertEquals("(<b> < #b>)", parsesAs("~1{62}\" #b\"\n"))

    @Test
    fun aReferenceIsReadInTheDocumentAsWrittenCommentsIncluded() {
        // The body of the first `""` straddles a parenthesis, so it is the
        // empty reference and the `#` after it opens a comment. Blanking that
        // comment must not turn the `""` into a reference that holds the
        // blanked text.
        assertEquals("(<> <a>)\n(<>)", parsesAs("\"\" a #)b\n\"\"\n"))
    }

    @Test
    fun theCommentReaderSkipsTheReferencesTheParserReads() {
        assertEquals("(a)\" #b\"\n", stripComments("(a)\" #b\"\n"))
        assertEquals("\"x\"' #y'\n", stripComments("\"x\"' #y'\n"))
        assertEquals("~1{62}\" #b\"\n", stripComments("~1{62}\" #b\"\n"))
        assertEquals("a\"b    \n", stripComments("a\"b #c\"\n"))
    }
}
