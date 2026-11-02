package io.github.linkfoundation.linksnotation

/*
 * Binary links notation, version 1: a port of `js/src/Binary.js` of
 * link-foundation/links-notation. The packet layer (raw addressed links) and
 * the document layer (Links Notation links mapped onto marker points) share no
 * transport. The wire format and its golden vectors live in `docs/protocol`.
 *
 * Every malformed packet, model or option throws [IllegalArgumentException]
 * with the message of the JavaScript `RangeError`.
 */

private val WIDTHS = intArrayOf(1, 2, 4, 8)

private const val TOP_BIT: ULong = 0x8000000000000000uL

/** Throw [IllegalArgumentException] with [message] unless [condition] holds. */
private fun requireValue(
    condition: Boolean,
    message: String,
) {
    if (!condition) throw IllegalArgumentException(message)
}

/** `a + b`, refusing to wrap past 2^64 - 1. */
private fun add64(
    a: ULong,
    b: ULong,
): ULong {
    requireValue(a <= ULong.MAX_VALUE - b, "uint64 overflow")
    return a + b
}

/** The unsigned 64-bit number [text] spells, or a refusal. */
private fun parseUInt64(text: String): ULong {
    requireValue(text.isNotEmpty() && text.all { it in '0'..'9' }, "expected uint64")
    return text.toULongOrNull() ?: throw IllegalArgumentException("uint64 overflow")
}

/** One reference of a raw packet link: the [Address] of a link, or an [External] value. */
sealed interface PacketReference {
    /** The unsigned 64-bit number the reference carries. */
    val value: ULong
}

/** A reference to the link at [value]: 0 and 1 are the reserved points, 2 to 5 the markers. */
data class Address(
    override val value: ULong,
) : PacketReference {
    override fun toString(): String = value.toString()
}

/** A Hybrid external value: a number outside the address space of the packet. */
data class External(
    override val value: ULong,
) : PacketReference {
    override fun toString(): String = "#$value"
}

/** A raw link of a packet with its implicit [address]. */
data class PacketLink(
    val address: ULong,
    val references: List<PacketReference>,
)

/** An inclusive range of link lengths; a null [max] is unbounded. */
data class ArityRange(
    val min: ULong = 2u,
    val max: ULong? = 2u,
) {
    init {
        requireValue(min > 0u && min <= ULong.MAX_VALUE shr 4 && (max == null || max >= min), "invalid arity")
    }

    /** Both bounds at once when they are small numbers. */
    constructor(min: Int, max: Int?) : this(min.toULongChecked(), max?.toULongChecked())

    /** Whether a link of [length] references is in the range. */
    fun contains(length: ULong): Boolean = length >= min && (max == null || length <= max)

    /** Whether a link of [length] references is in the range. */
    fun contains(length: Int): Boolean = length >= 0 && contains(length.toULong())

    /** Whether every link of the range has the same length. */
    val fixed: Boolean
        get() = min == max

    override fun toString(): String = if (fixed) "$min" else "$min..${max ?: ""}"

    companion object {
        private val SYNTAX = Regex("^[0-9]+(?:\\.\\.[0-9]*)?$")

        /** `2`, `2..3` or `1..` (unbounded). */
        fun parse(text: String): ArityRange {
            requireValue(SYNTAX.matches(text), "invalid arity")
            val parts = text.split("..")
            return ArityRange(parseUInt64(parts[0]), if (parts.last().isEmpty()) null else parseUInt64(parts.last()))
        }
    }
}

private fun Int.toULongChecked(): ULong {
    requireValue(this >= 0, "expected uint64")
    return toULong()
}

