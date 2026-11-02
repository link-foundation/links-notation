import XCTest

@testable import LinksNotation

/// Port of `js/tests/MultilineParser.test.js`.
final class MultilineParserTests: XCTestCase {
    private let parser = Parser()

    func testTwoLinks() throws {
        let source = "(first: x y)\n(second: a b)"
        let links = try parser.parse(source)
        let target = formatLinks(links)
        XCTAssertEqual(target, source)
    }

    func testParseAndStringify() throws {
        let source = """
            (papa (lovesMama: loves mama))
            (son lovesMama)
            (daughter lovesMama)
            (all (love mama))
            """
        let links = try parser.parse(source)
        let target = formatLinks(links)
        XCTAssertEqual(target, source)
    }

    func testParseAndStringifyTest2() throws {
        let source = """
            father (lovesMom: loves mom)
            son lovesMom
            daughter lovesMom
            all (love mom)
            """
        let links = try parser.parse(source)
        let target = formatLinks(links, lessParentheses: true)
        XCTAssertEqual(target, source)
    }

    func testParseAndStringifyWithLessParentheses() throws {
        let source = """
            lovesMama: loves mama
            papa lovesMama
            son lovesMama
            daughter lovesMama
            all (love mama)
            """
        let links = try parser.parse(source)
        let target = formatLinks(links, lessParentheses: true)
        XCTAssertEqual(target, source)
    }

    func testDuplicateIdentifiers() throws {
        let source = "(a: a b)\n(a: b c)"
        let target = "(a: a b)\n(a: b c)"
        let links = try parser.parse(source)
        let formattedLinks = formatLinks(links)
        XCTAssertEqual(formattedLinks, target)
    }

    func testComplexStructure() throws {
        let input = """
            (Type: Type Type)
              Number
              String
              Array
              Value
                (property: name type)
                (method: name params return)
            """

        let result = try parser.parse(input)
        XCTAssertGreaterThan(result.count, 0)
    }

    func testMixedFormats() throws {
        // Mix of single-line and multi-line formats; `(complex: ` ends with a space.
        let input = "id1: value1\n(id2: value2 value3)\nsimple_ref\n(complex: \n  nested1\n  nested2\n)"

        let result = try parser.parse(input)
        XCTAssertGreaterThan(result.count, 0)
    }

    func testMultilineWithId() throws {
        // Test multi-line link with id
        let input = "(id: value1 value2)"
        let result = try parser.parse(input)
        XCTAssertGreaterThan(result.count, 0)
    }

    func testMultipleTopLevelElements() throws {
        // Test multiple top-level elements
        let input = "(elem1: val1)\n(elem2: val2)"
        let result = try parser.parse(input)
        XCTAssertGreaterThan(result.count, 0)
    }

    func testMultilineSimpleLinks() throws {
        let input = "(1: 1 1)\n(2: 2 2)"
        let parsed = try parser.parse(input)
        XCTAssertGreaterThan(parsed.count, 0)

        // Validate regular formatting
        let output = formatLinks(parsed)
        XCTAssertTrue(output.contains("(1: 1 1)"), output)
        XCTAssertTrue(output.contains("(2: 2 2)"), output)

        // Validate alternate formatting matches input
        let outputAlternate = formatLinks(parsed)
        XCTAssertEqual(outputAlternate, input)
    }

    func testIndentedChildren() throws {
        let input = "parent\n  child1\n  child2"
        let parsed = try parser.parse(input)

        // The parsed structure should have parent with children
        XCTAssertGreaterThan(parsed.count, 0)
    }
}
