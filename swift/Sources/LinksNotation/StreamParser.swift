// Incremental parsing of complete top-level records: the port of
// `js/src/StreamParser.js`.

/// The longest record a `StreamParser` buffers when nothing says otherwise,
/// in UTF-16 code units.
public let defaultMaxBufferSize = 10 * 1024 * 1024

/// How a `StreamParser` reads a stream.
public struct StreamParserOptions: Sendable, Equatable {
    /// How each record is parsed.
    public var parser: ParserOptions
    /// The longest record to buffer, in UTF-16 code units. `nil` means
    /// `parser.maxInputSize`, and `defaultMaxBufferSize` when that is `nil`
    /// too.
    public var maxBufferSize: Int?
    /// Whether the parser keeps every link it reads until `drain()` (and
    /// `end()` returns them all); without it, `end()` returns only the links
    /// it completed.
    public var collect: Bool

    public init(parser: ParserOptions = .init(), maxBufferSize: Int? = nil, collect: Bool = true) {
        self.parser = parser
        self.maxBufferSize = maxBufferSize
        self.collect = collect
    }
}

/// Where a `StreamParser` is: just after the last character written.
public struct StreamPosition: Equatable, Sendable {
    /// How many UTF-16 code units were written.
    public var offset: Int
    /// The line, counted from 1.
    public var line: Int
    /// The column, counted from 1, in UTF-16 code units.
    public var column: Int
    /// How many UTF-16 code units are buffered and not yet parsed.
    public var buffered: Int
}

/// An error raised while finishing a streamed document, with the position of
/// the `LocatedParseError` of the record translated back to the whole stream.
public struct StreamParseError: Error, Equatable, Sendable, CustomStringConvertible {
    /// The error of the record.
    public let cause: LocatedParseError
    /// How far into the stream the offending position is, in UTF-16 code
    /// units.
    public let offset: Int
    /// The line of the stream, counted from 1.
    public let line: Int
    /// The column, counted from 1, in UTF-16 code units.
    public let column: Int
    /// The character found instead of what the grammar expected, if any.
    public var found: String? { cause.found }
    /// The offending line as written.
    public var lineText: String { cause.lineText ?? "" }
    /// The offending line with a caret under the offending column.
    public var snippet: String { cause.snippet ?? "" }

    init(_ cause: LocatedParseError, segmentOffset: Int, segmentLine: Int) {
        self.cause = cause
        self.offset = segmentOffset + (cause.offset ?? 0)
        self.line = segmentLine + (cause.line ?? 1) - 1
        self.column = cause.column ?? 1
    }

    /// `Stream parse error at line L, column C: ` and the message of the
    /// record's error.
    public var message: String {
        "Stream parse error at line \(line), column \(column): \(cause.message)"
    }

    public var description: String { message }
}

/// Why a `StreamParser` refused a chunk.
public enum StreamParserError: Error, Equatable, Sendable, CustomStringConvertible {
    /// `write(_:)` or `end(_:)` was called with text after `end(_:)`.
    case writeAfterEnd
    /// A record grew longer than `StreamParserOptions.maxBufferSize`.
    case bufferOverflow(Int)

    public var description: String {
        switch self {
        case .writeAfterEnd: return "Cannot write after end()"
        case .bufferOverflow(let limit): return "Buffered record exceeds maximum size of \(limit) characters"
        }
    }
}

/// Incrementally parses complete top-level Links Notation records.
///
/// A line can acquire indented children, so its terminating newline alone
/// does not prove that the record is complete. The parser commits a buffered
/// record as soon as the first non-indented character of the next record
/// arrives. It uses `Parser` as the source of truth, which keeps quoted
/// references, nested groups, comments and future grammar changes in one
/// place.
///
///     let stream = StreamParser()
///     stream.onLink { print($0) }
///     try stream.write("a: b\nc")   // [a: b], once "c" starts the next record
///     try stream.end()              // every link, with collection on
public final class StreamParser {
    public let options: StreamParserOptions
    private let parser: Parser
    private let comments: Bool
    /// The longest record this parser buffers, in UTF-16 code units.
    public let maxBufferSize: Int

    private var buffer = String.UnicodeScalarView()
    private var bufferLength = 0
    private var currentLine = String.UnicodeScalarView()
    private var currentLineLength = 0
    private var baseIndentation: Int?
    private var lineClassified = false
    private var links: [Link] = []
    private var offset = 0
    private var line = 1
    private var column = 1
    private var segmentOffset = 0
    private var segmentLine = 1
    private var ended = false