/** How much a packet or a document may hold, checked in both directions. */
data class DecodeLimits(
    val maxLinks: Long = 1L shl 22,
    val maxReferences: Long = 1L shl 24,
    val maxNodes: Long = 1L shl 22,
    val maxStringBytes: Long = 64L shl 20,
    val maxDepth: Long = 64,
) {
    init {
        requireValue(
            maxLinks >= 0 && maxReferences >= 0 && maxNodes >= 0 && maxStringBytes >= 0 && maxDepth >= 0,
            "invalid limit",
        )
    }

    companion object {
        /** No limit at all, for trusted input. */
        fun unlimited(): DecodeLimits = DecodeLimits(Long.MAX_VALUE, Long.MAX_VALUE, Long.MAX_VALUE, Long.MAX_VALUE, Long.MAX_VALUE)
    }
}

/**
 * How a document is written as a packet: with [externalReferences], numbers
 * and characters become Hybrid external values; links of a length in [arity]
 * are written whole; [packedWidths] lets every section use its own width.
 */
data class BinaryLinoOptions(
    val externalReferences: Boolean = false,
    val arity: ArityRange = ArityRange(),
    val packedWidths: Boolean = false,
) {
    companion object {
        /** The options a packet was evidently written with. */
        fun ofPacket(packet: LinksPacket): BinaryLinoOptions {
            var min = 2
            var max = 2
            for (link in packet.links()) {
                min = minOf(min, link.references.size)
                max = maxOf(max, link.references.size)
            }
            return BinaryLinoOptions(
                packet.externalReferences,
                ArityRange(min, max),
                packet.sections
                    .map { it.width }
                    .toSet()
                    .size > 1,
            )
        }
    }
}

/** A run of links with consecutive addresses, [gap] addresses after the previous run. */
data class Section(
    val gap: ULong,
    val arity: ArityRange,
    val width: Int,
    val links: List<List<PacketReference>>,
)

/** The fewest bytes that hold [reference]; external values give up the top bit. */
private fun referenceWidth(
    reference: PacketReference,
    external: Boolean,
): Int {
    requireValue(reference !is External || external, "external references disabled")
    val value = reference.value
    for (width in WIDTHS) {
        val bits = width * 8 - (if (external) 1 else 0)
        if (bits >= 64 || value < (1uL shl bits)) return width
    }
    throw IllegalArgumentException("reference exceeds capacity")
}

private class ByteWriter {
    private var bytes = ByteArray(64)
    var size = 0
        private set

    fun push(byte: Int) {
        if (size == bytes.size) bytes = bytes.copyOf(size * 2)
        bytes[size++] = byte.toByte()
    }

    fun leb(input: ULong) {
        var value = input
        while (value >= 128u) {
            push((value and 127u).toInt() or 128)
            value = value shr 7
        }
        push(value.toInt())
    }

    fun toByteArray(): ByteArray = bytes.copyOf(size)
}

