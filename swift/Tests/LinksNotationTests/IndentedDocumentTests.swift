// Ported from js/tests/IndentedDocument.test.js.

import Foundation
import XCTest

@testable import LinksNotation

/// The text of every line of `docs/protocol/reference-literals.txt`: UTF-8
/// hex, one reference per line, `-` for the empty reference.
private func indentedDocumentReferenceCorpus() throws -> [String] {
    let url = repositoryRoot.appendingPathComponent("docs/protocol/reference-literals.txt")
    let content = try String(contentsOf: url, encoding: .utf8)
    return content.trimmingCharacters(in: .whitespacesAndNewlines)
        .split(separator: "\n", omittingEmptySubsequences: false)
        .filter { !$0.hasPrefix("#") }
        .map { hex in
            if hex == "-" { return "" }
            var bytes: [UInt8] = []
            var index = hex.startIndex
            while index < hex.endIndex, let next = hex.index(index, offsetBy: 2, limitedBy: hex.endIndex) {
                if let byte = UInt8(hex[index..<next], radix: 16) { bytes.append(byte) }
                index = next
            }
            return String(decoding: bytes, as: UTF8.self)
        }
}

final class IndentedDocumentTests: XCTestCase {
    func testMixedQuotesRoundTripThroughTheExistingLinkFormatter() throws {
        let text = #"He said "it's ready""#
        // JS toString() is the Swift description.
        let formatted = Link(id: text).description
        XCTAssertEqual(try Parser().parse(formatted)[0].values[0].id, text)
        XCTAssertFalse(formatted.contains(#"\'"#))
        XCTAssertEqual(escapeReference(text, minimal: true), #"'He said "it''s ready"'"#)
    }

    func testMinimalEscapingLeavesOrdinaryProseUnquoted() {
        // JS `Link.escapeReference` is the free function `escapeReference` in Swift.
        XCTAssertEqual(escapeReference("What is your experience?", minimal: true), "What is your experience?")
        XCTAssertEqual(escapeReference("What is your experience?"), "'What is your experience?'")
    }

    func testPublicGroupsPreserveImmediateChildrenAndDeeperIndentation() throws {
        let groups = try Parser().parseGroups(
            "What is your experience?\n  JavaScript\n  Python\n    Django\nOther question\n  Answer")
        XCTAssertEqual(groups.count, 2)
        // JS checks `instanceof LinksGroup`; Swift checks the element type.
        XCTAssertTrue(type(of: groups[0]) == LinksGroup.self)
        XCTAssertEqual(groups[0].element.values.map(\.id), ["What", "is", "your", "experience?"])
        XCTAssertEqual(groups[0].children.count, 2)
        XCTAssertEqual(groups[0].children[1].children[0].element.values[0].id, "Django")
        XCTAssertEqual(groups[1].children[0].element.values[0].id, "Answer")
    }

    func testGroupsRetainNamedAndNestedLinksAndShareParserDiagnostics() throws {
        let parser = Parser()
        let groups = try parser.parseGroups("root:\n  child: (one two)\n  branch\n    leaf")
        let root = try XCTUnwrap(groups.first)
        XCTAssertEqual(root.element.id, "root")
        XCTAssertEqual(root.element.values, [])
        XCTAssertEqual(root.children[0].element.description, "(child: (one two))")
        XCTAssertEqual(root.children[1].children.count, 1)
        XCTAssertThrowsError(try parser.parseGroups("root: child: value")) { error in
            XCTAssertTrue(error is LocatedParseError, "\(error)")
        }
        XCTAssertThrowsError(try Parser(options: ParserOptions(maxDepth: 0)).parseGroups("root\n  child")) {
            error in
            XCTAssertTrue(error is LocatedParseError, "\(error)")
        }
        XCTAssertThrowsError(try Parser(options: ParserOptions(maxInputSize: 2)).parseGroups("root")) { error in
            XCTAssertTrue(String(describing: error).contains("Input size exceeds"), "\(error)")
        }
        // JS also rejects `parseGroups(null)` with a TypeError; a Swift String cannot be nil.
    }

    func testParseTheIssueDocumentWithoutInspectingPrivatePathFlags() throws {
        let input = """
            What is your experience?
              I have worked with JavaScript
            'Question with "quotes": and colon'
              Answer

            """
        XCTAssertEqual(
            try parseIndentedDocument(input),
            [
                "What is your experience?": .text("I have worked with JavaScript"),
                #"Question with "quotes": and colon"#: .text("Answer"),
            ])
    }

    func testMultipleChildLinesHaveExplicitArrayOrJoinedTextBehavior() throws {
        let input = "Skills\n  JavaScript\n  Python\nUnanswered\nSkills\n  Go"
        XCTAssertEqual(
            try parseIndentedDocument(input),
            ["Skills": .list(["JavaScript", "Python", "Go"]), "Unanswered": .list([])])
        XCTAssertEqual(
            try parseIndentedDocument(input, options: IndentedDocumentOptions(multipleValues: .join)),
            ["Skills": .text("JavaScript\nPython\nGo"), "Unanswered": .list([])])
        // JS rejects `multipleValues: 'guess'` with a TypeError; the Swift enum has only valid cases.
        XCTAssertNil(IndentedDocumentOptions.MultipleValues(rawValue: "guess"))
    }

    func testFormatTheIssueDocumentWithTwoSpaceIndentationAndAFinalNewline() throws {
        let entries: IndentedDocument = [
            "What is your experience?": .text("I have worked with JavaScript"),
            "Skills": .list(["JavaScript", "Python"]),
        ]
        XCTAssertEqual(
            formatIndentedDocument(entries),
            "What is your experience?\n  I have worked with JavaScript\nSkills\n  JavaScript\n  Python\n")
        XCTAssertEqual(try parseIndentedDocument(formatIndentedDocument(entries)), entries)
        XCTAssertEqual(formatIndentedDocument(IndentedDocument()), "")
        XCTAssertEqual(try parseIndentedDocument(""), IndentedDocument())
    }

    func testEmptyTextExactWhitespaceCommentsQuotesAndMultilineTextSurvive() throws {
        let references = [
            "",
            " ",
            "  leading",
            "trailing  ",
            "two  spaces",
            "a\tb",
            "# question",
            "text # literal",
            "issue#333",
            "Question: (details)",
            "`backticks`",
            #""double" and 'single'"#,
            #"'starts with both "quotes""#,
            #""starts with both 'quotes'"#,
            #"ends with both '""#,
            #"repeated ''' and """"#,
            #"literal \n and \'"#,
            "line one\n  line two",
            "carriage\rreturn",
            "Windows\r\nline",
            "Привет 🌍",
        ]
        for text in references {
            let escaped = escapeReference(text, minimal: true)
            // JS checks both `unescapeReference` and `Link.unescapeReference`; Swift has one function.
            XCTAssertEqual(try unescapeReference(escaped), text, escaped)
            let entries: IndentedDocument = [text: .text(text)]
            XCTAssertEqual(try parseIndentedDocument(formatIndentedDocument(entries)), entries, escaped)
        }
    }

    func testUnescapingUsesTheGrammarAndNeverDecodesAlreadyParsedIDsAgain() throws {
        XCTAssertEqual(try unescapeReference(#""He said ""hello""""#), #"He said "hello""#)
        XCTAssertEqual(try unescapeReference("'it''s ready'"), "it's ready")
        XCTAssertEqual(try unescapeReference("``text with ` inside``"), "text with ` inside")
        XCTAssertEqual(try unescapeReference("plain text"), "plain text")
        XCTAssertEqual(try unescapeReference(#"literal \n"#), #"literal \n"#)
        // JS throws SyntaxError; Swift throws UnescapeReferenceError.
        XCTAssertThrowsError(try unescapeReference(#""unfinished"#)) { error in
            XCTAssertTrue(error is UnescapeReferenceError, "\(error)")
        }
        XCTAssertThrowsError(try unescapeReference(#""value" extra"#)) { error in
            XCTAssertTrue(error is UnescapeReferenceError, "\(error)")
        }
        XCTAssertEqual(
            try parseIndentedDocument("Question\n  \"two '' quotes\""), ["Question": .text("two '' quotes")])
    }

    func testDocumentHelpersRejectDeeperOrNamedValueStructuresInsteadOfLosingData() {
        // JS throws TypeError; Swift throws IndentedDocumentError.
        XCTAssertThrowsError(try parseIndentedDocument("Question\n  Answer\n    Detail")) { error in
            XCTAssertEqual(error as? IndentedDocumentError, .nestedChildren)
        }
        XCTAssertThrowsError(try parseIndentedDocument("Question\n  answer: value")) { error in
            XCTAssertEqual(error as? IndentedDocumentError, .notText)
        }
        // JS also rejects non-string parents and children (42, null) with a TypeError;
        // IndentedDocument only holds strings, so those inputs cannot be built in Swift.
    }

    func testDocumentParsingRespectsCommentsAndExistingParserOptions() throws {
        XCTAssertEqual(
            try parseIndentedDocument("# comment\nQuestion\n  Answer # comment"), ["Question": .text("Answer")])
        XCTAssertEqual(
            try parseIndentedDocument(
                "# question\n  Answer", options: IndentedDocumentOptions(parser: ParserOptions(comments: false))),
            ["# question": .text("Answer")])
    }

    func testOneElementArraysNormalizeToStringsAndUnansweredParentsRemainDistinct() throws {
        let entries: IndentedDocument = [
            "One option": .list(["only"]),
            "No options": .list([]),
            "Empty answer": .text(""),
        ]
        XCTAssertEqual(
            try parseIndentedDocument(formatIndentedDocument(entries)),
            ["One option": .text("only"), "No options": .list([]), "Empty answer": .text("")])
        // JS also rejects a sparse array (`Array(1)`) with a TypeError; Swift arrays have no holes.
    }

    func testDocumentHelpersPreserveTheSharedUnicodeReferenceCorpusAndReservedPrefixes() throws {
        let references = try indentedDocumentReferenceCorpus()
        XCTAssertFalse(references.isEmpty)
        for text in references + [
            "~1{61}",
            "~2{00}",
            "~1{invalid}",
            "text ~1{61} after",
            "text ~2{00}",
            "text ~1{invalid}",
        ] {
            let hex = text.utf8.map { ($0 < 16 ? "0" : "") + String($0, radix: 16) }.joined()
            XCTAssertEqual(escapeReference(text), formatBinaryReference(text), hex)
            XCTAssertEqual(try unescapeReference(escapeReference(text)), text, hex)
            XCTAssertEqual(try unescapeReference(escapeReference(text, minimal: true)), text, hex)
            let entries: IndentedDocument = [text: .text(text)]
            XCTAssertEqual(try parseIndentedDocument(formatIndentedDocument(entries)), entries, hex)
        }
    }

    func testUnescapingDecodesVersionedLiteralsWithoutDecodingParsedDocumentIdsTwice() throws {
        XCTAssertEqual(try unescapeReference("~1{}"), "")
        XCTAssertEqual(try unescapeReference("~1{00}"), "\0")
        XCTAssertEqual(try unescapeReference("~1{C3A9}"), "é")
        for literal in ["~2{61}", "~1{0}", "~1{gg}", "~1{ff}"] {
            XCTAssertThrowsError(try unescapeReference(literal), literal)
        }
        let entries: IndentedDocument = ["~1{61}": .text("~1{62}")]
        XCTAssertEqual(try parseIndentedDocument(formatIndentedDocument(entries)), entries)
        // JS rejects a lone surrogate ('\ud800') with a TypeError; a Swift String cannot hold one
        // and decodes it as U+FFFD, which escapes and reads back like any other text.
        let loneSurrogate = String(decoding: [0xD800] as [UInt16], as: UTF16.self)
        XCTAssertEqual(loneSurrogate, "\u{FFFD}")
        XCTAssertEqual(try unescapeReference(escapeReference(loneSurrogate, minimal: true)), loneSurrogate)
    }
}
