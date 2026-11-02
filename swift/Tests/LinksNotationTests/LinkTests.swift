import XCTest

@testable import LinksNotation

final class LinkTests: XCTestCase {
    func testLinkConstructorWithIdOnly() {
        let link = Link(id: "test")
        XCTAssertEqual(link.id, "test")
        XCTAssertEqual(link.values, [])
    }

    func testLinkConstructorWithIdAndValues() {
        let link = Link(id: "parent", values: [Link(id: "child1"), Link(id: "child2")])
        XCTAssertEqual(link.id, "parent")
        XCTAssertEqual(link.values.count, 2)
        XCTAssertEqual(link.values[0].id, "child1")
        XCTAssertEqual(link.values[1].id, "child2")
    }

    // JS toString() is Swift's description.
    func testLinkToStringWithIdOnly() {
        let link = Link(id: "test")
        XCTAssertEqual(link.description, "(test)")
    }

    func testLinkToStringWithValuesOnly() {
        let link = Link(id: nil, values: [Link(id: "value1"), Link(id: "value2")])
        XCTAssertEqual(link.description, "(value1 value2)")
    }

    func testLinkToStringWithIdAndValues() {
        let link = Link(id: "parent", values: [Link(id: "child1"), Link(id: "child2")])
        XCTAssertEqual(link.description, "(parent: child1 child2)")
    }

    // JS static Link.escapeReference is the free function escapeReference in Swift.
    func testLinkEscapeReferenceSimple() {
        XCTAssertEqual(escapeReference("simple"), "simple")
    }

    func testLinkEscapeReferenceWithSpecialCharacters() {
        XCTAssertEqual(escapeReference("has:colon"), "'has:colon'")
        XCTAssertEqual(escapeReference("has space"), "'has space'")
        XCTAssertEqual(escapeReference("has(paren)"), "'has(paren)'")
        XCTAssertEqual(escapeReference("has\"quote"), "'has\"quote'")
        XCTAssertEqual(escapeReference("has'quote"), "\"has'quote\"")
    }

    func testLinkSimplify() {
        let link = Link(id: nil, values: [Link(id: "single")])
        let simplified = link.simplify()
        XCTAssertEqual(simplified.id, "single")
        XCTAssertEqual(simplified.values, [])
    }

    func testLinkCombine() {
        let link1 = Link(id: "first")
        let link2 = Link(id: "second")
        let combined = link1.combine(link2)
        XCTAssertNil(combined.id)
        XCTAssertEqual(combined.values.count, 2)
        XCTAssertEqual(combined.values[0].id, "first")
        XCTAssertEqual(combined.values[1].id, "second")
    }

    // JS equals() is Swift's ==.
    func testLinkEquals() {
        let link1 = Link(id: "test", values: [Link(id: "child")])
        let link2 = Link(id: "test", values: [Link(id: "child")])
        let link3 = Link(id: "different", values: [Link(id: "child")])

        XCTAssertTrue(link1 == link2)
        XCTAssertFalse(link1 == link3)
    }
}
