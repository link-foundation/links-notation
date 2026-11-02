// A hand-written port of the Peggy grammar `js/src/grammar.pegjs` of the
// JavaScript `links-notation` package, rule by rule.
//
// Each rule below is the rule of the same name in the grammar and reads the
// same way: ordered choice with backtracking, predicates and actions that run
// as soon as their part of a rule matches (actions are never undone, as in
// Peggy), and the same bookkeeping of the furthest position where a terminal
// failed, so a syntax error is reported at the same place and with the same
// message as the JavaScript parser reports it.

/// What a rule of the grammar returns: the raw items the grammar actions of
/// the JavaScript parser build (`{id}`, `{id, values}`, `{values}`,
/// `{nested}`, with `children` added for indented lines).
struct RawItem {
    var id: String?
    var values: [RawItem]?
    var nested: [RawItem]?
    var children: [RawItem]?
}

/// Why the grammar stopped, with positions as scalar offsets into the
/// document.
enum GrammarFailure: Error {
    case syntax(offset: Int, message: String)
    case depthExceeded(offset: Int, maxDepth: Int)
    case invalidLiteral(offset: Int, message: String)
}

/// The expectations the grammar records, described the way Peggy describes
/// them in a syntax error message.
private enum Expect {
    static let spaceOrTab = "[ \\t]"
    static let lineBreak = "[\\r\\n]"
    static let anyCharacter = "any character"
    static let openParen = "\"(\""
    static let closeParen = "\")\""
    static let colon = "\":\""
    static let tilde = "\"~\""
    static let digit = "[0-9]"
    static let openBrace = "\"{\""
    static let literalSymbol = "[^} \\t\\r\\n()]"
    static let closeBrace = "\"}\""
    static let space = "\" \""
    static let whiteSpace = "[ \\t\\n\\r]"
    static let referenceSymbol = "[^ \\t\\n\\r(:)]"
}

final class Grammar {
    private let input: [Unicode.Scalar]
    private let maxDepth: Int
    private var position = 0

    private var indentationStack = [0]
    private var baseIndentation: Int?
    private var contextStack: [(indentationStack: [Int], baseIndentation: Int?, depth: Int)] = []
    private var contextDepth = 0
    private var unreadableLines = Set<Int>()
    private let references: DelimitedReferences

    private var maxFailPosition = 0
    private var maxFailExpected: [String] = []
    private var silentFails = 0

    init(_ input: [Unicode.Scalar], maxDepth: Int) {
        self.input = input
        self.maxDepth = maxDepth
        self.references = DelimitedReferences(input)
    }

    /// The raw items of the document.
    func parse() throws -> [RawItem] {
        if let items = try document() {
            return items
        }
        throw GrammarFailure.syntax(offset: maxFailPosition, message: syntaxMessage())
    }

    // MARK: - Grammar state (the initializer block of grammar.pegjs)

    private func resetState() {
        indentationStack = [0]
        baseIndentation = nil
        contextStack = []
        contextDepth = 0
        unreadableLines = []
    }

    private func lineKey(_ at: Int) -> Int {
        contextStack.isEmpty ? at : -1 - at
    }

    private func enterNestedContext() {
        contextStack.append((indentationStack, baseIndentation, contextDepth))
        contextDepth = depth() + 1
        indentationStack = [0]
        baseIndentation = nil
    }

    private func exitNestedContext() {
        if let saved = contextStack.popLast() {
            indentationStack = saved.indentationStack
            baseIndentation = saved.baseIndentation
            contextDepth = saved.depth
        }
    }

    private func depth() -> Int {
        contextDepth + indentationStack.count - 1
    }

    private func checkDepth(_ levels: Int, at start: Int) throws {
        if levels > maxDepth {
            throw GrammarFailure.depthExceeded(offset: start, maxDepth: maxDepth)
        }
    }

    private func normalizeIndentation(_ spaces: Int) -> Int {
        guard let base = baseIndentation else { return spaces }
        return max(0, spaces - base)
    }

    // MARK: - Terminals

    private var atEnd: Bool { position >= input.count }

