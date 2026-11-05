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
    /// When `false`, links are read as a bare abstract syntax tree: they do
    /// not record how their identifiers were written, so `Link.rawId` and
    /// `Link.quote` are `nil`.
    public var syntax = true

    public init(
        maxDepth: Int = defaultMaxDepth, maxInputSize: Int? = nil, comments: Bool = true, syntax: Bool = true
    ) {
        self.maxDepth = maxDepth
        self.maxInputSize = maxInputSize
        self.comments = comments
        self.syntax = syntax
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
        var links: [Link] = []
        for item in try rawItems(text) {
            collectLinks(item, parentPath: [], into: &links)
        }
        return links
    }

    /// The indentation tree of the document before it is expanded into path
    /// combinations: each group's element is the link on that line, and its
    /// children are the groups of the lines indented below it.
    /// Parenthesised values stay links.
    /// Indented ID elements have no values; single-reference leaves within
    /// their value subtree are references, agreeing with parse when folded.
    /// - Throws: `LocatedParseError`.
    public func parseGroups(_ text: String) throws -> [LinksGroup] {
        try rawItems(text).map { transformGroup($0) }
    }

    /// The document as a lossless concrete syntax tree: every character of
    /// the document, comments and whitespace included, belongs to exactly
    /// one token, so `parseCst(text).description == text`. The document is
    /// parsed first, so it is refused exactly when `parse(_:)` would refuse
    /// it.
    /// - Throws: `LocatedParseError`, or `CstError` (which a document that
    ///   parses never causes).
    public func parseCst(_ text: String) throws -> CstNode {
        _ = try rawItems(text)
        return try buildCst(text, comments: options.comments)
    }

    private func rawItems(_ text: String) throws -> [RawItem] {
        let limit = options.maxInputSize ?? defaultMaxInputSize
        if text.utf16.count > limit {
            throw LocatedParseError(error: .inputTooLarge(limit), line: nil, column: nil)
        }

        // Comments are blanked rather than removed, so a position in the
        // prepared document is the same position in the document as written.
        let scalars = Array(text.unicodeScalars)
        let prepared = options.comments ? stripComments(scalars) : scalars
        do {
            return try Grammar(prepared, source: scalars, maxDepth: options.maxDepth).parse()
        } catch let failure as GrammarFailure {
            throw locate(failure, in: scalars, prepared: prepared)
        }
    }

    private func transformGroup(_ item: RawItem, indentedValue: Bool = false) -> LinksGroup {
        let children = item.children ?? []
        // Keep containers with descendants, and read leaf values in the same
        // context as transformIndentedValue when folding an indented ID.
        let childValues = indentedValue || (item.id != nil && (item.values ?? []).isEmpty)
        return LinksGroup(
            indentedValue && children.isEmpty ? transformIndentedValue(item) : transformLink(item),
            children: children.map { transformGroup($0, indentedValue: childValues) })
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
            let link = withRawId(Link(id: item.id, values: children.map(transformIndentedValue)), item)
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
            return withRawId(Link(id: item.id, values: children.map(transformIndentedValue)), item)
        }

        let current = transformLink(item)
        if !children.isEmpty {
            return withRawId(
                Link(id: current.id, values: current.values + children.map(transformIndentedValue)), item)
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
            return withRawId(Link(id: item.id, values: values.map(transformLink)), item)
        }
        return withRawId(Link(id: item.id), item)
    }

    /// The link with the identifier as the item wrote it, unless the parser
    /// reads a bare abstract syntax tree (`_withRawId`).
    private func withRawId(_ link: Link, _ item: RawItem) -> Link {
        guard options.syntax, link.id != nil, let rawId = item.rawId else { return link }
        var link = link
        link.rawId = rawId
        return link
    }

    // MARK: - Errors

    /// The public error for a grammar failure, with the line and column
    /// counted as `ParseError.js` counts them: CR, LF and CRLF end a line, and
    /// columns are UTF-16 code units, both in the document as written.
    private func locate(
        _ failure: GrammarFailure, in scalars: [Unicode.Scalar], prepared: [Unicode.Scalar]
    ) -> LocatedParseError {
        let offset: Int
        let error: ParseError
        var found: String?
        switch failure {
        case .depthExceeded(let at, let maxDepth):
            offset = at
            error = .depthExceeded(maxDepth)
        case .syntax(let at, let message):
            offset = at
            error = .syntax(line: 0, column: 0, message: message)
            if at < prepared.count {
                found = String(Character(prepared[at]))
            }
        case .invalidLiteral(let at, let message):
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

        // The offending line, without its line ending.
        var lineStart = end
        while lineStart > 0 && scalars[lineStart - 1] != "\n" && scalars[lineStart - 1] != "\r" {
            lineStart -= 1
        }
        var lineEnd = end
        while lineEnd < scalars.count && scalars[lineEnd] != "\n" && scalars[lineEnd] != "\r" {
            lineEnd += 1
        }
        var lineText = String.UnicodeScalarView()
        lineText.append(contentsOf: scalars[lineStart..<lineEnd])
        let text = String(lineText)
        let utf16Offset = scalars[..<end].reduce(0) { $0 + $1.utf16.count }

        var located = error
        if case .syntax(_, _, let message) = error {
            located = .syntax(line: line, column: column, message: message)
        }
        return LocatedParseError(
            error: located, line: line, column: column, offset: utf16Offset, found: found, lineText: text,
            snippet: quoteLine(line, text, column: column))
    }
}