/** A cursor that reads one packet at a time without consuming any following packet. */
class PacketReader(
    private val bytes: ByteArray,
    offset: Int = 0,
) {
    /** Where the next packet starts. */
    var offset: Int = offset
        private set

    init {
        requireValue(offset >= 0 && offset <= bytes.size, "invalid byte cursor")
    }

    private fun raw(width: Int): ULong {
        requireValue(width <= bytes.size - offset, "unexpected end of packet")
        var result = 0uL
        for (i in 0 until width) {
            result = result or ((bytes[offset++].toInt() and 0xFF).toULong() shl (i * 8))
        }
        return result
    }

    private fun leb(): ULong {
        var value = 0uL
        var shift = 0
        while (shift < 64) {
            val byte = raw(1)
            requireValue(shift != 63 || (byte and 127u) <= 1u, "LEB128 overflow")
            value = value or ((byte and 127u) shl shift)
            if (byte < 128u) return value
            shift += 7
        }
        throw IllegalArgumentException("LEB128 overflow")
    }

    /** The next packet, or null at the end of the bytes. */
    fun read(limits: DecodeLimits = DecodeLimits()): LinksPacket? {
        if (offset == bytes.size) return null
        val header = raw(1).toInt()
        requireValue((header and 0xf0) == 0x10, "unsupported binary version")
        val shapes = ArrayList<Section>()
        val counts = ArrayList<Long>()
        val maxLinks = limits.maxLinks.toULong()
        if (header and 2 != 0) {
            requireValue((header and 12) == 0, "explicit header width bits set")
            val sectionCount = leb()
            requireValue(sectionCount <= maxLinks, "too many sections")
            var address = 1uL
            var total = 0uL
            for (i in 0uL until sectionCount) {
                val shape = leb()
                val gap = if (shape and 4u != 0uL) leb() else 0uL
                val min = shape shr 4
                val extra = if (shape and 8u != 0uL) leb() else null
                val arity =
                    ArityRange(
                        min,
                        if (extra == null) {
                            min
                        } else if (extra == 0uL) {
                            null
                        } else {
                            add64(min, extra)
                        },
                    )
                val count = leb()
                address = add64(add64(address, gap), count)
                requireValue(count <= maxLinks - total, "too many links")
                total += count
                shapes.add(Section(gap, arity, WIDTHS[(shape and 3u).toInt()], emptyList()))
                counts.add(count.toLong())
            }
        } else {
            val count = leb()
            add64(6u, count)
            requireValue(count <= maxLinks, "too many links")
            if (count != 0uL) {
                shapes.add(Section(5u, ArityRange(), WIDTHS[(header shr 2) and 3], emptyList()))
                counts.add(count.toLong())
            }
        }
        var references = 0uL
        val maxReferences = limits.maxReferences.toULong()
        val sections =
            shapes.mapIndexed { i, section ->
                val links = ArrayList<List<PacketReference>>()
                for (j in 0L until counts[i]) {
                    val length = add64(section.arity.min, if (section.arity.fixed) 0uL else leb())
                    requireValue(section.arity.contains(length), "link outside arity")
                    requireValue(length <= maxReferences - references, "too many references")
                    references += length
                    val link = ArrayList<PacketReference>()
                    val top = 1uL shl (section.width * 8 - 1)
                    for (k in 0uL until length) {
                        val raw = raw(section.width)
                        link.add(
                            if (header and 1 != 0 && raw >= top) {
                                // (top << 1) - raw wraps to 2^64 - raw for eight-byte references.
                                External(if (raw == top) 0uL else (top shl 1) - raw)
                            } else {
                                Address(raw)
                            },
                        )
                    }
                    links.add(link)
                }
                section.copy(links = links)
            }
        return LinksPacket(header and 1 != 0, sections)
    }
}

