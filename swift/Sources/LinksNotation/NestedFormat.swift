/// Write recursively nested lines in value order, without a final newline.
/// Read with `Parser.parseGroups`, appending children to their element's values.
/// `indent` must be nonempty spaces. Canonical `parse` keeps path semantics.
public func formatNested(_ links: [Link], indent: String = "  ") -> String {
    precondition(
        !indent.isEmpty && indent.allSatisfy { $0 == " " },
        "indent must contain only spaces and be nonempty")
    return links.flatMap { nestedLines($0, pad: "", indent: indent) }.joined(separator: "\n")
}

private func nestedAtom(_ link: Link) -> Bool { link.id != nil && link.values.isEmpty }
private func nestedCanNest(_ link: Link) -> Bool {
    !nestedAtom(link) && !(link.id == nil && link.values.count == 1 && !nestedAtom(link.values[0]))
}
private func nestedLineHolds(_ link: Link, _ count: Int) -> Bool {
    link.id != nil || count >= 2 || (count == 1 && nestedAtom(link.values[0]))
}
private func nestedLines(_ link: Link, pad: String, indent: String, underName: Bool = false) -> [String] {
    if !nestedLineHolds(link, link.values.count) || (underName && link.id == nil && link.values.count == 1) {
        return [pad + link.format()]
    }
    var count = link.values.count
    while count > 0 && nestedCanNest(link.values[count - 1]) { count -= 1 }
    while count < link.values.count && !nestedLineHolds(link, count) { count += 1 }
    var parts = link.values.prefix(count).map { nestedAtom($0) ? escapeReference($0.id) : $0.format() }
    if let id = link.id { parts.insert(escapeReference(id) + ":", at: 0) }
    return [pad + parts.joined(separator: " ")]
        + link.values.dropFirst(count).flatMap {
            nestedLines($0, pad: pad + indent, indent: indent, underName: underName || (link.id != nil && count == 0))
        }
}
