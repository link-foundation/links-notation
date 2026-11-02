import Foundation
import XCTest

@testable import LinksNotation

/// Port of `cpp/tests/benchmark_documents_tests.cpp`: the Links Notation
/// documents the token benchmarks generate (`benchmarks/generated`) are
/// portable, and the Swift parser reads every one. Like the other bindings,
/// the test does not format the links back: no formatter keeps the empty
/// groups of sparse_records (`tags ()` formats as `(tags )`).
final class BenchmarkDocumentsTests: XCTestCase {
    /// The Links Notation files listed in `benchmarks/generated/index.json`,
    /// relative to the repository root.
    private func generatedDocuments() throws -> [String] {
        let index = try String(
            contentsOf: repositoryRoot.appendingPathComponent("benchmarks/generated/index.json"), encoding: .utf8)
        let pattern = try NSRegularExpression(pattern: #""(generated/[^"]+\.lino)""#)
        let range = NSRange(index.startIndex..., in: index)
        return pattern.matches(in: index, range: range).compactMap { match in
            Range(match.range(at: 1), in: index).map { "benchmarks/" + index[$0] }
        }
    }

    func testEveryGeneratedDocumentParses() throws {
        let paths = try generatedDocuments()
        // Three Links Notation forms of each of the eleven datasets.
        XCTAssertEqual(paths.count, 33)
        for path in paths {
            let text = try String(contentsOf: repositoryRoot.appendingPathComponent(path), encoding: .utf8)
            XCTAssertNoThrow(
                try {
                    let links = try Parser().parse(text)
                    XCTAssertFalse(links.isEmpty, path)
                }(), path)
        }
    }
}