/** A packet of raw links, in sections; the links of a section have consecutive addresses. */
data class LinksPacket(
    val externalReferences: Boolean = false,
    val sections: List<Section> = emptyList(),
) {
    /** Every link with its address: the first section starts at 1 plus its gap. */
    fun links(): List<PacketLink> {
        val result = ArrayList<PacketLink>()
        var address = 1uL
        for (section in sections) {
            address = add64(address, section.gap)
            for (link in section.links) {
                result.add(PacketLink(address, link))
                address = add64(address, 1u)
            }
        }
        return result
    }

    /** This packet, after checking it holds what [limits] allow and every reference fits its section. */
    fun validate(limits: DecodeLimits = DecodeLimits()): LinksPacket {
        requireValue(
            sections.size <= limits.maxLinks && links().size <= limits.maxLinks,
            "too many links or sections",
        )
        var references = 0L
        for (s in sections) {
            requireValue(s.width in WIDTHS, "invalid width")
            for (link in s.links) {
                requireValue(s.arity.contains(link.size), "link outside arity")
                references += link.size
                requireValue(references <= limits.maxReferences, "too many references")
                for (r in link) {
                    requireValue(referenceWidth(r, externalReferences) <= s.width, "reference outside width")
                }
            }
        }
        return this
    }

    /** The packet as bytes: the compact header when one doublet section allows it. */
    fun toBytes(limits: DecodeLimits = DecodeLimits()): ByteArray {
        validate(limits)
        val first = sections.firstOrNull()
        val compact =
            first == null ||
                (
                    sections.size == 1 && first.gap == 5uL && first.arity.min == 2uL &&
                        first.arity.max == 2uL && first.links.isNotEmpty()
                )
        val out = ByteWriter()
        var header = 0x10 or (if (externalReferences) 1 else 0)
        val shapes = ByteWriter()
        if (compact) {
            header = header or (WIDTHS.indexOf(first?.width ?: 1) shl 2)
            shapes.leb((first?.links?.size ?: 0).toULong())
        } else {
            header = header or 2
            shapes.leb(sections.size.toULong())
            for (s in sections) {
                val bits = WIDTHS.indexOf(s.width) or (if (s.gap != 0uL) 4 else 0) or (if (s.arity.fixed) 0 else 8)
                shapes.leb((s.arity.min shl 4) or bits.toULong())
                if (s.gap != 0uL) shapes.leb(s.gap)
                if (!s.arity.fixed) shapes.leb(if (s.arity.max == null) 0uL else s.arity.max - s.arity.min)
                shapes.leb(s.links.size.toULong())
            }
        }
        out.push(header)
        for (byte in shapes.toByteArray()) out.push(byte.toInt() and 0xFF)
        for (s in sections) {
            for (link in s.links) {
                if (!s.arity.fixed) out.leb(link.size.toULong() - s.arity.min)
                for (r in link) {
                    val bits = s.width * 8
                    var raw =
                        when (r) {
                            is External -> {
                                when {
                                    r.value == 0uL -> 1uL shl (bits - 1)
                                    bits == 64 -> 0uL - r.value
                                    else -> (1uL shl bits) - r.value
                                }
                            }

                            is Address -> {
                                r.value
                            }
                        }
                    for (i in 0 until s.width) {
                        out.push((raw and 255u).toInt())
                        raw = raw shr 8
                    }
                }
            }
        }
        return out.toByteArray()
    }

    companion object {
        /** The one packet [bytes] hold, with nothing after it. */
        fun fromBytes(
            bytes: ByteArray,
            limits: DecodeLimits = DecodeLimits(),
        ): LinksPacket {
            val reader = PacketReader(bytes)
            val packet = reader.read(limits)
            requireValue(packet != null, "empty input")
            requireValue(reader.offset == bytes.size, "trailing bytes")
            return packet!!
        }

        /** Raw links written as `address: reference reference; ...`, where `#v` is the external value `v`. */
        fun parseLinks(text: String): List<PacketLink> =
            text.split(';').filter { it.isNotBlank() }.map { entry ->
                val parts = entry.split(':')
                requireValue(parts.size == 2, "invalid packet link")
                PacketLink(
                    parseUInt64(parts[0].trim()),
                    parts[1].trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.map { r ->
                        if (r.startsWith('#')) External(parseUInt64(r.substring(1))) else Address(parseUInt64(r))
                    },
                )
            }

        /**
         * Lay out [input], links in increasing address order, in the sections
         * that take the fewest bytes; with [packedWidths], sections may differ
         * in width.
         */
        fun pack(
            externalReferences: Boolean,
            input: List<PacketLink>,
            packedWidths: Boolean = false,
        ): LinksPacket {
            val links = input
            var previous = 0uL
            val needs =
                links.map { link ->
                    requireValue(
                        link.address > previous && link.address < ULong.MAX_VALUE && link.references.isNotEmpty(),
                        "invalid address order or empty link",
                    )
                    previous = link.address
                    link.references.fold(1) { need, r -> maxOf(need, referenceWidth(r, externalReferences)) }
                }

            fun cheapest(costs: DoubleArray): Int {
                var best = 0
                for (state in costs.indices) if (costs[state] < costs[best]) best = state
                return best
            }

            // The cheapest split into sections: each state is a width and
            // whether the section writes the length of every link.
            fun layout(packed: Boolean): List<Pair<Int, Int>> {
                if (links.isEmpty()) return emptyList()
                val widest = needs.fold(1) { a, b -> maxOf(a, b) }
                val opens = IntArray(links.size)
                val bests = IntArray(links.size)
                var costs = DoubleArray(8) { Double.POSITIVE_INFINITY }
                for (i in links.indices) {
                    val best = cheapest(costs)
                    val before = if (i != 0) costs[best] else 0.0
                    val next = DoubleArray(8) { Double.POSITIVE_INFINITY }
                    var mask = 0
                    bests[i] = best
                    for (state in 0 until 8) {
                        val width = WIDTHS[state shr 1]
                        val variable = state and 1
                        if ((!packed && width != widest) || width < needs[i]) continue
                        val opening = before + 2 + variable
                        val size = links[i].references.size
                        val continuing =
                            if (i != 0 &&
                                links[i - 1].address + 1u == links[i].address &&
                                (variable == 1 || links[i - 1].references.size == size)
                            ) {
                                costs[state]
                            } else {
                                Double.POSITIVE_INFINITY
                            }
                        if (continuing <= opening) {
                            next[state] = continuing + size.toDouble() * width + variable
                        } else {
                            next[state] = opening + size.toDouble() * width + variable
                            mask = mask or (1 shl state)
                        }
                    }
                    opens[i] = mask
                    costs = next
                }
                val result = ArrayList<Pair<Int, Int>>()
                var end = links.size
                var state = cheapest(costs)
                for (i in links.indices.reversed()) {
                    if (opens[i] and (1 shl state) != 0) {
                        result.add(Pair(end - i, WIDTHS[state shr 1]))
                        end = i
                        state = bests[i]
                    }
                }
                return result.reversed()
            }

            fun packet(plan: List<Pair<Int, Int>>): LinksPacket {
                val sections = ArrayList<Section>()
                var index = 0
                var address = 1uL
                for ((count, width) in plan) {
                    val members = links.subList(index, index + count)
                    val start = members[0].address
                    var min = Int.MAX_VALUE
                    var max = 0
                    for (member in members) {
                        min = minOf(min, member.references.size)
                        max = maxOf(max, member.references.size)
                    }
                    sections.add(Section(start - address, ArityRange(min, max), width, members.map { it.references }))
                    index += count
                    address = start + count.toULong()
                }
                return LinksPacket(externalReferences, sections)
            }

            val uniform = packet(layout(false))
            if (!packedWidths) return uniform
            val packed = packet(layout(true))
            return if (packed.toBytes(DecodeLimits.unlimited()).size < uniform.toBytes(DecodeLimits.unlimited()).size) {
                packed
            } else {
                uniform
            }
        }
    }
}

