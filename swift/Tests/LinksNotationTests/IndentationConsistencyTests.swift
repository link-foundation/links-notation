import XCTest

@testable import LinksNotation

/// Port of `js/tests/IndentationConsistency.test.js` (issue #135).
final class IndentationConsistencyTests: XCTestCase {
    private let parser = Parser()

    func testLeadingSpacesVsNoLeadingSpaces() throws {
        // Example with 2 leading spaces (from issue #135)
        let withLeading = """
              TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
              TELEGRAM_ALLOWED_CHATS:
                -1002975819706
                -1002861722681
              TELEGRAM_HIVE_OVERRIDES:
                --all-issues
                --once
              TELEGRAM_BOT_VERBOSE: true
            """

        // Example without leading spaces (from issue #135)
        let withoutLeading = """
            TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
            TELEGRAM_ALLOWED_CHATS:
              -1002975819706
              -1002861722681
            TELEGRAM_HIVE_OVERRIDES:
              --all-issues
              --once
            TELEGRAM_BOT_VERBOSE: true
            """

        XCTAssertTrue(withLeading.hasPrefix("  TELEGRAM_BOT_TOKEN"))
        let resultWith = try parser.parse(withLeading)
        let resultWithout = try parser.parse(withoutLeading)

        // Compare the entire formatted output (complete round trip test)
        XCTAssertEqual(formatLinks(resultWith), formatLinks(resultWithout))
    }

    func testTwoSpacesVsFourSpacesIndentation() throws {
        // Example with 2 spaces per level
        let twoSpaces = """
            TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
            TELEGRAM_ALLOWED_CHATS:
              -1002975819706
              -1002861722681
            TELEGRAM_HIVE_OVERRIDES:
              --all-issues
              --once
              --auto-fork
              --skip-issues-with-prs
              --attach-logs
              --verbose
              --no-tool-check
            TELEGRAM_SOLVE_OVERRIDES:
              --auto-fork
              --auto-continue
              --attach-logs
              --verbose
              --no-tool-check
            TELEGRAM_BOT_VERBOSE: true
            """

        // Example with 4 spaces per level
        let fourSpaces = """
            TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
            TELEGRAM_ALLOWED_CHATS:
                -1002975819706
                -1002861722681
            TELEGRAM_HIVE_OVERRIDES:
                --all-issues
                --once
                --auto-fork
                --skip-issues-with-prs
                --attach-logs
                --verbose
                --no-tool-check
            TELEGRAM_SOLVE_OVERRIDES:
                --auto-fork
                --auto-continue
                --attach-logs
                --verbose
                --no-tool-check
            TELEGRAM_BOT_VERBOSE: true
            """

        let resultTwo = try parser.parse(twoSpaces)
        let resultFour = try parser.parse(fourSpaces)

        // Compare the entire formatted output (complete round trip test)
        XCTAssertEqual(formatLinks(resultTwo), formatLinks(resultFour))
    }

    func testSimpleTwoVsFourSpacesIndentation() throws {
        // Simple example with 2 spaces
        let twoSpaces = "parent:\n  child1\n  child2"

        // Simple example with 4 spaces
        let fourSpaces = "parent:\n    child1\n    child2"

        let resultTwo = try parser.parse(twoSpaces)
        let resultFour = try parser.parse(fourSpaces)

        // Compare the entire formatted output (complete round trip test)
        XCTAssertEqual(formatLinks(resultTwo), formatLinks(resultFour))
    }

    func testThreeLevelNestingWithDifferentIndentation() throws {
        // Three levels with 2 spaces
        let twoSpaces = "level1:\n  level2:\n    level3a\n    level3b\n  level2b"

        // Three levels with 4 spaces
        let fourSpaces = "level1:\n    level2:\n        level3a\n        level3b\n    level2b"

        let resultTwo = try parser.parse(twoSpaces)
        let resultFour = try parser.parse(fourSpaces)

        // Compare the entire formatted output (complete round trip test)
        XCTAssertEqual(formatLinks(resultTwo), formatLinks(resultFour))
    }
}
