import XCTest

@testable import LinksNotation

// Conformance tests for line comments (issue #301).
//
// `#` starts a comment that runs to the end of the line, unless it sits inside
// a token or inside a delimited reference. Parsers accept comments by default
// and can be told to treat `#` as an ordinary character again.

/// Every reference wrapped in angle brackets, so a `#` kept as content is visible.
private func commentsRender(_ node: Link) -> String {
    if node.values.isEmpty {
        return "<\(node.id ?? "")>"
    }
    let head = node.id.map { "<\($0)>: " } ?? ""
    return "(\(head)\(node.values.map(commentsRender).joined(separator: " ")))"
}

final class CommentsTests: XCTestCase {
    private let parser = Parser()

    private func parsesAs(_ input: String) throws -> String {
        try parser.parse(input).map(commentsRender).joined(separator: "\n")
    }

    func testALineThatStartsWithAHashIsAComment() throws {
        XCTAssertEqual(try parsesAs("# a b\n"), "")
    }

    func testACommentMayHoldAColon() throws {
        // The document from #301: prose with a colon used to be a parse error.
        XCTAssertEqual(try parsesAs("# a: b\n"), "")
    }

    func testACommentMayHoldAnythingAtAll() throws {
        XCTAssertEqual(try parsesAs("# ) : ( \" ' ` #\n"), "")
    }

    func testACommentEndsAtTheEndOfItsLine() throws {
        XCTAssertEqual(try parsesAs("# note\na: b\n"), "(<a>: <b>)")
    }

    func testACommentMayFollowALink() throws {
        XCTAssertEqual(try parsesAs("a: b # why\n"), "(<a>: <b>)")
    }

    func testACommentMayFollowAGroup() throws {
        XCTAssertEqual(try parsesAs("(a b) # why\n"), "(<a> <b>)")
    }

    func testACommentNeedsNoClosingNewline() throws {
        XCTAssertEqual(try parsesAs("a: b # why"), "(<a>: <b>)")
    }

    func testACommentLineInsideAnIndentedBlockIsSkipped() throws {
        XCTAssertEqual(try parsesAs("parent\n  # what the child is for\n  child\n"), try parsesAs("parent\n  child\n"))
    }

    func testACommentLineInsideAGroupIsSkipped() throws {
        XCTAssertEqual(try parsesAs("(\n  a\n  # why\n  b\n)\n"), try parsesAs("(\n  a\n  b\n)\n"))
    }

    func testALineOfSpacesSeparatesLinksTheWayAnEmptyLineDoes() throws {
        // Blanking a comment leaves a line of spaces behind, so such a line has
        // to read as a blank line.
        XCTAssertEqual(try parsesAs("a\n   \nb\n"), try parsesAs("a\n\nb\n"))
    }

    func testADocumentOfCommentsAloneHoldsNoLinks() throws {
        XCTAssertEqual(try parsesAs("# one\n# two\n"), "")
    }

    func testAHashInsideATokenIsAnOrdinaryCharacter() throws {
        XCTAssertEqual(try parsesAs("issue#1047\n"), "(<issue#1047>)")
    }

    func testAHashThatOpensATokenIsAnOrdinaryCharacter() throws {
        XCTAssertEqual(try parsesAs("a: b#c\n"), "(<a>: <b#c>)")
    }

    func testAHashInsideADelimitedReferenceIsContent() throws {
        XCTAssertEqual(try parsesAs("\"# not a comment\" a\n"), "(<# not a comment> <a>)")
    }

    func testACommentMayFollowADelimitedReference() throws {
        XCTAssertEqual(try parsesAs("\"a\" # why\n"), "(<a>)")
    }

    func testAHashInsideAMultilineDelimitedReferenceIsContent() throws {
        XCTAssertEqual(try parsesAs("\"a # b\nc\" d\n"), "(<a # b\nc> <d>)")
    }

    func testAParserWithoutCommentsKeepsTheHash() throws {
        let plain = Parser(options: ParserOptions(comments: false))

        XCTAssertEqual(try plain.parse("# a b\n").map(commentsRender).joined(separator: "\n"), "(<#> <a> <b>)")
    }

    // JS toThrow(ParseError) is a check that the error is a ParseError.
    func testAParserWithoutCommentsStillRejectsTheDocumentFromTheIssue() {
        let plain = Parser(options: ParserOptions(comments: false))

        XCTAssertThrowsError(try plain.parse("# a: b\n")) { error in
            XCTAssertTrue(error is ParseError, "\(error)")
        }
    }

