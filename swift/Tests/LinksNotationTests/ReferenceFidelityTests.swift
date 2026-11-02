import Foundation
import XCTest

@testable import LinksNotation

/// Port of `js/tests/ReferenceFidelity.test.js`: every reference of
/// `docs/protocol/reference-literals.txt` survives formatting, streaming at
/// any split and the binary codec, and the literals of
/// `docs/protocol/invalid-reference-literals.txt` are refused.
final class ReferenceFidelityTests: XCTestCase {
    private func protocolLines(_ name: String) throws -> [String] {
        let url = repositoryRoot.appendingPathComponent("docs/protocol/\(name)")
        return try String(contentsOf: url, encoding: .utf8)
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .components(separatedBy: "\n")
            .filter { !$0.hasPrefix("#") }
    }

    /// The references of the shared fixture file; `-` is the empty reference.
    private func references() throws -> [String] {
        try protocolLines("reference-literals.txt").map { hex in
            if hex == "-" { return "" }
            var bytes: [UInt8] = []
            var index = hex.startIndex
            while index < hex.endIndex {
                let next = hex.index(index, offsetBy: 2)
                bytes.append(UInt8(hex[index..<next], radix: 16)!)
                index = next
            }
            return String(decoding: bytes, as: UTF8.self)
        }
    }

    private func scalarText(_ scalars: ArraySlice<Unicode.Scalar>) -> String {
        var view = String.UnicodeScalarView()
        view.append(contentsOf: scalars)
        return String(view)
    }

    func testNativeReferenceFidelity() throws {
        let references = try references()
        XCTAssertFalse(references.isEmpty)
        for id in references {
            let original = Link(id: id, values: [Link(id: id), Link(id: "nested", values: [Link(id: id)])])
            let texts = [
                formatLinks([original], lessParentheses: false),
                formatLinks([original], lessParentheses: true),
                formatLinks([original], options: FormatOptions(maxInlineRefs: 1, preferInline: false)),
            ]
            for text in texts {
                XCTAssertEqual(try Parser().parse(text), [original], text)
            }
        }
    }

    func testReferenceLiteralsAtEveryChunkSplit() throws {
        for id in try references() {
            XCTAssertEqual(try decodeReferenceLiteral(encodeReferenceLiteral(id)), id)
            for literal in [escapeReference(id), formatBinaryReference(id), encodeReferenceLiteral(id)] {
                let text = "(root: \(literal))\n(\(literal): fixture)"
                let expected = [
                    Link(id: "root", values: [Link(id: id)]),
                    Link(id: id, values: [Link(id: "fixture")]),
                ]
                XCTAssertEqual(try Parser().parse(text), expected, text)
                // JavaScript splits at every UTF-16 index; a Swift string can
                // only be split between Unicode scalars.
                let scalars = Array(text.unicodeScalars)
                for split in 0...scalars.count {
                    let stream = StreamParser()
                    try stream.write(scalarText(scalars[..<split]))
                    try stream.write(scalarText(scalars[split...]))
                    XCTAssertEqual(try stream.end(), expected, "\(text) split at \(split)")
                }
            }
        }
    }

    func testBinaryReferenceFidelity() throws {
        let codec = BinaryLinoCodec()
        for id in try references() {
            let original = [Link(id: id, values: [Link(id: id)])]
            let decoded = try codec.decode(codec.encode(original))
            XCTAssertEqual(decoded, original)
            XCTAssertEqual(try codec.parseDocument(codec.formatDocument(decoded)), original)
        }
    }

    func testMalformedReferenceLiteralsAreRejected() throws {
        let invalid = try protocolLines("invalid-reference-literals.txt")
        XCTAssertFalse(invalid.isEmpty)
        for literal in invalid {
            XCTAssertThrowsError(try decodeReferenceLiteral(literal), literal)
            XCTAssertThrowsError(try Parser().parse(literal), literal)
        }
        XCTAssertThrowsError(try decodeReferenceLiteral("~1{61}\n"))
        XCTAssertEqual(try decodeReferenceLiteral("~1{C3A9}"), "é")
        // A lone surrogate ("\ud800"), which JavaScript refuses to encode or
        // escape, cannot be held by a Swift String: decoding it yields U+FFFD,
        // which encodes as ordinary UTF-8.
        let loneSurrogate = String(decoding: [0xD800] as [UInt16], as: UTF16.self)
        XCTAssertEqual(loneSurrogate, "\u{FFFD}")
        XCTAssertEqual(encodeReferenceLiteral(loneSurrogate), "~1{efbfbd}")
        XCTAssertEqual(escapeReference(loneSurrogate), "\u{FFFD}")
    }
}
