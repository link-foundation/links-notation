/// Why a document could not be read.
public enum ParseError: Error, Equatable, Sendable {
    /// The document is not Links Notation. `line` and `column` count from 1,
    /// the column in UTF-16 code units, the way the JavaScript parser counts
    /// them. `message` is the message of the JavaScript parser, such as
    /// `Expected ":" but "x" found.`
    case syntax(line: Int, column: Int, message: String)
    /// Links nest deeper than the given `ParserOptions.maxDepth`.
    case depthExceeded(Int)
    /// The document is longer than the given `ParserOptions.maxInputSize`.
    case inputTooLarge(Int)
}

/// A `ParseError` and where in the document it happened, thrown by
/// `Parser.parseLocated(_:)`.
///
/// `ParseError.depthExceeded` does not carry a position, but a diagnostic for
/// it does point at one (`docs/spec/limits.md`), so this error carries it.
public struct LocatedParseError: Error, Equatable, Sendable {
    /// What went wrong.
    public let error: ParseError
    /// The line, counted from 1; `nil` for `ParseError.inputTooLarge`, which
    /// is refused before the document is read.
    public let line: Int?
    /// The column in UTF-16 code units, counted from 1; `nil` for
    /// `ParseError.inputTooLarge`.
    public let column: Int?

    public init(error: ParseError, line: Int?, column: Int?) {
        self.error = error
        self.line = line
        self.column = column
    }
}
