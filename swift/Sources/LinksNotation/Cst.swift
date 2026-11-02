// The concrete syntax tree of a Links Notation document: the port of
// `js/src/Cst.js`.
//
// Every character of a document belongs to exactly one token, so the text of
// the tree is the document itself, comments, blank lines, indentation, quotes
// and line endings included. A document is a list of `line` nodes; a line
// holds the tokens up to and including its line ending, and a parenthesised
// `group` node holds its own parentheses and the lines written between them.
// A group is part of the line it opens on, however many lines it spans.

/// The kinds of nodes and tokens of a concrete syntax tree.
public enum CstKind: String, Sendable, CaseIterable {
    /// The whole document: its lines.
    case document
    /// One line: its tokens and groups, up to and including its line ending.
    case line
    /// A parenthesised group: `(`, the lines inside it, and `)`.
    case group
    /// A run of spaces and tabs.
    case whitespace
    /// One line ending: `\n`, `\r\n` or `\r`.
    case newline
    /// A comment, from `#` up to the line ending.
    case comment
    /// `(`
    case openParen = "open_paren"
    /// `)`
    case closeParen = "close_paren"
    /// `:`
    case colon
    /// A bare, quoted or reference literal reference.
    case reference

    /// Whether nodes of this kind have children rather than text.
    public var isNode: Bool { self == .document || self == .line || self == .group }
}

/// One node or token of a concrete syntax tree.
public struct CstNode: Hashable, Sendable {
    /// What this node or token is.
    public var kind: CstKind
    /// The children of a node, in document order; empty for a token.
    public var children: [CstNode]
    /// What a reference token means, its delimiters and escapes resolved
    /// (the identifier a parsed link has); `nil` for every other node and
    /// token.
    public var value: String?
    /// The quote a quoted reference token was written between (`'`, `"` or
    /// `` ` ``); `nil` for a bare or literal reference and every other kind.
    public var quote: String?
    private var tokenText: String

    public init(
        _ kind: CstKind, text: String = "", children: [CstNode] = [], value: String? = nil, quote: String? = nil
    ) {
        self.kind = kind
        self.children = children
        self.value = value
        self.quote = quote
        self.tokenText = text
    }

    /// Whether this is a token rather than a node with children.
    public var isToken: Bool { !kind.isNode }

    /// The exact text this node or token was read from.
    public var text: String {
        isToken ? tokenText : children.map(\.text).joined()
    }

    /// Every token of this subtree, in document order.
    public func tokens() -> [CstNode] {
        isToken ? [self] : children.flatMap { $0.tokens() }
    }

    /// The tree as an S-expression: `(kind child ...)` for a node and
    /// `kind:"text"` for a token, the text escaped as a JSON string escapes
    /// `\`, `"`, line feeds, carriage returns and tabs. Two trees are the
    /// same exactly when their S-expressions are.
    ///
    ///     try Parser().parseCst("a '1'").toSExpression()
    ///     // (document (line reference:"a" whitespace:" " reference:"'1'"))
    public func toSExpression() -> String {
        if isToken {
            return "\(kind.rawValue):\(quoteText(tokenText))"
        }
        return "(" + ([kind.rawValue] + children.map { $0.toSExpression() }).joined(separator: " ") + ")"
    }
}

extension CstNode: CustomStringConvertible {
    /// The exact text this node or token was read from.
    public var description: String { text }
}

/// Why a concrete syntax tree could not be built: unbalanced parentheses,
/// which a document that parses never has.
public struct CstError: Error, Equatable, Sendable, CustomStringConvertible {
    public let message: String
    public var description: String { message }
}

private func quoteText(_ text: String) -> String {
    var result = "\""
    for scalar in text.unicodeScalars {
        switch scalar {
        case "\\": result += "\\\\"
        case "\"": result += "\\\""
        case "\n": result += "\\n"
        case "\r": result += "\\r"
        case "\t": result += "\\t"
        default: result.unicodeScalars.append(scalar)
        }
    }
    return result + "\""
}

