// How references are written and how reference literals are read: the port of
// `formatReference`, `encodeReferenceLiteral` and `decodeReferenceLiteral`
// (`js/src/ReferenceLiteral.js`) and of `escapeReference` (`js/src/references.js`).

/// The characters a reference can be written between.
let quoteScalars: [Unicode.Scalar] = ["'", "\"", "`"]

/// A reference written so that the parser reads it back unchanged: as is when
/// nothing in it means something else, between the shortest run of quotes
/// that encloses it otherwise, and as a version 1 reference literal
/// (`~1{<UTF-8 hex>}`) when it is empty or holds a control character.
/// `nil` (an anonymous link) is written as nothing.
///
/// With `minimal`, ordinary prose separated by single spaces stays as it is,
/// so a reference can be a plain line of an indented document
/// (`escapeReference(reference, { minimal: true })` of the JavaScript
/// package); otherwise it is quoted like a reference inside a link.
public func escapeReference(_ reference: String?, minimal: Bool = false) -> String {
    guard let text = reference else { return "" }
    let scalars = Array(text.unicodeScalars)
    if minimal && !scalars.isEmpty && !scalars.contains(where: isControl) {
        return escapeMinimally(text, scalars)
    }
    if scalars.isEmpty || scalars.contains(where: isControl) {
        return encodeReferenceLiteral(text)
    }
    let needsQuotes =
        scalars.first == "#"
        || hasReferenceLiteralPrefix(scalars, at: 0)
        || scalars.contains(where: { isWhiteSpace($0) || "():\"'`".unicodeScalars.contains($0) })
    if !needsQuotes {
        return text
    }

    var choice: (quote: Unicode.Scalar, count: Int)?
    for quote in quoteScalars where scalars.first != quote {
        var longest = 0
        var run = 0
        for scalar in scalars {
            run = scalar == quote ? run + 1 : 0
            longest = max(longest, run)
        }
        let count = (longest + 1) | 1
        if choice == nil || count < choice!.count {
            choice = (quote, count)
        }
    }
    let delimiter = String(repeating: String(Character(choice!.quote)), count: choice!.count)
    return delimiter + text + delimiter
}

/// Exact Unicode text as a version 1 reference literal: `~1{` followed by the
/// lowercase hexadecimal UTF-8 bytes of the text and `}`.
public func encodeReferenceLiteral(_ text: String) -> String {
    let digits = Array("0123456789abcdef")
    var hex = ""
    for byte in text.utf8 {
        hex.append(digits[Int(byte >> 4)])
        hex.append(digits[Int(byte & 0x0F)])
    }
    return "~1{\(hex)}"
}

/// Why a reference literal could not be read.
public struct ReferenceLiteralError: Error, Equatable, Sendable {
    public let message =
        "Invalid or unsupported reference literal (expected ~1{UTF-8 hex})"
}

/// The text a complete reference literal (`~1{<UTF-8 hex>}`) stands for.
/// - Throws: `ReferenceLiteralError` for any other version, an odd number or
///   a non-hexadecimal digit, or bytes that are not well-formed UTF-8.
public func decodeReferenceLiteral(_ literal: String) throws -> String {
    try decodeReferenceLiteral(Array(literal.unicodeScalars)[...])
}

func decodeReferenceLiteral(_ literal: ArraySlice<Unicode.Scalar>) throws -> String {
    let scalars = Array(literal)
    guard scalars.count >= 4, scalars[0] == "~", scalars[1] == "1", scalars[2] == "{",
        scalars[scalars.count - 1] == "}"
    else { throw ReferenceLiteralError() }
    let hex = scalars[3..<(scalars.count - 1)]
    guard hex.count % 2 == 0 else { throw ReferenceLiteralError() }

    var bytes: [UInt8] = []
    bytes.reserveCapacity(hex.count / 2)
    var high: UInt8?
    for scalar in hex {
        guard let digit = hexValue(scalar) else { throw ReferenceLiteralError() }
        if let first = high {
            bytes.append(first << 4 | digit)
            high = nil
        } else {
            high = digit
        }
    }

    // Decode strictly, as JavaScript's TextDecoder with `fatal: true` and
    // `ignoreBOM: true` does: reject malformed bytes, keep a byte order mark.
    var text = String.UnicodeScalarView()
    var iterator = bytes.makeIterator()
    var decoder = UTF8()
    while true {
        switch decoder.decode(&iterator) {
        case .scalarValue(let scalar): text.append(scalar)
        case .emptyInput: return String(text)
        case .error: throw ReferenceLiteralError()
        }
    }
}

/// Whether a reserved reference literal prefix (`~<digits>{`) starts at
/// `start`.
func hasReferenceLiteralPrefix(_ scalars: [Unicode.Scalar], at start: Int) -> Bool {
    guard start < scalars.count, scalars[start] == "~" else { return false }
    var position = start + 1
    while position < scalars.count, isDigit(scalars[position]) {
        position += 1
    }
    return position > start + 1 && position < scalars.count && scalars[position] == "{"
}