    private var linkListeners: [(id: Int, handler: (Link) -> Void)] = []
    private var errorListeners: [(id: Int, handler: (Error) -> Void)] = []
    private var endListeners: [(id: Int, handler: ([Link]) -> Void)] = []
    private var nextListener = 0

    public init(options: StreamParserOptions = .init()) {
        self.options = options
        self.parser = Parser(options: options.parser)
        self.comments = options.parser.comments
        self.maxBufferSize = options.maxBufferSize ?? options.parser.maxInputSize ?? defaultMaxBufferSize
    }

    /// Whether `end(_:)` was called since the parser was created or reset.
    public var isEnded: Bool { ended }

    // MARK: Listeners

    /// A handle to remove a listener with `removeListener(_:)`.
    public struct Listener: Hashable, Sendable {
        fileprivate let id: Int
    }

    /// Calls `handler` with every link as soon as it is complete.
    @discardableResult
    public func onLink(_ handler: @escaping (Link) -> Void) -> Listener {
        nextListener += 1
        linkListeners.append((nextListener, handler))
        return Listener(id: nextListener)
    }

    /// Calls `handler` with every error before it is thrown.
    @discardableResult
    public func onError(_ handler: @escaping (Error) -> Void) -> Listener {
        nextListener += 1
        errorListeners.append((nextListener, handler))
        return Listener(id: nextListener)
    }

    /// Calls `handler` with what `end(_:)` returns when the stream ends.
    @discardableResult
    public func onEnd(_ handler: @escaping ([Link]) -> Void) -> Listener {
        nextListener += 1
        endListeners.append((nextListener, handler))
        return Listener(id: nextListener)
    }

    /// Stops calling the listener.
    public func removeListener(_ listener: Listener) {
        linkListeners.removeAll { $0.id == listener.id }
        errorListeners.removeAll { $0.id == listener.id }
        endListeners.removeAll { $0.id == listener.id }
    }

    // MARK: Reading

    /// Feeds a chunk and returns the links it made complete.
    /// - Throws: `StreamParserError`.
    @discardableResult
    public func write(_ chunk: String) throws -> [Link] {
        if ended {
            throw fail(StreamParserError.writeAfterEnd)
        }

        var emitted: [Link] = []
        for character in chunk.unicodeScalars {
            let width = character.utf16.count
            currentLine.append(character)
            currentLineLength += width
            offset += width

            if character == "\n" {
                buffer.append(contentsOf: currentLine)
                bufferLength += currentLineLength
                currentLine = String.UnicodeScalarView()
                currentLineLength = 0
                lineClassified = false
                line += 1
                column = 1
            } else {
                if !lineClassified && character != " " && character != "\t" && character != "\r" {
                    lineClassified = true
                    if !(comments && character == "#") {
                        startContentLine(leadingSpaces(currentLine), &emitted)
                    }
                }
                column += width
            }

            if bufferLength + currentLineLength > maxBufferSize {
                throw fail(StreamParserError.bufferOverflow(maxBufferSize))
            }
        }
        return emitted
    }

    /// Finishes the stream. With collection on (the default) it returns every
    /// link not yet drained; otherwise only the links this call completed.
    /// - Throws: `StreamParserError`, or `StreamParseError` when the last
    ///   record does not parse.
    @discardableResult
    public func end(_ chunk: String = "") throws -> [Link] {
        var emitted = chunk.isEmpty ? [] : try write(chunk)
        if ended {
            return options.collect ? links : emitted
        }

        var document = buffer
        document.append(contentsOf: currentLine)
        let text = String(document)
        if !document.isEmpty {
            let parsed: [Link]
            do {
                parsed = try parser.parseLocated(text)
            } catch let error as LocatedParseError {
                throw fail(StreamParseError(error, segmentOffset: segmentOffset, segmentLine: segmentLine))
            }
            publish(parsed, &emitted)
            advanceSegment(document, length: bufferLength + currentLineLength)
        }

        buffer = String.UnicodeScalarView()
        bufferLength = 0
        currentLine = String.UnicodeScalarView()
        currentLineLength = 0
        baseIndentation = nil
        ended = true
        let result = options.collect ? links : emitted
        for listener in endListeners { listener.handler(result) }
        return result
    }

    /// Returns and forgets the links kept since the previous drain.
    public func drain() -> [Link] {
        defer { links = [] }
        return links
    }

