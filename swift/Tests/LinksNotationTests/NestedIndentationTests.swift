import XCTest

@testable import LinksNotation

/// Port of `js/tests/NestedIndentation.test.js` (issue #282): indentation is
/// structural at the root, so it must be structural inside parentheses too: a
/// parenthesised group opens a nested context that starts fresh at
/// indentation level zero and follows exactly the root's rules.
final class NestedIndentationTests: XCTestCase {
    private let parser = Parser()

    private func format(_ source: String) throws -> String {
        formatLinks(try parser.parse(source), lessParentheses: false)
    }

    func testTestParenthesesReproduceRootIndentation() throws {
        let root = try format("a\n  b\nc\n  d")

        XCTAssertEqual(root, "(a)\n((a) (b))\n(c)\n((c) (d))")

        // The same lines inside parentheses keep the same structure, nested
        // under the link the group belongs to.
        let nested = try format("array (\n  a\n    b\n  c\n    d\n)")

        XCTAssertEqual(nested, "(array ((a) ((a) (b)) (c) ((c) (d))))")
    }

    func testTestParenthesesKeepRecordBoundaries() throws {
        XCTAssertEqual(try format("value (\n  id \"1\"\n  label \"one\"\n)"), "(value ((id 1) (label one)))")

        let links = try parser.parse("value (\n  id \"1\"\n  label \"one\"\n)")
        XCTAssertEqual(links.count, 1)

        let group = links[0].values[1]
        XCTAssertNil(group.id)
        XCTAssertEqual(group.values.count, 2)
        XCTAssertEqual(group.values[0].values[0].id, "id")
        XCTAssertEqual(group.values[0].values[1].id, "1")
        XCTAssertEqual(group.values[1].values[0].id, "label")
        XCTAssertEqual(group.values[1].values[1].id, "one")
    }

    func testTestParenthesesKeepSeveralRecordsSeparate() throws {
        XCTAssertEqual(
            try format("value (\n  (id \"1\" label \"one\")\n  (id \"2\" label \"two\")\n)"),
            "(value ((id 1 label one) (id 2 label two)))")
    }

    func testTestParenthesesNestDeeply() throws {
        XCTAssertEqual(
            try format("outer (\n  inner (\n    x 1\n    y 2\n  )\n  z 3\n)"),
            "(outer ((inner ((x 1) (y 2))) (z 3)))")
    }

    func testTestSingleLineParenthesesAreUnchanged() throws {
        XCTAssertEqual(try format("(a b c)"), "(a b c)")
        XCTAssertEqual(try format("(1: 2 3)"), "(1: 2 3)")
        XCTAssertEqual(try format("(a: b c)"), "(a: b c)")
        XCTAssertEqual(try format("((a b))"), "((a b))")
        XCTAssertEqual(try format("(a)"), "(a)")
        XCTAssertEqual(try format("()"), "()")
    }

    func testTestParenthesesWithIndentedIdSyntax() throws {
        XCTAssertEqual(try format("(\n  a:\n    b\n    c\n)"), "(a: b c)")
    }

    func testTestEmployeeRecordsKeepTheirFields() throws {
        let source = """
            empInfo
              employees:
                (
                  name (James Kirk)
                  age 40
                )
                (
                  name (Jean-Luc Picard)
                  age 45
                )
            """
        XCTAssertEqual(
            try format(source),
            "(empInfo)\n((empInfo) (employees: ((name (James Kirk)) (age 40)) ((name (Jean-Luc Picard)) (age 45))))")
    }
}