/** The Unicode code points of [text], a lone surrogate read as itself. */
private fun codePoints(text: String): List<Int> {
    val result = ArrayList<Int>(text.length)
    var i = 0
    while (i < text.length) {
        val c = text[i]
        if (c.isHighSurrogate() && i + 1 < text.length && text[i + 1].isLowSurrogate()) {
            result.add(0x10000 + ((c.code - 0xD800) shl 10) + (text[i + 1].code - 0xDC00))
            i += 2
        } else {
            result.add(c.code)
            i++
        }
    }
    return result
}

private fun StringBuilder.appendCodePoint(codePoint: Int): StringBuilder {
    if (codePoint < 0x10000) {
        append(codePoint.toChar())
    } else {
        val offset = codePoint - 0x10000
        append((0xD800 + (offset shr 10)).toChar())
        append((0xDC00 + (offset and 0x3FF)).toChar())
    }
    return this
}

/** Whether [text] holds no lone surrogate, like JavaScript `isWellFormed`. */
private fun isWellFormed(text: String): Boolean {
    var i = 0
    while (i < text.length) {
        val c = text[i]
        if (c.isHighSurrogate()) {
            if (i + 1 >= text.length || !text[i + 1].isLowSurrogate()) return false
            i += 2
        } else {
            if (c.isLowSurrogate()) return false
            i++
        }
    }
    return true
}

