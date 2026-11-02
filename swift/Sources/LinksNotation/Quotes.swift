// Delimited references and how far each one reaches: the port of
// `js/src/quotes.js`.
//
// A reference opened by a run of N delimiters (`"`, `'` or `` ` ``) closes at
// the next run of exactly N, and a run of 2N inside it is that delimiter
// escaped. An even run that encloses nothing substantive is the empty
// reference. A run of R delimiters in a body closes the reference exactly when
// `R / N` is odd; the last N of it close it and the rest is content.

/// What a delimited reference holds and how many scalars it takes.
struct Reading: Equatable {
    var value: String
    var length: Int
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
    let emptyReference = count % 2 == 0 ? Reading(value: "", length: count) : nil
    guard let end else { return emptyReference }

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

/// The document with every comment blanked out: the port of `stripComments`
/// (`js/src/comments.js`). `#` starts a comment at the start of the document
/// or after a space, a tab or a line break, outside delimited references.
/// Every scalar of a comment becomes a space, so positions do not move.
func stripComments(_ document: [Unicode.Scalar]) -> [Unicode.Scalar] {
    var blanked = document
    var position = 0
    let references = DelimitedReferences(document)
    let beforeReference: [Unicode.Scalar] = [" ", "\t", "\n", "\r", "(", ":"]
    let beforeComment: [Unicode.Scalar] = [" ", "\t", "\n", "\r"]

    func follows(_ allowed: [Unicode.Scalar]) -> Bool {
        position == 0 || allowed.contains(document[position - 1])
    }

    while position < document.count {
        let scalar = document[position]
        if quoteScalars.contains(scalar) && follows(beforeReference) {
            position = references.end(at: position) ?? position + 1
            continue
        }
        if scalar == "#" && follows(beforeComment) {
            while position < document.count && document[position] != "\n"
                && document[position] != "\r"
            {
                blanked[position] = " "
                position += 1
            }
            continue
        }
        position += 1
    }
    return blanked
}
