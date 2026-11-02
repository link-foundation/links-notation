import Foundation
import XCTest

@testable import LinksNotation

/// Replays vectors written by `experiments/differential-vectors.mjs` (random
/// documents and what the JavaScript parser made of them) when
/// `LINKS_NOTATION_VECTORS` names the file (and `LINKS_NOTATION_MAX_DEPTH` the
/// depth they were made with, 8 by default); skipped otherwise.
final class DifferentialTests: XCTestCase {
    func testTheJavaScriptParserAgrees() throws {
        guard let path = ProcessInfo.processInfo.environment["LINKS_NOTATION_VECTORS"] else {
            throw XCTSkip("set LINKS_NOTATION_VECTORS to a file of differential-vectors.mjs")
        }
        let maxDepth = ProcessInfo.processInfo.environment["LINKS_NOTATION_MAX_DEPTH"].flatMap { Int($0) } ?? 8
        let parser = Parser(options: ParserOptions(maxDepth: maxDepth))
        var failures = 0
        for fixture in try loadCases(URL(fileURLWithPath: path)) where failures < 20 {
            let actual: String
            do {
                let links = try parser.parse(fixture.input)
                actual = "ok \(links.map(\.tree)) | \(formatLinks(links))"
            } catch let error as ParseError {
                if fixture.code == "invalid-literal", case .syntax(_, _, let message) = error {
                    actual = "invalid literal \(message)"
                } else {
                    actual = "error \(error)"
                }
            }
            let expected: String
            if fixture.code == "invalid-literal" {
                expected = "invalid literal \(fixture.message!)"
            } else if fixture.error == true {
                let error: ParseError =
                    fixture.code == "depth-exceeded"
                    ? .depthExceeded(maxDepth)
                    : .syntax(line: fixture.line!, column: fixture.column!, message: fixture.message!)
                expected = "error \(error)"
            } else {
                expected = "ok \(fixture.expected!.map(\.link.tree)) | \(fixture.format!)"
            }
            if actual != expected {
                failures += 1
                XCTFail("\(fixture.id) \(fixture.input.debugDescription)\n  js:    \(expected)\n  swift: \(actual)")
            }
        }
    }
}

extension Link {
    /// The structure alone: `id[values]`, regardless of how it is formatted.
    fileprivate var tree: String {
        "\(id.map { $0.debugDescription } ?? "nil")[\(values.map(\.tree).joined(separator: ","))]"
    }
}
