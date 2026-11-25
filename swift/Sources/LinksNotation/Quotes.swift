// Delimited references and how far each one reaches: the port of
// `js/src/quotes.js`.
//
// A reference opened by a run of N delimiters (`"`, `'` or `` ` ``) closes at
// the next run of exactly N, and a run of 2N inside it is that delimiter
// escaped. An even run that encloses nothing substantive is the empty
// reference. A run of R delimiters in a body closes the reference exactly when
// `R / N` is odd; the last N of it close it and the rest is content.

/// What a delimited reference holds, how many scalars it takes and whether a
/// run of delimiters closes it. An even run nothing closes is the empty
/// reference, until a closing run is written after it, which turns it into one
/// holding what follows: a stream must wait for that run.
struct Reading: Equatable {
    var value: String
    var length: Int
    var closed = true
}

/// Every delimited reference of one document, read on demand and at most once.
final class DelimitedReferences {
    private let document: [Unicode.Scalar]
    private var runsByQuote: [Unicode.Scalar: DelimiterRuns] = [:]
    private var readings: [Int: Reading?] = [:]

    init(_ document: [Unicode.Scalar]) {
        self.document = document
    }

    /// The reference opened at `start`, or `nil` when nothing opens there.
    func read(at start: Int) -> Reading? {
        if let reading = readings[start] {
            return reading
        }
        let reading = computeReading(at: start)
        readings[start] = .some(reading)
        return reading
    }

    /// The position just past the reference opened at `start`.
    func end(at start: Int) -> Int? {
        read(at: start).map { start + $0.length }
    }

    private func computeReading(at start: Int) -> Reading? {
        guard start < document.count, quoteScalars.contains(document[start]) else { return nil }
        let quote = document[start]
        let runs = runsOf(quote)
        let opening = runs.index(of: start)
        let count = runs.end(opening) - start

        // The first run after the opening one that closes the reference.
        var closing = opening + 1
        while closing < runs.count {
            let length = runs.lengths[closing]
            if length < count {
                closing = runs.nextLonger[closing]
            } else if (length / count) % 2 == 1 {
                break
            } else {
                closing += 1
            }
        }
        let end = closing < runs.count ? runs.end(closing) : nil
        return reading(document, start: start, quote: quote, count: count, end: end)
    }

    private func runsOf(_ quote: Unicode.Scalar) -> DelimiterRuns {
        if let runs = runsByQuote[quote] {
            return runs
        }
        let runs = DelimiterRuns(document, quote: quote)
        runsByQuote[quote] = runs
        return runs
    }
}

/// The reading of a reference opened by `count` delimiters at `start`, closed
/// by the run that ends at `end` when there is one.
private func reading(
    _ document: [Unicode.Scalar], start: Int, quote: Unicode.Scalar, count: Int, end: Int?
) -> Reading? {
    if count % 2 == 0 && staysOnItsLine(document, bodyStart: start + count, end: end) {
        // A pair, or a longer even run, that ends its line (or is followed by
        // whitespace up to a line break before anything closes it) is the
        // empty reference however later lines continue (issue #443).
        return Reading(value: "", length: count)
    }
    let emptyReference = count % 2 == 0 ? Reading(value: "", length: count) : nil
    guard let end else {
        // Nothing closes the run: an even one is the empty reference, which a
        // later closing run would still turn into one holding what follows.
        return count % 2 == 0 ? Reading(value: "", length: count, closed: false) : nil
    }

    var value = String.UnicodeScalarView()
    var position = start + count
    while position < end {
        if document[position] != quote {
            value.append(document[position])
            position += 1
            continue
        }
        let length = runLength(document, from: position, quote: quote)
        let escaped = (length / (2 * count)) * count
        // The closing run is the last one of the body.
        let closes = position + length == end ? count : 0
        for _ in 0..<(length - escaped - closes) {
            value.append(quote)
        }
        position += length
    }

    if emptyReference != nil && !isSubstantiveBody(value) {
        return emptyReference
    }
    return Reading(value: String(value), length: end - start)
}