/// The concrete syntax tree of a document that has already been parsed.
func buildCst(_ input: String, comments: Bool = true) throws -> CstNode {
    let source = Array(input.unicodeScalars)
    // Bare references end where they end in the document the grammar reads:
    // the one with its comments blanked, which keeps every position of the one
    // written. Delimited references and literals are read, as the grammar
    // reads them, in the document as written, so a comment never changes what
    // a reference holds (issue #377).
    let prepared = comments ? stripComments(source) : source
    let references = DelimitedReferences(source)

    // The open containers, innermost last, each with the line being filled.
    var containers: [(node: CstNode, line: CstNode?)] = [(CstNode(.document), nil)]

    func closeLine(_ index: Int) {
        if let line = containers[index].line {
            containers[index].node.children.append(line)
            containers[index].line = nil
        }
    }
    func add(_ token: CstNode) {
        let last = containers.count - 1
        if containers[last].line == nil {
            containers[last].line = CstNode(.line)
        }
        containers[last].line!.children.append(token)
    }
    func slice(_ start: Int, _ end: Int) -> String {
        var text = String.UnicodeScalarView()
        text.append(contentsOf: source[start..<end])
        return String(text)
    }
    func utf16Offset(_ position: Int) -> Int {
        source[..<position].reduce(0) { $0 + $1.utf16.count }
    }

    var position = 0
    while position < source.count {
        let character = source[position]
        var end = position + 1

        if comments && character == "#" && prepared[position] != "#" {
            // A blanked `#` opens a comment, which runs to the line ending.
            while end < source.count && source[end] != "\n" && source[end] != "\r" {
                end += 1
            }
            add(CstNode(.comment, text: slice(position, end)))
        } else if character == "\r" || character == "\n" {
            if character == "\r" && end < source.count && source[end] == "\n" {
                end += 1
            }
            add(CstNode(.newline, text: slice(position, end)))
            closeLine(containers.count - 1)
        } else if character == " " || character == "\t" {
            while end < source.count && (source[end] == " " || source[end] == "\t") {
                end += 1
            }
            add(CstNode(.whitespace, text: slice(position, end)))
        } else if character == "(" {
            // The group is added to its line when it closes.
            containers.append((CstNode(.group, children: [CstNode(.openParen, text: "(")]), nil))
        } else if character == ")" {
            guard containers.count > 1 else {
                throw CstError(message: "Unbalanced \")\" at offset \(utf16Offset(position))")
            }
            closeLine(containers.count - 1)
            var group = containers.removeLast().node
            group.children.append(CstNode(.closeParen, text: ")"))
            add(group)
        } else if character == ":" {
            add(CstNode(.colon, text: ":"))
        } else {
            end = referenceEnd(source, prepared, position, references)
            let text = slice(position, end)
            let quoted = quoteScalars.contains(character) ? references.read(at: position) : nil
            let value: String
            if let quoted {
                value = quoted.value
            } else if character == "~" && referenceLiteralEnd(source, position) == end {
                value = try decodeReferenceLiteral(text)
            } else {
                value = text
            }
            add(CstNode(.reference, text: text, value: value, quote: quoted.map { _ in String(Character(character)) }))
        }
        position = end
    }

    guard containers.count == 1 else {
        throw CstError(message: "Unbalanced \"(\" at the end of the document")
    }
    closeLine(0)
    return containers[0].node
}

/// Where the reference that starts at `start` ends, read as the grammar
/// reads it: a literal or a delimited reference in the document as written,
/// a bare reference in the one with its comments blanked.
private func referenceEnd(
    _ source: [Unicode.Scalar], _ prepared: [Unicode.Scalar], _ start: Int, _ references: DelimitedReferences
) -> Int {
    if let literal = referenceLiteralEnd(source, start) {
        return literal
    }
    if quoteScalars.contains(source[start]), let end = references.end(at: start) {
        return end
    }
    var end = start + 1
    while end < prepared.count && !" \t\r\n(:)".unicodeScalars.contains(prepared[end]) {
        end += 1
    }
    return end
}
