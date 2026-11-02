/// A link: an optional identifier and the links it connects.
///
/// This is the Swift twin of `Link` in the JavaScript `links-notation`
/// package (`js/src/Link.js`): a link without values is a reference, and a
/// link without an identifier (`id == nil`) is anonymous.
public struct Link: Hashable, Sendable {
    /// The identifier, or `nil` for an anonymous link.
    public var id: String?
    /// The links this link connects, in order.
    public var values: [Link]

    /// The identifier exactly as the parsed document wrote it: `'1'` for a
    /// quoted `1`, `1` for a bare one, `~1{31}` for a reference literal.
    /// `nil` for a link without an identifier, a link built in code, a link
    /// made by combining the lines of an indented document, and every link
    /// read by a parser with `ParserOptions.syntax` turned off. It takes no
    /// part in `==` or in formatting.
    public var rawId: String?

    /// Whether the parser built this link by combining an indented line with
    /// the lines above it. The JavaScript parser marks such links
    /// (`_isFromPathCombination`) and formats their values in parentheses;
    /// the mark is not part of the link's identity, so `==` ignores it.
    var isFromPathCombination = false

    public init(id: String? = nil, values: [Link] = [], rawId: String? = nil) {
        self.id = id
        self.values = values
        self.rawId = rawId
    }

    /// The quote the identifier was written between: `'`, `"` or `` ` ``
    /// when it was quoted, and `nil` when it was bare, a reference literal,
    /// or not read from a document (see `rawId`). `1` and `'1'` stay equal
    /// links; this only says how each was written.
    public var quote: String? { referenceQuote(rawId) }

    /// Two links are equal when their identifiers and values are equal.
    public static func == (lhs: Link, rhs: Link) -> Bool {
        lhs.id == rhs.id && lhs.values == rhs.values
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
        hasher.combine(values)
    }

    /// The link with single-value containers unwrapped: a link with one
    /// value is that value, and a link with several values keeps its
    /// identifier and simplifies each of them.
    public func simplify() -> Link {
        switch values.count {
        case 0: return self
        case 1: return values[0]
        default: return Link(id: id, values: values.map { $0.simplify() })
        }
    }

    /// An anonymous link of this link and `other`.
    public func combine(_ other: Link) -> Link {
        Link(values: [self, other])
    }

    /// The values written one after another, as `getValuesString()` of the
    /// JavaScript package writes them.
    public var valuesString: String {
        values.map(\.linkOrIdString).joined(separator: " ")
    }

    /// The bare escaped identifier of a reference, and the formatted link
    /// otherwise (`toLinkOrIdString()` of the JavaScript package).
    public var linkOrIdString: String {
        values.isEmpty ? escapeReference(id) : format()
    }

    /// The link written as Links Notation, exactly as `Link.format()` of the
    /// JavaScript package writes it.
    /// - Parameter lessParentheses: Leave out the parentheses where the text
    ///   stays unambiguous (JavaScript `format(true)`).
    public func format(lessParentheses: Bool = false) -> String {
        format(lessParentheses, isCompoundValue: false)
    }

    /// The link written as Links Notation with the given options, as
    /// `Link.format(new FormatOptions(...))` of the JavaScript package
    /// writes it.
    public func format(options: FormatOptions) -> String {
        format(options, isCompoundValue: false)
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
                return formattedValues
            }
            return "(\(formattedValues))"
        }

        let escapedId = escapeReference(id)
        if values.isEmpty {
            if isCompoundValue {
                return "(\(escapedId))"
            }
            return lessParentheses && !Link.needsParentheses(id) ? escapedId : "(\(escapedId))"
        }
        let withColon = "\(escapedId): \(formattedValues)"
        return lessParentheses && !Link.needsParentheses(id) ? withColon : "(\(withColon))"
    }

    // `_formatWithOptions` of the JavaScript package.
    func format(_ options: FormatOptions, isCompoundValue: Bool) -> String {
        if id == nil && values.isEmpty {
            return options.lessParentheses ? "" : "()"
        }
        if values.isEmpty {
            let escapedId = escapeReference(id)
            if isCompoundValue {
                return "(\(escapedId))"
            }
            return options.lessParentheses && !Link.needsParentheses(id!) ? escapedId : "(\(escapedId))"
        }

        let inline = formattedValues
        var shouldIndent = options.shouldIndentByRefCount(values.count)
        if !shouldIndent {
            let testLine: String
            if let id {
                let idString = escapeReference(id)
                testLine = options.lessParentheses ? "\(idString): \(inline)" : "(\(idString): \(inline))"
            } else {
                testLine = options.lessParentheses ? inline : "(\(inline))"
            }
            shouldIndent = options.shouldIndentByLength(testLine)
        }
        if shouldIndent && !options.preferInline {
            return formatIndented(options)
        }

        guard let id else {
            if options.lessParentheses {
                if values.allSatisfy({ $0.values.isEmpty }) {
                    return values.map { escapeReference($0.id) }.joined(separator: " ")
                }
                return inline
            }
            return "(\(inline))"
        }
        let withColon = "\(escapeReference(id)): \(inline)"
        return options.lessParentheses && !Link.needsParentheses(id) ? withColon : "(\(withColon))"
    }

    // `_formatIndented` of the JavaScript package.
    private func formatIndented(_ options: FormatOptions) -> String {
        let lines = values.map { options.indentString + formatValue($0) }
        guard let id else {
            return lines.joined(separator: "\n")
        }
        return (["\(escapeReference(id)):"] + lines).joined(separator: "\n")
    }

    private var formattedValues: String {
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

/// The links written one per line with the given options; with
/// `FormatOptions.groupConsecutive`, consecutive links with the same
/// identifier are first merged into one.
public func formatLinks(_ links: [Link], options: FormatOptions) -> String {
    let linksToFormat = options.groupConsecutive ? groupConsecutiveLinks(links) : links
    return linksToFormat.map { $0.format(options: options) }.joined(separator: "\n")
}

/// Consecutive links with the same identifier and some values, merged into
/// one link holding all their values (`_groupConsecutiveLinks`).
func groupConsecutiveLinks(_ links: [Link]) -> [Link] {
    var grouped: [Link] = []
    var index = 0
    while index < links.count {
        let current = links[index]
        if current.id != nil && !current.values.isEmpty {
            var sameIdValues = current.values
            var next = index + 1
            while next < links.count, links[next].id == current.id, !links[next].values.isEmpty {
                sameIdValues += links[next].values
                next += 1
            }
            if next > index + 1 {
                grouped.append(Link(id: current.id, values: sameIdValues))
                index = next
                continue
            }
        }
        grouped.append(current)
        index += 1
    }
    return grouped
}