    private func fail(_ expected: String) {
        guard silentFails == 0, position >= maxFailPosition else { return }
        if position > maxFailPosition {
            maxFailPosition = position
            maxFailExpected = []
        }
        maxFailExpected.append(expected)
    }

    private func match(_ expected: String, _ test: (Unicode.Scalar) -> Bool) -> Bool {
        if !atEnd && test(input[position]) {
            position += 1
            return true
        }
        fail(expected)
        return false
    }

    private func match(_ scalar: Unicode.Scalar, _ expected: String) -> Bool {
        match(expected) { $0 == scalar }
    }

    /// `&"x"`: whether the next scalar is `scalar`, recording nothing.
    private func peek(_ scalar: Unicode.Scalar) -> Bool {
        !atEnd && input[position] == scalar
    }

    private func matchSpaceOrTab() -> Bool { match(Expect.spaceOrTab) { $0 == " " || $0 == "\t" } }
    private func matchLineBreak() -> Bool { match(Expect.lineBreak) { $0 == "\r" || $0 == "\n" } }

    /// `" "*`, returning how many spaces it read.
    private func spaces() -> Int {
        let start = position
        while match(" ", Expect.space) {}
        return position - start
    }

    // MARK: - Rules

    // document = skipEmptyLines links _ eof / _ eof
    private func document() throws -> [RawItem]? {
        let start = position
        resetState()
        skipEmptyLines()
        if let items = try links() {
            whiteSpace()
            if eof() {
                return items
            }
        }
        position = start
        resetState()
        whiteSpace()
        if eof() {
            return []
        }
        position = start
        return nil
    }

    // skipEmptyLines = ([ \t]* [\r\n])*
    private func skipEmptyLines() {
        while true {
            let start = position
            while matchSpaceOrTab() {}
            if !matchLineBreak() {
                position = start
                return
            }
        }
    }

    // links = firstLine line* { popIndentation() }
    private func links() throws -> [RawItem]? {
        let start = position
        guard let first = try firstLine() else {
            position = start
            return nil
        }
        var items = [first]
        while let item = try line() {
            items.append(item)
        }
        if indentationStack.count > 1 {
            indentationStack.removeLast()
        }
        return items
    }

    // firstLine = SET_BASE_INDENTATION element
    private func firstLine() throws -> RawItem? {
        let start = position
        let count = spaces()
        if baseIndentation == nil {
            baseIndentation = count
        }
        if let item = try element() {
            return item
        }
        position = start
        return nil
    }

    // line = CHECK_INDENTATION element
    private func line() throws -> RawItem? {
        let start = position
        let count = spaces()
        if normalizeIndentation(count) >= indentationStack[indentationStack.count - 1],
            let item = try element()
        {
            return item
        }
        position = start
        return nil
    }

    // element = HERE anyLink &{checkDepth} SAVE_INDENTATION (PUSH_INDENTATION links)?
    //         / &{ remember the line is unreadable; false } .
    private func element() throws -> RawItem? {
        let start = position
        if !unreadableLines.contains(lineKey(position)), var item = try anyLink() {
            try checkDepth(depth(), at: start)
            let saved = indentationStack
            let childrenStart = position
            var children: [RawItem]?
            if pushIndentation() {
                children = try links()
            }
            guard let children else {
                position = childrenStart
                indentationStack = saved
                return item
            }
            item.children = children
            return item
        }
        position = start
        unreadableLines.insert(lineKey(position))
        return nil
    }

    // PUSH_INDENTATION = " "* &{ deeper than the current level } { push }
    private func pushIndentation() -> Bool {
        let start = position
        let normalized = normalizeIndentation(spaces())
        if normalized > indentationStack[indentationStack.count - 1] {
            indentationStack.append(normalized)
            return true
        }
        position = start
        return false
    }

    // referenceOrLink = multiLineAnyLink / reference
    private func referenceOrLink() throws -> RawItem? {
        if let group = try nestedGroup() {
            return group
        }
        return try reference().map { RawItem(id: $0) }
    }

    // anyLink = &"(" groupLink / !"(" (indentedIdLink / singleLineAnyLink)
    private func anyLink() throws -> RawItem? {
        if peek("(") {
            return try groupLink()
        }
        if let item = try indentedIdLink() {
            return item
        }
        return try singleLineAnyLink()
    }

