import Foundation
import XCTest

@testable import LinksNotation

/// Port of `js/tests/NestingDepth.test.js`: reading nested groups must take
/// time that grows with the size of the document, not with two to the power
/// of its nesting depth (issue #314). Each case is parsed on its own thread
/// (the JavaScript worker `support/nestingDepthWorker.js`) and fails when it
/// has not finished within the budget, so a regression fails instead of
/// hanging.
final class NestingDepthTests: XCTestCase {
    /// What the worker answers: the formatted links, or the name of the error.
    private enum Outcome: Equatable {
        case formatted(String)
        case error(String)
    }

    /// Where the worker thread leaves its answer.
    private final class Mailbox: @unchecked Sendable {
        let done = DispatchSemaphore(value: 0)
        var outcome: Outcome?
    }

    // Generous enough for a slow machine, and far below what the exponential
    // reading took at the depths used here.
    private static let budget: TimeInterval = 5 * timeScale

    // The depth used for the shapes that used to take exponential time.
    private static let deep = 32

    // A depth that shows the time grows with the size of the document.
    private static let veryDeep = 256

    /// Parses `source` on a thread with a large stack, as the worker does,
    /// and fails when it does not finish within the budget. A thread that
    /// overruns is left behind.
    private func withinBudget(
        _ what: String, _ source: String, file: StaticString = #filePath, line: UInt = #line
    ) -> Outcome? {
        let mailbox = Mailbox()
        let thread = Thread {
            // The documents nest deeper than the default limit on purpose
            // (`maxDepth: Infinity` in the worker); only time is measured.
            let parser = Parser(options: ParserOptions(maxDepth: Int.max))
            do {
                mailbox.outcome = .formatted(formatLinks(try parser.parse(source)))
            } catch {
                mailbox.outcome = .error(String(describing: type(of: error)))
            }
            mailbox.done.signal()
        }
        // Deep nesting recurses deeply; give it room so only time is measured.
        thread.stackSize = 256 << 20
        thread.start()
        guard mailbox.done.wait(timeout: .now() + NestingDepthTests.budget) == .success else {
            XCTFail("\(what) did not finish within \(Int(NestingDepthTests.budget * 1000)) ms", file: file, line: line)
            return nil
        }
        return mailbox.outcome
    }

    private func closed(_ depth: Int) -> String {
        String(repeating: "(", count: depth) + "a" + String(repeating: ")", count: depth)
    }

    private func valueAfter(_ depth: Int) -> String {
        String(repeating: "(", count: depth) + "a" + String(repeating: ") b", count: depth)
    }

    private func unclosed(_ depth: Int) -> String {
        String(repeating: "(", count: depth) + "a"
    }

    // Unclosed groups on lines that are each indented one space deeper.
    private func indentedUnclosed(_ depth: Int) -> String {
        (0..<depth).map { String(repeating: " ", count: $0) + "(a" }.joined(separator: "\n")
    }

    func testClosedGroupsReadInLinearTime() {
        let source = closed(NestingDepthTests.deep)
        XCTAssertEqual(withinBudget("closed groups", source), .formatted(source))
    }

    func testValuesAfterGroupsReadInLinearTime() {
        let source = valueAfter(NestingDepthTests.deep)
        XCTAssertEqual(withinBudget("values after groups", source), .formatted("(\(source))"))
    }

    func testUnclosedGroupsFailInLinearTime() {
        let result = withinBudget("unclosed groups", unclosed(NestingDepthTests.deep))
        XCTAssertEqual(result, .error("ParseError"))
    }

    func testUnclosedGroupsOnIndentedLinesFailInLinearTime() {
        let result = withinBudget("unclosed indented groups", indentedUnclosed(NestingDepthTests.deep))
        XCTAssertEqual(result, .error("ParseError"))
    }

    func testValuesAfterVeryDeepGroupsReadInLinearTime() {
        let source = valueAfter(NestingDepthTests.veryDeep)
        XCTAssertEqual(withinBudget("very deep values after groups", source), .formatted("(\(source))"))
    }

    func testGroupFollowedByValuesKeepsItsStructure() throws {
        let cases = [
            ("(a) b", "((a) b)"),
            ("(a) (b) c", "((a) (b) c)"),
            ("((a) b) c", "(((a) b) c)"),
            ("(a: b) c", "((a: b) c)"),
            ("(a)\n(b) c", "(a)\n((b) c)"),
            ("x\n  (a) b\n  (c)", "(x)\n((x) ((a) b))\n((x) (c))"),
        ]
        let parser = Parser()
        for (source, expected) in cases {
            XCTAssertEqual(formatLinks(try parser.parse(source)), expected, source)
        }
    }
}
