// Binary links notation, version 1: the port of `js/src/Binary.js`.
// The packet layer (`LinksPacket`, `PacketReader`) reads and writes raw links;
// the document layer (`BinaryLinoCodec`) maps Links Notation documents onto
// them. Every implementation writes the bytes of
// `docs/protocol/binary-links-notation-vectors.txt`.

private let widths = [1, 2, 4, 8]

/// Why bytes, a packet or a document were refused, worded as the
/// JavaScript package words its `RangeError`s.
public struct BinaryError: Error, Equatable, Sendable, CustomStringConvertible {
    public let message: String

    public init(_ message: String) {
        self.message = message
    }

    public var description: String { message }
}

@inline(__always)
private func require(_ condition: Bool, _ message: @autoclosure () -> String) throws {
    if !condition { throw BinaryError(message()) }
}

private func add(_ a: UInt64, _ b: UInt64) throws -> UInt64 {
    let (sum, overflow) = a.addingReportingOverflow(b)
    try require(!overflow, "uint64 overflow")
    return sum
}

private func parseUInt64(_ text: Substring) throws -> UInt64 {
    let trimmed = String(String(text.drop(while: \.isWhitespace).reversed()).drop(while: \.isWhitespace).reversed())
    try require(!trimmed.isEmpty && trimmed.allSatisfy { $0.isASCII && $0.isNumber }, "expected uint64")
    guard let value = UInt64(trimmed) else { throw BinaryError("uint64 overflow") }
    return value
}

/// What a link of a packet refers to: another link (or one of the markers
/// `0`–`5`) by address, or a value outside the packet (`External` in the
/// JavaScript package), which a packet may hold only when it allows external
/// references.
public enum BinaryReference: Hashable, Sendable {
    case address(UInt64)
    case external(UInt64)
}

/// The range of link lengths (arities) a section or a codec allows.
public struct ArityRange: Hashable, Sendable {
    public let min: UInt64
    /// `nil` means unbounded.
    public let max: UInt64?

    /// Links of exactly two references: the default.
    public static let doublets = ArityRange(unchecked: 2, 2)

    /// - Throws: `BinaryError` "invalid arity" unless
    ///   `0 < min <= UInt64.max >> 4` and `max >= min`.
    public init(min: UInt64 = 2, max: UInt64? = 2) throws {
        try require(min > 0 && min <= UInt64.max >> 4 && (max.map { $0 >= min } ?? true), "invalid arity")
        self.min = min
        self.max = max
    }

    private init(unchecked min: UInt64, _ max: UInt64?) {
        self.min = min
        self.max = max
    }

    public func contains(_ length: Int) -> Bool {
        contains(UInt64(length))
    }

    public func contains(_ length: UInt64) -> Bool {
        length >= min && (max.map { length <= $0 } ?? true)
    }

    /// Whether every link has the same length.
    public var fixed: Bool { max == min }

    /// `n`, `n..m` or `n..` (unbounded).
    public static func parse(_ text: String) throws -> ArityRange {
        let parts = text.split(separator: "..", omittingEmptySubsequences: false)
        let isDigits = { (part: Substring) in part.allSatisfy { $0.isASCII && $0.isNumber } }
        try require(
            (parts.count == 1 || parts.count == 2) && !parts[0].isEmpty && parts.allSatisfy(isDigits),
            "invalid arity")
        let min = try parseUInt64(parts[0])
        let max = parts.count == 2 && parts[1].isEmpty ? nil : try parseUInt64(parts.last!)
        return try ArityRange(min: min, max: max)
    }
}

/// How much a packet or a document may hold before it is refused, in both
/// directions.
public struct DecodeLimits: Hashable, Sendable {
    public let maxLinks: Int
    public let maxReferences: Int
    public let maxNodes: Int
    public let maxStringBytes: Int
    public let maxDepth: Int

    /// - Throws: `BinaryError` "invalid limit" for a negative limit.
    public init(
        maxLinks: Int = 1 << 22, maxReferences: Int = 1 << 24, maxNodes: Int = 1 << 22,
        maxStringBytes: Int = 64 << 20, maxDepth: Int = 64
    ) throws {
        try require([maxLinks, maxReferences, maxNodes, maxStringBytes, maxDepth].allSatisfy { $0 >= 0 }, "invalid limit")
        self.maxLinks = maxLinks
        self.maxReferences = maxReferences
        self.maxNodes = maxNodes
        self.maxStringBytes = maxStringBytes
        self.maxDepth = maxDepth
    }

