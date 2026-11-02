import Foundation
import XCTest

@testable import LinksNotation

/// Bytes from hexadecimal text; spaces are ignored.
private func binaryTestBytes(_ hex: String) -> [UInt8] {
    let digits = Array(hex.replacingOccurrences(of: " ", with: ""))
    precondition(digits.count % 2 == 0, "odd number of hex digits")
    return stride(from: 0, to: digits.count, by: 2).map { UInt8(String(digits[$0...$0 + 1]), radix: 16)! }
}

final class BinaryTests: XCTestCase {
    func testBinaryTextQuotesEveryUnicodeGrammarWhitespaceCharacter() throws {
        for text in ["\u{85}", "x\u{a0}y", "x\u{2028}y", "\u{1c}", "\u{1d}", "\u{1e}", "\u{1f}", "\u{feff}"] {
            XCTAssertEqual(
                try Parser().parse("(root: \(formatBinaryReference(text)))"),
                [Link(id: "root", values: [Link(id: text)])],
                text.unicodeScalars.map { String($0.value, radix: 16) }.joined(separator: " "))
        }
    }

    func testStringDecodingStopsAtTheUtf8BudgetBeforeReadingLaterScalars() throws {
        let bytes = binaryTestBytes("13024605011001030000009fffffff9effffff0028ffff06")
        let codec = BinaryLinoCodec(limits: try DecodeLimits(maxStringBytes: 1))
        XCTAssertThrowsError(try codec.decode(bytes)) { error in
            XCTAssertTrue(String(describing: error).contains("string budget exceeded"), "\(error)")
        }
    }

    func testSharedBinaryGoldenVectors() throws {
        let url = repositoryRoot.appendingPathComponent("docs/protocol/binary-links-notation-vectors.txt")
        let text = try String(contentsOf: url, encoding: .utf8)
        var count = 0
        for rawLine in text.split(separator: "\n", omittingEmptySubsequences: false) {
            let line = rawLine.hasSuffix("\r") ? String(rawLine.dropLast()) : String(rawLine)
            if line.isEmpty || line.hasPrefix("#") { continue }
            let f = line.split(separator: "\t", omittingEmptySubsequences: false).map(String.init)
            let bytes = binaryTestBytes(f[f.count - 1])
            if f[0] == "document" {
                let codec = BinaryLinoCodec(
                    options: BinaryLinoOptions(
                        externalReferences: f[2] == "external", arity: try ArityRange.parse(f[3]),
                        packedWidths: f[4] == "packed"))
                let model = try codec.parseDocument(f[1].replacingOccurrences(of: "\\n", with: "\n"))
                XCTAssertEqual(try codec.encode(model), bytes, line)
                XCTAssertEqual(try codec.decode(bytes), model, line)
            } else {
                let links = try LinksPacket.parseLinks(f[1])
                XCTAssertEqual(
                    try LinksPacket.pack(externalReferences: f[2] == "external", links, packedWidths: f[3] == "packed")
                        .toBytes(),
                    bytes, line)
                XCTAssertEqual(try LinksPacket.fromBytes(bytes).links(), links, line)
            }
            count += 1
        }
        XCTAssertEqual(count, 96)
    }

    func testAllNativeTextModelsSurviveAllBinaryOptions() throws {
        for source in [
            "",
            "()",
            "\"\"",
            "a",
            "(a)",
            "((a))",
            "(a b c)",
            "(\"\": () \"\" (b))",
            "a:\n  b\n  c",
            "\"#x\" \"λ😀\" \"007\" \"18446744073709551615\"",
            "# comment\n(a # tail\n b)",
        ] {
            let model = try Parser().parse(source)
            for external in [false, true] {
                for arity in ["2", "2..3", "1.."] {
                    for packed in [false, true] {
                        let codec = BinaryLinoCodec(
                            options: BinaryLinoOptions(
                                externalReferences: external, arity: try ArityRange.parse(arity), packedWidths: packed))
                        let decoded = try codec.decode(try codec.encode(model))
                        let context = "\(source) external=\(external) arity=\(arity) packed=\(packed)"
                        XCTAssertEqual(decoded.count, model.count, context)
                        XCTAssertTrue(zip(decoded, model).allSatisfy { $0 == $1 }, context)
                    }
                }
            }
        }
    }

    func testConfigurableLimitsApplyInBothDirectionsRejectMalformedPackets() throws {
        let model = [Link(id: nil, values: [Link(id: "abcdef")])]
        let bytes = try BinaryLinoCodec().encode(model)
        for limits in [
            try DecodeLimits(maxNodes: 1),
            try DecodeLimits(maxStringBytes: 2),
            try DecodeLimits(maxDepth: 1),
            try DecodeLimits(maxLinks: 1),
            try DecodeLimits(maxReferences: 1),
        ] {
            let codec = BinaryLinoCodec(limits: limits)
            XCTAssertThrowsError(try codec.decode(bytes), "\(limits)")
            XCTAssertThrowsError(try codec.encode(model), "\(limits)")
        }
        for hex in ["", "20", "1e00", "1001", "100000", "10ffffffffffffffffffff"] {
            XCTAssertThrowsError(try BinaryLinoCodec().decode(binaryTestBytes(hex)), hex)
        }
    }

    // JS Uint8Array and BigInt references are [UInt8] and UInt64 in Swift.
    func testPacketCursorBoundariesUint64TruncationAndConfigurableDepth() throws {
        for (external, references) in [(false, "0 18446744073709551615"), (true, "#0 #9223372036854775807")] {
            let links = try LinksPacket.parseLinks("6:" + references)
            let packet = try LinksPacket.pack(externalReferences: external, links, packedWidths: true)
            let data = try packet.toBytes()
            var reader = try PacketReader(data + data)
            XCTAssertEqual(try XCTUnwrap(try reader.read()).links(), links)
            XCTAssertEqual(reader.offset, data.count)
            XCTAssertEqual(try XCTUnwrap(try reader.read()).links(), links)
            XCTAssertNil(try reader.read())
            for end in 0..<data.count {
                XCTAssertThrowsError(try LinksPacket.fromBytes(Array(data[0..<end])), "\(references) cut at \(end)")
            }
        }
        var document = [Link(id: "leaf")]
        for _ in 0..<70 { document = [Link(id: nil, values: document)] }
        XCTAssertThrowsError(try BinaryLinoCodec().encode(document))
        let codec = BinaryLinoCodec(limits: try DecodeLimits(maxDepth: 80))
        XCTAssertEqual(try codec.decode(try codec.encode(document)), document)
    }
}
