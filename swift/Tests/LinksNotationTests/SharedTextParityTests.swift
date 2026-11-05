// Ported from js/tests/SharedTextParity.test.js.

import XCTest

@testable import LinksNotation

final class SharedTextParityTests: XCTestCase {
    private func unindent(_ group: LinksGroup) -> Link {
        if group.children.isEmpty { return group.element }
        return Link(id: group.element.id, values: group.element.values + group.children.map(unindent))
    }

    func testIndentedIdGroupsAgreeWithParse() throws {
        let fixtures = try loadCases(repositoryRoot.appendingPathComponent("parity/text-fixtures.json"))
        let cases = fixtures.filter { $0.id.hasPrefix("indented-id-") }
        XCTAssertEqual(cases.count, 6)
        for fixture in cases {
            let groups = try Parser().parseGroups(fixture.input)
            XCTAssertEqual(groups.map(unindent), try Parser().parse(fixture.input), fixture.id)
            XCTAssertEqual(groups[0].element.id, "x", fixture.id)
            XCTAssertTrue(groups[0].element.values.isEmpty, fixture.id)
        }
        for input in ["id:", "(id:)"] {
            XCTAssertEqual(try Parser().parseGroups(input)[0].element, Link(id: "id", values: []))
        }
        let ordinary = try Parser().parseGroups("x: kind\n  a\n  b")[0]
        XCTAssertEqual(ordinary.children[0].element, Link(id: nil, values: [Link(id: "a")]))
        XCTAssertEqual(ordinary.children[1].element, Link(id: nil, values: [Link(id: "b")]))
        let ast = try Parser(options: ParserOptions(syntax: false)).parseGroups("x:\n  'a'")[0]
        XCTAssertEqual(ast.children[0].element.id, "a")
        XCTAssertNil(ast.children[0].element.rawId)
    }

    func testSharedTextParity() throws {
        let fixtures = try loadCases(repositoryRoot.appendingPathComponent("parity/text-fixtures.json"))
        XCTAssertFalse(fixtures.isEmpty)
        for fixture in fixtures {
            let expected = try XCTUnwrap(fixture.expected, fixture.id).map(\.link)
            let format = try XCTUnwrap(fixture.format, fixture.id)

            let parsed = try Parser().parse(fixture.input)
            XCTAssertEqual(parsed, expected, fixture.id)
            XCTAssertEqual(formatLinks(parsed), format, fixture.id)
            XCTAssertEqual(try Parser().parse(format), expected, fixture.id)

            // Written one code point at a time, as the JS `for...of` loop does.
            let stream = StreamParser()
            for scalar in fixture.input.unicodeScalars {
                try stream.write(String(scalar))
            }
            XCTAssertEqual(try stream.end(), expected, fixture.id)
        }
    }

    func testSharedLessParenthesesRoundTrip() throws {
        let fixtures = try loadCases(repositoryRoot.appendingPathComponent("parity/text-fixtures.json"))
        XCTAssertFalse(fixtures.isEmpty)
        for fixture in fixtures {
            let expected = try XCTUnwrap(fixture.expected, fixture.id).map(\.link)
            let lessParentheses = try XCTUnwrap(fixture.lessParentheses, fixture.id)

            let parsed = try Parser().parse(fixture.input)
            XCTAssertEqual(formatLinks(parsed, lessParentheses: true), lessParentheses, fixture.id)
            XCTAssertEqual(
                formatLinks(parsed, options: FormatOptions(lessParentheses: true)), lessParentheses, fixture.id)
            XCTAssertEqual(try Parser().parse(lessParentheses), expected, fixture.id)
        }
    }
    func testSharedNestedFormat() throws {
        struct NestedCase: Decodable { let id: String; let input: String; let nested: String }
        let data = try Data(contentsOf: repositoryRoot.appendingPathComponent("parity/nested-fixtures.json"))
        let cases = try JSONDecoder().decode([NestedCase].self, from: data)
        XCTAssertFalse(cases.isEmpty)
        for fixture in cases {
            let links = try Parser().parse(fixture.input)
            let text = formatNested(links)
            XCTAssertEqual(text, fixture.nested, fixture.id)
            XCTAssertEqual(try Parser().parseGroups(text).map(unindent), links, fixture.id)
            XCTAssertEqual(
                try Parser().parseGroups(formatNested(links, indent: "    ")).map(unindent), links, fixture.id)
        }
    }

    func testAnonymousThresholdRoundTrip() throws {
        for input in ["a b c", "((b c))", "(a (b c))"] {
            let links = try Parser().parse(input)
            for options in [
                FormatOptions(maxInlineRefs: 0, preferInline: false),
                FormatOptions(maxLineLength: 1, indentLongLines: true, preferInline: false),
            ] {
                XCTAssertEqual(try Parser().parse(formatLinks(links, options: options)), links, input)
            }
        }
    }
}
