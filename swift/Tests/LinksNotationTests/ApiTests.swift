// Ported from js/tests/ApiTests.test.js.

import XCTest

@testable import LinksNotation

final class ApiTests: XCTestCase {
    private let parser = Parser()

    func testIsRef() {
        // Neither JS nor Swift has separate Ref/Link types; a link without values is a reference.
        let simpleLink = Link(id: "some_value")
        XCTAssertEqual(simpleLink.id, "some_value")
        XCTAssertEqual(simpleLink.values, [])
    }

    func testIsLink() {
        let link = Link(id: "id", values: [Link(id: "child")])
        XCTAssertEqual(link.id, "id")
        XCTAssertEqual(link.values.count, 1)
        XCTAssertEqual(link.values[0].id, "child")
    }

    func testIsRefEquivalent() {
        // Neither JS nor Swift has separate Ref/Link types; a link without values is a reference.
        let simpleLink = Link(id: "some_value")
        XCTAssertEqual(simpleLink.id, "some_value")
        XCTAssertEqual(simpleLink.values, [])
    }

    func testIsLinkEquivalent() {
        let link = Link(id: "id", values: [Link(id: "child")])
        XCTAssertEqual(link.id, "id")
        XCTAssertEqual(link.values.count, 1)
        XCTAssertEqual(link.values[0].id, "child")
    }

    func testEmptyLink() {
        // JS toString() is the Swift description.
        let link = Link(id: nil, values: [])
        XCTAssertEqual(link.description, "()")
    }

    func testSimpleLink() throws {
        let parsed = try parser.parse("(1: 1 1)")
        XCTAssertEqual(parsed[0].format(), "(1: 1 1)")
    }

    func testLinkWithSourceTarget() throws {
        let input = "(index: source target)"
        let parsed = try parser.parse(input)
        XCTAssertEqual(parsed[0].format(), input)
    }

    func testLinkWithSourceTypeTarget() throws {
        let input = "(index: source type target)"
        let parsed = try parser.parse(input)
        XCTAssertEqual(parsed[0].format(), input)
    }

    func testSingleLineFormat() throws {
        let parsed = try parser.parse("id: value1 value2")
        let output = parsed[0].format(lessParentheses: true)
        XCTAssertTrue(output.contains("id"))
        XCTAssertTrue(output.contains("value1"))
        XCTAssertTrue(output.contains("value2"))
    }

    func testQuotedReferences() throws {
        let parsed = try parser.parse(#"("quoted id": "value with spaces")"#)
        let output = parsed[0].format()
        XCTAssertTrue(output.contains("quoted id"))
        XCTAssertTrue(output.contains("value with spaces"))
    }

    func testQuotedReferencesParsing() throws {
        let parsed = try parser.parse(#"("quoted id": "value with spaces")"#)
        let output = formatLinks(parsed)
        XCTAssertTrue(output.contains("quoted id"))
        XCTAssertTrue(output.contains("value with spaces"))
    }

    func testIndentedIdSyntaxParsing() throws {
        let indented = "id:\n  value1\n  value2"
        let inline = "(id: value1 value2)"

        let indentedOutput = formatLinks(try parser.parse(indented))
        let inlineOutput = formatLinks(try parser.parse(inline))
        XCTAssertEqual(indentedOutput, inlineOutput)
        XCTAssertEqual(indentedOutput, "(id: value1 value2)")
    }

    func testIndentedIdSyntaxRoundtrip() throws {
        let input = "id:\n  value1\n  value2"
        let parsed = try parser.parse(input)

        var options = FormatOptions()
        options.maxInlineRefs = 1  // Indent links with more than one value.
        options.preferInline = false
        XCTAssertEqual(formatLinks(parsed, options: options), input)
    }

    func testMultipleIndentedIdSyntaxParsing() throws {
        let indented = "id1:\n  a\n  b\nid2:\n  c\n  d"
        let inline = "(id1: a b)\n(id2: c d)"

        let indentedOutput = formatLinks(try parser.parse(indented))
        let inlineOutput = formatLinks(try parser.parse(inline))
        XCTAssertEqual(indentedOutput, inlineOutput)
        XCTAssertEqual(indentedOutput, "(id1: a b)\n(id2: c d)")
    }

    func testMultipleIndentedIdSyntaxRoundtrip() throws {
        let input = "id1:\n  a\n  b\nid2:\n  c\n  d"
        let parsed = try parser.parse(input)

        var options = FormatOptions()
        options.maxInlineRefs = 1  // Indent links with more than one value.
        options.preferInline = false
        XCTAssertEqual(formatLinks(parsed, options: options), input)
    }
}
