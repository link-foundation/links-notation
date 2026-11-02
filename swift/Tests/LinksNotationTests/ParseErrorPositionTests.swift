import XCTest

@testable import LinksNotation

/// Port of `js/tests/ParseErrorPosition.test.js`: a parse error has to say
/// where the document stopped making sense (issue #302). The JavaScript
/// `ParseError` is `LocatedParseError` here, thrown by `parseLocated`.
final class ParseErrorPositionTests: XCTestCase {
    private let parser = Parser()

    private func syntaxError(
        _ document: String, file: StaticString = #filePath, line: UInt = #line
    ) -> LocatedParseError? {
        do {
            let links = try parser.parseLocated(document)
            XCTFail("expected the document not to parse, got \(links.count) links", file: file, line: line)
        } catch let error as LocatedParseError {
            return error
        } catch {
            XCTFail("unexpected error \(error)", file: file, line: line)
        }
        return nil
    }

    func testReportsTheLineAndColumnOfTheDefect() throws {
        // The defect is the second colon on line 2, and the two lines after it
        // are fine.
        let error = try XCTUnwrap(syntaxError("ci_gate x\nstage: rust: nextest\nnext stage\n  clippy"))

        XCTAssertEqual(error.line, 2)
        XCTAssertEqual(error.column, 12)
        XCTAssertEqual(error.found, ":")
    }

    func testOffsetAgreesWithTheOtherImplementations() throws {
        // Rust and C# report offset 21, line 2, column 12 for this document.
        let error = try XCTUnwrap(syntaxError("ci_gate x\nstage: rust: nextest\n"))

        XCTAssertEqual(error.offset, 21)
        XCTAssertEqual(error.line, 2)
        XCTAssertEqual(error.column, 12)
    }

    func testReportsTheLineALateDefectIsOn() throws {
        let error = try XCTUnwrap(syntaxError("a\nb\nc\nd\ne: f: g\nh\n"))

        XCTAssertEqual(error.line, 5)
        XCTAssertEqual(error.column, 5)
        XCTAssertEqual(error.lineText, "e: f: g")
    }

    func testLoneCRCountsAsOneLineBreakInDiagnostics() throws {
        let error = try XCTUnwrap(syntaxError("a\rb: c: d"))

        XCTAssertEqual(error.line, 2)
        XCTAssertEqual(error.column, 5)
        XCTAssertEqual(error.lineText, "b: c: d")
    }

    func testReportsTheEndOfTheDocumentWhenAGroupIsNeverClosed() throws {
        let error = try XCTUnwrap(syntaxError("a (b\n"))

        XCTAssertEqual(error.offset, 5)
        XCTAssertEqual(error.line, 2)
        XCTAssertEqual(error.column, 1)
        XCTAssertNil(error.found)
        XCTAssertTrue(error.message.contains("end of input"), error.message)
    }

    func testReportsAnUnmatchedClosingParenthesis() throws {
        let error = try XCTUnwrap(syntaxError("a b)\n"))

        XCTAssertEqual(error.offset, 3)
        XCTAssertEqual(error.line, 1)
        XCTAssertEqual(error.column, 4)
        XCTAssertEqual(error.found, ")")
    }

    func testMessageSaysWhereTheDocumentBroke() throws {
        let error = try XCTUnwrap(syntaxError("ci_gate x\nstage: rust: nextest\n"))

        XCTAssertTrue(error.message.hasPrefix("Syntax error at line 2, column 12:"), error.message)
        XCTAssertEqual(error.snippet, "2 | stage: rust: nextest\n  |            ^")
    }

    func testMessageQuotesOneLineRatherThanTheRestOfTheDocument() throws {
        let document = "ci_gate x\nstage: rust: nextest\n" + String(repeating: "trailing line\n", count: 500)

        let error = try XCTUnwrap(syntaxError(document))

        XCTAssertTrue(error.message.contains("line 2, column 12"), error.message)
        XCTAssertFalse(error.message.contains("trailing line"), error.message)
        XCTAssertLessThan(error.message.utf16.count, 200)
    }

    func testMessageOfALongLineStaysAMessage() throws {
        let document = String(repeating: "a", count: 400) + ": " + String(repeating: "b", count: 400) + ": c"

        let error = try XCTUnwrap(syntaxError(document))

        XCTAssertEqual(error.line, 1)
        XCTAssertEqual(error.column, 803)
        XCTAssertTrue(error.message.contains("..."), error.message)
        XCTAssertLessThan(error.message.utf16.count, 300)
    }

    func testTheLocationTheParserUsedToReportIsStillThere() throws {
        let error = try XCTUnwrap(syntaxError("a: b: c"))

        // JavaScript `error.location.start` is the offset, line and column of
        // the located error, and `error.cause` is the wrapped `ParseError`.
        XCTAssertEqual(error.offset, 4)
        XCTAssertEqual(error.line, 1)
        XCTAssertEqual(error.column, 5)
        // The message of the cause is the one node reports for this document.
        XCTAssertEqual(
            error.error,
            .syntax(line: 1, column: 5, message: #"Expected "(", [ \t], [\r\n], or [^ \t\n\r(:)] but ":" found."#))
    }

    func testADocumentThatParsesReportsNothing() throws {
        XCTAssertEqual(try parser.parse("a: b\n  c: d\n").count, 2)
    }
}
