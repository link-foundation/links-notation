import XCTest

@testable import LinksNotation

final class EdgeCaseParserTests: XCTestCase {
    private let parser = Parser()

    func testEmptyLink() {
        // A standalone ':' is forbidden.
        XCTAssertThrowsError(try parser.parse(":"))
    }

    func testEmptyLinkWithParentheses() throws {
        let links = try parser.parse("()")
        XCTAssertEqual(formatLinks(links), "()")
    }

    func testEmptyLinkWithEmptySelfReference() {
        // '(:)' is forbidden.
        XCTAssertThrowsError(try parser.parse("(:)"))
    }

    func testAllFeatures() throws {
        // Single-line link with id
        var result = try parser.parse("id: value1 value2")
        XCTAssertGreaterThan(result.count, 0)

        // Multi-line link with id
        result = try parser.parse("(id: value1 value2)")
        XCTAssertGreaterThan(result.count, 0)

        // Link without id (single-line) is forbidden
        XCTAssertThrowsError(try parser.parse(": value1 value2"))

        // Link without id (multi-line) is forbidden
        XCTAssertThrowsError(try parser.parse("(: value1 value2)"))

        // Singlet link
        result = try parser.parse("(singlet)")
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.count, 1)
        XCTAssertEqual(result[0].values[0].id, "singlet")
        XCTAssertEqual(result[0].values[0].values, [])

        // Value link
        result = try parser.parse("(value1 value2 value3)")
        XCTAssertGreaterThan(result.count, 0)

        // Quoted references
        result = try parser.parse("(\"id with spaces\": \"value with spaces\")")
        XCTAssertGreaterThan(result.count, 0)

        // Single-quoted references
        result = try parser.parse("('id': 'value')")
        XCTAssertGreaterThan(result.count, 0)

        // Nested links
        result = try parser.parse("(outer: (inner: value))")
        XCTAssertGreaterThan(result.count, 0)
    }

    func testEmptyDocument() throws {
        XCTAssertEqual(try parser.parse(""), [])
    }

    func testWhitespaceOnly() throws {
        XCTAssertEqual(try parser.parse("   \n   \n   "), [])
    }

    func testEmptyLinks() throws {
        var result = try parser.parse("()")
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values, [])

        // '(:)' is forbidden
        XCTAssertThrowsError(try parser.parse("(:)"))

        result = try parser.parse("(id:)")
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "id")
        XCTAssertEqual(result[0].values, [])
    }

    func testSingletLinks() throws {
        for ids in [["1"], ["1", "2"], ["1", "2", "3"], ["1", "2", "3", "4"]] {
            let input = "(\(ids.joined(separator: " ")))"
            let result = try parser.parse(input)
            XCTAssertEqual(result.count, 1, input)
            XCTAssertNil(result[0].id, input)
            XCTAssertEqual(result[0].values.count, ids.count, input)
            for (index, id) in ids.enumerated() where index < result[0].values.count {
                XCTAssertEqual(result[0].values[index].id, id, input)
                XCTAssertEqual(result[0].values[index].values, [], input)
            }
        }
    }

    func testInvalidInput() {
        // Unclosed parentheses
        XCTAssertThrowsError(try parser.parse("(invalid"))
    }
}