private fun utf8Length(text: String): Long = text.encodeToByteArray().size.toLong()

/** A point of the document graph while it is built: kind `e`, `i`, `d` or `t` and a number. */
private data class Node(
    val kind: Char,
    val value: ULong,
)

private class Encoder(
    private val options: BinaryLinoOptions,
) {
    private val doublets = ArrayList<List<Node>>()
    private val tuples = ArrayList<List<Node>>()
    private val created = HashMap<String, Node>()
    private val powers = arrayListOf(Node('i', 1u))

    fun link(items: List<Node>): Node {
        val key = items.joinToString(",") { "${it.kind}${it.value}" }
        return created.getOrPut(key) {
            val doublet = items.size == 2 && items.all { it.kind != 't' }
            val target = if (doublet) doublets else tuples
            val node = Node(if (doublet) 'd' else 't', target.size.toULong())
            target.add(items)
            node
        }
    }

    fun chain(items: List<Node>): Node {
        var tail = Node('i', 0u)
        for (i in items.indices.reversed()) tail = link(listOf(items[i], tail))
        return tail
    }

    fun typed(
        marker: Int,
        elements: List<Node>,
    ): Node {
        val items = listOf(Node('i', marker.toULong())) + elements
        return if (items.size != 2 && options.arity.contains(items.size)) {
            link(items)
        } else {
            link(listOf(items[0], chain(elements)))
        }
    }

    fun list(elements: List<Node>): Node {
        if (elements.isEmpty()) return Node('i', 0u)
        return if (elements.size == 2 || options.arity.contains(elements.size)) link(elements) else typed(4, elements)
    }

    fun unary(value: ULong): Node {
        val terms = ArrayList<Node>()
        for (bit in 63 downTo 0) {
            if (value and (1uL shl bit) != 0uL) {
                while (powers.size <= bit) {
                    val p = powers.last()
                    powers.add(link(listOf(p, p)))
                }
                terms.add(powers[bit])
            }
        }
        var sum = terms.removeLastOrNull() ?: Node('i', 0u)
        while (terms.isNotEmpty()) sum = link(listOf(terms.removeAt(terms.size - 1), sum))
        return sum
    }

    fun scalar(value: ULong): Node = if (options.externalReferences && value < TOP_BIT) Node('e', value) else unary(value)

    fun reference(text: String): Node {
        val number = if (DECIMAL.matches(text) && text.length <= 20) text.toULongOrNull() else null
        if (number != null) {
            return if (options.externalReferences && number < TOP_BIT) {
                Node('e', number)
            } else {
                link(listOf(Node('i', 2u), unary(number)))
            }
        }
        return typed(3, codePoints(text).map { scalar(it.toULong()) })
    }

    fun encode(node: Link): Node {
        val id = node.id
        if (id != null && node.values.isEmpty()) return reference(id)
        if (id != null) return typed(5, listOf(reference(id)) + node.values.map { encode(it) })
        return list(node.values.map { encode(it) })
    }

    fun finish(): LinksPacket {
        fun resolve(node: Node): PacketReference =
            when (node.kind) {
                'e' -> External(node.value)
                'i' -> Address(node.value)
                else -> Address(6uL + node.value + (if (node.kind == 't') doublets.size.toULong() else 0uL))
            }
        return LinksPacket.pack(
            options.externalReferences,
            (doublets + tuples).mapIndexed { i, items -> PacketLink(6uL + i.toULong(), items.map(::resolve)) },
            options.packedWidths,
        )
    }

    companion object {
        val DECIMAL = Regex("^(0|[1-9][0-9]*)$")
    }
}

