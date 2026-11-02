import XCTest

@testable import LinksNotation

private let streamDocument = """
    first loves data
    # streamed comment
    profile:
      name Ada
      note "line one
    line two"
    (nested:
      child value)
    last sees first
    """

private func streamFormatted(_ links: [Link]) -> String { formatLinks(links) }

final class StreamParserTests: XCTestCase {
    func testMatchesCanonicalParserOneSymbolAtATime() throws {
        let stream = StreamParser()
        // JS iterates code points; Swift writes one Unicode scalar at a time.
        for scalar in streamDocument.unicodeScalars { try stream.write(String(scalar)) }

        XCTAssertEqual(streamFormatted(try stream.end()), streamFormatted(try Parser().parse(streamDocument)))
    }

    func testSupportsLineChunksFinalRecordAndPosition() throws {
        let stream = StreamParser()
        // Each line with its line feed, as /.*(?:\n|$)/g splits it.
        var lines: [String] = []
        var current = ""
        for character in streamDocument {
            current.append(character)
            if character == "\n" {
                lines.append(current)
                current = ""
            }
        }
        if !current.isEmpty { lines.append(current) }
        for line in lines { try stream.write(line) }

        XCTAssertEqual(streamFormatted(try stream.end()), streamFormatted(try Parser().parse(streamDocument)))
        XCTAssertEqual(stream.position().offset, streamDocument.utf16.count)
        XCTAssertEqual(stream.position().buffered, 0)
    }

    // JS on('link', ...) is onLink in Swift.
    func testEmitsARecordAsSoonAsTheNextTopLevelRecordStarts() throws {
        let stream = StreamParser()
        var seen: [String] = []
        stream.onLink { seen.append($0.description) }

        XCTAssertEqual(try stream.write("first loves data\n"), [])
        XCTAssertEqual(try stream.write("s").map(\.description), ["(first loves data)"])
        XCTAssertEqual(seen, ["(first loves data)"])
    }

    func testEmitsOnlyCompleteRecords() throws {
        let stream = StreamParser()
        var seen: [Link] = []
        stream.onLink { seen.append($0) }

        for character in "profile:\n  name Ada\n  role engineer\n" {
            try stream.write(String(character))
        }
        XCTAssertEqual(seen, [])

        try stream.write("n")
        XCTAssertEqual(streamFormatted(seen), "(profile: (name Ada) (role engineer))")
    }

    func testDoesNotSplitMultilineQuotesOrParenthesizedContexts() throws {
        let stream = StreamParser()
        var seen: [Link] = []
        stream.onLink { seen.append($0) }

        try stream.write("\"first\nsecond\"\n(nested:\n  value one)\n")
        XCTAssertEqual(seen.count, 1)
        try stream.write("n")
        XCTAssertEqual(seen.count, 2)
    }

    func testAcceptsAFinalRecordWithoutANewline() throws {
        let stream = StreamParser()
        try stream.write("only one record")
        XCTAssertEqual(streamFormatted(try stream.end()), "(only one record)")
    }

    // JS toBeInstanceOf(StreamParseError) is a cast to StreamParseError.
    func testReportsPositionsRelativeToTheWholeStream() throws {
        let stream = StreamParser()
        stream.onError { _ in }
        try stream.write("good link\nnext link\nb")

        var caught: Error?
        do {
            try stream.end("ad: value: nope")
        } catch {
            caught = error
        }
        let streamError = try XCTUnwrap(caught as? StreamParseError)
        XCTAssertEqual(streamError.line, 3)
        XCTAssertGreaterThan(streamError.offset, "good link\nnext link\n".utf16.count)
    }

    func testCanAvoidRetainingOutputForBoundedMemoryEventProcessing() throws {
        let stream = StreamParser(options: StreamParserOptions(collect: false))
        var seen: [String] = []
        stream.onLink { seen.append($0.description) }
        try stream.write("one link\nt")
        XCTAssertEqual(stream.drain(), [])
        XCTAssertEqual(try stream.end("wo link").map(\.description), ["(two link)"])
        XCTAssertEqual(seen, ["(one link)", "(two link)"])
    }

    // JS RangeError is StreamParserError.bufferOverflow in Swift.
    func testSupportsDrainResetAndBoundedMemory() throws {
        let stream = StreamParser()
        try stream.write("one link\nt")
        XCTAssertEqual(stream.drain().map(\.description), ["(one link)"])
        XCTAssertEqual(try stream.end("wo link").map(\.description), ["(two link)"])

        try stream.reset().write("fresh record")
        XCTAssertEqual(try stream.end().map(\.description), ["(fresh record)"])

        let bounded = StreamParser(options: StreamParserOptions(maxBufferSize: 4))
        bounded.onError { _ in }
        XCTAssertThrowsError(try bounded.write("12345")) { error in
            XCTAssertEqual(error as? StreamParserError, .bufferOverflow(4))
        }
    }

    // JS parse(iterable) and parseAsync(asyncIterable) are the Sequence and
    // AsyncSequence overloads of StreamParser.parse in Swift.
    func testProvidesLazyAdapters() async throws {
        XCTAssertEqual(
            try StreamParser.parse(["one link\n", "two link"]).map(\.description), ["(one link)", "(two link)"])

        let chunks = AsyncStream<String> { continuation in
            continuation.yield("one link\n")
            continuation.yield("two link")
            continuation.finish()
        }
        var links: [String] = []
        for try await link in StreamParser.parse(chunks) {
            links.append(link.description)
        }
        XCTAssertEqual(links, ["(one link)", "(two link)"])
    }

    func testLimitsOnlyTheUnresolvedRecordNotTotalStreamSize() throws {
        let stream = StreamParser(options: StreamParserOptions(maxBufferSize: 12, collect: false))
        stream.onError { _ in }
        for index in 0..<100 { try stream.write("a\(index)\n") }
        XCTAssertEqual(try stream.end().map(\.description), ["(a99)"])
    }

    func testRejectsWritesAfterFinish() throws {
        let stream = StreamParser()
        try stream.end("one")
        stream.onError { _ in }
        XCTAssertThrowsError(try stream.write("two")) { error in
            XCTAssertEqual(error as? StreamParserError, .writeAfterEnd)
            XCTAssertTrue(String(describing: error).contains("after end"))
        }
    }

    func testTracksTheAbsoluteStreamPosition() throws {
        let stream = StreamParser()
        try stream.write("one\ntw")
        XCTAssertEqual(stream.position(), StreamPosition(offset: 6, line: 2, column: 3, buffered: 2))
    }

    func testWaitsForTheLineThatClosesAnEvenRunOfQuotes() throws {
        // `""` is the empty reference only when nothing closes it, and here the
        // next line does, so the first line cannot be emitted on its own (#377).
        let input = "a \"\" b\n\"\" c\n"
        let stream = StreamParser()
        for scalar in input.unicodeScalars {
            XCTAssertEqual(try stream.write(String(scalar)), [], "after \(scalar)")
        }

        XCTAssertEqual(streamFormatted(try stream.end()), streamFormatted(try Parser().parse(input)))
    }
}