    // JS parser.comments is Parser.options.comments in Swift.
    func testCommentsAreOnByDefault() {
        XCTAssertTrue(Parser().options.comments)
        XCTAssertTrue(Parser(options: ParserOptions()).options.comments)
    }

    // The JS ParseError carries lineText; in Swift that is LocatedParseError
    // from parseLocated, and parse throws a ParseError with line and column.
    func testACommentDoesNotMoveThePositionALaterErrorIsReportedAt() {
        // Blanking a comment keeps every later character where it was, so the
        // position reported for a defect is the position in the original document.
        let document = "# a comment\nstage: rust: nextest\n"
        XCTAssertThrowsError(try parser.parseLocated(document)) { error in
            guard let located = error as? LocatedParseError else {
                return XCTFail("expected LocatedParseError, got \(error)")
            }
            XCTAssertEqual(located.line, 2)
            XCTAssertEqual(located.column, 12)
            XCTAssertEqual(located.lineText, "stage: rust: nextest")
        }
        XCTAssertThrowsError(try parser.parse(document)) { error in
            guard case .syntax(let line, let column, _)? = error as? ParseError else {
                return XCTFail("expected ParseError.syntax, got \(error)")
            }
            XCTAssertEqual(line, 2)
            XCTAssertEqual(column, 12)
        }
    }

    func testBlankingACommentKeepsTheLengthOfTheDocument() {
        XCTAssertEqual(stripComments("a: b # why\n"), "a: b      \n")
        XCTAssertEqual(stripComments("\"# kept\"\n"), "\"# kept\"\n")
        XCTAssertEqual(stripComments("issue#1047\n"), "issue#1047\n")
        XCTAssertEqual(stripComments("a: b\n").utf16.count, 5)
    }

    func testAReferenceThatBeginsWithAHashIsWrittenQuoted() throws {
        // Without the quotes the document would read as `a` followed by a comment.
        let document = formatLinks([Link(id: nil, values: [Link(id: "a"), Link(id: "#tag")])])

        XCTAssertEqual(document, "(a '#tag')")
        XCTAssertEqual(try parser.parse(document).map(commentsRender).joined(separator: "\n"), "(<a> <#tag>)")
    }

    // JS static Link.escapeReference is the free function escapeReference in Swift.
    func testAHashThatCannotOpenACommentIsLeftUnquoted() {
        XCTAssertEqual(escapeReference("issue#1047"), "issue#1047")
        XCTAssertEqual(escapeReference("#"), "'#'")
        XCTAssertEqual(escapeReference("#ff0000"), "'#ff0000'")
    }

    // Issue #377: the comment reader and the parser must agree on where every
    // delimited reference starts and how far it reaches, or a comment is
    // blanked inside what the parser then reads as a reference.

    func testAHashInsideAReferenceThatFollowsAGroupIsContent() throws {
        XCTAssertEqual(try parsesAs("(a)\" #b\"\n"), "((<a>) < #b>)")
    }

    func testAHashInsideAReferenceThatFollowsAnotherReferenceIsContent() throws {
        XCTAssertEqual(try parsesAs("\"x\"' #y'\n"), "(<x> < #y>)")
        XCTAssertEqual(try parsesAs("```q```\"\" #c\n\"\"\"\n"), "(<q> < #c\n\">)")
    }

    func testAHashInsideAReferenceThatFollowsALiteralIsContent() throws {
        XCTAssertEqual(try parsesAs("~1{62}\" #b\"\n"), "(<b> < #b>)")
    }

    func testAReferenceIsReadInTheDocumentAsWrittenCommentsIncluded() throws {
        // The body of the first `""` straddles a parenthesis, so it is the
        // empty reference and the `#` after it opens a comment. Blanking that
        // comment must not turn the `""` into a reference that holds the
        // blanked text.
        XCTAssertEqual(try parsesAs("\"\" a #)b\n\"\"\n"), "(<> <a>)\n(<>)")
    }

    func testTheCommentReaderSkipsTheReferencesTheParserReads() {
        XCTAssertEqual(stripComments("(a)\" #b\"\n"), "(a)\" #b\"\n")
        XCTAssertEqual(stripComments("\"x\"' #y'\n"), "\"x\"' #y'\n")
        XCTAssertEqual(stripComments("~1{62}\" #b\"\n"), "~1{62}\" #b\"\n")
        XCTAssertEqual(stripComments("a\"b #c\"\n"), "a\"b    \n")
    }
}
