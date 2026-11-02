// Ported from js/tests/MultiQuoteParser.test.js.

import XCTest

@testable import LinksNotation

/// The identifier of a single reference, which parses as an anonymous link
/// holding that reference (`getSingleRefId` of the JavaScript test).
private func singleRefId(_ result: [Link]) -> String? {
    if result.count == 1 && result[0].id == nil && result[0].values.count == 1 {
        return result[0].values[0].id
    }
    return result.first?.id
}

/// A run of `count` double quotes.
private func quotes(_ count: Int) -> String {
    String(repeating: "\"", count: count)
}

final class MultiQuoteParserTests: XCTestCase {
    private let parser = Parser()

    private func assertSingleRef(
        _ input: String, _ expected: String, file: StaticString = #filePath, line: UInt = #line
    ) throws {
        let result = try parser.parse(input)
        XCTAssertEqual(result.count, 1, file: file, line: line)
        XCTAssertEqual(singleRefId(result), expected, file: file, line: line)
    }

    // MARK: Backtick quote tests (single backtick)

    func testTestBacktickQuotedReference() throws {
        try assertSingleRef("`backtick quoted`", "backtick quoted")
    }

    func testTestBacktickQuotedWithSpaces() throws {
        try assertSingleRef("`text with spaces`", "text with spaces")
    }

