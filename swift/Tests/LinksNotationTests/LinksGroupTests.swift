import XCTest

@testable import LinksNotation

/// Port of `js/tests/LinksGroup.test.js`. The JavaScript `LinksGroup` takes
/// links or groups as children and its tests compare by identity; the Swift
/// `LinksGroup` holds groups, so plain links are wrapped in `LinksGroup(_:)`
/// and compared by value.
final class LinksGroupTests: XCTestCase {
    func testLinksGroupConstructor() {
        let element = Link(id: "root")
        let children = [LinksGroup(Link(id: "child1")), LinksGroup(Link(id: "child2"))]
        let group = LinksGroup(element, children: children)

        XCTAssertEqual(group.element, element)
        XCTAssertEqual(group.children, children)
    }

    func testLinksGroupToListFlattensStructure() {
        let root = Link(id: "root")
        let child1 = Link(id: "child1")
        let child2 = Link(id: "child2")
        let grandchild = Link(id: "grandchild")

        let childGroup = LinksGroup(child2, children: [LinksGroup(grandchild)])
        let group = LinksGroup(root, children: [LinksGroup(child1), childGroup])

        let list = group.toList()
        XCTAssertEqual(list.count, 4)
        XCTAssertEqual(list[0], root)
        XCTAssertEqual(list[1], child1)
        XCTAssertEqual(list[2], child2)
        XCTAssertEqual(list[3], grandchild)
    }

    func testLinksGroupToString() {
        let element = Link(id: "root")
        let children = [LinksGroup(Link(id: "child1")), LinksGroup(Link(id: "child2"))]
        let group = LinksGroup(element, children: children)

        let str = group.description
        XCTAssertTrue(str.contains("(root)"), str)
        XCTAssertTrue(str.contains("(child1)"), str)
        XCTAssertTrue(str.contains("(child2)"), str)
    }

    func testLinksGroupConstructorEquivalentTest() {
        // Test creating a LinksGroup structure in an equivalent way
        let root = Link(id: "root")
        let children = [Link(id: "child1"), Link(id: "child2")]

        // Create a group with an id
        let group = LinksGroup(Link(id: "group"), children: [LinksGroup(root)] + children.map { LinksGroup($0) })

        XCTAssertEqual(group.element.id, "group")
        XCTAssertEqual(group.children.count, 3)
        XCTAssertEqual(group.children[0].element, root)
    }

    func testLinksGroupAppendToLinksListTest() {
        let element = Link(id: "root")
        let children = [Link(id: "child1"), Link(id: "child2")]
        let group = LinksGroup(element, children: children.map { LinksGroup($0) })

        // `_appendToList` is private in Swift; `toList()` is what it fills.
        let list = group.toList()

        XCTAssertEqual(list.count, 3)
        XCTAssertEqual(list[0], element)
        XCTAssertEqual(list[1], children[0])
        XCTAssertEqual(list[2], children[1])
    }
}