    private init(all value: Int) {
        maxLinks = value
        maxReferences = value
        maxNodes = value
        maxStringBytes = value
        maxDepth = value
    }

    /// The default limits.
    public static let standard = try! DecodeLimits()

    /// No practical limit (`Number.MAX_SAFE_INTEGER`, as in JavaScript).
    public static let unlimited = DecodeLimits(all: 9_007_199_254_740_991)
}

/// How a `BinaryLinoCodec` lays a document out.
public struct BinaryLinoOptions: Hashable, Sendable {
    /// Whether numbers and code points may be written as external values.
    public var externalReferences: Bool
    /// The lengths of links the codec may write; it must contain 2.
    public var arity: ArityRange
    /// Whether sections may use different reference widths when that is
    /// shorter.
    public var packedWidths: Bool

    public init(externalReferences: Bool = false, arity: ArityRange = .doublets, packedWidths: Bool = false) {
        self.externalReferences = externalReferences
        self.arity = arity
        self.packedWidths = packedWidths
    }

    /// The options a packet was evidently written with.
    public static func of(_ packet: LinksPacket) throws -> BinaryLinoOptions {
        var low = 2
        var high = 2
        for link in try packet.links() {
            low = Swift.min(low, link.references.count)
            high = Swift.max(high, link.references.count)
        }
        return BinaryLinoOptions(
            externalReferences: packet.externalReferences,
            arity: try ArityRange(min: UInt64(low), max: UInt64(high)),
            packedWidths: Set(packet.sections.map(\.width)).count > 1)
    }
}

/// A run of links at consecutive addresses that share an arity range and a
/// reference width.
public struct Section: Hashable, Sendable {
    /// How many addresses lie between the previous section and this one.
    public var gap: UInt64
    public var arity: ArityRange
    /// Bytes per reference: 1, 2, 4 or 8.
    public var width: Int
    public var links: [[BinaryReference]]

    public init(gap: UInt64, arity: ArityRange, width: Int, links: [[BinaryReference]] = []) {
        self.gap = gap
        self.arity = arity
        self.width = width
        self.links = links
    }
}

/// A link of a packet at its address.
public struct PacketLink: Hashable, Sendable {
    public var address: UInt64
    public var references: [BinaryReference]

    public init(address: UInt64, references: [BinaryReference]) {
        self.address = address
        self.references = references
    }
}

private func referenceWidth(_ reference: BinaryReference, external: Bool) throws -> Int {
    let value: UInt64
    switch reference {
    case .address(let address):
        value = address
    case .external(let external):
        value = external
    }
    if case .external = reference {
        try require(external, "external references disabled")
    }
    for width in widths {
        let bits = width * 8 - (external ? 1 : 0)
        if bits >= 64 || value < UInt64(1) << UInt64(bits) { return width }
    }
    throw BinaryError("reference exceeds capacity")
}

private func leb(_ out: inout [UInt8], _ input: UInt64) {
    var value = input
    while value >= 128 {
        out.append(UInt8(value & 127) | 128)
        value >>= 7
    }
    out.append(UInt8(value))
}

/// Reads one packet at a time from bytes, without consuming any packet that
/// follows it.
public struct PacketReader {
    public let bytes: [UInt8]
    public private(set) var offset: Int

    public init(_ bytes: [UInt8], offset: Int = 0) throws {
        try require(offset >= 0 && offset <= bytes.count, "invalid byte cursor")
        self.bytes = bytes
        self.offset = offset
    }

    mutating func raw(_ width: Int) throws -> UInt64 {
        try require(width <= bytes.count - offset, "unexpected end of packet")
        var result: UInt64 = 0
        for index in 0..<width {
            result |= UInt64(bytes[offset]) << UInt64(index * 8)
            offset += 1
        }
        return result
    }

    mutating func leb() throws -> UInt64 {
        var value: UInt64 = 0
        var shift: UInt64 = 0
        while shift < 64 {
            let byte = try raw(1)
            try require(shift != 63 || byte & 127 <= 1, "LEB128 overflow")
            value |= (byte & 127) << shift
            if byte < 128 { return value }
            shift += 7
        }
        throw BinaryError("LEB128 overflow")
    }