    // groupLink = multiLineAnyLink groupLinkRest
    // groupLinkRest = eol / singleLineValueAndWhitespace* eol
    private func groupLink() throws -> RawItem? {
        let start = position
        guard let group = try nestedGroup() else {
            position = start
            return nil
        }
        let restStart = position
        if eol() {
            return group
        }
        position = restStart
        var values = [group]
        while let value = try singleLineValueAndWhitespace() {
            values.append(value)
        }
        if eol() {
            return RawItem(values: values)
        }
        position = start
        return nil
    }

    // singleLineAnyLink = singleLineLink eol / singleLineValueLink eol
    private func singleLineAnyLink() throws -> RawItem? {
        let start = position
        if let item = try singleLineLink(), eol() {
            return item
        }
        position = start
        if let values = try singleLineValues(), eol() {
            return RawItem(values: values)
        }
        position = start
        return nil
    }

    // nestedGroup = HERE "(" &{checkDepth} ENTER_NESTED_CONTEXT nestedGroupBody
    //             / "(" &{ exitNestedContext(); false }
    private func nestedGroup() throws -> RawItem? {
        let start = position
        if match("(", Expect.openParen) {
            try checkDepth(depth() + 1, at: start)
            enterNestedContext()
            if let body = try nestedGroupBody() {
                exitNestedContext()
                return body
            }
        }
        position = start
        if match("(", Expect.openParen) {
            exitNestedContext()
        }
        position = start
        return nil
    }

    // nestedGroupBody = skipEmptyLines links _ ")" / _ ")"
    private func nestedGroupBody() throws -> RawItem? {
        let start = position
        skipEmptyLines()
        if let items = try links() {
            whiteSpace()
            if match(")", Expect.closeParen) {
                return RawItem(nested: items)
            }
        }
        position = start
        whiteSpace()
        if match(")", Expect.closeParen) {
            return RawItem(nested: [])
        }
        position = start
        return nil
    }

    // singleLineValueAndWhitespace = __ referenceOrLink
    private func singleLineValueAndWhitespace() throws -> RawItem? {
        let start = position
        spacesAndTabs()
        if let value = try referenceOrLink() {
            return value
        }
        position = start
        return nil
    }

    // singleLineValues = singleLineValueAndWhitespace+
    private func singleLineValues() throws -> [RawItem]? {
        var values: [RawItem] = []
        while let value = try singleLineValueAndWhitespace() {
            values.append(value)
        }
        return values.isEmpty ? nil : values
    }

    // singleLineLink = __ reference __ ":" singleLineValues
    private func singleLineLink() throws -> RawItem? {
        let start = position
        spacesAndTabs()
        if let id = try reference() {
            spacesAndTabs()
            if match(":", Expect.colon), let values = try singleLineValues() {
                return RawItem(id: id, values: values)
            }
        }
        position = start
        return nil
    }

    // indentedIdLink = reference __ ":" eol
    private func indentedIdLink() throws -> RawItem? {
        let start = position
        if let id = try reference() {
            spacesAndTabs()
            if match(":", Expect.colon), eol() {
                return RawItem(id: id, values: [])
            }
        }
        position = start
        return nil
    }

    // reference = referenceLiteral / quotedReference / simpleReference
    private func reference() throws -> String? {
        if let literal = try referenceLiteral() {
            return literal
        }
        if let quoted = quotedReference() {
            return quoted
        }
        return simpleReference()
    }

    // referenceLiteral = &'~' &{prefix} $('~' [0-9]+ '{' [^} \t\r\n()]* '}')
    private func referenceLiteral() throws -> String? {
        let start = position
        guard peek("~"), hasReferenceLiteralPrefix(input, at: position) else { return nil }
        guard match("~", Expect.tilde), match(Expect.digit, isDigit) else {
            position = start
            return nil
        }
        while match(Expect.digit, isDigit) {}
        guard match("{", Expect.openBrace) else {
            position = start
            return nil
        }
        while match(Expect.literalSymbol, { !"} \t\r\n()".unicodeScalars.contains($0) }) {}
        guard match("}", Expect.closeBrace) else {
            position = start
            return nil
        }
        do {
            return try decodeReferenceLiteral(input[start..<position])
        } catch let error as ReferenceLiteralError {
            throw GrammarFailure.invalidLiteral(offset: start, message: error.message)
        }
    }