func isDigit(_ scalar: Unicode.Scalar) -> Bool {
    scalar.value >= 0x30 && scalar.value <= 0x39
}

private func hexValue(_ scalar: Unicode.Scalar) -> UInt8? {
    switch scalar.value {
    case 0x30...0x39: return UInt8(scalar.value - 0x30)
    case 0x41...0x46: return UInt8(scalar.value - 0x41 + 10)
    case 0x61...0x66: return UInt8(scalar.value - 0x61 + 10)
    default: return nil
    }
}

/// `[\u0000-\u001f\u007f]`
private func isControl(_ scalar: Unicode.Scalar) -> Bool {
    scalar.value <= 0x1F || scalar.value == 0x7F
}

/// `[\p{White_Space}﻿]`
private func isWhiteSpace(_ scalar: Unicode.Scalar) -> Bool {
    scalar.properties.isWhitespace || scalar.value == 0xFEFF
}

/// The minimal quoting of `escapeReference(_:minimal:)`: quote only text that
/// would not read back as one plain line, between single quotes unless the
/// text has more of them than double quotes, doubling the chosen quote inside.
private func escapeMinimally(_ text: String, _ scalars: [Unicode.Scalar]) -> String {
    var needsQuoting = false
    for (index, scalar) in scalars.enumerated() {
        let atWordStart = index == 0 || scalars[index - 1] == " "
        if atWordStart && hasReferenceLiteralPrefix(scalars, at: index) {
            needsQuoting = true  // (^| )~[0-9]+\{
        } else if ":()'\"`".unicodeScalars.contains(scalar) || (scalar != " " && isWhiteSpace(scalar)) {
            needsQuoting = true  // [:()'"`]|(?! )[\p{White_Space}\ufeff]
        } else if atWordStart && scalar == "#" {
            needsQuoting = true  // (^| )#
        } else if scalar == " " && (index == 0 || index == scalars.count - 1 || scalars[index + 1] == " ") {
            needsQuoting = true  // ^ | $| {2,}
        }
        if needsQuoting { break }
    }
    if !needsQuoting { return text }

    let singleQuotes = scalars.filter { $0 == "'" }.count
    let doubleQuotes = scalars.filter { $0 == "\"" }.count
    var quote: Unicode.Scalar = singleQuotes <= doubleQuotes ? "'" : "\""
    // The opening delimiter must be a run of exactly one quote. Choosing the
    // other wrapper keeps a leading content quote from extending that run.
    if scalars.first == quote { quote = quote == "'" ? "\"" : "'" }
    var result = String.UnicodeScalarView()
    result.append(quote)
    for scalar in scalars {
        result.append(scalar)
        if scalar == quote { result.append(quote) }
    }
    result.append(quote)
    return String(result)
}

/// Why `unescapeReference(_:)` could not read a reference.
public struct UnescapeReferenceError: Error, Equatable, Sendable {
    public let message: String
}

/// The text of one complete, escaped reference, read with the parser's rules:
/// a reference literal is decoded, a quoted reference loses its quotes, and
/// plain text is returned unchanged. Parsed link identifiers are already
/// decoded and should not be passed through this a second time.
/// - Throws: `ReferenceLiteralError` for an invalid reference literal, and
///   `UnescapeReferenceError` when a quoted reference does not span the text.
public func unescapeReference(_ reference: String) throws -> String {
    let scalars = Array(reference.unicodeScalars)
    if hasReferenceLiteralPrefix(scalars, at: 0) {
        return try decodeReferenceLiteral(reference)
    }
    guard let first = scalars.first, quoteScalars.contains(first) else { return reference }
    guard let reading = DelimitedReferences(scalars).read(at: 0), reading.length == scalars.count else {
        throw UnescapeReferenceError(message: "Expected one complete quoted reference")
    }
    return reading.value
}

/// The quote a reference was written between, read from the reference as it
/// was written: `'`, `"` or `` ` `` for a quoted reference (however many of
/// them open it), and `nil` for a bare reference, a reference literal, or no
/// text.
///
///     referenceQuote("'1'")        // "'"
///     referenceQuote("\"\"a b\"\"") // "\""
///     referenceQuote("1")          // nil
///     referenceQuote("'unclosed")  // nil: a bare reference that starts with '
public func referenceQuote(_ raw: String?) -> String? {
    guard let raw else { return nil }
    let scalars = Array(raw.unicodeScalars)
    guard let first = scalars.first, quoteScalars.contains(first),
        let reading = DelimitedReferences(scalars).read(at: 0), reading.length == scalars.count
    else { return nil }
    return String(Character(first))
}