    /// The next packet, or `nil` at the end of the bytes.
    public mutating func read(limits: DecodeLimits = .standard) throws -> LinksPacket? {
        if offset == bytes.count { return nil }
        let header = try raw(1)
        try require(header & 0xF0 == 0x10, "unsupported binary version")
        var sections: [Section] = []
        var counts: [Int] = []
        if header & 2 != 0 {
            try require(header & 12 == 0, "explicit header width bits set")
            let sectionCount = try leb()
            try require(sectionCount <= UInt64(limits.maxLinks), "too many sections")
            var address: UInt64 = 1
            var total: UInt64 = 0
            for _ in 0..<sectionCount {
                let shape = try leb()
                let gap = shape & 4 != 0 ? try leb() : 0
                let min = shape >> 4
                let extra: UInt64? = shape & 8 != 0 ? try leb() : nil
                let arity = try ArityRange(
                    min: min, max: extra == nil ? min : extra == 0 ? nil : try add(min, extra!))
                let count = try leb()
                address = try add(try add(address, gap), count)
                total += count
                try require(total <= UInt64(limits.maxLinks), "too many links")
                sections.append(Section(gap: gap, arity: arity, width: widths[Int(shape & 3)]))
                counts.append(Int(count))
            }
        } else {
            let count = try leb()
            _ = try add(6, count)
            try require(count <= UInt64(limits.maxLinks), "too many links")
            if count != 0 {
                sections.append(Section(gap: 5, arity: .doublets, width: widths[Int((header >> 2) & 3)]))
                counts.append(Int(count))
            }
        }

        var references: UInt64 = 0
        let external = header & 1 != 0
        for index in sections.indices {
            let section = sections[index]
            for _ in 0..<counts[index] {
                let length = try add(section.arity.min, section.arity.fixed ? 0 : try leb())
                try require(section.arity.contains(length), "link outside arity")
                let (sum, overflow) = references.addingReportingOverflow(length)
                references = sum
                try require(!overflow && references <= UInt64(limits.maxReferences), "too many references")
                var link: [BinaryReference] = []
                let top = UInt64(1) << UInt64(section.width * 8 - 1)
                for _ in 0..<length {
                    let raw = try raw(section.width)
                    link.append(
                        external && raw >= top ? .external(raw == top ? 0 : (top << 1) &- raw) : .address(raw))
                }
                sections[index].links.append(link)
            }
        }
        return LinksPacket(externalReferences: external, sections: sections)
    }
}

/// Raw links in sections, as they travel in binary links notation.
public struct LinksPacket: Hashable, Sendable {
    public var externalReferences: Bool
    public var sections: [Section]

    public init(externalReferences: Bool = false, sections: [Section] = []) {
        self.externalReferences = externalReferences
        self.sections = sections
    }

    /// Every link at its address.
    public func links() throws -> [PacketLink] {
        var result: [PacketLink] = []
        var address: UInt64 = 1
        for section in sections {
            address = try add(address, section.gap)
            for link in section.links {
                result.append(PacketLink(address: address, references: link))
                address = try add(address, 1)
            }
        }
        return result
    }

    /// The packet itself, once it is known to fit its sections and limits.
    @discardableResult
    public func validate(limits: DecodeLimits = .standard) throws -> LinksPacket {
        try require(
            sections.count <= limits.maxLinks && (try links()).count <= limits.maxLinks,
            "too many links or sections")
        var references = 0
        for section in sections {
            try require(widths.contains(section.width), "invalid width")
            for link in section.links {
                try require(section.arity.contains(link.count), "link outside arity")
                references += link.count
                try require(references <= limits.maxReferences, "too many references")
                for reference in link {
                    try require(
                        try referenceWidth(reference, external: externalReferences) <= section.width,
                        "reference outside width")
                }
            }
        }
        return self
    }

