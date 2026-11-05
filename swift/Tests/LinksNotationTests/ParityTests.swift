import XCTest

@testable import LinksNotation

/// The cross-language golden corpus (`parity/text-fixtures.json`) that every
/// implementation replays.
final class ParityTests: XCTestCase {
    private let corpus = repositoryRoot.appendingPathComponent("parity/text-fixtures.json")

    func testCorpusHasEveryUpstreamCase() throws {
        let ids = try loadCases(corpus).map(\.id)
        XCTAssertEqual(
            ids,
            [
                "empty", "singlet", "tuple", "named", "nested", "indent", "context", "quotes",
                "empty-ref", "unicode", "comments", "quote-runs", "multiline", "literal",
                "less-parentheses-lone-nested", "less-parentheses-lone-singlet",
                "less-parentheses-lone-named", "less-parentheses-lone-quoted",
                "less-parentheses-lone-deep", "less-parentheses-lone-mixed",
                "less-parentheses-named-lone", "less-parentheses-empty-link",
                "less-parentheses-several-nested", "less-parentheses-trailing-nested",
                "less-parentheses-leading-nested",
                "indented-id-references", "indented-id-quoted", "indented-id-explicit-links",
                "indented-id-nested", "indented-id-inline-descendants", "indented-id-comments",
            ])
    }

    func testParseFormatAndRoundTripEveryCase() throws {
        for fixture in try loadCases(corpus) {
            try assertParseFormatRoundTrip(fixture)
        }
    }
}
