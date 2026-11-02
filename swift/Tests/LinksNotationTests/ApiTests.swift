// Ported from js/tests/ApiTests.test.js.

import XCTest

@testable import LinksNotation

final class ApiTests: XCTestCase {
    private let parser = Parser()

    func testTestIsRef() {
        // Neither JS nor Swift has separate Ref/Link types; a link without values is a reference.
        let simpleLink = Link(id: "some_value")
        XCTAssertEqual(simpleLink.id, "some_value")
        XCTAssertEqual(simpleLink.values, [])
    }

    func testTestIsLink() {
        let link = Link(id: "id", values: [Link(id: "child")])
        XCTAssertEqual(link.id, "id")
        XCTAssertEqual(link.values.count, 1)
        XCTAssertEqual(link.values[0].id, "child")
    }

    func testTestIsRefEquivalent() {
        // Neither JS nor Swift has separate Ref/Link types; a link without values is a reference.
        let simpleLink = Link(id: "some_value")
        XCTAssertEqual(simpleLink.id, "some_value")
        XCTAssertEqual(simpleLink.values, [])
    }

    func testTestIsLinkEquivalent() {
        let link = Link(id: "id", values: [Link(id: "child")])
        XCTAssertEqual(link.id, "id")
        XCTAssertEqual(link.values.count, 1)
        XCTAssertEqual(link.values[0].id, "child")
    }

    func testTestEmptyLink() {
        // JS toString() is the Swift description.
        let link = Link(id: nil, values: [])
        XCTAssertEqual(link.description, "()")
    }

    func testTestSimpleLink() throws {
        let parsed = try parser.parse("(1: 1 1)")
        XCTAssertEqual(parsed[0].format(), "(1: 1 1)")
    }

    func testTestLinkWithSourceTarget() throws {
        let input = "(index: source target)"
        let parsed = try parser.parse(input)
        XCTAssertEqual(parsed[0].format(), input)
    }

    func testTestLinkWithSourceTypeTarget() throws {
        let input = "(index: source type target)"
        let parsed = try parser.parse(input)
        XCTAssertEqual(parsed[0].format(), input)
    }

    func testTestSingleLineFormat() throws {
        let parsed = try parser.parse("id: value1 value2")
        let output = parsed[0].format(lessParentheses: true)
        XCTAssertTrue(output.contains("id"))
        XCTAssertTrue(output.contains("value1"))
        XCTAssertTrue(output.contains("value2"))
    }

    func testTestQuotedReferences() throws {
        let parsed = try parser.parse(#"("quoted id": "value with spaces")"#)
        let output = parsed[0].format()
        XCTAssertTrue(output.contains("quoted id"))
        XCTAssertTrue(output.contains("value with spaces"))
    }

    func testTestQuotedReferencesParsing() throws {
        let parsed = try parser.parse(#"("quoted id": "value with spaces")"#)
        let output = formatLinks(parsed)
        XCTAssertTrue(output.contains("quoted id"))
        XCTAssertTrue(output.contains("value with spaces"))
    }

    func testTestIndentedIdSyntaxParsing() throws {
        let indented = "id:\n  value1\n  value2"
        let inline = "(id: value1 value2)"

        let indentedOutput = formatLinks(try parser.parse(indented))
        let inlineOutput = formatLinks(try parser.parse(inline))
        XCTAssertEqual(indentedOutput, inlineOutput)
        XCTAssertEqual(indentedOutput, "(id: value1 value2)")
    }

    func testTestIndentedIdSyntaxRoundtrip() throws {
        let input = "id:\n  value1\n  value2"
        let parsed = try parser.parse(input)

        var options = FormatOptions()
        options.maxInlineRefs = 1  // Indent links with more than one value.
        options.preferInline = false
        XCTAssertEqual(formatLinks(parsed, options: options), input)
    }

    func testTestMultipleIndentedIdSyntaxParsing() throws {
        let indented = "id1:\n  a\n  b\nid2:\n  c\n  d"
        let inline = "(id1: a b)\n(id2: c d)"

        let indentedOutput = formatLinks(try parser.parse(indented))
        let inlineOutput = formatLinks(try parser.parse(inline))
        XCTAssertEqual(indentedOutput, inlineOutput)
        XCTAssertEqual(indentedOutput, "(id1: a b)\n(id2: c d)")
    }

    func testTestMultipleIndentedIdSyntaxRoundtrip() throws {
        let input = "id1:\n  a\n  b\nid2:\n  c\n  d"
        let parsed = try parser.parse(input)

        var options = FormatOptions()
        options.maxInlineRefs = 1  // Indent links with more than one value.
        options.preferInline = false
        XCTAssertEqual(formatLinks(parsed, options: options), input)
    }
}