/// Whether an even run whose body starts at `bodyStart` has to be read as the
/// empty reference because its n-quoted reading would leave the line without
/// opening a multiline reference: whitespace follows the run directly, and a
/// line break comes before the closing run (or no run closes it at all).
private func staysOnItsLine(_ document: [Unicode.Scalar], bodyStart: Int, end: Int?) -> Bool {
    if bodyStart < document.count && !isWhitespace(document[bodyStart]) {
        return false
    }
    guard let end else { return true }
    return document[bodyStart..<end].contains { $0 == "\n" || $0 == "\r" }
}

/// A space, a tab or a line break: what may follow an even run that does not
/// open a multiline reference.
private func isWhitespace(_ scalar: Unicode.Scalar) -> Bool {
    scalar == " " || scalar == "\t" || scalar == "\n" || scalar == "\r"
}

private func runLength(_ text: [Unicode.Scalar], from start: Int, quote: Unicode.Scalar) -> Int {
    var end = start
    while end < text.count && text[end] == quote {
        end += 1
    }
    return end - start
}

/// The maximal runs of one delimiter in a document, in order, each linked to
/// the next run that is longer than it.
private struct DelimiterRuns {
    var starts: [Int] = []
    var lengths: [Int] = []
    var nextLonger: [Int] = []
    var count: Int { starts.count }

    init(_ document: [Unicode.Scalar], quote: Unicode.Scalar) {
        var position = 0
        while position < document.count {
            if document[position] == quote {
                let length = runLength(document, from: position, quote: quote)
                starts.append(position)
                lengths.append(length)
                position += length
            } else {
                position += 1
            }
        }

        nextLonger = Array(repeating: starts.count, count: starts.count)
        var longer: [Int] = []
        for run in stride(from: starts.count - 1, through: 0, by: -1) {
            while let last = longer.last, lengths[last] <= lengths[run] {
                longer.removeLast()
            }
            nextLonger[run] = longer.last ?? starts.count
            longer.append(run)
        }
    }

    func end(_ run: Int) -> Int { starts[run] + lengths[run] }

    /// The run that holds the given position of a delimiter.
    func index(of position: Int) -> Int {
        var low = 0
        var high = count - 1
        while low < high {
            let middle = (low + high + 1) / 2
            if starts[middle] <= position {
                low = middle
            } else {
                high = middle - 1
            }
        }
        return low
    }
}

/// Whether a body written between an even run of delimiters carries something
/// a pair of delimiters enclosing nothing cannot: at least one visible
/// character, and no parenthesis it straddles.
private func isSubstantiveBody(_ content: String.UnicodeScalarView) -> Bool {
    var depth = 0
    var hasVisible = false
    for scalar in content {
        if scalar == "(" {
            depth += 1
        } else if scalar == ")" {
            depth -= 1
            if depth < 0 {
                return false
            }
        }
        if !(scalar == " " || scalar == "\t" || scalar == "\n" || scalar == "\r") {
            hasVisible = true
        }
    }
    return hasVisible && depth == 0
}

/// Whether the `#` at `position` starts a comment: the port of `opensComment`
/// (`js/src/comments.js`). It has to open a token (start the document or
/// follow a space, a tab or a line break), and either only indentation stands
/// before it on its line or no character that could continue a bare reference
/// follows it: whitespace, the end of the document, `(`, `:` or `)`. So
/// `a: b # why` and `a: b #` hold a comment, while `tag #release` is the link
/// of `tag` and `#release` (issue #444). Whether the `#` stands inside a
/// delimited reference is up to the caller.
///
///     opensComment("# note", 0)        // true: the start of a line
///     opensComment("a # why", 2)       // true: a space follows it
///     opensComment("tag #release", 4)  // false: a value
///     opensComment("issue#1047", 5)    // false: inside a token
func opensComment(_ document: [Unicode.Scalar], _ position: Int) -> Bool {
    guard document[position] == "#" else { return false }
    if position > 0 && !isWhitespace(document[position - 1]) {
        return false
    }
    var before = position - 1
    while before >= 0 && (document[before] == " " || document[before] == "\t") {
        before -= 1
    }
    if before < 0 || document[before] == "\n" || document[before] == "\r" {
        return true
    }
    let next = position + 1
    return next >= document.count || tokenSeparators.contains(document[next])
}

