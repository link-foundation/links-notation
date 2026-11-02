import XCTest

@testable import LinksNotation

/// Port of `js/tests/EmptyReference.test.js`: conformance tests for the empty
/// reference (issue #288). A bare delimiter pair is the empty reference; the
/// three delimiters behave identically, and every longer n-quote run keeps
/// the meaning it already had.
final class EmptyReferenceTests: XCTestCase {
    private let parser = Parser()

    /// A parsed node written unambiguously: every reference is wrapped in
    /// angle brackets so an empty one is visible as `<>`.
    private func render(_ node: Link) -> String {
        if node.values.isEmpty {
            return "<\(node.id ?? "")>"
        }
        let head = node.id.map { "<\($0)>: " } ?? ""
        return "(\(head)\(node.values.map(render).joined(separator: " ")))"
    }

    private func parsesAs(_ input: String) throws -> String {
        try parser.parse(input).map(render).joined(separator: "\n")
    }

    func testTestBareDelimiterPairIsTheEmptyReference() throws {
        XCTAssertEqual(try parsesAs("(a \"\" b)"), "(<a> <> <b>)")
    }

    func testTestEveryDelimiterStyleYieldsTheSameEmptyReference() throws {
        XCTAssertEqual(try parsesAs("(a \"\" b)"), "(<a> <> <b>)")
        XCTAssertEqual(try parsesAs("(a '' b)"), "(<a> <> <b>)")
        XCTAssertEqual(try parsesAs("(a `` b)"), "(<a> <> <b>)")
    }

    func testTestAdjacentEmptyReferencesStaySeparate() throws {
        XCTAssertEqual(try parsesAs("(a \"\" \"\" b)"), "(<a> <> <> <b>)")
        XCTAssertEqual(try parsesAs("(a '' '' b)"), "(<a> <> <> <b>)")
        XCTAssertEqual(try parsesAs("(a `` `` b)"), "(<a> <> <> <b>)")
        XCTAssertEqual(try parsesAs("(a \"\"  \"\" b)"), "(<a> <> <> <b>)")
    }

    func testTestNestedEmptyReferencesParse() throws {
        XCTAssertEqual(try parsesAs("(\"\" (\"\" 1))"), "(<> (<> <1>))")
        XCTAssertEqual(try parsesAs("(\"\" ('' 1))"), "(<> (<> <1>))")
        XCTAssertEqual(try parsesAs("(\"x\" (\"\" 1))"), "(<x> (<> <1>))")
        XCTAssertEqual(try parsesAs("(\"\" (\"x\" 1))"), "(<> (<x> <1>))")
        XCTAssertEqual(try parsesAs("(\"\" x (\"\" 1))"), "(<> <x> (<> <1>))")
        XCTAssertEqual(try parsesAs("(\"\" 1 (\"\" 1))"), "(<> <1> (<> <1>))")
    }

    func testTestEmptyReferenceIsValidAsAnId() throws {
        XCTAssertEqual(try parsesAs("(\"\": 1)"), "(<>: <1>)")
        XCTAssertEqual(try parsesAs("(o: (\"\" (o: (\"\" 1))))"), "(<o>: (<> (<o>: (<> <1>))))")
    }

    func testTestNQuoteDelimitedBodiesAreUnchanged() throws {
        // A run that encloses a substantive body keeps its n-quote meaning.
        XCTAssertEqual(try parsesAs("(a \"\"x\"\" b)"), "(<a> <x> <b>)")
        XCTAssertEqual(try parsesAs("(x \"\" \" \"\")"), "(<x> < \" >)")
        XCTAssertEqual(try parsesAs("(x ' \" ')"), "(<x> < \" >)")
        // An n-quote-delimited empty is still empty.
        XCTAssertEqual(try parsesAs("(a \"\"\"\" b)"), "(<a> <> <b>)")
    }

    func testTestSingleSpaceStillReadsAsASpace() throws {
        XCTAssertEqual(try parsesAs("(a \" \" b)"), "(<a> < > <b>)")
    }

    func testTestEmptyReferenceSurvivesARoundTrip() throws {
        let inputs = [
            "(a \"\" b)",
            "(a \"\" \"\" b)",
            "(\"\" (\"\" 1))",
            "(\"\": 1)",
            "(o: (\"\" (o: (\"\" 1))))",
        ]
        for input in inputs {
            let links = try parser.parse(input)
            let formatted = formatLinks(links)
            XCTAssertEqual(try parser.parse(formatted), links, input)
        }
    }

    func testTestEmptyReferenceIsWrittenAsAVersionedLiteral() throws {
        XCTAssertEqual(formatLinks(try parser.parse("(a \"\" b)")), "(a ~1{} b)")
    }
}
