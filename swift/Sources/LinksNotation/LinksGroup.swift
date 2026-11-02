/// A line of a document with the lines indented below it, as
/// `Parser.parseGroups(_:)` reads them: the port of `LinksGroup`
/// (`js/src/LinksGroup.js`).
public struct LinksGroup: Hashable, Sendable {
    /// The link on the line.
    public var element: Link
    /// The groups of the lines indented directly below it.
    public var children: [LinksGroup]

    public init(_ element: Link, children: [LinksGroup] = []) {
        self.element = element
        self.children = children
    }

    /// The element followed by the elements of every group below it, depth
    /// first.
    public func toList() -> [Link] {
        var list: [Link] = []
        appendToList(&list)
        return list
    }

    private func appendToList(_ list: inout [Link]) {
        list.append(element)
        for child in children {
            child.appendToList(&list)
        }
    }
}

extension LinksGroup: CustomStringConvertible {
    /// Every link of `toList()` in parentheses: its identifier when it has a
    /// non-empty one, and the formatted link otherwise.
    public var description: String {
        toList().map { link in
            if let id = link.id, !id.isEmpty {
                return "(\(id))"
            }
            return "(\(link.format()))"
        }.joined(separator: " ")
    }
}
