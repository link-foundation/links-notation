import XCTest

@testable import LinksNotation

/// Port of `js/tests/QuoteReference.test.js`: quoting a reference, and reading
/// every quoted reference back (issues #443 and #444).
///
/// `quoteReference` writes one reference so a parser reads it back as exactly
/// that text; `needsQuoting` says whether the text can be written bare. The
/// round trip below feeds tricky and seeded random text built from the
/// characters that matter to the grammar through the formatter and reads it
/// back in the ID and the value position of parenthesised, single-line and
/// indented links.
final class QuoteReferenceTests: XCTestCase {
    private let parser = Parser()

    func testQuoteReferenceWritesTextThatNeedsNoDelimitersAsItIs() {
        for text in ["plain", "issue#1047", "a-b_c.d", "π", "~1"] {
            XCTAssertEqual(quoteReference(text), text)
            XCTAssertFalse(needsQuoting(text), text)
        }
    }

    func testQuoteReferenceQuotesTextAParserWouldReadDifferently() {
        XCTAssertEqual(quoteReference("has space"), "'has space'")
        XCTAssertEqual(quoteReference("12:30"), "'12:30'")
        XCTAssertEqual(quoteReference("#release"), "'#release'")
        XCTAssertEqual(quoteReference("(a)"), "'(a)'")
        XCTAssertEqual(quoteReference("\""), "'\"'")
        XCTAssertEqual(quoteReference("'"), "\"'\"")
        XCTAssertEqual(quoteReference(""), "~1{}")
        XCTAssertEqual(quoteReference("a\nb"), "~1{610a62}")
        for text in ["has space", "12:30", "#release", "", "\"", "a\nb"] {
            XCTAssertTrue(needsQuoting(text), text)
        }
    }

    func testQuoteReferenceIsEscapeReference() {
        for text in ["a b", "a", "it's", "", "#x", "x:y"] {
            XCTAssertEqual(quoteReference(text), escapeReference(text))
            XCTAssertEqual(quoteReference(text, minimal: true), escapeReference(text, minimal: true))
            XCTAssertEqual(needsQuoting(text, minimal: true), escapeReference(text, minimal: true) != text)
        }
        XCTAssertEqual(quoteReference(nil), "")
    }

    func testEveryQuotedReferenceReadsBackInEveryPosition() throws {
        for text in tricky + texts(300, seed: 443_444) {
            let written = quoteReference(text)
            let message = "text \(text.debugDescription) written \(written.debugDescription)"
            XCTAssertEqual(try unescapeReference(written), text, message)

            let link = [Link(id: text, values: [Link(id: text), Link(id: "x")])]
            XCTAssertEqual(try parser.parse("(\(written): \(written) x)"), link, message)
            XCTAssertEqual(try parser.parse("\(written): \(written) x"), link, message)
            XCTAssertEqual(try parser.parse("\(written): \(written) x\n"), link, message)
            XCTAssertEqual(try parser.parse("\(written):\n  \(written)\n  x\n"), link, message)
            // Two lines that each end with the reference: the shape of issue #443.
            XCTAssertEqual(
                try parser.parse("root:\n  a \(written)\n  b \(written)\n"),
                [
                    Link(
                        id: "root",
                        values: [
                            Link(values: [Link(id: "a"), Link(id: text)]),
                            Link(values: [Link(id: "b"), Link(id: text)]),
                        ])
                ],
                message)
            XCTAssertEqual(
                try parser.parse("(a (\(written) \(written)) b)"),
                [
                    Link(values: [
                        Link(id: "a"), Link(values: [Link(id: text), Link(id: text)]), Link(id: "b"),
                    ])
                ],
                message)
        }
    }

    func testEveryFormattedLinkReadsBackAsTheSameLink() throws {
        let pool = tricky + texts(60, seed: 445)
        var index = 0
        while index + 2 < pool.count {
            let links = [
                Link(id: pool[index], values: [Link(id: pool[index + 1]), Link(id: "x")]),
                Link(values: [Link(id: pool[index + 2]), Link(id: pool[index])]),
            ]
            let message = pool[index..<index + 3].map(\.debugDescription).joined(separator: " ")
            for document in [formatLinks(links), formatLinks(links, lessParentheses: true)] {
                XCTAssertEqual(try parser.parse(document), links, message + " " + document.debugDescription)
            }
            // The nested writer puts every value on a line of its own.
            XCTAssertEqual(try parser.parse(formatNested(links)), try parser.parse(formatLinks(links)), message)
            index += 3
        }
    }
}

/// Texts that broke a parser or a formatter before, or came close.
private let tricky = [
    "", " ", "\"", "'", "`", "\"\"", "''", "\"\"\"\"", "\"'", "'\"", "#", "#x", "a #b", ":", "a:", ":a",
    "12:30", "a: b", "(", ")", "~1{}", "~1{61}", "a\nb", "\"\" ", " \"\"", "\"\n", "it's", "say \"hi\"",
]

/// The characters the random texts are built from: those that matter to the
/// grammar, and a few that take more than one UTF-16 unit or byte.
private let alphabet: [String] = [
    "a", "b", "1", " ", " ", "\t", "\n", "\r", "\"", "\"", "'", "'", "`", "#", ":", "(", ")", "~", "{", "}",
    "é", "😀",
]

/// `count` texts of up to 8 characters from a small seeded generator
/// (mulberry32, as in the JavaScript test), so a failure names the text that
/// broke and the same texts are tried on every run.
private func texts(_ count: Int, seed: UInt32) -> [String] {
    var state = seed
    func next() -> Double {
        state = state &+ 0x6D2B_79F5
        var value = state
        value = (value ^ (value >> 15)) &* (value | 1)
        value ^= value &+ ((value ^ (value >> 7)) &* (value | 61))
        return Double(value ^ (value >> 14)) / 4_294_967_296
    }
    return (0..<count).map { _ in
        let length = Int(next() * 9)
        return (0..<length).map { _ in alphabet[Int(next() * Double(alphabet.count))] }.joined()
    }
}
