// Ported from js/tests/SharedTextParity.test.js.

import XCTest

@testable import LinksNotation

final class SharedTextParityTests: XCTestCase {
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
}
