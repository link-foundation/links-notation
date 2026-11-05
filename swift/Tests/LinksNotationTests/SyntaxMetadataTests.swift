import XCTest

@testable import LinksNotation

/// Port of `js/tests/SyntaxMetadata.test.js`: syntax metadata on parsed links
/// (issue #364).
final class SyntaxMetadataTests: XCTestCase {
    func test1And1AreTheSameReferenceButKeepHowTheyWereWritten() throws {
        let link = try XCTUnwrap(try Parser().parse("(t 1 '1')").first)
        let bare = link.values[1]
        let quoted = link.values[2]
        XCTAssertEqual(bare.id, "1")
        XCTAssertEqual(quoted.id, "1")
        XCTAssertEqual(bare.rawId, "1")
        XCTAssertEqual(quoted.rawId, "'1'")
        XCTAssertNil(bare.quote)
        XCTAssertEqual(quoted.quote, "'")
        // Equality and formatting ignore the metadata.
        XCTAssertEqual(bare, quoted)
        XCTAssertEqual(link.format(), "(t 1 1)")
    }

    func testRecordsEveryQuoteKindAndRunLength() throws {
        let link = try XCTUnwrap(try Parser().parse("(\"a\": 'b' `c` \"\"d\"\" ~1{65} f)").first)
        XCTAssertEqual(link.rawId, "\"a\"")
        XCTAssertEqual(link.quote, "\"")
        XCTAssertEqual(link.values.map(\.rawId), ["'b'", "`c`", "\"\"d\"\"", "~1{65}", "f"])
        XCTAssertEqual(link.values.map(\.quote), ["'", "`", "\"", nil, nil])
    }

    func testKeepsRawTextFromTheSourceNotFromCommentStripping() throws {
        let link = try XCTUnwrap(try Parser().parse("(a 'b # c') # d").first)
        XCTAssertEqual(link.values[1].rawId, "'b # c'")
    }

    func testLeavesLinksWithoutWrittenIDsWithoutRawText() throws {
        let link = try XCTUnwrap(try Parser().parse("(a b)").first)
        XCTAssertNil(link.rawId)
        XCTAssertNil(link.quote)
        XCTAssertNil(Link(id: "x").rawId)
        XCTAssertNil(Link(id: "x").quote)
    }

    func testDoesNotChangeEqualityFormattingOrSerialization() throws {
        let quoted = try Parser().parse("('a': 'b')")
        let bare = try Parser().parse("(a: b)")
        XCTAssertEqual(quoted[0], bare[0])
        XCTAssertEqual(formatLinks(quoted), formatLinks(bare))
        XCTAssertEqual(quoted[0].description, bare[0].description)
        // JSON.stringify has no Swift counterpart on Link; hashing is the
        // other place the metadata must not show.
        XCTAssertEqual(quoted[0].hashValue, bare[0].hashValue)
        XCTAssertEqual(quoted, bare)
    }

    func testASTModeSyntaxFalseDropsTheMetadata() throws {
        let link = try XCTUnwrap(try Parser(options: ParserOptions(syntax: false)).parse("('a': 'b')").first)
        XCTAssertNil(link.rawId)
        XCTAssertNil(link.values[0].rawId)
        XCTAssertNil(link.values[0].quote)
        XCTAssertEqual(link, try Parser().parse("('a': 'b')")[0])
    }

    func testParseGroupsAndStreamParserKeepTheMetadata() throws {
        let groups = try Parser().parseGroups("'root':\n  \"child\"")
        XCTAssertEqual(groups[0].element.rawId, "'root'")
        XCTAssertEqual(groups[0].children[0].element.rawId, "\"child\"")
        let stream = StreamParser()
        try stream.write("(a '")
        try stream.write("b')")
        let link = try XCTUnwrap(try stream.end().first)
        XCTAssertEqual(link.values[1].rawId, "'b'")
        XCTAssertEqual(link.values[1].quote, "'")
    }

    func testRawIdCanBeSetOnLinksBuiltInCodeAndMustBeTextOrNull() {
        var link = Link(id: "a")
        link.rawId = "\"a\""
        XCTAssertEqual(link.quote, "\"")
        link.rawId = nil
        XCTAssertNil(link.quote)
        // Assigning a number (a TypeError in JavaScript) does not type-check
        // in Swift: `rawId` is a `String?`.
    }

    func testReferenceQuoteReadsTheDelimiterOfOneCompleteReference() {
        XCTAssertEqual(referenceQuote("'1'"), "'")
        XCTAssertEqual(referenceQuote("\"\"a b\"\""), "\"")
        XCTAssertEqual(referenceQuote("`x`"), "`")
        XCTAssertNil(referenceQuote("1"))
        XCTAssertNil(referenceQuote("~1{31}"))
        XCTAssertNil(referenceQuote("'unclosed"))
        XCTAssertNil(referenceQuote("'a' b"))
        XCTAssertNil(referenceQuote(nil))
    }
}