    func testTestBacktickQuotedMultiline() throws {
        let result = try parser.parse("(`line1\nline2`)")
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].values[0].id, "line1\nline2")
    }

    func testTestBacktickQuotedWithEscapedBacktick() throws {
        try assertSingleRef("`text with `` escaped backtick`", "text with ` escaped backtick")
    }

    // MARK: Single quote tests (with escaping)

    func testTestSingleQuoteWithEscapedSingleQuote() throws {
        try assertSingleRef("'text with '' escaped quote'", "text with ' escaped quote")
    }

    // MARK: Double quote tests (with escaping)

    func testTestDoubleQuoteWithEscapedDoubleQuote() throws {
        try assertSingleRef(#""text with "" escaped quote""#, #"text with " escaped quote"#)
    }

    // MARK: Double quotes (2 quote chars)

    func testTestDoubleDoubleQuotes() throws {
        try assertSingleRef(quotes(2) + "double double quotes" + quotes(2), "double double quotes")
    }

    func testTestDoubleDoubleQuotesWithSingleQuoteInside() throws {
        try assertSingleRef(quotes(2) + "text with \" inside" + quotes(2), #"text with " inside"#)
    }

    func testTestDoubleDoubleQuotesWithEscape() throws {
        try assertSingleRef(
            quotes(2) + "text with " + quotes(4) + " escaped double" + quotes(2), #"text with "" escaped double"#)
    }

    func testTestDoubleSingleQuotes() throws {
        try assertSingleRef("''double single quotes''", "double single quotes")
    }

    func testTestDoubleSingleQuotesWithSingleQuoteInside() throws {
        try assertSingleRef("''text with ' inside''", "text with ' inside")
    }

    func testTestDoubleSingleQuotesWithEscape() throws {
        try assertSingleRef("''text with '''' escaped single''", "text with '' escaped single")
    }

    func testTestDoubleBacktickQuotes() throws {
        try assertSingleRef("``double backtick quotes``", "double backtick quotes")
    }

    func testTestDoubleBacktickQuotesWithBacktickInside() throws {
        try assertSingleRef("``text with ` inside``", "text with ` inside")
    }

    func testTestDoubleBacktickQuotesWithEscape() throws {
        try assertSingleRef("``text with ```` escaped backtick``", "text with `` escaped backtick")
    }

    // MARK: Triple quotes (3 quote chars)

    func testTestTripleDoubleQuotes() throws {
        try assertSingleRef(quotes(3) + "triple double quotes" + quotes(3), "triple double quotes")
    }

    func testTestTripleDoubleQuotesWithDoubleQuoteInside() throws {
        try assertSingleRef(quotes(3) + "text with " + quotes(2) + " inside" + quotes(3), #"text with "" inside"#)
    }

    func testTestTripleDoubleQuotesWithEscape() throws {
        try assertSingleRef(
            quotes(3) + "text with " + quotes(6) + " escaped triple" + quotes(3), #"text with """ escaped triple"#)
    }

    func testTestTripleSingleQuotes() throws {
        try assertSingleRef("'''triple single quotes'''", "triple single quotes")
    }

    func testTestTripleSingleQuotesWithDoubleQuoteInside() throws {
        try assertSingleRef("'''text with '' inside'''", "text with '' inside")
    }

    func testTestTripleSingleQuotesWithEscape() throws {
        try assertSingleRef("'''text with '''''' escaped triple'''", "text with ''' escaped triple")
    }

    func testTestTripleBacktickQuotes() throws {
        try assertSingleRef("```triple backtick quotes```", "triple backtick quotes")
    }

    func testTestTripleBacktickQuotesWithDoubleBacktickInside() throws {
        try assertSingleRef("```text with `` inside```", "text with `` inside")
    }

    func testTestTripleBacktickQuotesWithEscape() throws {
        try assertSingleRef("```text with `````` escaped triple```", "text with ``` escaped triple")
    }

    // MARK: Quadruple quotes (4 quote chars)

    func testTestQuadrupleDoubleQuotes() throws {
        try assertSingleRef(quotes(4) + "quadruple double quotes" + quotes(4), "quadruple double quotes")
    }

    func testTestQuadrupleDoubleQuotesWithTripleQuoteInside() throws {
        try assertSingleRef(quotes(4) + "text with " + quotes(3) + " inside" + quotes(4), #"text with """ inside"#)
    }

    func testTestQuadrupleDoubleQuotesWithEscape() throws {
        try assertSingleRef(
            quotes(4) + "text with " + quotes(8) + " escaped quad" + quotes(4), #"text with """" escaped quad"#)
    }

    func testTestQuadrupleSingleQuotes() throws {
        try assertSingleRef("''''quadruple single quotes''''", "quadruple single quotes")
    }

    func testTestQuadrupleBacktickQuotes() throws {
        try assertSingleRef("````quadruple backtick quotes````", "quadruple backtick quotes")
    }

    // MARK: Quintuple quotes (5 quote chars)

    func testTestQuintupleDoubleQuotes() throws {
        try assertSingleRef(quotes(5) + "quintuple double quotes" + quotes(5), "quintuple double quotes")
    }

    func testTestQuintupleDoubleQuotesWithQuadQuoteInside() throws {
        try assertSingleRef(quotes(5) + "text with " + quotes(4) + " inside" + quotes(5), #"text with """" inside"#)
    }

    func testTestQuintupleDoubleQuotesWithEscape() throws {
        try assertSingleRef(
            quotes(5) + "text with " + quotes(10) + " escaped quint" + quotes(5), #"text with """"" escaped quint"#)
    }

    func testTestQuintupleSingleQuotes() throws {
        try assertSingleRef("'''''quintuple single quotes'''''", "quintuple single quotes")
    }

    func testTestQuintupleBacktickQuotes() throws {
        try assertSingleRef("`````quintuple backtick quotes`````", "quintuple backtick quotes")
    }

    // MARK: Complex scenarios

    func testTestMixedQuotesInLink() throws {
        let result = try parser.parse(#"("double" 'single' `backtick`)"#)
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].values.count, 3)
        XCTAssertEqual(result[0].values[0].id, "double")
        XCTAssertEqual(result[0].values[1].id, "single")
        XCTAssertEqual(result[0].values[2].id, "backtick")
    }

    func testTestBacktickAsIdInLink() throws {
        let result = try parser.parse("(`myId`: value1 value2)")
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "myId")
        XCTAssertEqual(result[0].values.count, 2)
    }

    func testTestCodeBlockLikeContent() throws {
        // Triple backticks for code-like content.
        try assertSingleRef("```const x = 1;```", "const x = 1;")
    }

    func testTestNestedQuotesInMarkdown() throws {
        // Double backticks to include a single backtick.
        try assertSingleRef("``Use `code` in markdown``", "Use `code` in markdown")
    }

    func testTestSQLWithQuotes() throws {
        // Inside '', four single quotes are an escaped pair.
        try assertSingleRef(
            "''SELECT * FROM users WHERE name = ''''John''''''", "SELECT * FROM users WHERE name = ''John''")
    }

    func testTestJSONStringWithQuotes() throws {
        try assertSingleRef(quotes(2) + "{\"key\": \"value\"}" + quotes(2), #"{"key": "value"}"#)
    }

    // MARK: Edge cases

    func testTestEmptySingleQuotedReference() throws {
        // Either parses into some links or fails; both are accepted, as in JS.
        do {
            let result = try parser.parse("''")
            XCTAssertGreaterThanOrEqual(result.count, 0)
        } catch {
            XCTAssertFalse(String(describing: error).isEmpty)
        }
    }

    func testTestWhitespacePreservedInQuotes() throws {
        try assertSingleRef("\"  spaces  \"", "  spaces  ")
    }

    func testTestMultilineInDoubleDoubleQuotes() throws {
        let result = try parser.parse("(\"\"line1\nline2\"\")")
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].values[0].id, "line1\nline2")
    }

    // MARK: Unlimited quotes (6+ quote chars)

    func testTestUnlimitedQuotes6() throws {
        try assertSingleRef(quotes(6) + "hello" + quotes(6), "hello")
    }

    func testTestUnlimitedQuotes10() throws {
        try assertSingleRef(quotes(10) + "very deeply quoted" + quotes(10), "very deeply quoted")
    }

    func testTestUnlimitedQuotes6WithInnerQuotes() throws {
        try assertSingleRef(
            quotes(6) + "hello with " + quotes(5) + " five quotes inside" + quotes(6),
            #"hello with """"" five quotes inside"#)
    }

    func testTestUnlimitedSingleQuotes7() throws {
        try assertSingleRef("'''''''seven single quotes'''''''", "seven single quotes")
    }

    func testTestUnlimitedBackticks8() throws {
        try assertSingleRef("````````eight backticks````````", "eight backticks")
    }
}
