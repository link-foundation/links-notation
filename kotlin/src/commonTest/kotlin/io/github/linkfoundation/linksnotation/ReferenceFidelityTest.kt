package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/** Port of `js/tests/ReferenceFidelity.test.js`, over `docs/protocol/reference-literals.txt`. */
class ReferenceFidelityTest {
    @Test
    fun nativeReferenceFidelity() {
        assertTrue(REFERENCES.isNotEmpty())
        for (id in REFERENCES) {
            val original = Link(id, listOf(Link(id), Link("nested", listOf(Link(id)))))
            for (text in listOf(
                formatLinks(listOf(original), false),
                formatLinks(listOf(original), true),
                formatLinks(listOf(original), FormatConfig(maxInlineRefs = 1, preferInline = false)),
            )) {
                assertEquals(listOf(original), Parser().parse(text), text)
            }
        }
    }

    @Test
    fun referenceLiteralsAtEveryChunkSplit() {
        for (id in REFERENCES) {
            assertEquals(id, decodeReferenceLiteral(encodeReferenceLiteral(id)))
            for (literal in listOf(escapeReference(id), formatBinaryReference(id), encodeReferenceLiteral(id))) {
                val text = "(root: $literal)\n($literal: fixture)"
                val expected = listOf(Link("root", listOf(Link(id))), Link(id, listOf(Link("fixture"))))
                assertEquals(expected, Parser().parse(text), text)
                for (split in 0..text.length) {
                    val stream = StreamParser()
                    stream.write(text.substring(0, split))
                    stream.write(text.substring(split))
                    assertEquals(expected, stream.end(), "$text split at $split")
                }
            }
        }
    }

    @Test
    fun binaryReferenceFidelity() {
        val codec = BinaryLinoCodec()
        for (id in REFERENCES) {
            val original = listOf(Link(id, listOf(Link(id))))
            val decoded = codec.decode(codec.encode(original))
            assertEquals(original, decoded)
            assertEquals(original, codec.parseDocument(codec.formatDocument(decoded)))
        }
    }

    @Test
    fun malformedReferenceLiteralsAreRejected() {
        val invalid = dataLines(INVALID_REFERENCE_LITERAL_LINES)
        assertTrue(invalid.isNotEmpty())
        for (literal in invalid) {
            assertFailsWith<IllegalArgumentException>(literal) { decodeReferenceLiteral(literal) }
            assertFailsWith<ParseException>(literal) { Parser().parse(literal) }
        }
        assertFailsWith<IllegalArgumentException> { decodeReferenceLiteral("~1{61}\n") }
        assertEquals("é", decodeReferenceLiteral("~1{C3A9}"))
        assertFailsWith<IllegalArgumentException> { encodeReferenceLiteral(LONE_SURROGATE) }
        assertFailsWith<IllegalArgumentException> { escapeReference(LONE_SURROGATE) }
    }
}
