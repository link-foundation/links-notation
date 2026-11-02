import XCTest

@testable import LinksNotation

final class IndentedIdSyntaxTests: XCTestCase {
    private let parser = Parser()

    func testBasicIndentedIdSyntax() throws {
        let indentedSyntax = "3:\n  papa\n  loves\n  mama"
        let inlineSyntax = "(3: papa loves mama)"

        let indentedResult = try parser.parse(indentedSyntax)
        let inlineResult = try parser.parse(inlineSyntax)

        XCTAssertEqual(indentedResult, inlineResult)

        XCTAssertEqual(formatLinks(indentedResult), "(3: papa loves mama)")
        XCTAssertEqual(formatLinks(inlineResult), "(3: papa loves mama)")
    }

    func testIndentedIdSyntaxWithSingleValue() throws {
        let input = "greeting:\n  hello"

        let result = try parser.parse(input)
        let formatted = formatLinks(result)

        XCTAssertEqual(formatted, "(greeting: hello)")
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "greeting")
        XCTAssertEqual(result[0].values.count, 1)
        XCTAssertEqual(result[0].values[0].id, "hello")
    }

    func testIndentedIdSyntaxWithMultipleValues() throws {
        let input = "action:\n  run\n  fast\n  now"

        let result = try parser.parse(input)
        let formatted = formatLinks(result)

        XCTAssertEqual(formatted, "(action: run fast now)")
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "action")
        XCTAssertEqual(result[0].values.count, 3)
    }

    func testIndentedIdSyntaxWithNumericId() throws {
        let input = "42:\n  answer\n  to\n  everything"

        let result = try parser.parse(input)
        XCTAssertEqual(formatLinks(result), "(42: answer to everything)")
    }

    func testIndentedIdSyntaxWithQuotedId() throws {
        let input = "\"complex id\":\n  value1\n  value2"

        let result = try parser.parse(input)
        XCTAssertEqual(formatLinks(result), "('complex id': value1 value2)")
    }

    func testMultipleIndentedIdLinks() throws {
        let input = "first:\n  a\n  b\nsecond:\n  c\n  d"

        let result = try parser.parse(input)
        let formatted = formatLinks(result)

        XCTAssertEqual(result.count, 2)
        XCTAssertEqual(formatted, "(first: a b)\n(second: c d)")
    }

    func testMixedIndentedAndRegularSyntax() throws {
        let input = "first:\n  a\n  b\n(second: c d)\nthird value"

        let result = try parser.parse(input)
        XCTAssertEqual(result.count, 3)

        let formatted = formatLinks(result)
        XCTAssertTrue(formatted.contains("(first: a b)"))
        XCTAssertTrue(formatted.contains("(second: c d)"))
        XCTAssertTrue(formatted.contains("third value"))
    }

    func testUnsupportedColonOnlySyntaxShouldFail() {
        let input = ":\n  papa\n  loves\n  mama"

        XCTAssertThrowsError(try parser.parse(input))
    }

    func testIndentedIdWithDeeperNesting() throws {
        let input = "root:\n  child1\n  child2\n    grandchild"

        let result = try parser.parse(input)
        XCTAssertGreaterThan(result.count, 0)

        let rootLink = result[0]
        XCTAssertEqual(rootLink.id, "root")
        XCTAssertEqual(rootLink.values.count, 2)
        XCTAssertEqual(formatLinks(result), "(root: child1 (child2 grandchild))")
    }

    func testEmptyIndentedIdShouldWork() throws {
        let input = "empty:"

        let result = try parser.parse(input)
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "empty")
        XCTAssertEqual(result[0].values.count, 0)

        XCTAssertEqual(formatLinks(result), "(empty)")
    }

    func testEquivalenceTestComprehensive() throws {
        let testCases: [(indented: String, inline: String)] = [
            ("test:\n  one", "(test: one)"),
            ("x:\n  a\n  b\n  c", "(x: a b c)"),
            ("\"quoted\":\n  value", "(\"quoted\": value)"),
        ]

        for testCase in testCases {
            let indentedResult = try parser.parse(testCase.indented)
            let inlineResult = try parser.parse(testCase.inline)

            XCTAssertEqual(indentedResult, inlineResult, testCase.indented)
            XCTAssertEqual(formatLinks(indentedResult), formatLinks(inlineResult), testCase.indented)
        }
    }
}
