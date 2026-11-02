/// How `Link.format(options:)` and `formatLinks(_:options:)` write links: the
/// port of `FormatOptions` (`js/src/FormatOptions.js`).
public struct FormatOptions: Sendable, Equatable {
    /// Leave out the parentheses where the text stays unambiguous.
    public var lessParentheses: Bool
    /// The longest line, in UTF-16 code units, before `indentLongLines` breaks
    /// a link over several lines.
    public var maxLineLength: Int
    /// Write a link whose line is longer than `maxLineLength` indented.
    public var indentLongLines: Bool
    /// The most values a link writes on one line; `nil` means no limit.
    public var maxInlineRefs: Int?
    /// Merge consecutive links with the same identifier into one link.
    public var groupConsecutive: Bool
    /// What one level of indentation is written as.
    public var indentString: String
    /// Keep links on one line even past the thresholds above; set it to
    /// `false` to let the thresholds indent links.
    public var preferInline: Bool

    public init(
        lessParentheses: Bool = false,
        maxLineLength: Int = 80,
        indentLongLines: Bool = false,
        maxInlineRefs: Int? = nil,
        groupConsecutive: Bool = false,
        indentString: String = "  ",
        preferInline: Bool = true
    ) {
        self.lessParentheses = lessParentheses
        self.maxLineLength = maxLineLength
        self.indentLongLines = indentLongLines
        self.maxInlineRefs = maxInlineRefs
        self.groupConsecutive = groupConsecutive
        self.indentString = indentString
        self.preferInline = preferInline
    }

    /// Whether a line is long enough to be indented: only with
    /// `indentLongLines`, and then when it is longer than `maxLineLength`
    /// UTF-16 code units.
    public func shouldIndentByLength(_ line: String) -> Bool {
        indentLongLines && line.utf16.count > maxLineLength
    }

    /// Whether a link with `count` values has too many of them for one line.
    public func shouldIndentByRefCount(_ count: Int) -> Bool {
        guard let maxInlineRefs else { return false }
        return count > maxInlineRefs
    }
}

/// The name the Python and JavaScript packages also export `FormatOptions`
/// under.
public typealias FormatConfig = FormatOptions