    // quotedReference = doubleQuotedUniversal / singleQuotedUniversal / backtickQuotedUniversal
    private func quotedReference() -> String? {
        for quote in ["\"", "'", "`"] as [Unicode.Scalar] where peek(quote) {
            if let reading = references.read(at: position) {
                position += reading.length
                return reading.value
            }
        }
        return nil
    }

    // simpleReference = &{ !prefix } referenceSymbol+
    private func simpleReference() -> String? {
        guard !hasReferenceLiteralPrefix(input, at: position) else { return nil }
        let start = position
        while match(Expect.referenceSymbol, isReferenceSymbol) {}
        guard position > start else { return nil }
        var text = String.UnicodeScalarView()
        text.append(contentsOf: input[start..<position])
        return String(text)
    }

    // eol = __ (lineBreaks / eof / nestedGroupEnd)
    private func eol() -> Bool {
        let start = position
        spacesAndTabs()
        if lineBreaks() || eof() || (!contextStack.isEmpty && peek(")")) {
            return true
        }
        position = start
        return false
    }

    // lineBreaks = [\r\n]+ ([ \t]+ [\r\n]+)*
    private func lineBreaks() -> Bool {
        guard matchLineBreak() else { return false }
        while matchLineBreak() {}
        while true {
            let start = position
            guard matchSpaceOrTab() else {
                position = start
                return true
            }
            while matchSpaceOrTab() {}
            guard matchLineBreak() else {
                position = start
                return true
            }
            while matchLineBreak() {}
        }
    }

    // eof = !.
    private func eof() -> Bool { atEnd }

    // __ = [ \t]*
    private func spacesAndTabs() {
        while matchSpaceOrTab() {}
    }

    // _ = [ \t\n\r]*
    private func whiteSpace() {
        while match(Expect.whiteSpace, { $0 == " " || $0 == "\t" || $0 == "\n" || $0 == "\r" }) {}
    }

    // MARK: - Syntax error message (Peggy's buildMessage)

    private func syntaxMessage() -> String {
        let descriptions = Array(Set(maxFailExpected)).sorted()
        let expected: String
        switch descriptions.count {
        case 0: expected = ""
        case 1: expected = descriptions[0]
        case 2: expected = "\(descriptions[0]) or \(descriptions[1])"
        default:
            expected = descriptions.dropLast().joined(separator: ", ") + ", or " + descriptions.last!
        }
        let found =
            maxFailPosition < input.count
            ? "\"" + literalEscape(input[maxFailPosition]) + "\"" : "end of input"
        return "Expected \(expected) but \(found) found."
    }
}

/// `[^ \t\n\r(:)]`
private func isReferenceSymbol(_ scalar: Unicode.Scalar) -> Bool {
    !(scalar == " " || scalar == "\t" || scalar == "\n" || scalar == "\r" || scalar == "("
        || scalar == ":" || scalar == ")")
}

/// How Peggy writes the character it found in a syntax error message.
private func literalEscape(_ scalar: Unicode.Scalar) -> String {
    let hex = String(scalar.value, radix: 16, uppercase: true)
    switch scalar {
    case "\\": return "\\\\"
    case "\"": return "\\\""
    case "\0": return "\\0"
    case "\t": return "\\t"
    case "\n": return "\\n"
    case "\r": return "\\r"
    default: break
    }
    switch scalar.value {
    case 0x00...0x0F: return "\\x0" + hex
    case 0x10...0x1F, 0x7F...0x9F: return "\\x" + hex
    default: break
    }
    switch scalar.properties.generalCategory {
    case .control, .format, .surrogate, .privateUse, .unassigned, .nonspacingMark, .spacingMark:
        return "\\u{" + hex + "}"
    default:
        return String(Character(scalar))
    }
}
