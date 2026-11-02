import Foundation
import XCTest

@testable import LinksNotation

/// Port of `js/tests/Cst.test.js`: the concrete syntax tree (issue #364).
final class CstTests: XCTestCase {
    private func roundTrip(_ input: String, _ options: ParserOptions = .init()) throws -> String {
        try Parser(options: options).parseCst(input).description
    }

    private func referenceTokens(_ input: String) throws -> [CstNode] {
        try Parser().parseCst(input).tokens().filter { $0.kind == .reference }
    }

    func testIsTheDefaultLosslessViewOfADocument() throws {
        let input = "(t 1 '1')"
        // `toBeInstanceOf(CstNode)` holds by the static type of `parseCst`.
        let cst: CstNode = try Parser().parseCst(input)
        XCTAssertEqual(cst.kind, .document)
        XCTAssertEqual(cst.description, input)
        XCTAssertEqual(
            cst.toSExpression(),
            #"(document (line (group open_paren:"(" (line reference:"t" whitespace:" " reference:"1" whitespace:" " reference:"'1'") close_paren:")")))"#
        )
    }

    func testReferenceTokensCarryTheirValueAndDelimiter() throws {
        let references = try referenceTokens("(a \"b c\" ~1{64} ''e''''f'')")
        XCTAssertEqual(references.map(\.text), ["a", "\"b c\"", "~1{64}", "''e''''f''"])
        XCTAssertEqual(references.map(\.value), ["a", "b c", "d", "e''f"])
        XCTAssertEqual(references.map(\.quote), [nil, "\"", nil, "'"])
    }

    // The JavaScript `test.each` table, checked case by case in one test.
    func testRecoversSExactly() throws {
        let documents: [(String, String)] = [
            ("empty", ""),
            ("only whitespace", " \t "),
            ("blank lines", "\n\n"),
            ("CRLF and CR", "a\r\nb\rc\r\n"),
            ("tabs and trailing spaces", "a\t b  \n"),
            ("comments everywhere", "# head\na: b # tail\n  # inner\n  c\n# end"),
            ("multiline quotes", "(note: \"one\n  two\r\nthree\")"),
            ("nested groups over lines", "(a (b\n  (c d)\n) e)\n"),
            ("indentation", "root:\n  child:\n    leaf\n  tail"),
            ("literals", "(~1{} ~1{e6a0b9})"),
            ("comment marks inside quotes", "('#a' \"b # c\" `#`)"),
            ("unicode", "(根: café 🙂)\n"),
        ]
        for (name, input) in documents {
            XCTAssertEqual(try roundTrip(input), input, "recovers \(name) exactly")
        }
    }

    func testWithoutCommentSupportIsPartOfReferences() throws {
        let input = "a #b"
        let cst = try Parser(options: ParserOptions(comments: false)).parseCst(input)
        XCTAssertEqual(cst.description, input)
        XCTAssertEqual(cst.tokens().map(\.kind.rawValue), ["reference", "whitespace", "reference"])
    }

    func testAGroupBelongsToTheLineItOpensOn() throws {
        let cst = try Parser().parseCst("a (b\nc)\nd")
        XCTAssertEqual(cst.children.map(\.description), ["a (b\nc)\n", "d"])
        let group = cst.children[0].children[2]
        XCTAssertEqual(group.kind, .group)
        XCTAssertEqual(group.children.map(\.kind.rawValue), ["open_paren", "line", "line", "close_paren"])
    }

    func testReadsVersionedLiteralsInLinearTime() throws {
        // CodeQL js/polynomial-redos flagged the regular expression that used
        // to find where a literal ends; the scanner that replaced it is one
        // pass.
        let input = [
            "~1{" + String(repeating: "61", count: 50000) + "}",
            "~" + String(repeating: "1", count: 50000) + "x",
            String(repeating: "~1{61} ", count: 20000),
        ].joined(separator: "\n")
        let started = Date()
        let cst = try Parser().parseCst(input)
        XCTAssertLessThan(Date().timeIntervalSince(started), 5)
        XCTAssertEqual(cst.description, input)
        let references = try referenceTokens("(~1{64} ~{} ~a{b} ~1x)")
        XCTAssertEqual(references.map(\.text), ["~1{64}", "~{}", "~a{b}", "~1x"])
        XCTAssertEqual(references.map(\.value), ["d", "~{}", "~a{b}", "~1x"])
    }

    func testRejectsWhatParseRejects() {
        XCTAssertThrowsError(try Parser().parseCst("(a"))
        XCTAssertThrowsError(try Parser().parseCst("a)"))
        XCTAssertThrowsError(try Parser(options: ParserOptions(maxDepth: 1)).parseCst("((a))"))
    }
}
