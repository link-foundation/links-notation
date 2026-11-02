package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Port of `js/tests/Binary.test.js`, with the shared golden vectors. */
class BinaryTest {
    @Test
    fun binaryTextQuotesEveryUnicodeGrammarWhitespaceCharacter() {
        for (text in listOf("\u0085", "x\u00a0y", "x\u2028y", "\u001c", "\u001d", "\u001e", "\u001f", "\ufeff")) {
            assertEquals(
                listOf(Link("root", listOf(Link(text)))),
                Parser().parse("(root: ${formatBinaryReference(text)})"),
            )
        }
    }

    @Test
    fun stringDecodingStopsAtTheUtf8BudgetBeforeReadingLaterScalars() {
        val bytes = hexBytes("13024605011001030000009fffffff9effffff0028ffff06")
        val codec = BinaryLinoCodec(limits = DecodeLimits(maxStringBytes = 1))
        val error = assertFailsWith<IllegalArgumentException> { codec.decode(bytes) }
        assertEquals("string budget exceeded", error.message)
    }

    @Test
    fun sharedBinaryGoldenVectors() {
        var count = 0
        for (line in dataLines(BINARY_VECTOR_LINES)) {
            val f = line.split('\t')
            val bytes = hexBytes(f.last())
            if (f[0] == "document") {
                val codec = BinaryLinoCodec(
                    BinaryLinoOptions(f[2] == "external", ArityRange.parse(f[3]), f[4] == "packed"),
                )
                val model = codec.parseDocument(f[1].replace("\\n", "\n"))
                assertContentEquals(bytes, codec.encode(model), line)
                assertEquals(model, codec.decode(bytes), line)
            } else {
                val links = LinksPacket.parseLinks(f[1])
                assertContentEquals(bytes, LinksPacket.pack(f[2] == "external", links, f[3] == "packed").toBytes(), line)
                assertEquals(links, LinksPacket.fromBytes(bytes).links(), line)
            }
            count++
        }
        assertEquals(96, count)
    }

    @Test
    fun allNativeTextModelsSurviveAllBinaryOptions() {
        for (source in listOf(
            "",
            "()",
            "\"\"",
            "a",
            "(a)",
            "((a))",
            "(a b c)",
            "(\"\": () \"\" (b))",
            "a:\n  b\n  c",
            "\"#x\" \"λ😀\" \"007\" \"18446744073709551615\"",
            "# comment\n(a # tail\n b)",
        )) {
            val model = Parser().parse(source)
            for (external in listOf(false, true)) {
                for (arity in listOf("2", "2..3", "1..")) {
                    for (packed in listOf(false, true)) {
                        val codec = BinaryLinoCodec(BinaryLinoOptions(external, ArityRange.parse(arity), packed))
                        assertEquals(model, codec.decode(codec.encode(model)), "$source $external $arity $packed")
                    }
                }
            }
        }
    }

    @Test
    fun configurableLimitsApplyInBothDirectionsAndMalformedPacketsAreRejected() {
        val model = listOf(Link(null, listOf(Link("abcdef"))))
        val bytes = BinaryLinoCodec().encode(model)
        for (limits in listOf(
            DecodeLimits(maxNodes = 1),
            DecodeLimits(maxStringBytes = 2),
            DecodeLimits(maxDepth = 1),
            DecodeLimits(maxLinks = 1),
            DecodeLimits(maxReferences = 1),
        )) {
            val codec = BinaryLinoCodec(limits = limits)
            assertFailsWith<IllegalArgumentException>("$limits") { codec.decode(bytes) }
            assertFailsWith<IllegalArgumentException>("$limits") { codec.encode(model) }
        }
        for (hex in listOf("", "20", "1e00", "1001", "100000", "10ffffffffffffffffffff")) {
            assertFailsWith<IllegalArgumentException>(hex) { BinaryLinoCodec().decode(hexBytes(hex)) }
        }
    }

    @Test
    fun packetCursorBoundariesUint64TruncationAndConfigurableDepth() {
        for ((external, references) in listOf(
            false to "0 18446744073709551615",
            true to "#0 #9223372036854775807",
        )) {
            val links = LinksPacket.parseLinks("6:$references")
            val data = LinksPacket.pack(external, links, true).toBytes()
            val reader = PacketReader(data + data)
            assertEquals(links, reader.read()!!.links())
            assertEquals(data.size, reader.offset)
            assertEquals(links, reader.read()!!.links())
            assertNull(reader.read())
            for (end in data.indices) {
                assertFailsWith<IllegalArgumentException> { LinksPacket.fromBytes(data.copyOf(end)) }
            }
        }
        var document = listOf(Link("leaf"))
        repeat(70) { document = listOf(Link(null, document)) }
        assertFailsWith<IllegalArgumentException> { BinaryLinoCodec().encode(document) }
        val codec = BinaryLinoCodec(limits = DecodeLimits(maxDepth = 80))
        assertEquals(document, codec.decode(codec.encode(document)))
    }

    @Test
    fun optionsArityAndTextHelpers() {
        assertEquals(ArityRange(2u, null), ArityRange.parse("2.."))
        assertEquals(ArityRange(2u, 3u), ArityRange.parse("2..3"))
        assertTrue(ArityRange.parse("1..").contains(1000))
        for (text in listOf("", "0", "a", "3..2", "2...3", "-1", "18446744073709551616")) {
            assertFailsWith<IllegalArgumentException>(text) { ArityRange.parse(text) }
        }
        val packet = LinksPacket.pack(true, LinksPacket.parseLinks("6: #1 2 3; 7: 6 6"), true)
        assertEquals(BinaryLinoOptions(true, ArityRange(2, 3), false), BinaryLinoOptions.ofPacket(packet))
        val codec = BinaryLinoCodec()
        assertEquals("a b\n(c: d)", codec.decodeText(codec.encodeText("a b\nc: d")))
        assertEquals("~1{}", formatBinaryReference(""))
        assertEquals("((a))", formatBinaryDocument(listOf(Link(null, listOf(Link("a"))))))
        assertFailsWith<IllegalArgumentException> { DecodeLimits(maxLinks = -1) }
        assertFailsWith<IllegalArgumentException> { PacketReader(ByteArray(1), 2) }
        assertFailsWith<IllegalArgumentException> { codec.encode(listOf(Link("\ud800"))) }
    }
}