    /// The bytes of the packet.
    public func toBytes(limits: DecodeLimits = .standard) throws -> [UInt8] {
        try validate(limits: limits)
        let first = sections.first
        let compact =
            first == nil
            || (sections.count == 1 && first!.gap == 5 && first!.arity.min == 2 && first!.arity.max == 2
                && !first!.links.isEmpty)
        var out: [UInt8] = [0x10 | (externalReferences ? 1 : 0)]
        if compact {
            out[0] |= UInt8(widths.firstIndex(of: first?.width ?? 1)!) << 2
            leb(&out, UInt64(first?.links.count ?? 0))
        } else {
            out[0] |= 2
            leb(&out, UInt64(sections.count))
            for section in sections {
                let flags = UInt64(widths.firstIndex(of: section.width)!) | (section.gap != 0 ? 4 : 0)
                    | (section.arity.fixed ? 0 : 8)
                leb(&out, section.arity.min << 4 | flags)
                if section.gap != 0 { leb(&out, section.gap) }
                if !section.arity.fixed { leb(&out, section.arity.max.map { $0 - section.arity.min } ?? 0) }
                leb(&out, UInt64(section.links.count))
            }
        }
        for section in sections {
            for link in section.links {
                if !section.arity.fixed { leb(&out, UInt64(link.count) - section.arity.min) }
                let bits = UInt64(section.width * 8)
                for reference in link {
                    var raw: UInt64
                    switch reference {
                    case .address(let address):
                        raw = address
                    case .external(let value):
                        // 1 << 64 is 0 in UInt64, so the subtraction wraps to
                        // 2^64 - value as intended.
                        raw = value == 0 ? UInt64(1) << (bits - 1) : (UInt64(1) << bits) &- value
                    }
                    for _ in 0..<section.width {
                        out.append(UInt8(raw & 255))
                        raw >>= 8
                    }
                }
            }
        }
        return out
    }

    /// The single packet the bytes hold.
    public static func fromBytes(_ bytes: [UInt8], limits: DecodeLimits = .standard) throws -> LinksPacket {
        var reader = try PacketReader(bytes)
        guard let packet = try reader.read(limits: limits) else { throw BinaryError("empty input") }
        try require(reader.offset == bytes.count, "trailing bytes")
        return packet
    }

    /// Links written as `address: reference reference…` separated by `;`,
    /// where `#v` is the external value `v`.
    public static func parseLinks(_ text: String) throws -> [PacketLink] {
        try text.split(separator: ";", omittingEmptySubsequences: false)
            .filter { !$0.allSatisfy(\.isWhitespace) }
            .map { entry in
                let parts = entry.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
                try require(parts.count == 2, "expected uint64")
                let references = try parts[1].split(whereSeparator: \.isWhitespace).map { reference in
                    reference.hasPrefix("#")
                        ? BinaryReference.external(try parseUInt64(reference.dropFirst()))
                        : BinaryReference.address(try parseUInt64(reference))
                }
                return PacketLink(address: try parseUInt64(parts[0]), references: references)
            }
    }

    /// Links at increasing addresses laid out in the fewest bytes: sections
    /// of one width, or of mixed widths too with `packedWidths` when that is
    /// shorter.
    public static func pack(
        externalReferences: Bool, _ links: [PacketLink], packedWidths: Bool = false
    ) throws -> LinksPacket {
        var previous: UInt64 = 0
        var needs: [Int] = []
        for link in links {
            try require(
                link.address > previous && link.address < UInt64.max && !link.references.isEmpty,
                "invalid address order or empty link")
            previous = link.address
            var need = 1
            for reference in link.references {
                need = Swift.max(need, try referenceWidth(reference, external: externalReferences))
            }
            needs.append(need)
        }

        func layout(_ packed: Bool) -> [(count: Int, width: Int)] {
            if links.isEmpty { return [] }
            let widest = needs.max() ?? 1
            var opens: [Int] = []
            var bests: [Int] = []
            var costs = [Double](repeating: .infinity, count: 8)
            func cheapest(_ costs: [Double]) -> Int {
                var best = 0
                for state in costs.indices where costs[state] < costs[best] { best = state }
                return best
            }
            for index in links.indices {
                let best = cheapest(costs)
                let before = index > 0 ? costs[best] : 0
                var next = [Double](repeating: .infinity, count: 8)
                var mask = 0
                bests.append(best)
                let length = Double(links[index].references.count)
                for state in 0..<8 {
                    let width = widths[state >> 1]
                    let variable = state & 1
                    if (!packed && width != widest) || width < needs[index] { continue }
                    let opening = before + 2 + Double(variable)
                    let continuing =
                        index > 0 && links[index - 1].address + 1 == links[index].address
                            && (variable != 0
                                || links[index - 1].references.count == links[index].references.count)
                        ? costs[state] : .infinity
                    if continuing <= opening {
                        next[state] = continuing + length * Double(width) + Double(variable)
                    } else {
                        next[state] = opening + length * Double(width) + Double(variable)
                        mask |= 1 << state
                    }
                }
                opens.append(mask)
                costs = next
            }
            var result: [(count: Int, width: Int)] = []
            var end = links.count
            var state = cheapest(costs)
            for index in links.indices.reversed() where opens[index] & (1 << state) != 0 {
                result.append((end - index, widths[state >> 1]))
                end = index
                state = bests[index]
            }
            return result.reversed()
        }

        func packet(_ plan: [(count: Int, width: Int)]) throws -> LinksPacket {
            var sections: [Section] = []
            var index = 0
            var address: UInt64 = 1
            for (count, width) in plan {
                let members = links[index..<index + count]
                let start = members.first!.address
                let lengths = members.map(\.references.count)
                sections.append(
                    Section(
                        gap: start - address,
                        arity: try ArityRange(min: UInt64(lengths.min()!), max: UInt64(lengths.max()!)),
                        width: width, links: members.map(\.references)))
                index += count
                address = start + UInt64(count)
            }
            return LinksPacket(externalReferences: externalReferences, sections: sections)
        }

        let uniform = try packet(layout(false))
        if !packedWidths { return uniform }
        let packed = try packet(layout(true))
        return try packed.toBytes(limits: .unlimited).count < uniform.toBytes(limits: .unlimited).count
            ? packed : uniform
    }
}

