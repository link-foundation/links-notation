package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/**
 * Port of `js/tests/StreamParser.test.js`. JavaScript's `parseAsync` over an
 * async iterable has no counterpart: it would need kotlinx.coroutines, and
 * this library has no runtime dependencies. `StreamParser.parse` is the lazy
 * adapter over chunks.
 */
class StreamParserTest {
    private val document = """first loves data
# streamed comment
profile:
  name Ada
  note "line one
line two"
(nested:
  child value)
last sees first"""

    private fun formatted(links: List<Link>) = formatLinks(links)

    @Test
    fun matchesCanonicalParserOneSymbolAtATime() {
        val stream = StreamParser()
        for (character in document) stream.write(character.toString())
        assertEquals(formatted(Parser().parse(document)), formatted(stream.end()))
    }

    @Test
    fun supportsLineChunksFinalRecordAndPosition() {
        val stream = StreamParser()
        for (line in Regex(".*(?:\n|$)").findAll(document).map { it.value }.filter { it.isNotEmpty() }) {
            stream.write(line)
        }
        assertEquals(formatted(Parser().parse(document)), formatted(stream.end()))
        assertEquals(document.length, stream.position().offset)
        assertEquals(0, stream.position().buffered)
    }

    @Test
    fun emitsARecordAsSoonAsTheNextTopLevelRecordStarts() {
        val stream = StreamParser()
        val seen = ArrayList<String>()
        stream.onLink { seen.add(it.toString()) }
        assertEquals(emptyList(), stream.write("first loves data\n"))
        assertEquals(listOf("(first loves data)"), stream.write("s").map { it.toString() })
        assertEquals(listOf("(first loves data)"), seen)
    }

    @Test
    fun emitsOnlyCompleteRecords() {
        val stream = StreamParser()
        val seen = ArrayList<Link>()
        stream.onLink { seen.add(it) }
        for (character in "profile:\n  name Ada\n  role engineer\n") stream.write(character.toString())
        assertEquals(emptyList(), seen)
        stream.write("n")
        assertEquals("(profile: (name Ada) (role engineer))", formatted(seen))
    }

    @Test
    fun doesNotSplitMultilineQuotesOrParenthesizedContexts() {
        val stream = StreamParser()
        val seen = ArrayList<Link>()
        stream.onLink { seen.add(it) }
        stream.write("\"first\nsecond\"\n(nested:\n  value one)\n")
        assertEquals(1, seen.size)
        stream.write("n")
        assertEquals(2, seen.size)
    }

    @Test
    fun acceptsAFinalRecordWithoutANewline() {
        val stream = StreamParser()
        stream.write("only one record")
        assertEquals("(only one record)", formatted(stream.end()))
    }

    @Test
    fun reportsPositionsRelativeToTheWholeStream() {
        val stream = StreamParser()
        val errors = ArrayList<Throwable>()
        stream.onError { errors.add(it) }
        stream.write("good link\nnext link\nb")
        val caught = assertFailsWith<StreamParseException> { stream.end("ad: value: nope") }
        assertEquals(3, caught.line)
        assertTrue(caught.offset > "good link\nnext link\n".length)
        assertEquals(listOf<Throwable>(caught), errors)
    }

    @Test
    fun canAvoidRetainingOutputForBoundedMemoryEventProcessing() {
        val stream = StreamParser(collect = false)
        val seen = ArrayList<String>()
        stream.onLink { seen.add(it.toString()) }
        stream.write("one link\nt")
        assertEquals(emptyList(), stream.drain())
        assertEquals(listOf("(two link)"), stream.end("wo link").map { it.toString() })
        assertEquals(listOf("(one link)", "(two link)"), seen)
    }

    @Test
    fun supportsDrainResetAndBoundedMemory() {
        val stream = StreamParser()
        stream.write("one link\nt")
        assertEquals(listOf("(one link)"), stream.drain().map { it.toString() })
        assertEquals(listOf("(two link)"), stream.end("wo link").map { it.toString() })
        stream.reset().write("fresh record")
        assertEquals(listOf("(fresh record)"), stream.end().map { it.toString() })
        val bounded = StreamParser(maxBufferSize = 4)
        bounded.onError { }
        assertFailsWith<IllegalArgumentException> { bounded.write("12345") }
    }

    @Test
    fun providesLazyAdapters() {
        assertEquals(
            listOf("(one link)", "(two link)"),
            StreamParser.parse(listOf("one link\n", "two link")).map { it.toString() }.toList(),
        )
        var pulled = 0
        val chunks = sequence {
            pulled++
            yield("one link\n")
            pulled++
            yield("two link")
        }
        val links = StreamParser.parse(chunks).iterator()
        assertEquals("(one link)", links.next().toString())
        assertEquals(2, pulled)
        assertEquals("(two link)", links.next().toString())
        assertTrue(!links.hasNext())
    }

    @Test
    fun limitsOnlyTheUnresolvedRecordNotTotalStreamSize() {
        val stream = StreamParser(maxBufferSize = 12, collect = false)
        stream.onError { }
        for (index in 0 until 100) stream.write("a$index\n")
        assertEquals(listOf("(a99)"), stream.end().map { it.toString() })
    }

    @Test
    fun rejectsWritesAfterFinish() {
        val stream = StreamParser()
        stream.end("one")
        stream.onError { }
        val error = assertFailsWith<IllegalStateException> { stream.write("two") }
        assertTrue(error.message!!.contains("after end"))
    }

    @Test
    fun tracksTheAbsoluteStreamPosition() {
        val stream = StreamParser()
        stream.write("one\ntw")
        assertEquals(StreamParser.Position(offset = 6, line = 2, column = 3, buffered = 2), stream.position())
    }

    @Test
    fun followsTheParserOptions() {
        val stream = StreamParser(ParserOptions(comments = false))
        assertEquals(listOf(Link(null, listOf(Link("#a"), Link("b")))), stream.end("#a b"))
        val links = StreamParser(ParserOptions(syntax = false)).end("('a': b)")
        assertEquals(null, links.single().rawId)
        assertEquals("'a'", StreamParser().end("('a': b)").single().rawId)
    }
}
