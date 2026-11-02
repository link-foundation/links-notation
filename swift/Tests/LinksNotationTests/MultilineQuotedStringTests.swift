import XCTest

@testable import LinksNotation

/// Port of `js/tests/MultilineQuotedString.test.js`.
final class MultilineQuotedStringTests: XCTestCase {
    private let parser = Parser()

    func testMultilineDoubleQuotedReference() throws {
        let input = """
            (
              "long
            string literal representing
            the reference"

              'another
            long string literal
            as another reference'
            )
            """
        let result = try parser.parse(input)

        XCTAssertGreaterThan(result.count, 0)
        XCTAssertEqual(result.count, 1)

        // The two references sit on separate lines inside the parentheses, so
        // the nested context turns each of them into its own link.
        let link = result[0]
        XCTAssertNil(link.id)
        XCTAssertFalse(link.values.isEmpty)
        XCTAssertEqual(link.values.count, 2)

        XCTAssertEqual(link.values[0].values.first?.id, "long\nstring literal representing\nthe reference")

        XCTAssertEqual(link.values[1].values.first?.id, "another\nlong string literal\nas another reference")
    }

    func testSimpleMultilineDoubleQuoted() throws {
        let input = "(\"line1\nline2\")"
        let result = try parser.parse(input)

        XCTAssertGreaterThan(result.count, 0)
        XCTAssertEqual(result.count, 1)

        let link = result[0]
        XCTAssertNil(link.id)
        XCTAssertFalse(link.values.isEmpty)
        XCTAssertEqual(link.values.count, 1)
        XCTAssertEqual(link.values[0].id, "line1\nline2")
    }

    func testSimpleMultilineSingleQuoted() throws {
        let input = "('line1\nline2')"
        let result = try parser.parse(input)

        XCTAssertGreaterThan(result.count, 0)
        XCTAssertEqual(result.count, 1)

        let link = result[0]
        XCTAssertNil(link.id)
        XCTAssertFalse(link.values.isEmpty)
        XCTAssertEqual(link.values.count, 1)
        XCTAssertEqual(link.values[0].id, "line1\nline2")
    }

    func testMultilineQuotedAsId() throws {
        let input = "(\"multi\nline\nid\": value1 value2)"
        let result = try parser.parse(input)

        XCTAssertGreaterThan(result.count, 0)
        XCTAssertEqual(result.count, 1)

        let link = result[0]
        XCTAssertEqual(link.id, "multi\nline\nid")
        XCTAssertFalse(link.values.isEmpty)
        XCTAssertEqual(link.values.count, 2)
    }
}