// MARK: - Documents

private enum Node: Hashable {
    case immediate(UInt64)
    case doublet(Int)
    case tuple(Int)
    case external(UInt64)
}

private final class Encoder {
    let options: BinaryLinoOptions
    var doublets: [[Node]] = []
    var tuples: [[Node]] = []
    var created: [[Node]: Node] = [:]
    var powers: [Node] = [.immediate(1)]

    init(_ options: BinaryLinoOptions) {
        self.options = options
    }

    func link(_ items: [Node]) -> Node {
        if let node = created[items] { return node }
        let doublet = items.count == 2 && items.allSatisfy { if case .tuple = $0 { return false } else { return true } }
        let node: Node
        if doublet {
            node = .doublet(doublets.count)
            doublets.append(items)
        } else {
            node = .tuple(tuples.count)
            tuples.append(items)
        }
        created[items] = node
        return node
    }

    func chain(_ items: [Node]) -> Node {
        var tail = Node.immediate(0)
        for item in items.reversed() { tail = link([item, tail]) }
        return tail
    }

    func typed(_ marker: UInt64, _ elements: [Node]) -> Node {
        let items = [Node.immediate(marker)] + elements
        return items.count != 2 && options.arity.contains(items.count)
            ? link(items) : link([items[0], chain(elements)])
    }

    func list(_ elements: [Node]) -> Node {
        if elements.isEmpty { return .immediate(0) }
        return elements.count == 2 || options.arity.contains(elements.count) ? link(elements) : typed(4, elements)
    }

    func unary(_ value: UInt64) -> Node {
        var terms: [Node] = []
        for bit in stride(from: 63, through: 0, by: -1) where value & (UInt64(1) << UInt64(bit)) != 0 {
            while powers.count <= bit {
                let power = powers.last!
                powers.append(link([power, power]))
            }
            terms.append(powers[bit])
        }
        var sum = terms.popLast() ?? .immediate(0)
        while let term = terms.popLast() { sum = link([term, sum]) }
        return sum
    }

    func scalar(_ value: UInt64) -> Node {
        options.externalReferences && value < UInt64(1) << 63 ? .external(value) : unary(value)
    }

    func reference(_ text: String) -> Node {
        let digits = text.unicodeScalars
        let isNumber =
            !digits.isEmpty && digits.allSatisfy { $0.value >= 48 && $0.value <= 57 }
            && (digits.first != "0" || digits.count == 1) && digits.count <= 20
        if isNumber, let value = UInt64(text) {
            return options.externalReferences && value < UInt64(1) << 63
                ? .external(value) : link([.immediate(2), unary(value)])
        }
        return typed(3, text.unicodeScalars.map { scalar(UInt64($0.value)) })
    }

    func encode(_ node: Link) -> Node {
        if let id = node.id, node.values.isEmpty { return reference(id) }
        if let id = node.id {
            let identifier = reference(id)
            return typed(5, [identifier] + node.values.map(encode))
        }
        return list(node.values.map(encode))
    }

