import Foundation
import XCTest

@testable import LinksNotation

/// An expected link of a fixture: `{"id": <string or null>, "values": [...]}`.
struct ExpectedLink: Decodable, Equatable {
    let id: String?
    let values: [ExpectedLink]

    var link: Link { Link(id: id, values: values.map(\.link)) }
}

/// One case of `parity/text-fixtures.json` or of the differential vectors.
struct FixtureCase: Decodable {
    let id: String
    let input: String
    let expected: [ExpectedLink]?
    let format: String?
    /// `true` when the parser must refuse the input (differential vectors only).
    let error: Bool?
    /// `syntax-error` or `depth-exceeded`.
    let code: String?
    let line: Int?
    let column: Int?
    let message: String?
}

/// The `swift/` directory of the repository.
let swiftDirectory = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent()  // LinksNotationTests
    .deletingLastPathComponent()  // Tests
    .deletingLastPathComponent()

/// The root of the repository, where the shared `parity/` fixtures live.
let repositoryRoot = swiftDirectory.deletingLastPathComponent()

func loadCases(_ url: URL) throws -> [FixtureCase] {
    try JSONDecoder().decode([FixtureCase].self, from: Data(contentsOf: url))
}

/// Asserts what every language binding asserts for a case: the input parses
/// into the expected links, they format as the expected text, and that text
/// parses back into the same links.
func assertParseFormatRoundTrip(
    _ fixture: FixtureCase, file: StaticString = #filePath, line: UInt = #line
) throws {
    let expected = try XCTUnwrap(fixture.expected, "\(fixture.id): expected", file: file, line: line)
        .map(\.link)
    let format = try XCTUnwrap(fixture.format, "\(fixture.id): format", file: file, line: line)
    let parser = Parser()

    let links = try parser.parse(fixture.input)
    XCTAssertEqual(links, expected, "\(fixture.id): parse", file: file, line: line)
    XCTAssertEqual(formatLinks(links), format, "\(fixture.id): format", file: file, line: line)
    XCTAssertEqual(try parser.parse(format), expected, "\(fixture.id): round trip", file: file, line: line)
}
