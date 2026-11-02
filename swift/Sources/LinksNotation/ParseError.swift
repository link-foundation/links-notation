/// Why a document could not be read.
public enum ParseError: Error, Equatable, Sendable {
    /// The document is not Links Notation. `line` and `column` count from 1,
    /// the column in UTF-16 code units, the way the JavaScript parser counts
    /// them. `message` is the message of the JavaScript parser, such as
    /// `Expected ":" but "x" found.` An invalid reference literal (`~1{zz}`)
    /// is reported this way too, with the message of
    /// `ReferenceLiteralError`.
    case syntax(line: Int, column: Int, message: String)
    /// Links nest deeper than the given `ParserOptions.maxDepth`.
    case depthExceeded(Int)
    /// The document is longer than the given `ParserOptions.maxInputSize`.
    case inputTooLarge(Int)
}

extension ParseError: CustomStringConvertible {
    /// What went wrong, in the words of the JavaScript parser.
    public var description: String {
        switch self {
        case .syntax(let line, let column, let message):
            return "Syntax error at line \(line), column \(column): \(message)"
        case .depthExceeded(let maxDepth):
            return "nesting depth exceeds the maximum of \(maxDepth)"
        case .inputTooLarge(let limit):
            return "Input size exceeds maximum allowed size of \(limit) bytes"
        }
    }
}

/// A `ParseError` and where in the document it happened, thrown by
/// `Parser.parseLocated(_:)`: the port of `ParseError` of the JavaScript
/// package (`js/src/ParseError.js`), which quotes the offending line with a
/// caret under the offending column.
///
/// `ParseError.depthExceeded` does not carry a position, but a diagnostic for
/// it does point at one, so this error carries it. Two located errors are
/// equal when they are the same error at the same line and column.
public struct LocatedParseError: Error, Equatable, Sendable {
    /// What went wrong.
    public let error: ParseError
    /// The line, counted from 1; `nil` for `ParseError.inputTooLarge`, which
    /// is refused before the document is read.
    public let line: Int?
    /// The column in UTF-16 code units, counted from 1; `nil` for
    /// `ParseError.inputTooLarge`.
    public let column: Int?
    /// How far into the document the offending position is, in UTF-16 code
    /// units; `nil` for `ParseError.inputTooLarge`.
    public let offset: Int?
    /// The character found instead of what the grammar expected, or `nil` at
    /// the end of the document and for errors that are not syntax errors.
    public let found: String?
    /// The offending line as written, without its line ending.
    public let lineText: String?
    /// The offending line with a caret under the offending column, cut down
    /// to a window of 80 characters around it when it is longer:
    ///
    ///     1 | (a b
    ///       |     ^
    public let snippet: String?

    public init(
        error: ParseError, line: Int?, column: Int?, offset: Int? = nil, found: String? = nil,
        lineText: String? = nil, snippet: String? = nil
    ) {
        self.error = error
        self.line = line
        self.column = column
        self.offset = offset
        self.found = found
        self.lineText = lineText
        self.snippet = snippet
    }

    /// The message of the JavaScript `ParseError`: the kind of error, where
    /// it happened and the snippet, such as
    ///
    ///     Syntax error at line 1, column 5: Expected ")" but end of input found.
    ///     1 | (a b
    ///       |     ^
    public var message: String {
        guard let line, let column else { return error.description }
        let kind: String
        let detail: String
        switch error {
        case .syntax(_, _, let message):
            kind = "Syntax error"
            detail = message
        case .depthExceeded:
            kind = "Nesting too deep"
            detail = error.description
        case .inputTooLarge:
            return error.description
        }
        let summary = "\(kind) at line \(line), column \(column): \(detail)"
        return snippet.map { "\(summary)\n\($0)" } ?? summary
    }

    /// The deepest nesting allowed when the document is nested deeper, and
    /// `nil` for any other error.
    public var maxDepth: Int? {
        if case .depthExceeded(let maxDepth) = error { return maxDepth }
        return nil
    }

    public static func == (lhs: LocatedParseError, rhs: LocatedParseError) -> Bool {
        lhs.error == rhs.error && lhs.line == rhs.line && lhs.column == rhs.column
    }
}

extension LocatedParseError: CustomStringConvertible {
    public var description: String { message }
}

/// The number of characters a quoted line is cut down to.
private let quotedLineWidth = 80
/// What a message writes in place of the part of a long line it left out.
private let ellipsis = "..."

/// The offending line with a caret under the offending column, quoted the
/// way a compiler quotes source (`quote` in `ParseError.js`).
func quoteLine(_ number: Int, _ lineText: String, column: Int) -> String {
    let (quoted, at) = windowAround(lineText, column: column)
    let gutter = String(repeating: " ", count: String(number).count)
    return "\(number) | \(quoted)\n\(gutter) | \(String(repeating: " ", count: max(0, at - 1)))^"
}

/// A line cut down to a window around the given column, in UTF-16 code
/// units as JavaScript counts them, and the column within that window.
private func windowAround(_ lineText: String, column: Int) -> (String, Int) {
    let units = Array(lineText.utf16)
    if units.count <= quotedLineWidth {
        return (lineText, column)
    }
    let target = column - 1
    let lastStart = units.count - quotedLineWidth
    let start = min(max(target - quotedLineWidth / 2, 0), lastStart)
    let end = start + quotedLineWidth
    let quoted =
        (start > 0 ? ellipsis : "") + String(decoding: units[start..<end], as: UTF16.self)
        + (end < units.count ? ellipsis : "")
    let shift = start > 0 ? ellipsis.count : 0
    return (quoted, target - start + shift + 1)
}