    func finish() throws -> LinksPacket {
        let doubletCount = UInt64(doublets.count)
        func resolve(_ node: Node) -> BinaryReference {
            switch node {
            case .external(let value): return .external(value)
            case .immediate(let value): return .address(value)
            case .doublet(let index): return .address(6 + UInt64(index))
            case .tuple(let index): return .address(6 + UInt64(index) + doubletCount)
            }
        }
        let links = (doublets + tuples).enumerated().map {
            PacketLink(address: 6 + UInt64($0.offset), references: $0.element.map(resolve))
        }
        return try LinksPacket.pack(
            externalReferences: options.externalReferences, links, packedWidths: options.packedWidths)
    }
}

private struct Decoder {
    let limits: DecodeLimits
    var links: [[BinaryReference]] = []
    var unary: [UInt64?] = []
    var nodes: Int
    var strings: Int

    init(_ packet: LinksPacket, limits: DecodeLimits) throws {
        try packet.validate(limits: limits)
        self.limits = limits
        nodes = limits.maxNodes
        strings = limits.maxStringBytes
        for link in try packet.links() {
            let address = link.address
            try require(
                address == 6 + UInt64(links.count)
                    && link.references.allSatisfy {
                        if case .address(let reference) = $0 { return reference < address } else { return true }
                    },
                "document addresses must be contiguous and references backward")
            func value(_ reference: BinaryReference) -> UInt64? {
                guard case .address(let address) = reference else { return nil }
                return address <= 1 ? address : address >= 6 ? unary[Int(address - 6)] : nil
            }
            var sum: UInt64?
            if link.references.count == 2, let a = value(link.references[0]), let b = value(link.references[1]) {
                let (total, overflow) = a.addingReportingOverflow(b)
                sum = overflow ? nil : total
            }
            unary.append(sum)
            links.append(link.references)
        }
    }

    func chain(_ start: BinaryReference) throws -> [BinaryReference] {
        var elements: [BinaryReference] = []
        var tail = start
        while tail != .address(0) {
            guard case .address(let address) = tail, address >= 6 else { throw BinaryError("broken chain") }
            let items = links[Int(address - 6)]
            try require(items.count == 2 && elements.count < limits.maxNodes, "broken or excessive chain")
            elements.append(items[0])
            tail = items[1]
        }
        return elements
    }

    func number(_ reference: BinaryReference) throws -> UInt64 {
        let value: UInt64?
        switch reference {
        case .external(let external): value = external
        case .address(let address): value = address <= 1 ? address : address >= 6 ? unary[Int(address - 6)] : nil
        }
        guard let value else { throw BinaryError("expected unary number") }
        return value
    }

    mutating func text(_ text: String) throws -> Link {
        strings -= text.utf8.count
        try require(strings >= 0, "string budget exceeded")
        return Link(id: text)
    }

    mutating func decode(_ reference: BinaryReference, depth: Int) throws -> Link {
        try require(depth < limits.maxDepth, "node or depth budget exceeded")
        nodes -= 1
        try require(nodes >= 0, "node or depth budget exceeded")
        let address: UInt64
        switch reference {
        case .external(let value): return try text(String(value))
        case .address(0): return Link()
        case .address(let value): address = value
        }
        try require(address >= 6, "standalone marker")
        let items = links[Int(address - 6)]
        var elements = items
        if case .address(let marker) = items[0], marker >= 1 && marker <= 5 {
            elements = items.count != 2 || marker == 2 ? Array(items.dropFirst()) : try chain(items[1])
            switch marker {
            case 2:
                try require(elements.count == 1, "number needs one value")
                return try text(String(try number(elements[0])))
            case 3:
                var scalars = String.UnicodeScalarView()
                var byteCount = 0
                for element in elements {
                    let point = try number(element)
                    guard point <= 0x10FFFF, let scalar = Unicode.Scalar(UInt32(point)) else {
                        throw BinaryError("invalid Unicode scalar")
                    }
                    let size = point <= 0x7F ? 1 : point <= 0x7FF ? 2 : point <= 0xFFFF ? 3 : 4
                    try require(size <= strings - byteCount, "string budget exceeded")
                    byteCount += size
                    scalars.append(scalar)
                }
                return try text(String(scalars))
            case 5:
                try require(!elements.isEmpty, "identified needs id")
                let id = try decode(elements[0], depth: depth)
                try require(id.id != nil && id.values.isEmpty, "id must be reference")
                var values: [Link] = []
                for element in elements.dropFirst() { values.append(try decode(element, depth: depth + 1)) }
                return Link(id: id.id, values: values)
            default:
                try require(marker == 4, "invalid typed marker")
            }
        }
        var values: [Link] = []
        for element in elements { values.append(try decode(element, depth: depth + 1)) }
        return Link(id: nil, values: values)
    }