private class Decoder(
    packet: LinksPacket,
    private val limits: DecodeLimits,
) {
    private val links = ArrayList<List<PacketReference>>()
    private val unary = ArrayList<ULong?>()
    private var nodes = limits.maxNodes
    private var strings = limits.maxStringBytes

    init {
        packet.validate(limits)
        for ((address, refs) in packet.links()) {
            requireValue(
                address == 6uL + links.size.toULong() && refs.all { it is External || it.value < address },
                "document addresses must be contiguous and references backward",
            )

            fun value(r: PacketReference): ULong? =
                when {
                    r is External -> null
                    r.value <= 1u -> r.value
                    r.value >= 6u -> unary[(r.value - 6u).toInt()]
                    else -> null
                }
            val a = if (refs.size == 2) value(refs[0]) else null
            val b = if (refs.size == 2) value(refs[1]) else null
            unary.add(if (a != null && b != null && a <= ULong.MAX_VALUE - b) a + b else null)
            links.add(refs)
        }
    }

    private fun chain(start: PacketReference): List<PacketReference> {
        val elements = ArrayList<PacketReference>()
        var tail = start
        while (tail != Address(0u)) {
            requireValue(tail is Address && tail.value >= 6u, "broken chain")
            val items = links[(tail.value - 6u).toInt()]
            requireValue(items.size == 2 && elements.size < limits.maxNodes, "broken or excessive chain")
            elements.add(items[0])
            tail = items[1]
        }
        return elements
    }

    private fun number(r: PacketReference): ULong {
        val value =
            when {
                r is External -> r.value
                r.value <= 1u -> r.value
                r.value >= 6u -> unary[(r.value - 6u).toInt()]
                else -> null
            }
        requireValue(value != null, "expected unary number")
        return value!!
    }

    private fun text(text: String): Link {
        strings -= utf8Length(text)
        requireValue(strings >= 0, "string budget exceeded")
        return Link(text)
    }

    private fun isMarker(r: PacketReference): Boolean = r is Address && r.value >= 1u && r.value <= 5u

    fun decode(
        r: PacketReference,
        depth: Long,
    ): Link {
        requireValue(depth < limits.maxDepth && --nodes >= 0, "node or depth budget exceeded")
        if (r is External) return text(r.value.toString())
        if (r.value == 0uL) return Link(null)
        requireValue(r.value >= 6u, "standalone marker")
        val items = links[(r.value - 6u).toInt()]
        val elements: List<PacketReference>
        if (isMarker(items[0])) {
            val marker = items[0].value.toInt()
            elements = if (items.size != 2 || marker == 2) items.drop(1) else chain(items[1])
            if (marker == 2) {
                requireValue(elements.size == 1, "number needs one value")
                return text(number(elements[0]).toString())
            }
            if (marker == 3) {
                val chars = StringBuilder()
                var byteCount = 0L
                for (e in elements) {
                    val p = number(e)
                    requireValue(p <= 0x10ffffu && !(p >= 0xd800u && p <= 0xdfffu), "invalid Unicode scalar")
                    val size =
                        if (p <= 0x7fu) {
                            1
                        } else if (p <= 0x7ffu) {
                            2
                        } else if (p <= 0xffffu) {
                            3
                        } else {
                            4
                        }
                    requireValue(size <= strings - byteCount, "string budget exceeded")
                    byteCount += size
                    chars.appendCodePoint(p.toInt())
                }
                return text(chars.toString())
            }
            if (marker == 5) {
                requireValue(elements.isNotEmpty(), "identified needs id")
                val id = decode(elements[0], depth)
                requireValue(id.id != null && id.values.isEmpty(), "id must be reference")
                return Link(id.id, elements.drop(1).map { decode(it, depth + 1) })
            }
            requireValue(marker == 4, "invalid typed marker")
        } else {
            elements = items
        }
        return Link(null, elements.map { decode(it, depth + 1) })
    }

    fun document(): List<Link> {
        if (links.isEmpty()) return emptyList()
        val root = links.last()
        val elements =
            if (root.size == 2 && root[0] == Address(4u)) {
                chain(root[1])
            } else {
                requireValue(!isMarker(root[0]), "root must be list")
                root
            }
        return elements.map { decode(it, 0) }
    }
}

