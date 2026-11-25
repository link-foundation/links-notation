import XCTest

@testable import LinksNotation

/// Port of `js/tests/BareReferenceColons.test.js` (issue #444): colons inside
/// a bare reference.
///
/// A run of colons between two characters of a bare reference belongs to the
/// reference, so times, URLs and qualified names need no quotes. A colon that
/// is followed by whitespace, a parenthesis, a quote or a versioned literal
/// still separates an ID from its values, and a bare reference never starts
/// or ends with a colon.
final class BareReferenceColonsTests: XCTestCase {
    private let parser = Parser()

    private func same(_ document: String, _ expected: String, line: UInt = #line) throws {
        XCTAssertEqual(try parser.parse(document), try parser.parse(expected), document, line: line)
    }

    func testATimeIsOneReference() throws {
        try same("time 12:30\n", "time '12:30'\n")
        try same("root:\n  time 12:30\n", "root:\n  time '12:30'\n")
    }

    func testAURLIsOneReference() throws {
        try same("url https://example.com/a#b\n", "url 'https://example.com/a#b'\n")
    }

    func testAQualifiedNameIsOneReference() throws {
        try same("type std::string\n", "type 'std::string'\n")
    }

    func testAnIdMayHoldAColon() throws {
        try same("a:b: c\n", "'a:b': c\n")
        try same("(a:b: c)", "('a:b': c)")
        try same("a:b\n", "'a:b'\n")
    }

    func testAColonBeforeAValueThatCannotContinueAReferenceSeparates() throws {
        try same("a: b\n", "(a: b)")
        try same("a:\"b c\"\n", "(a: 'b c')")
        try same("a:'b'\n", "(a: b)")
        try same("a:(b c)\n", "(a: (b c))")
        try same("a:~1{62}\n", "(a: b)")
        try same("a :b\n", "(a: b)")
    }

    func testAValueOfTheLinkMayHoldAColon() throws {
        try same("a: b:c\n", "(a: 'b:c')")
    }

    func testASecondIdOnALineIsStillAnError() {
        XCTAssertThrowsError(try parser.parse("stage: rust: nextest\n"))
        XCTAssertThrowsError(try parser.parse(": a\n"))
    }

    func testAReferenceWithColonsIsWrittenWithQuotes() throws {
        XCTAssertEqual(formatLinks(try parser.parse("time 12:30\n")), "(time '12:30')")
    }
}
