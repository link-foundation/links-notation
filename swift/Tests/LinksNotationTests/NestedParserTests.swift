import XCTest

@testable import LinksNotation

final class NestedParserTests: XCTestCase {
    private let parser = Parser()

    func testSignificantWhitespaceTest() throws {
        let source = """

            users
                user1
                    id
                        43
                    name
                        first
                            John
                        last
                            Williams
                    location
                        New York
                    age
                        23
                user2
                    id
                        56
                    name
                        first
                            Igor
                        middle
                            Petrovich
                        last
                            Ivanov
                    location
                        Moscow
                    age
                        20
            """

        let target = """
            (users)
            ((users) (user1))
            (((users) (user1)) (id))
            ((((users) (user1)) (id)) (43))
            (((users) (user1)) (name))
            ((((users) (user1)) (name)) (first))
            (((((users) (user1)) (name)) (first)) (John))
            ((((users) (user1)) (name)) (last))
            (((((users) (user1)) (name)) (last)) (Williams))
            (((users) (user1)) (location))
            ((((users) (user1)) (location)) (New York))
            (((users) (user1)) (age))
            ((((users) (user1)) (age)) (23))
            ((users) (user2))
            (((users) (user2)) (id))
            ((((users) (user2)) (id)) (56))
            (((users) (user2)) (name))
            ((((users) (user2)) (name)) (first))
            (((((users) (user2)) (name)) (first)) (Igor))
            ((((users) (user2)) (name)) (middle))
            (((((users) (user2)) (name)) (middle)) (Petrovich))
            ((((users) (user2)) (name)) (last))
            (((((users) (user2)) (name)) (last)) (Ivanov))
            (((users) (user2)) (location))
            ((((users) (user2)) (location)) (Moscow))
            (((users) (user2)) (age))
            ((((users) (user2)) (age)) (20))
            """

        let links = try parser.parse(source)
        XCTAssertEqual(formatLinks(links), target)
    }

    func testSimpleSignificantWhitespaceTest() throws {
        let source = "a\n    b\n    c"
        let target = "(a)\n((a) (b))\n((a) (c))"
        let links = try parser.parse(source)
        XCTAssertEqual(formatLinks(links), target)
    }

    func testTwoSpacesSizedWhitespaceTest() throws {
        let source = "\nusers\n  user1"
        let target = "(users)\n((users) (user1))"
        let links = try parser.parse(source)
        XCTAssertEqual(formatLinks(links), target)
    }

    func testParseNestedStructureWithIndentation() throws {
        let input = "parent\n  child1\n  child2"
        let result = try parser.parse(input)
        XCTAssertEqual(result.count, 3)
        // (parent), ((parent) (child1)), ((parent) (child2))
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.first?.id, "parent")
        XCTAssertNil(result[1].id)
        XCTAssertEqual(result[1].values.count, 2)
        XCTAssertNil(result[2].id)
        XCTAssertEqual(result[2].values.count, 2)
    }

    func testIndentationConsistency() throws {
        // Inconsistent indentation still parses.
        let input = "parent\n  child1\n   child2"
        let result = try parser.parse(input)
        XCTAssertGreaterThan(result.count, 0)
    }

    func testIndentationBasedChildren() throws {
        let input = "parent\n  child1\n  child2\n    grandchild"
        let result = try parser.parse(input)
        XCTAssertEqual(result.count, 4)
    }

    func testComplexIndentation() throws {
        let input = "root\n  level1a\n    level2a\n    level2b\n  level1b\n    level2c"
        let result = try parser.parse(input)
        XCTAssertEqual(result.count, 6)
    }

    func testNestedLinks() throws {
        let input = "(1: (2: (3: 3)))"
        let parsed = try parser.parse(input)
        XCTAssertGreaterThan(parsed.count, 0)

        // JS toBeTruthy on a string: non-empty.
        let output = formatLinks(parsed)
        XCTAssertFalse(output.isEmpty)

        XCTAssertEqual(parsed.count, 1)
    }

    func testIndentationParser() throws {
        let input = "parent\n  child1\n  child2"
        let result = try parser.parse(input)
        XCTAssertGreaterThan(result.count, 0)
        let hasParentLink = result.contains { link in link.values.contains { $0.id == "parent" } }
        XCTAssertTrue(hasParentLink)
    }

    func testNestedIndentationParser() throws {
        let input = "parent\n  child\n    grandchild"
        let result = try parser.parse(input)
        XCTAssertGreaterThan(result.count, 0)
        XCTAssertGreaterThanOrEqual(result.count, 1)
    }

    func testThreeLevelNestingRoundtrip() throws {
        let input = "(1: (2: (3: 3)))"
        let parsed = try parser.parse(input)
        XCTAssertEqual(formatLinks(parsed), input)
    }

    func testDeepNestedStructureRoundtrip() throws {
        let input = "(a: (b: (c: (d: d))))"
        let parsed = try parser.parse(input)
        XCTAssertEqual(formatLinks(parsed), input)
    }

    func testMultipleNestedLinksRoundtrip() throws {
        let input = "(parent: (child1: value1) (child2: value2))"
        let parsed = try parser.parse(input)
        XCTAssertEqual(formatLinks(parsed), input)
    }
}