/** The document model of [node]: an anonymous link around one bare reference is that reference. */
private fun canonical(node: Link): Link {
    if (node.id == null && node.values.size == 1 && node.values[0].id != null && node.values[0].values.isEmpty()) {
        return node.values[0]
    }
    return Link(node.id, node.values.map(::canonical))
}

/**
 * [text] written as a reference of a binary document: as it is when it reads
 * back the same, quoted otherwise, and as a `~1{...}` literal when it is empty
 * or holds a control character.
 *
 * @throws IllegalArgumentException when [text] holds a lone surrogate.
 */
fun formatBinaryReference(text: String): String = formatReference(text)

/** The text of a decoded binary [document], read back by [BinaryLinoCodec.parseDocument] as the same links. */
fun formatBinaryDocument(document: List<Link>): String {
    fun nested(
        node: Link,
        top: Boolean = false,
    ): String {
        val id = node.id
        if (id != null && node.values.isEmpty()) return formatBinaryReference(id)
        val values = node.values.joinToString(" ") { nested(it) }
        if (id != null) return "(${formatBinaryReference(id)}: $values)"
        if (node.values.size == 1 && node.values[0].id != null && node.values[0].values.isEmpty()) {
            return "(($values))"
        }
        return if (top && node.values.size >= 2) values else "($values)"
    }
    return document.joinToString("\n") { nested(it, true) }
}

/** Writes Links Notation documents as binary packets and reads them back, within [limits]. */
class BinaryLinoCodec(
    val options: BinaryLinoOptions = BinaryLinoOptions(),
    val limits: DecodeLimits = DecodeLimits(),
) {
    /** The packet [document] maps to. */
    fun encodePacket(document: List<Link>): LinksPacket {
        requireValue(options.arity.contains(2), "arity must contain 2")
        val pending = ArrayList<Pair<Link, Long>>()
        for (n in document) pending.add(Pair(n, 0L))
        var nodes = 0L
        var strings = 0L
        while (pending.isNotEmpty()) {
            val (n, depth) = pending.removeAt(pending.size - 1)
            requireValue(depth < limits.maxDepth, "invalid model or excessive depth")
            nodes += 1 + (if (n.id != null && n.values.isNotEmpty()) 1 else 0)
            val id = n.id
            if (id != null) {
                requireValue(isWellFormed(id), "invalid Unicode string")
                strings += utf8Length(id)
            }
            requireValue(nodes <= limits.maxNodes && strings <= limits.maxStringBytes, "model budget exceeded")
            for (v in n.values) pending.add(Pair(v, depth + 1))
        }
        val encoder = Encoder(options)
        if (document.isNotEmpty()) encoder.list(document.map { encoder.encode(it) })
        return encoder.finish().validate(limits)
    }

    /** The bytes [document] maps to. */
    fun encode(document: List<Link>): ByteArray = encodePacket(document).toBytes(limits)

    /** The document [packet] holds. */
    fun decodePacket(packet: LinksPacket): List<Link> = Decoder(packet, limits).document()

    /** The document [bytes] hold. */
    fun decode(bytes: ByteArray): List<Link> = decodePacket(LinksPacket.fromBytes(bytes, limits))

    /** The document model of [text]: its links, an anonymous link around one bare reference unwrapped. */
    fun parseDocument(
        text: String,
        parser: Parser = Parser(),
    ): List<Link> = parser.parse(text).map(::canonical)

    /** The text of [document]; see [formatBinaryDocument]. */
    fun formatDocument(document: List<Link>): String = formatBinaryDocument(document)

    /** The bytes the document [text] maps to. */
    fun encodeText(
        text: String,
        parser: Parser = Parser(),
    ): ByteArray = encode(parseDocument(text, parser))

    /** The text of the document [bytes] hold. */
    fun decodeText(bytes: ByteArray): String = formatDocument(decode(bytes))
}
