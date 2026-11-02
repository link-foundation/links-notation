// Ported from js/tests/SingleLineParser.test.js.

import XCTest

@testable import LinksNotation

final class SingleLineParserTests: XCTestCase {
    private let parser = Parser()

    func testSingleLink() throws {
        let source = "(address: source target)"
        let links = try parser.parse(source)
        XCTAssertEqual(formatLinks(links), source)
    }

    func testTripletSingleLink() throws {
        let source = "(papa has car)"
        let links = try parser.parse(source)
        XCTAssertEqual(formatLinks(links), source)
    }

    func testBugTest1() throws {
        let source = "(ignore conan-center-index repository)"
        let links = try parser.parse(source)
        XCTAssertEqual(formatLinks(links), source)
    }

    func testQuotedReferences() throws {
        let source = #"(a: 'b' "c")"#
        let links = try parser.parse(source)
        XCTAssertEqual(formatLinks(links), "(a: b c)")
    }

    func testQuotedReferencesWithSpaces() throws {
        let source = #"('a a': 'b b' "c c")"#
        let links = try parser.parse(source)
        XCTAssertEqual(formatLinks(links), "('a a': 'b b' 'c c')")
    }

    func testParseSimpleReference() throws {
        let result = try parser.parse("test")
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.count, 1)
        XCTAssertEqual(result[0].values[0].id, "test")
        XCTAssertEqual(result[0].values[0].values, [])
    }

    func testParseReferenceWithColonAndValues() throws {
        let result = try parser.parse("parent: child1 child2")
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "parent")
        XCTAssertEqual(result[0].values.count, 2)
        XCTAssertEqual(result[0].values[0].id, "child1")
        XCTAssertEqual(result[0].values[1].id, "child2")
    }

    func testParseMultilineLink() throws {
        let result = try parser.parse("(parent: child1 child2)")
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "parent")
        XCTAssertEqual(result[0].values.count, 2)
    }

    func testParseQuotedReferences() throws {
        let result = try parser.parse(#""has space" 'has:colon'"#)
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.count, 2)
        XCTAssertEqual(result[0].values[0].id, "has space")
        XCTAssertEqual(result[0].values[1].id, "has:colon")
        XCTAssertEqual(formatLinks(result), "('has space' 'has:colon')")
    }

    func testParseValuesOnly() {
        // A standalone ':' is forbidden.
        XCTAssertThrowsError(try parser.parse(": value1 value2"))
    }

    func testSingleLineLinkWithId() throws {
        let result = try parser.parse("id: value1 value2")
        XCTAssertGreaterThan(result.count, 0)
    }

    func testMultiLineLinkWithId() throws {
        let result = try parser.parse("(id: value1 value2)")
        XCTAssertGreaterThan(result.count, 0)
    }

    func testLinkWithoutIdSingleLine() {
        // A standalone ':' is forbidden.
        XCTAssertThrowsError(try parser.parse(": value1 value2"))
    }

    func testLinkWithoutIdMultiLine() {
        // '(:)' syntax is forbidden.
        XCTAssertThrowsError(try parser.parse("(: value1 value2)"))
    }

    func testSingletLink() throws {
        let result = try parser.parse("(singlet)")
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.count, 1)
        XCTAssertEqual(result[0].values[0].id, "singlet")
        XCTAssertEqual(result[0].values[0].values, [])
    }

    func testValueLink() throws {
        let result = try parser.parse("(value1 value2 value3)")
        XCTAssertGreaterThan(result.count, 0)
    }

    func testParseQuotedReferencesValuesOnly() throws {
        let parser = Parser()
        let links = try parser.parse(#""has space" 'has:colon'"#)
        XCTAssertFalse(links.isEmpty)
        XCTAssertEqual(links.count, 1)
        XCTAssertNil(links[0].id)
        XCTAssertEqual(links[0].values.count, 2)
        XCTAssertEqual(links[0].values[0].id, "has space")
        XCTAssertEqual(links[0].values[1].id, "has:colon")
    }

    // JS has both "Quoted references" and "Test quoted references".
    func testTestQuotedReferences() throws {
        let result = try parser.parse(#"("id with spaces": "value with spaces")"#)
        XCTAssertGreaterThan(result.count, 0)
    }

    func testSingleQuotedReferences() throws {
        let result = try parser.parse("('id': 'value')")
        XCTAssertGreaterThan(result.count, 0)
    }

    func testNestedLinks() throws {
        let result = try parser.parse("(outer: (inner: value))")
        XCTAssertGreaterThan(result.count, 0)
    }

    func testSpecialCharactersInQuotes() throws {
        var result = try parser.parse(#"("key:with:colons": "value(with)parens")"#)
        XCTAssertGreaterThan(result.count, 0)

        result = try parser.parse("('key with spaces': 'value: with special chars')")
        XCTAssertGreaterThan(result.count, 0)
    }

    func testDeeplyNested() throws {
        let result = try parser.parse("(a: (b: (c: (d: (e: value)))))")
        XCTAssertGreaterThan(result.count, 0)
    }

    func testHyphenatedIdentifiers() throws {
        let result = try parser.parse("(conan-center-index: repository info)")
        XCTAssertGreaterThan(result.count, 0)
    }

    func testMultipleWordsInQuotes() throws {
        let result = try parser.parse(#"("New York": city state)"#)
        XCTAssertGreaterThan(result.count, 0)
        // JS checks JSON.stringify(result); the Swift links' description is used instead.
        XCTAssertTrue(String(describing: result).contains("New York"))
    }

    func testSimpleRef() throws {
        let result = try parser.parse("simple_ref")
        XCTAssertGreaterThan(result.count, 0)
    }

    func testSimpleReferenceParser() throws {
        let result = try parser.parse("hello")
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.count, 1)
        XCTAssertEqual(result[0].values[0].id, "hello")
    }

    func testQuotedReferenceParser() throws {
        let result = try parser.parse(#""hello world""#)
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.count, 1)
        XCTAssertEqual(result[0].values[0].id, "hello world")
    }

    func testSingletLinkParser() throws {
        let result = try parser.parse("(singlet)")
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.count, 1)
        XCTAssertEqual(result[0].values[0].id, "singlet")
        XCTAssertEqual(result[0].values[0].values, [])
    }

    func testValueLinkParser() throws {
        let result = try parser.parse("(a b c)")
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.count, 3)
    }

    func testMultilineWithoutId() {
        // '(:)' syntax is forbidden.
        XCTAssertThrowsError(try parser.parse("(: value1 value2)"))
    }

    func testParseValuesOnlyStandaloneColon() {
        // A standalone ':' is forbidden.
        XCTAssertThrowsError(try parser.parse(": value1 value2"))
    }

    func testQuotedReferencesWithSpacesInLink() throws {
        let result = try parser.parse(#"(id: "value with spaces")"#)
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "id")
        XCTAssertEqual(result[0].values.count, 1)
        XCTAssertEqual(result[0].values[0].id, "value with spaces")
    }

    func testSingleLineWithoutId() throws {
        let result = try parser.parse("(value1 value2)")
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.count, 2)
    }

    func testLinkWithId() throws {
        let result = try parser.parse("(id: a b c)")
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "id")
        XCTAssertEqual(result[0].values.count, 3)
    }

    func testQuotedReference() throws {
        let result = try parser.parse(#""quoted value""#)
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.count, 1)
        XCTAssertEqual(result[0].values[0].id, "quoted value")
    }

    func testQuotedReferencesWithSpecialChars() throws {
        let result = try parser.parse(#"("special:char" "another@char")"#)
        XCTAssertEqual(result.count, 1)
        XCTAssertNil(result[0].id)
        XCTAssertEqual(result[0].values.count, 2)
        XCTAssertEqual(result[0].values[0].id, "special:char")
        XCTAssertEqual(result[0].values[1].id, "another@char")
    }

    func testSimpleReference() throws {
        let result = try parser.parse("simplereference")
        XCTAssertGreaterThan(result.count, 0)
    }

    func testSingleLineLink() throws {
        let result = try parser.parse("id: value1 value2")
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "id")
        XCTAssertEqual(result[0].values.count, 2)
    }

    func testSingleLineWithId() throws {
        let result = try parser.parse("myid: val1 val2")
        XCTAssertGreaterThan(result.count, 0)
        XCTAssertEqual(result[0].id, "myid")
    }
}
