import XCTest

@testable import LinksNotation

/// Port of `js/tests/NestedSelfReference.test.js`.
final class NestedSelfReferenceTests: XCTestCase {
    func testNestedSelfReferencedObjectInPairValue() throws {
        // Test case from PARSER_BUG.md: a dict with two pairs, where the second
        // pair's value is itself a self-referenced dict definition
        // (obj_1: dict ...)
        let notation =
            "(obj_0: dict ((str bmFtZQ==) (str ZGljdDE=)) ((str b3RoZXI=) (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))))"

        let links = try Parser().parse(notation)

        // Should parse exactly one top-level link
        XCTAssertEqual(links.count, 1)

        let link = links[0]

        // Top-level link should have ID "obj_0"
        XCTAssertEqual(link.id, "obj_0")

        // Should have: type marker + 2 pairs = 3 values
        XCTAssertEqual(link.values.count, 3)

        // First value is the type marker "dict"
        XCTAssertEqual(link.values[0].id, "dict")

        // Second and third values are the two pairs
        let pair1 = link.values[1]
        let pair2 = link.values[2]

        // Pair 1: ((str bmFtZQ==) (str ZGljdDE=))
        XCTAssertNil(pair1.id)
        XCTAssertEqual(pair1.values.count, 2)

        // First element of pair1: (str bmFtZQ==)
        XCTAssertNil(pair1.values[0].id)
        XCTAssertEqual(pair1.values[0].values.count, 2)
        XCTAssertEqual(pair1.values[0].values[0].id, "str")
        XCTAssertEqual(pair1.values[0].values[1].id, "bmFtZQ==")

        // Second element of pair1: (str ZGljdDE=)
        XCTAssertNil(pair1.values[1].id)
        XCTAssertEqual(pair1.values[1].values.count, 2)
        XCTAssertEqual(pair1.values[1].values[0].id, "str")
        XCTAssertEqual(pair1.values[1].values[1].id, "ZGljdDE=")

        // Pair 2: ((str b3RoZXI=) (obj_1: dict ...))
        XCTAssertNil(pair2.id)
        XCTAssertEqual(pair2.values.count, 2)

        // First element of pair2: (str b3RoZXI=)
        XCTAssertNil(pair2.values[0].id)
        XCTAssertEqual(pair2.values[0].values.count, 2)
        XCTAssertEqual(pair2.values[0].values[0].id, "str")
        XCTAssertEqual(pair2.values[0].values[1].id, "b3RoZXI=")

        // Second element of pair2: obj_1 keeps its ID.
        let obj1 = pair2.values[1]
        XCTAssertEqual(obj1.id, "obj_1")
        XCTAssertFalse(obj1.values.isEmpty)
        XCTAssertEqual(obj1.values.count, 3)  // type marker + 2 pairs

        // obj_1's type marker
        XCTAssertEqual(obj1.values[0].id, "dict")

        // obj_1's first pair: ((str bmFtZQ==) (str ZGljdDI=))
        let obj1Pair1 = obj1.values[1]
        XCTAssertEqual(obj1Pair1.values.count, 2)
        XCTAssertEqual(obj1Pair1.values[0].values[0].id, "str")
        XCTAssertEqual(obj1Pair1.values[0].values[1].id, "bmFtZQ==")
        XCTAssertEqual(obj1Pair1.values[1].values[0].id, "str")
        XCTAssertEqual(obj1Pair1.values[1].values[1].id, "ZGljdDI=")

        // obj_1's second pair: ((str b3RoZXI=) obj_0) - reference back to obj_0
        let obj1Pair2 = obj1.values[2]
        XCTAssertEqual(obj1Pair2.values.count, 2)
        XCTAssertEqual(obj1Pair2.values[0].values[0].id, "str")
        XCTAssertEqual(obj1Pair2.values[0].values[1].id, "b3RoZXI=")
        XCTAssertEqual(obj1Pair2.values[1].id, "obj_0")  // Reference to obj_0
        XCTAssertEqual(obj1Pair2.values[1].values, [])  // Just a reference
    }

    func testSelfReferenceAsDirectChildWorksCorrectly() throws {
        let notation = "(obj_0: list (int 1) (int 2) (obj_1: list (int 3) (int 4) obj_0))"

        let links = try Parser().parse(notation)

        XCTAssertEqual(links.count, 1)
        XCTAssertEqual(links[0].id, "obj_0")
        XCTAssertEqual(links[0].values.count, 4)  // list + 1 + 2 + obj_1

        // The fourth value should be obj_1 with a self-reference
        let obj1 = links[0].values[3]
        XCTAssertEqual(obj1.id, "obj_1")
        XCTAssertEqual(obj1.values.count, 4)  // list + 3 + 4 + obj_0
        XCTAssertEqual(obj1.values[3].id, "obj_0")  // Reference back to obj_0
    }
}