    mutating func document() throws -> [Link] {
        guard let root = links.last else { return [] }
        let elements: [BinaryReference]
        if root.count == 2 && root[0] == .address(4) {
            elements = try chain(root[1])
        } else {
            if case .address(let marker) = root[0] {
                try require(!(marker >= 1 && marker <= 5), "root must be list")
            }
            elements = root
        }
        var document: [Link] = []
        for element in elements { document.append(try decode(element, depth: 0)) }
        return document
    }
}

/// The text model of a link: a group that only wraps one reference is that
/// reference.
private func canonical(_ node: Link) -> Link {
    if node.id == nil && node.values.count == 1 && node.values[0].id != nil && node.values[0].values.isEmpty {
        return node.values[0]
    }
    return Link(id: node.id, values: node.values.map(canonical))
}

/// A reference written for binary-derived text: the same quoting as
/// `escapeReference`, with reference literals for empty text and control
/// characters.
public func formatBinaryReference(_ text: String) -> String {
    escapeReference(text)
}

/// A decoded document as text that parses back to the same model.
public func formatBinaryDocument(_ document: [Link]) -> String {
    func nested(_ node: Link, top: Bool = false) -> String {
        if let id = node.id, node.values.isEmpty { return formatBinaryReference(id) }
        let values = node.values.map { nested($0) }.joined(separator: " ")
        if let id = node.id { return "(\(formatBinaryReference(id)): \(values))" }
        if node.values.count == 1 && node.values[0].id != nil && node.values[0].values.isEmpty {
            return "((\(values)))"
        }
        return top && node.values.count >= 2 ? values : "(\(values))"
    }
    return document.map { nested($0, top: true) }.joined(separator: "\n")
}

/// Writes Links Notation documents as binary links notation and reads them
/// back, within limits in both directions.
public struct BinaryLinoCodec: Sendable {
    public var options: BinaryLinoOptions
    public var limits: DecodeLimits

    public init(options: BinaryLinoOptions = .init(), limits: DecodeLimits = .standard) {
        self.options = options
        self.limits = limits
    }

    public func encodePacket(_ document: [Link]) throws -> LinksPacket {
        try require(options.arity.contains(2), "arity must contain 2")
        var pending = document.map { ($0, 0) }
        var nodes = 0
        var strings = 0
        while case let (node, depth)? = pending.popLast() {
            try require(depth < limits.maxDepth, "invalid model or excessive depth")
            nodes += 1 + (node.id != nil && !node.values.isEmpty ? 1 : 0)
            if let id = node.id { strings += id.utf8.count }
            try require(nodes <= limits.maxNodes && strings <= limits.maxStringBytes, "model budget exceeded")
            for value in node.values { pending.append((value, depth + 1)) }
        }
        let encoder = Encoder(options)
        if !document.isEmpty { _ = encoder.list(document.map(encoder.encode)) }
        return try encoder.finish().validate(limits: limits)
    }

    public func encode(_ document: [Link]) throws -> [UInt8] {
        try encodePacket(document).toBytes(limits: limits)
    }

    public func decodePacket(_ packet: LinksPacket) throws -> [Link] {
        var decoder = try Decoder(packet, limits: limits)
        return try decoder.document()
    }

    public func decode(_ bytes: [UInt8]) throws -> [Link] {
        try decodePacket(LinksPacket.fromBytes(bytes, limits: limits))
    }

    /// The text model of a document: what the binary format round-trips.
    public func parseDocument(_ text: String, parser: Parser = Parser()) throws -> [Link] {
        try parser.parse(text).map(canonical)
    }

    public func formatDocument(_ document: [Link]) -> String {
        formatBinaryDocument(document)
    }

    public func encodeText(_ text: String, parser: Parser = Parser()) throws -> [UInt8] {
        try encode(parseDocument(text, parser: parser))
    }

    public func decodeText(_ bytes: [UInt8]) throws -> String {
        formatDocument(try decode(bytes))
    }
}