    /// Makes the parser ready for a new stream, keeping its listeners and
    /// options.
    @discardableResult
    public func reset() -> StreamParser {
        buffer = String.UnicodeScalarView()
        bufferLength = 0
        currentLine = String.UnicodeScalarView()
        currentLineLength = 0
        baseIndentation = nil
        lineClassified = false
        links = []
        offset = 0
        line = 1
        column = 1
        segmentOffset = 0
        segmentLine = 1
        ended = false
        return self
    }

    /// The position just after the last character written.
    public func position() -> StreamPosition {
        StreamPosition(offset: offset, line: line, column: column, buffered: bufferLength + currentLineLength)
    }

    /// The links of a sequence of chunks, read with collection off.
    public static func parse<Chunks: Sequence>(
        _ chunks: Chunks, options: StreamParserOptions = .init()
    ) throws -> [Link] where Chunks.Element == String {
        var options = options
        options.collect = false
        let parser = StreamParser(options: options)
        var links: [Link] = []
        for chunk in chunks {
            links += try parser.write(chunk)
        }
        return links + (try parser.end())
    }

    /// The links of an asynchronous sequence of chunks, each yielded as soon
    /// as it is complete.
    public static func parse<Chunks: AsyncSequence & Sendable>(
        _ chunks: Chunks, options: StreamParserOptions = .init()
    ) -> AsyncThrowingStream<Link, Error> where Chunks.Element == String {
        AsyncThrowingStream { continuation in
            let task = Task {
                var options = options
                options.collect = false
                let parser = StreamParser(options: options)
                do {
                    for try await chunk in chunks {
                        for link in try parser.write(chunk) { continuation.yield(link) }
                    }
                    for link in try parser.end() { continuation.yield(link) }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    // MARK: Records

    private func startContentLine(_ indentation: Int, _ emitted: inout [Link]) {
        if bufferLength > 0, let base = baseIndentation, indentation <= base,
            structurallyComplete(Array(buffer), comments: comments),
            let parsed = try? parser.parse(String(buffer))
        {
            publish(parsed, &emitted)
            advanceSegment(buffer, length: bufferLength)
            buffer = String.UnicodeScalarView()
            bufferLength = 0
            baseIndentation = nil
        }
        if baseIndentation == nil {
            baseIndentation = indentation
        }
    }

    private func publish(_ parsed: [Link], _ emitted: inout [Link]) {
        for link in parsed {
            emitted.append(link)
            if options.collect { links.append(link) }
            for listener in linkListeners { listener.handler(link) }
        }
    }

    private func advanceSegment(_ document: String.UnicodeScalarView, length: Int) {
        segmentOffset += length
        segmentLine += document.reduce(0) { $1 == "\n" ? $0 + 1 : $0 }
    }

    private func fail(_ error: Error) -> Error {
        for listener in errorListeners { listener.handler(error) }
        return error
    }
}

private func leadingSpaces(_ line: String.UnicodeScalarView) -> Int {
    line.prefix { $0 == " " }.count
}

/// Whether every quoted reference and every group of the buffered records is
/// closed, so they may be parsed.
private func structurallyComplete(_ document: [Unicode.Scalar], comments: Bool) -> Bool {
    // Tokens are read as the comment reader and the grammar read them: a
    // reference may start after a separator, and right after a delimited
    // reference or a literal (issue #377).
    let beforeComment: [Unicode.Scalar] = [" ", "\t", "\n", "\r"]
    let references = DelimitedReferences(document)
    var depth = 0
    var position = 0
    var tokenStart = true
    while position < document.count {
        let character = document[position]
        let previous: Unicode.Scalar? = position == 0 ? nil : document[position - 1]

        if comments && character == "#" && (previous.map { beforeComment.contains($0) } ?? true) {
            guard let newline = document[position...].firstIndex(of: "\n") else { return true }
            // The newline ends the comment and is read as a separator.
            position = newline
            continue
        }
        if tokenSeparators.contains(character) {
            if character == "(" { depth += 1 }
            if character == ")" { depth -= 1 }
            tokenStart = true
            position += 1
            continue
        }
        if tokenStart && quoteScalars.contains(character) {
            // A reference nothing closes yet may be closed by a later line,
            // which changes what it holds: an even run is the empty reference
            // only when no run in the whole document closes it.
            guard let reading = references.read(at: position), reading.closed else { return false }
            position += reading.length
            continue
        }
        if tokenStart, let end = referenceLiteralEnd(document, position) {
            position = end
            continue
        }
        tokenStart = false
        position += 1
    }
    return depth == 0
}
