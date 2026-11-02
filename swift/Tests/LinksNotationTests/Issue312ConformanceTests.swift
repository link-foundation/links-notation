// Ported from js/tests/Issue312Conformance.test.js.

import XCTest

@testable import LinksNotation

/// A link written with its identifiers in angle brackets (`render` of the JS test).
private func renderIssue312(_ node: Link) -> String {
    if node.values.isEmpty {
        return "<\(node.id ?? "")>"
    }
    let head = node.id.map { "<\($0)>: " } ?? ""
    return "(\(head)\(node.values.map(renderIssue312).joined(separator: " ")))"
}

final class Issue312ConformanceTests: XCTestCase {
    private let parser = Parser()

    private func parsesAs(_ source: String) throws -> String {
        try parser.parse(source).map(renderIssue312).joined(separator: "\n")
    }

    /// The characters JS lists: NEL, NBSP, LINE SEPARATOR, IDEOGRAPHIC SPACE and BOM.
    private let unicodeSpaces = ["\u{0085}", "\u{00a0}", "\u{2028}", "\u{3000}", "\u{feff}"]

    func testCRIsALineBreak() throws {
        XCTAssertEqual(try parsesAs("a\rb"), "(<a>)\n(<b>)")
        XCTAssertEqual(try parsesAs("a\r\nb"), "(<a>)\n(<b>)")
    }

    func testOnlyGrammarWhitespaceMakesAnEmptyDocument() throws {
        XCTAssertEqual(try parsesAs(" \t\n\r"), "")
        for character in unicodeSpaces {
            XCTAssertEqual(try parsesAs(character), "(<\(character)>)")
        }
    }

    func testUnicodeSpacesAreSubstantiveEvenQuoteBodies() throws {
        for character in unicodeSpaces {
            XCTAssertEqual(try parsesAs("''\(character)''"), "(<\(character)>)")
        }
    }

    func testTrailingIndentationIsDocumentWhitespace() throws {
        XCTAssertEqual(try parsesAs("a\n  "), "(<a>)")
        XCTAssertEqual(try parsesAs("a\n  \t"), "(<a>)")
    }

    func testASingleReferenceIsALinkValueAtEveryDepth() throws {
        XCTAssertEqual(try parsesAs("1"), "(<1>)")
        XCTAssertEqual(try parsesAs("(1)"), "(<1>)")
        XCTAssertEqual(try parsesAs("((1))"), "((<1>))")
    }
}
