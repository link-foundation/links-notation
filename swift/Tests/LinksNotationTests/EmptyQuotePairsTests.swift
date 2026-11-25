import XCTest

@testable import LinksNotation

/// Port of `js/tests/EmptyQuotePairs.test.js` (issue #443): an empty quoted
/// value at the end of a line must not swallow the lines after it.
///
/// An even run of quotes (`""`, `''`, `""""`, ...) followed by whitespace up
/// to the end of its line is the empty reference, however later lines
/// continue. A run followed directly by text (`""x`) still opens a reference
/// that may reach across lines, so multiline references keep working.
final class EmptyQuotePairsTests: XCTestCase {
    private let parser = Parser()

    private func ref(_ id: String?) -> Link { Link(id: id) }
    private func link(_ id: String?, _ values: Link...) -> Link { Link(id: id, values: values) }

    func testEmptyValuesOnConsecutiveIndentedLinesStayOnTheirLines() throws {
        let expected = [link("root", link(nil, ref("a"), ref("")), link(nil, ref("b"), ref("")))]
        XCTAssertEqual(try parser.parse("root:\n  a \"\"\n  b \"\"\n"), expected)
        XCTAssertEqual(try parser.parse("root:\n  a ''\n  b ''\n"), expected)
        XCTAssertEqual(try parser.parse("root:\n  a \"\"\n  b \"\""), expected)
    }

    func testAnEmptyValueBeforeAQuotedValueKeepsBothValues() throws {
        let root = try XCTUnwrap(try parser.parse("root:\n  a \"\"\n  b \"x y\"\n").first)
        XCTAssertEqual(root.values.map { $0.values.map(\.id) }, [["a", ""], ["b", "x y"]])
    }

    func testAnEmptyValueAtTheEndOfATopLevelLineStaysOnItsLine() throws {
        XCTAssertEqual(formatLinks(try parser.parse("a \"\"\nb \"\"\n")), "(a ~1{})\n(b ~1{})")
        XCTAssertEqual(formatLinks(try parser.parse("a \"\" \nb \"\"\n")), "(a ~1{})\n(b ~1{})")
        XCTAssertEqual(formatLinks(try parser.parse("a \"\"")), "(a ~1{})")
    }

    func testALongerEvenRunAtTheEndOfALineIsEmptyToo() throws {
        XCTAssertEqual(formatLinks(try parser.parse("a \"\"\"\"\nb \"\"\"\"\n")), "(a ~1{})\n(b ~1{})")
    }

    func testDoubledQuotesThatNothingClosesAreTheEmptyReference() throws {
        XCTAssertEqual(try parser.parse("(a: \"\"\"\")"), [link("a", ref(""))])
        XCTAssertEqual(try parser.parse("(a: \"\"\"\"\"\")"), [link("a", ref(""))])
    }

    func testASingleQuoteCharacterIsWrittenBetweenTheOtherQuotes() throws {
        XCTAssertEqual(try parser.parse("(a: '\"')"), [link("a", ref("\""))])
        XCTAssertEqual(try parser.parse("(a: \"'\")"), [link("a", ref("'"))])
        XCTAssertEqual(try parser.parse("(a: `\"`)"), [link("a", ref("\""))])
    }

    func testAnEvenRunFollowedByTextStillOpensAMultilineReference() throws {
        XCTAssertEqual(try parser.parse("a \"\"x\ny\"\"\n"), [link(nil, ref("a"), ref("x\ny"))])
    }

    func testAnEvenRunStillHoldsWhatTheSameLineCloses() throws {
        XCTAssertEqual(try parser.parse("(x \"\" \" \"\")"), [link(nil, ref("x"), ref(" \" "))])
        XCTAssertEqual(try parser.parse("a \"\" b \"\""), [link(nil, ref("a"), ref(" b "))])
    }

    func testTheStreamEmitsALineThatEndsWithAnEmptyValueAtOnce() throws {
        let stream = StreamParser()
        var emitted: [Link] = []
        for scalar in "a \"\"\nb \"\"\nc\n".unicodeScalars {
            emitted += try stream.write(String(scalar))
        }
        XCTAssertEqual(formatLinks(emitted), "(a ~1{})\n(b ~1{})")
        XCTAssertEqual(formatLinks(try stream.end()), "(a ~1{})\n(b ~1{})\n(c)")
    }
}
