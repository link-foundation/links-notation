import XCTest

@testable import LinksNotation

/// The limits of `docs/spec/limits.md`: nesting depth and input size.
final class LimitsTests: XCTestCase {
    private func nested(_ levels: Int) -> String {
        String(repeating: "(", count: levels) + "x" + String(repeating: ")", count: levels)
    }

    func testTheDefaultDepthIs64() {
        XCTAssertEqual(ParserOptions().maxDepth, 64)
        XCTAssertEqual(defaultMaxDepth, 64)
    }

    func testSixtyFourLevelsOfGroupsParse() throws {
        XCTAssertEqual(try Parser().parse(nested(64)).count, 1)
    }

    func testSixtyFiveLevelsOfGroupsAreTooDeep() {
        XCTAssertThrowsError(try Parser().parse(nested(65))) { error in
            XCTAssertEqual(error as? ParseError, .depthExceeded(64))
        }
    }

    func testTheDepthErrorSaysWhereTheNestingGotTooDeep() {
        XCTAssertThrowsError(try Parser().parseLocated("a\n" + nested(65))) { error in
            XCTAssertEqual(
                error as? LocatedParseError,
                LocatedParseError(error: .depthExceeded(64), line: 2, column: 65))
        }
    }

    func testIndentationLevelsCountTowardsTheDepth() throws {
        // Line i is indented by i spaces: 65 lines nest 64 levels below the first.
        let lines = (0...65).map { String(repeating: " ", count: $0) + "x\($0)" }
        XCTAssertNoThrow(try Parser().parse(lines.dropLast().joined(separator: "\n")))
        XCTAssertThrowsError(try Parser().parseLocated(lines.joined(separator: "\n"))) { error in
            // Where links-notation 0.27.1 reports it: the 66th line, at its reference.
            XCTAssertEqual(
                error as? LocatedParseError,
                LocatedParseError(error: .depthExceeded(64), line: 66, column: 66))
        }
    }

    func testASmallerMaxDepthIsHonoured() {
        let parser = Parser(options: ParserOptions(maxDepth: 2))
        XCTAssertNoThrow(try parser.parse(nested(2)))
        XCTAssertThrowsError(try parser.parse(nested(3))) { error in
            XCTAssertEqual(error as? ParseError, .depthExceeded(2))
        }
    }

    func testInputOverMaxInputSizeIsRefusedBeforeItIsRead() {
        let parser = Parser(options: ParserOptions(maxInputSize: 8))
        XCTAssertNoThrow(try parser.parse("(a: b c)"))
        // Nine characters, and not even Links Notation: the size is checked first.
        XCTAssertThrowsError(try parser.parse("(((((((((")) { error in
            XCTAssertEqual(error as? ParseError, .inputTooLarge(8))
        }
        XCTAssertThrowsError(try parser.parseLocated("(a: b cd)")) { error in
            XCTAssertEqual(
                error as? LocatedParseError, LocatedParseError(error: .inputTooLarge(8), line: nil, column: nil))
        }
    }

    func testInputSizeIsMeasuredInUTF16CodeUnits() {
        // One scalar, two UTF-16 code units, as JavaScript's `input.length`.
        let parser = Parser(options: ParserOptions(maxInputSize: 1))
        XCTAssertThrowsError(try parser.parse("🙂")) { error in
            XCTAssertEqual(error as? ParseError, .inputTooLarge(1))
        }
    }

    func testTheDefaultMaxInputSizeIsTheJavaScriptDefault() {
        XCTAssertNil(ParserOptions().maxInputSize)
        XCTAssertEqual(defaultMaxInputSize, 10 * 1024 * 1024)
        XCTAssertThrowsError(try Parser().parse(String(repeating: "a", count: defaultMaxInputSize + 1))) {
            error in
            XCTAssertEqual(error as? ParseError, .inputTooLarge(defaultMaxInputSize))
        }
    }
}
