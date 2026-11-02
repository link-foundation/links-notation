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
public func escapeReference(_ reference: String?) -> String {
    guard let text = reference else { return "" }
    let scalars = Array(text.unicodeScalars)
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
