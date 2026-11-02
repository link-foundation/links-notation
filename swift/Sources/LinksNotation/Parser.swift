/// How deep links may nest when nothing says otherwise: `DEFAULT_MAX_DEPTH`
/// of the JavaScript package, the same in every Links Notation
/// implementation.
public let defaultMaxDepth = 64

/// The longest document the parser reads when nothing says otherwise, in
/// UTF-16 code units: the 10 MiB default of the JavaScript parser.
public let defaultMaxInputSize = 10 * 1024 * 1024

/// How a `Parser` reads documents.
public struct ParserOptions: Sendable, Equatable {
    /// How deep links may nest: every parenthesised group and every
    /// indentation level is one level.
    public var maxDepth = defaultMaxDepth
    /// The longest document to read, in UTF-16 code units (the measure of the
    /// JavaScript parser). `nil` means `defaultMaxInputSize`.
    public var maxInputSize: Int? = nil
    /// When `false`, `#` is an ordinary character instead of the start of a
    /// comment.
    public var comments = true

    public init(maxDepth: Int = defaultMaxDepth, maxInputSize: Int? = nil, comments: Bool = true) {
        self.maxDepth = maxDepth
        self.maxInputSize = maxInputSize
        self.comments = comments
    }
}

/// Reads Links Notation documents into links, exactly as `Parser.parse` of
/// the JavaScript `links-notation` package does.
public struct Parser: Sendable {
    public var options: ParserOptions

    public init(options: ParserOptions = .init()) {
        self.options = options
    }

    /// The links of the document.
    /// - Throws: `ParseError`.
    public func parse(_ text: String) throws -> [Link] {
        do {
            return try parseLocated(text)
        } catch let located as LocatedParseError {
            throw located.error
        }
    }

    /// The links of the document, like `parse(_:)`, but a failure says where
    /// in the document it happened.
    /// - Throws: `LocatedParseError`.
    public func parseLocated(_ text: String) throws -> [Link] {
        let limit = options.maxInputSize ?? defaultMaxInputSize
        if text.utf16.count > limit {
            throw LocatedParseError(error: .inputTooLarge(limit), line: nil, column: nil)
        }

        let scalars = Array(text.unicodeScalars)
        let prepared = options.comments ? stripComments(scalars) : scalars
        let items: [RawItem]
        do {
            items = try Grammar(prepared, maxDepth: options.maxDepth).parse()
        } catch let failure as GrammarFailure {
            throw locate(failure, in: scalars)
        }

        var links: [Link] = []
        for item in items {
            collectLinks(item, parentPath: [], into: &links)
        }
        return links
    }

    // MARK: - Shaping the raw items (transformResult and friends in Parser.js)

    private func collectLinks(_ item: RawItem, parentPath: [Link], into result: inout [Link]) {
        let children = item.children ?? []
        guard !children.isEmpty else {
            result.append(combine(parentPath, transformLink(item)))
            return
        }

        // An ID with no values whose children become its values (indented ID).
        if item.id != nil && (item.values ?? []).isEmpty {
            let link = Link(id: item.id, values: children.map(transformIndentedValue))
            result.append(combine(parentPath, link))
            return
        }

        let current = transformLink(item)
        result.append(combine(parentPath, current))
        let path = parentPath + [current]
        for child in children {
            collectLinks(child, parentPath: path, into: &result)
        }
    }

    /// A line below an indented ID is a value in its own right. Bare single
    /// references unwrap, but named links and descendants keep their
    /// structure.
    private func transformIndentedValue(_ item: RawItem) -> Link {
        let children = item.children ?? []
        if !children.isEmpty && item.id != nil && (item.values ?? []).isEmpty {
            return Link(id: item.id, values: children.map(transformIndentedValue))
        }

        let current = transformLink(item)
        if !children.isEmpty {
            return Link(id: current.id, values: current.values + children.map(transformIndentedValue))
        }
        if item.id == nil && item.nested == nil && current.values.count == 1 {
            return current.values[0]
        }
        return current
    }

    private func combine(_ path: [Link], _ current: Link) -> Link {
        guard let last = path.last else { return current }
        let parent = path.count == 1 ? last : combine(Array(path.dropLast()), last)
        var combined = Link(id: nil, values: [parent, current])
        combined.isFromPathCombination = true
        return combined
    }

    /// A parenthesised group: a single link is used as is, several links
    /// become the values of one anonymous link, and a group that holds just
    /// another group keeps it, so `((a b))` stays distinct from `(a b)`.
    private func transformNested(_ nested: [RawItem]) -> Link {
        var links: [Link] = []
        for item in nested {
            collectLinks(item, parentPath: [], into: &links)
        }
        let wrapsSingleGroup = nested.count == 1 && nested[0].nested != nil
        if links.count == 1 && !wrapsSingleGroup {
            return links[0]
        }
        return Link(id: nil, values: links)
    }

    private func transformLink(_ item: RawItem) -> Link {
        if let nested = item.nested {
            return transformNested(nested)
        }
        if let values = item.values {
            return Link(id: item.id, values: values.map(transformLink))
        }
        return Link(id: item.id)
    }

    // MARK: - Errors

    /// The public error for a grammar failure, with the line and column
    /// counted as `ParseError.js` counts them: CR, LF and CRLF end a line, and
    /// columns are UTF-16 code units, both in the document as written.
    private func locate(_ failure: GrammarFailure, in scalars: [Unicode.Scalar]) -> LocatedParseError {
        let offset: Int
        let error: ParseError
        switch failure {
        case .depthExceeded(let at, let maxDepth):
            offset = at
            error = .depthExceeded(maxDepth)
        case .syntax(let at, let message), .invalidLiteral(let at, let message):
            offset = at
            error = .syntax(line: 0, column: 0, message: message)
        }

        var line = 1
        var column = 1
        var index = 0
        let end = min(offset, scalars.count)
        while index < end {
            let scalar = scalars[index]
            if scalar == "\r" {
                line += 1
                column = 1
                if index + 1 < end && scalars[index + 1] == "\n" {
                    index += 1
                }
            } else if scalar == "\n" {
                line += 1
                column = 1
            } else {
                column += scalar.utf16.count
            }
            index += 1
        }

        if case .syntax(_, _, let message) = error {
            return LocatedParseError(
                error: .syntax(line: line, column: column, message: message), line: line, column: column)
        }
        return LocatedParseError(error: error, line: line, column: column)
    }
}
