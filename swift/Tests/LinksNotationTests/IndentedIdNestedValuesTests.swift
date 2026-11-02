// Ported from js/tests/IndentedIdNestedValues.test.js.

import XCTest

@testable import LinksNotation

private let indentedIdNestedValuesCases: [(source: String, expected: String)] = [
    (
        "outer:\n  inner:\n    value1\n    value2\n  value3",
        "(outer: (inner: value1 value2) value3)"
    ),
    (
        "statement:\n  subject:\n    I\n  verb:\n    love\n  object:\n    you:\n      very\n      much",
        "(statement: (subject: I) (verb: love) (object: (you: very much)))"
    ),
    (
        "document:\n  (metadata: title author date)\n  content:\n    paragraph1\n    (paragraph2: text (with: nested structure))\n    paragraph3",
        "(document: (metadata: title author date) (content: paragraph1 (paragraph2: text (with: nested structure)) paragraph3))"
    ),
    (
        "image:\n    file: .gitpod.Dockerfile\n    context: ./docker-content",
        "(image: (file: .gitpod.Dockerfile) (context: ./docker-content))"
    ),
    (
        "level1:\n  level2:\n    level3a\n    level3b\n  level2b",
        "(level1: (level2: level3a level3b) level2b)"
    ),
    (
        "root:\n  child1\n  child2\n    grandchild",
        "(root: child1 (child2 grandchild))"
    ),
]

final class IndentedIdNestedValuesTests: XCTestCase {
    func testIndentedIDRetainsNestedValues() throws {
        for (source, expected) in indentedIdNestedValuesCases {
            let parser = Parser()
            XCTAssertEqual(formatLinks(try parser.parse(source)), expected, source)
            XCTAssertEqual(try parser.parse(source), try parser.parse(expected), source)
        }
    }
}
