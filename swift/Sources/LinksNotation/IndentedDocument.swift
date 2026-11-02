// Text parents with immediate text children: the port of
// `js/src/IndentedDocument.js`.

/// What a parent of an indented document holds.
public enum IndentedValue: Hashable, Sendable {
    /// Exactly one child, or several joined with `\n` under
    /// `IndentedDocumentOptions.MultipleValues.join`.
    case text(String)
    /// No children, or several under `.array`.
    case list([String])

    /// The children: one for `.text`, all of them for `.list`.
    public var values: [String] {
        switch self {
        case .text(let text): return [text]
        case .list(let list): return list
        }
    }
}

/// The parents of an indented document in document order, each with its
/// children: the ordered `Map` that the JavaScript package uses.
public struct IndentedDocument: Hashable, Sendable, Sequence, ExpressibleByDictionaryLiteral {
    public struct Entry: Hashable, Sendable {
        public var parent: String
        public var value: IndentedValue

        public init(parent: String, value: IndentedValue) {
            self.parent = parent
            self.value = value
        }
    }

    public private(set) var entries: [Entry]

    public init(_ entries: [Entry] = []) {
        self.entries = []
        for entry in entries { self[entry.parent] = entry.value }
    }

    public init(dictionaryLiteral elements: (String, IndentedValue)...) {
        self.init(elements.map { Entry(parent: $0.0, value: $0.1) })
    }

    /// The parents in document order.
    public var parents: [String] { entries.map(\.parent) }

    public var count: Int { entries.count }
    public var isEmpty: Bool { entries.isEmpty }

    /// The value of a parent; setting keeps the position of an existing
    /// parent, as `Map.set` does, and setting `nil` removes it.
    public subscript(parent: String) -> IndentedValue? {
        get { entries.first { $0.parent == parent }?.value }
        set {
            let index = entries.firstIndex { $0.parent == parent }
            switch (index, newValue) {
            case (let index?, let value?): entries[index].value = value
            case (let index?, nil): entries.remove(at: index)
            case (nil, let value?): entries.append(Entry(parent: parent, value: value))
            case (nil, nil): break
            }
        }
    }

    public func makeIterator() -> IndexingIterator<[Entry]> {
        entries.makeIterator()
    }
}

/// How `parseIndentedDocument` reads a document.
public struct IndentedDocumentOptions: Sendable, Equatable {
    /// What a parent with several children holds.
    public enum MultipleValues: String, Sendable {
        /// `IndentedValue.list` of the children.
        case array
        /// `IndentedValue.text` of the children joined with `\n`.
        case join
    }

    public var parser: ParserOptions
    public var multipleValues: MultipleValues

    public init(parser: ParserOptions = .init(), multipleValues: MultipleValues = .array) {
        self.parser = parser
        self.multipleValues = multipleValues
    }
}

/// Why a document is not an indented text document.
public enum IndentedDocumentError: Error, Equatable, Sendable, CustomStringConvertible {
    /// A line is a named link or holds nested values.
    case notText
    /// A child has children of its own.
    case nestedChildren

    public var description: String {
        switch self {
        case .notText: return "Indented document lines must contain only text references"
        case .nestedChildren: return "Indented documents support only immediate children"
        }
    }
}

/// A text line is a single reference or a flat list of words.
private func lineText(_ link: Link) throws -> String {
    if let id = link.id, link.values.isEmpty { return id }
    if link.id == nil, !link.values.isEmpty, link.values.allSatisfy({ $0.id != nil && $0.values.isEmpty }) {
        return link.values.compactMap(\.id).joined(separator: " ")
    }
    throw IndentedDocumentError.notText
}

/// Reads text parents and their immediate text children. Repeated parents
/// accumulate children in document order. No children yields an empty
/// `.list`, one yields `.text`, and several yield `.list` (or `.text` of the
/// joined children with `.join`).
///
///     try parseIndentedDocument("colors\n  red\n  green\n")
///     // ["colors": .list(["red", "green"])]
/// - Throws: `LocatedParseError` or `IndentedDocumentError`.
public func parseIndentedDocument(
    _ input: String, options: IndentedDocumentOptions = .init()
) throws -> IndentedDocument {
    let groups = try Parser(options: options.parser).parseGroups(input)
    var parents: [String] = []
    var collected: [String: [String]] = [:]
    for group in groups {
        let parent = try lineText(group.element)
        if collected[parent] == nil {
            parents.append(parent)
            collected[parent] = []
        }
        for child in group.children {
            if !child.children.isEmpty { throw IndentedDocumentError.nestedChildren }
            collected[parent]!.append(try lineText(child.element))
        }
    }
    return IndentedDocument(
        parents.map { parent in
            let values = collected[parent]!
            let value: IndentedValue
            if values.count == 1 {
                value = .text(values[0])
            } else if values.count > 1 && options.multipleValues == .join {
                value = .text(values.joined(separator: "\n"))
            } else {
                value = .list(values)
            }
            return IndentedDocument.Entry(parent: parent, value: value)
        })
}

/// Writes text parents with minimal quoting and their children indented by
/// two spaces. A multiline `.text` is one reference; the entries of a `.list`
/// are separate children. Output that is not empty ends with a newline.
public func formatIndentedDocument(_ document: IndentedDocument) -> String {
    var lines: [String] = []
    for entry in document {
        lines.append(escapeReference(entry.parent, minimal: true))
        for child in entry.value.values {
            lines.append("  " + escapeReference(child, minimal: true))
        }
    }
    return lines.isEmpty ? "" : lines.joined(separator: "\n") + "\n"
}
