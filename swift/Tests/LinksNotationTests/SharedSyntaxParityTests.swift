import Foundation
import XCTest

@testable import LinksNotation

/// A link of `parity/syntax-fixtures.json` with how its identifier was written.
private struct SyntaxParityLink: Decodable, Equatable {
    let id: String?
    let raw: String?
    let quote: String?
    let values: [SyntaxParityLink]

    init(id: String?, raw: String?, quote: String?, values: [SyntaxParityLink]) {
        self.id = id
        self.raw = raw
        self.quote = quote
        self.values = values
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(String.self, forKey: .id)
        raw = try container.decodeIfPresent(String.self, forKey: .raw)
        quote = try container.decodeIfPresent(String.self, forKey: .quote)
        values = try container.decode([SyntaxParityLink].self, forKey: .values)
    }

    private enum CodingKeys: String, CodingKey { case id, raw, quote, values }
}

private struct SyntaxParityFixture: Decodable {
    let id: String
    let input: String
    let links: [SyntaxParityLink]
    let cst: String
}

private struct SyntaxParityInput: Decodable {
    let id: String
    let input: String
}

private func syntaxParityTree(_ links: [Link]) -> [SyntaxParityLink] {
    links.map { SyntaxParityLink(id: $0.id, raw: $0.rawId, quote: $0.quote, values: syntaxParityTree($0.values)) }
}

private func readParity<T: Decodable>(_ name: String, as type: T.Type) throws -> T {
    let url = repositoryRoot.appendingPathComponent("parity").appendingPathComponent(name)
    return try JSONDecoder().decode(T.self, from: Data(contentsOf: url))
}

final class SharedSyntaxParityTests: XCTestCase {
    func testSharedSyntaxParityRawReferencesAndConcreteSyntaxTrees() throws {
        let fixtures = try readParity("syntax-fixtures.json", as: [SyntaxParityFixture].self)
        XCTAssertFalse(fixtures.isEmpty)
        for fixture in fixtures {
            let parser = Parser()
            XCTAssertEqual(syntaxParityTree(try parser.parse(fixture.input)), fixture.links, fixture.id)
            let cst = try parser.parseCst(fixture.input)
            XCTAssertEqual(cst.toSExpression(), fixture.cst, fixture.id)
            XCTAssertEqual(cst.description, fixture.input, fixture.id)
            // JS iterates code points; Swift writes one Unicode scalar at a time.
            let stream = StreamParser()
            for scalar in fixture.input.unicodeScalars {
                try stream.write(String(scalar))
            }
            XCTAssertEqual(syntaxParityTree(try stream.end()), fixture.links, fixture.id)
        }
    }

    func testEverySharedInputIsRecoveredExactlyFromItsConcreteSyntaxTree() throws {
        let inputs =
            try readParity("text-fixtures.json", as: [SyntaxParityInput].self)
            + readParity("syntax-fixtures.json", as: [SyntaxParityInput].self)
        XCTAssertFalse(inputs.isEmpty)
        for fixture in inputs {
            let cst = try Parser().parseCst(fixture.input)
            XCTAssertEqual(cst.description, fixture.input, fixture.id)
            XCTAssertEqual(cst.tokens().map(\.text).joined(), fixture.input, fixture.id)
        }
    }
}