/// The document with every comment blanked out: the port of `stripComments`
/// (`js/src/comments.js`). `#` starts a comment where `opensComment` says so,
/// outside delimited references. Every scalar of a comment becomes a space, so
/// positions do not move.
func stripComments(_ document: [Unicode.Scalar]) -> [Unicode.Scalar] {
    var blanked = document
    var position = 0
    let references = DelimitedReferences(document)
    // Whether a token may start at `position`. The document is read token by
    // token, as the grammar reads it, so a `#` inside a reference that starts
    // right after a group, another reference or a literal stays content
    // (issue #377).
    var tokenStart = true

    while position < document.count {
        let scalar = document[position]
        if scalar == "#" && opensComment(document, position) {
            while position < document.count && document[position] != "\n"
                && document[position] != "\r"
            {
                blanked[position] = " "
                position += 1
            }
            continue
        }
        if tokenSeparators.contains(scalar) {
            tokenStart = true
            position += 1
            continue
        }
        if tokenStart, let end = delimitedTokenEnd(document, position, references) {
            position = end
            continue
        }
        // Anything else is part of a bare reference, which runs to a separator.
        tokenStart = false
        position += 1
    }
    return blanked
}

/// What ends a bare reference. A token starts after one of these, at the
/// start of the document, and right after a delimited reference or a
/// versioned literal: the places the grammar reads a reference from.
let tokenSeparators: [Unicode.Scalar] = [" ", "\t", "\n", "\r", "(", ":", ")"]

/// `[^ \t\n\r(:)"'\`]`: what may start a bare reference, and so continue one
/// after a run of colons inside it (issue #444).
func isBareReferenceStart(_ scalar: Unicode.Scalar) -> Bool {
    !tokenSeparators.contains(scalar) && !quoteScalars.contains(scalar)
}

/// Where the versioned literal `~<digits>{<payload>}` that starts at `start`
/// ends, or `nil` when none starts there.
func referenceLiteralEnd(_ text: [Unicode.Scalar], _ start: Int) -> Int? {
    guard start < text.count, text[start] == "~" else { return nil }
    var index = start + 1
    while index < text.count && isDigit(text[index]) {
        index += 1
    }
    guard index > start + 1, index < text.count, text[index] == "{" else { return nil }
    index += 1
    while index < text.count && !"} \t\r\n()".unicodeScalars.contains(text[index]) {
        index += 1
    }
    return index < text.count && text[index] == "}" ? index + 1 : nil
}

/// Where the versioned literal or delimited reference that starts the token at
/// `start` ends, or `nil` when the token there is a bare reference: a
/// delimiter run that never closes is read as one, as the grammar reads it.
private func delimitedTokenEnd(
    _ document: [Unicode.Scalar], _ start: Int, _ references: DelimitedReferences
) -> Int? {
    if let literal = referenceLiteralEnd(document, start) {
        return literal
    }
    return quoteScalars.contains(document[start]) ? references.end(at: start) : nil
}

/// The document with every comment replaced by spaces of the same length, so
/// offsets, lines and columns stay the same: `stripComments` of the
/// JavaScript package. Outside quoted references, `#` starts a comment at
/// the start of a line, after any indentation, and later on a line after a
/// space or a tab when whitespace, the end of the document, `(`, `:` or `)`
/// follows it; otherwise it is an ordinary character (issue #444).
///
///     stripComments("a: b # why\n")    // "a: b      \n"
///     stripComments("tag #release\n")  // "tag #release\n"
///     stripComments("issue#1047\n")  // "issue#1047\n"
public func stripComments(_ document: String) -> String {
    var view = String.UnicodeScalarView()
    view.append(contentsOf: stripComments(Array(document.unicodeScalars)))
    return String(view)
}
