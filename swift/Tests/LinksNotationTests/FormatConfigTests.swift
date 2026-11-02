import XCTest

@testable import LinksNotation

final class FormatConfigTests: XCTestCase {
    private let parser = Parser()

    func testFormatConfigBasic() {
        let config = FormatConfig()
        XCTAssertFalse(config.lessParentheses)
        XCTAssertEqual(config.maxLineLength, 80)
        XCTAssertFalse(config.indentLongLines)
    }

    func testFormatWithLineLengthLimit() {
        // A link with many references that exceeds the line length.
        let link = Link(id: "sequence", values: (1...10).map { Link(id: String($0)) })

        // '(sequence: 1 2 3 4 5 6 7 8 9 10)' is 32 characters, so use a threshold of 30.
        let config = FormatConfig(maxLineLength: 30, indentLongLines: true, preferInline: false)

        let output = link.format(options: config)
        XCTAssertTrue(output.contains("sequence:"))
        XCTAssertTrue(output.contains("\n"))  // indented across multiple lines
    }

    func testFormatWithMaxInlineRefs() {
        let link = Link(id: "id", values: (1...4).map { Link(id: String($0)) })

        // maxInlineRefs = 3 triggers indentation.
        let config = FormatConfig(maxInlineRefs: 3, preferInline: false)

        let output = link.format(options: config)
        XCTAssertTrue(output.contains("id:"))
        XCTAssertTrue(output.contains("\n"))
    }

    func testFormatWithConsecutiveGrouping() {
        let links = [
            Link(id: "SetA", values: [Link(id: "a")]),
            Link(id: "SetA", values: [Link(id: "b")]),
            Link(id: "SetA", values: [Link(id: "c")]),
        ]

        let config = FormatConfig(groupConsecutive: true)

        let output = formatLinks(links, options: config)

        XCTAssertTrue(output.contains("SetA"))
        XCTAssertTrue(output.contains("a"))
        XCTAssertTrue(output.contains("b"))
        XCTAssertTrue(output.contains("c"))
    }

    func testFormatConfigLessParentheses() {
        let link = Link(id: "id", values: [Link(id: "value")])

        let config = FormatConfig(lessParentheses: true)

        let output = link.format(options: config)
        // No outer parentheses.
        XCTAssertEqual(output, "id: value")
    }

    func testFormatConfigCustomIndent() {
        let link = Link(id: "id", values: (1...4).map { Link(id: String($0)) })

        let config = FormatConfig(maxInlineRefs: 3, indentString: "    ", preferInline: false)

        let output = link.format(options: config)
        XCTAssertTrue(output.contains("    "))  // four-space indentation
    }

    func testRoundtripWithLineLengthFormatting() throws {
        let originalLink = Link(id: "test", values: [Link(id: "a"), Link(id: "b"), Link(id: "c")])

        let config = FormatConfig(maxInlineRefs: 2, preferInline: false)

        let formatted = originalLink.format(options: config)

        let parsed = try parser.parse(formatted)

        XCTAssertGreaterThan(parsed.count, 0)
    }

    func testShouldIndentByLength() {
        let config = FormatConfig(maxLineLength: 80, indentLongLines: true)

        let shortLine = "short"
        let longLine = String(repeating: "a", count: 100)

        XCTAssertFalse(config.shouldIndentByLength(shortLine))
        XCTAssertTrue(config.shouldIndentByLength(longLine))
    }

    func testShouldIndentByRefCount() {
        let config = FormatConfig(maxInlineRefs: 3)

        XCTAssertFalse(config.shouldIndentByRefCount(2))
        XCTAssertFalse(config.shouldIndentByRefCount(3))
        XCTAssertTrue(config.shouldIndentByRefCount(4))
    }
}
