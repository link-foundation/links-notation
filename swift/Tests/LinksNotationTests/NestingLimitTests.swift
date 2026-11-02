import XCTest

@testable import LinksNotation

/// Port of `js/tests/NestingLimit.test.js`: links nested too deeply are
/// refused with an error rather than recursed into until the stack overflows
/// (issue #315). Every parenthesized group and every indentation level is one
/// level, and the lines of a document start at level 0.
final class NestingLimitTests: XCTestCase {
    private func parens(_ depth: Int) -> String {
        String(repeating: "(", count: depth) + "a" + String(repeating: ")", count: depth)
    }

    private func values(_ depth: Int) -> String {
        String(repeating: "(a ", count: depth) + "b" + String(repeating: ")", count: depth)
    }

    private func indentation(_ depth: Int) -> String {
        (0...depth).map { String(repeating: " ", count: $0) + "a\n" }.joined()
    }

    /// The located error of a document that nests deeper than `maxDepth`.
    private func tooDeep(
        _ document: String, _ maxDepth: Int, file: StaticString = #filePath, line: UInt = #line
    ) -> LocatedParseError? {
        do {
            let links = try Parser(options: ParserOptions(maxDepth: maxDepth)).parseLocated(document)
            XCTFail("expected the document to be too deep, got \(links.count) links", file: file, line: line)
            return nil
        } catch let error as LocatedParseError {
            XCTAssertEqual(error.maxDepth, maxDepth, file: file, line: line)
            return error
        } catch {
            XCTFail("unexpected error \(error)", file: file, line: line)
            return nil
        }
    }

    private func accepted(_ document: String, _ maxDepth: Int = defaultMaxDepth) -> Bool {
        guard let links = try? Parser(options: ParserOptions(maxDepth: maxDepth)).parse(document) else {
            return false
        }
        return !links.isEmpty
    }

    func testTheDefaultLimitIsSharedByEveryImplementation() {
        XCTAssertEqual(defaultMaxDepth, 64)
        XCTAssertEqual(Parser().options.maxDepth, defaultMaxDepth)
    }

    func testParenthesesUpToTheLimitAreAccepted() {
        XCTAssertTrue(accepted(parens(3), 3))
        XCTAssertTrue(accepted(values(3), 3))
    }

    func testParenthesesPastTheLimitAreRefusedAtTheGroupThatIsTooDeep() throws {
        let error = try XCTUnwrap(tooDeep(parens(4), 3))

        XCTAssertEqual(error.line, 1)
        XCTAssertEqual(error.column, 4)
        XCTAssertEqual(error.offset, 3)
        XCTAssertEqual(
            error.message,
            "Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3\n"
                + "1 | ((((a))))\n"
                + "  |    ^")
    }

    func testGroupsInValuePositionCountLikeAnyOtherGroup() throws {
        let error = try XCTUnwrap(tooDeep(values(4), 3))

        XCTAssertEqual(error.line, 1)
        XCTAssertEqual(error.column, 10)
    }

    func testIndentationUpToTheLimitIsAccepted() {
        XCTAssertTrue(accepted(indentation(3), 3))
        XCTAssertTrue(accepted(indentation(defaultMaxDepth)))
    }

    func testIndentationPastTheLimitIsRefusedAtTheLineThatIsTooDeep() throws {
        let error = try XCTUnwrap(tooDeep(indentation(4), 3))

        XCTAssertEqual(error.line, 5)
        XCTAssertEqual(error.column, 5)
        XCTAssertEqual(error.lineText, "    a")
    }

    func testGroupsAndIndentationAddUp() throws {
        // `(b)` on the line indented once is at level 2.
        XCTAssertTrue(accepted("a\n  (b)\n", 2))
        let error = try XCTUnwrap(tooDeep("a\n  (b)\n", 1))

        XCTAssertEqual(error.line, 2)
        XCTAssertEqual(error.column, 3)
    }

    func testTrailingSpacesOnADeepLineAreNotADeeperLine() {
        XCTAssertTrue(accepted("a\n  b\n    c   \n", 2))
    }

    func testASyntaxErrorIsNotMistakenForNestingThatIsTooDeep() {
        XCTAssertThrowsError(try Parser().parseLocated("a: b: c")) { error in
            guard let error = error as? LocatedParseError else {
                return XCTFail("expected a LocatedParseError, got \(error)")
            }
            XCTAssertNil(error.maxDepth)
            XCTAssertTrue(error.message.hasPrefix("Syntax error at "), error.message)
        }
    }

    func testRefusesADocumentFarPastTheLimitInsteadOfOverflowingTheStack() throws {
        // Before the limit existed each of these ran out of stack.
        for document in [parens(100_000), values(100_000), indentation(2_000)] {
            let error = try XCTUnwrap(tooDeep(document, defaultMaxDepth))
            XCTAssertTrue(error.message.hasPrefix("Nesting too deep at "), String(error.message.prefix(80)))
        }
    }

    func testTheStreamParserReportsWhereTheNestingIsTooDeep() throws {
        let stream = StreamParser(options: StreamParserOptions(parser: ParserOptions(maxDepth: 1)))
        try stream.write("a\nb ((c))\n")

        XCTAssertThrowsError(try stream.end()) { error in
            guard let error = error as? StreamParseError else {
                return XCTFail("expected a StreamParseError, got \(error)")
            }
            XCTAssertEqual(error.cause.maxDepth, 1)
            XCTAssertEqual(error.line, 2)
            XCTAssertEqual(error.column, 4)
            XCTAssertEqual(error.offset, 5)
        }
    }
}
