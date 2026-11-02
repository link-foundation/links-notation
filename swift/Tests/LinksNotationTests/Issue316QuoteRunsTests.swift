import Foundation
import XCTest

@testable import LinksNotation

// Issue #316: a reference that opens with a wide run of delimiters used to be
// read one character at a time, comparing the whole width at every position,
// and every run that never closed was read to the end of the document again.
// Read a run at a time they take milliseconds, so the bound below only fails
// on the old behaviour.

private let issue316Parser = Parser()
private let issue316BoundSeconds = 2.0 * timeScale
private let issue316Size = 400_000

private func issue316Render(_ node: Link) -> String {
    if node.values.isEmpty {
        return "<\(node.id ?? "")>"
    }
    let head = node.id.map { "<\($0)>: " } ?? ""
    return "(\(head)\(node.values.map(issue316Render).joined(separator: " ")))"
}

private func parsesAs(_ source: String) throws -> String {
    try issue316Parser.parse(source).map(issue316Render).joined(separator: "\n")
}

private func q(_ count: Int) -> String { String(repeating: "'", count: count) }

private func timed<T>(_ read: () throws -> T) rethrows -> (result: T, elapsed: TimeInterval) {
    let started = Date()
    let result = try read()
    return (result, Date().timeIntervalSince(started))
}

// The shapes from the issue, and two that defeat shortcuts a fix could take.

private func wideQuoteOverALongRun(_ size: Int) -> String {
    let width = size / 4
    return "\(q(width + 1)) a \(q(width - 4)) \(String(repeating: "x", count: 2 * width))"
}

private func narrowingUnclosedQuotes(_ size: Int) -> String {
    var widths: [Int] = []
    var width = 2 * Int((Double(size / 2).squareRoot() / 2).rounded(.down)) + 1
    while width >= 1 {
        widths.append(width)
        width -= 2
    }
    let head = widths.map { "\(q($0))x" }.joined(separator: " ")
    return "\(head) \(String(repeating: "a' ", count: (size - head.utf16.count) / 3))"
}

private func closedWideQuoteOverQuotes(_ size: Int) -> String {
    let width = size / 8
    return q(width) + String(repeating: "\(q(width - 1))x", count: 6) + q(width)
}

private func unclosedWidthsOverAnEvenRun(_ size: Int) -> String {
    let run = size / 4
    var widths: [Int] = []
    var width = Int(Double(size).squareRoot().rounded(.down))
    while width >= 2 {
        if (run / width) % 2 == 0 { widths.append(width) }
        width -= 1
    }
    let head = widths.map { "\(q($0))x" }.joined(separator: " ")
    let tail = String(repeating: "a' ", count: (size - head.utf16.count - run) / 3)
    return "\(head) \(tail)\(q(run)) b"
}

private func expectParsedWithinBound(_ source: String, file: StaticString = #filePath, line: UInt = #line) throws {
    XCTAssertLessThan(
        try timed { try issue316Parser.parse(source) }.elapsed, issue316BoundSeconds, "parse", file: file, line: line)
    XCTAssertLessThan(
        timed { stripComments(source) }.elapsed, issue316BoundSeconds, "stripComments", file: file, line: line)
}

final class Issue316QuoteRunsTests: XCTestCase {
    func testARunInsideABodyIsReadAsEscapesThenAClosingRun() throws {
        XCTAssertEqual(try parsesAs("'''a'''"), "(<a>)")
        XCTAssertEqual(try parsesAs("'''a''''''b'''"), "(<a'''b>)")
        XCTAssertEqual(try parsesAs("''a'''"), "(<a'>)")
        XCTAssertEqual(try parsesAs("'a'''"), "(<a'>)")
        XCTAssertEqual(try parsesAs("\(q(3))a\(q(9)) b"), "(<a'''> <b>)")
        XCTAssertEqual(try parsesAs("\(q(50))a\(q(100))b\(q(50))"), "(<a\(q(50))b>)")
        XCTAssertEqual(try parsesAs("\"\"\"a\"\"b\"\"\""), "(<a\"\"b>)")
        XCTAssertEqual(try parsesAs("``a````b``"), "(<a``b>)")
    }

    func testARunThatNeverClosesTheReferenceLeavesItUnclosed() throws {
        // 7 / 3 rounds down to an even number: two escaped runs of three and one delimiter.
        XCTAssertEqual(try parsesAs("\(q(3))a\(q(7))"), "(<\(q(3))a\(q(7))>)")
        XCTAssertEqual(try parsesAs("\(q(5))a\(q(4))"), "(<\(q(5))a\(q(4))>)")
        XCTAssertEqual(try parsesAs("''a'''''"), "(<> <a'''''>)")
        XCTAssertEqual(try parsesAs("''''x a"), "(<> <x> <a>)")
    }

    // JS quotedReferenceEnd (comments.js) and DelimitedReferences.endAt are both
    // served by the internal DelimitedReferences.end(at:) in Swift.
    func testAReferenceCanOpenInsideARun() {
        // Comment stripping and the stream parser ask where a reference opened at
        // any delimiter ends, including one in the middle of a run.
        let cases: [(String, Int, Int?)] = [
            ("x'''a'''", 1, 8),
            ("x'''a''", 2, 7),
            ("x'''a'", 3, 6),
            ("'''a", 0, nil),
            ("''''a", 0, 4),
            ("a", 0, nil),
            ("'a'", 3, nil),
        ]
        for (document, start, end) in cases {
            let references = DelimitedReferences(Array(document.unicodeScalars))
            XCTAssertEqual(references.end(at: start), end, "\(document) at \(start)")
            XCTAssertEqual(references.read(at: start).map { start + $0.length }, end, "\(document) at \(start)")
        }
    }

    func testAReferenceThatOpensWithAWideRunIsReadInLinearTime() throws {
        let width = issue316Size / 4
        let source = wideQuoteOverALongRun(issue316Size)
        let (result, elapsed) = try timed { try issue316Parser.parse(source) }
        // The odd opening run never closes, so it is a plain reference; the even
        // run after `a` encloses nothing and is the empty reference.
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(
            result.first?.values.map(\.id), [q(width + 1), "a", "", String(repeating: "x", count: 2 * width)])
        XCTAssertLessThan(elapsed, issue316BoundSeconds)
    }

    func testWideQuoteOverALongRunIsParsedWithinTheTimeBound() throws {
        try expectParsedWithinBound(wideQuoteOverALongRun(issue316Size))
    }

    func testNarrowingUnclosedQuotesIsParsedWithinTheTimeBound() throws {
        try expectParsedWithinBound(narrowingUnclosedQuotes(issue316Size))
    }

    func testClosedWideQuoteOverQuotesIsParsedWithinTheTimeBound() throws {
        try expectParsedWithinBound(closedWideQuoteOverQuotes(issue316Size))
    }

    func testUnclosedWidthsOverAnEvenRunIsParsedWithinTheTimeBound() throws {
        try expectParsedWithinBound(unclosedWidthsOverAnEvenRun(issue316Size))
    }

    func testAStreamOfWideQuotesIsReadWithinTheTimeBound() throws {
        // The second line is what makes the stream ask whether the first is complete.
        let source = "\(closedWideQuoteOverQuotes(issue316Size))\nb"
        var links: [Link] = []
        let elapsed = try timed {
            let stream = StreamParser()
            stream.onLink { links.append($0) }
            try stream.write(source)
            try stream.end()
        }.elapsed
        XCTAssertEqual(links.count, 2)
        XCTAssertLessThan(elapsed, issue316BoundSeconds)
    }
}
