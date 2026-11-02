/// A link: an optional identifier and the links it connects.
///
/// This is the Swift twin of `Link` in the JavaScript `links-notation`
/// package (`js/src/Link.js`): a link without values is a reference, and a
/// link without an identifier (`id == nil`) is anonymous.
public struct Link: Equatable, Sendable {
    /// The identifier, or `nil` for an anonymous link.
    public var id: String?
    /// The links this link connects, in order.
    public var values: [Link]

    /// Whether the parser built this link by combining an indented line with
    /// the lines above it. The JavaScript parser marks such links
    /// (`_isFromPathCombination`) and formats their values in parentheses;
    /// the mark is not part of the link's identity, so `==` ignores it.
    var isFromPathCombination = false

    public init(id: String? = nil, values: [Link] = []) {
        self.id = id
        self.values = values
    }

    /// Two links are equal when their identifiers and values are equal.
    public static func == (lhs: Link, rhs: Link) -> Bool {
        lhs.id == rhs.id && lhs.values == rhs.values
    }

    /// The link written as Links Notation, exactly as `Link.format()` of the
    /// JavaScript package writes it.
    /// - Parameter lessParentheses: Leave out the parentheses where the text
    ///   stays unambiguous (JavaScript `format(true)`).
    public func format(lessParentheses: Bool = false) -> String {
        format(lessParentheses, isCompoundValue: false)
    }

    func format(_ lessParentheses: Bool, isCompoundValue: Bool) -> String {
        guard let id else {
            if values.isEmpty {
                return lessParentheses ? "" : "()"
            }
            if lessParentheses {
                if values.allSatisfy({ $0.values.isEmpty }) {
                    return values.map { escapeReference($0.id) }.joined(separator: " ")
                }
                return valuesString
            }
            return "(\(valuesString))"
        }

        let escapedId = escapeReference(id)
        if values.isEmpty {
            if isCompoundValue {
                return "(\(escapedId))"
            }
            return lessParentheses && !Link.needsParentheses(id) ? escapedId : "(\(escapedId))"
        }
        let withColon = "\(escapedId): \(valuesString)"
        return lessParentheses && !Link.needsParentheses(id) ? withColon : "(\(withColon))"
    }

    private var valuesString: String {
        values.map(formatValue).joined(separator: " ")
    }

    private func formatValue(_ value: Link) -> String {
        if isFromPathCombination {
            return value.format(false, isCompoundValue: true)
        }
        if value.values.isEmpty {
            return escapeReference(value.id)
        }
        return value.format(false, isCompoundValue: false)
    }

    private static func needsParentheses(_ text: String) -> Bool {
        text.unicodeScalars.contains { $0 == " " || $0 == ":" || $0 == "(" || $0 == ")" }
    }
}

extension Link: CustomStringConvertible {
    public var description: String { format() }
}

/// The links written one per line, as `formatLinks` of the JavaScript
/// package writes them.
/// - Parameters:
///   - links: The links to write.
///   - lessParentheses: Leave out the parentheses where the text stays
///     unambiguous.
public func formatLinks(_ links: [Link], lessParentheses: Bool = false) -> String {
    links.map { $0.format(lessParentheses: lessParentheses) }.joined(separator: "\n")
}
