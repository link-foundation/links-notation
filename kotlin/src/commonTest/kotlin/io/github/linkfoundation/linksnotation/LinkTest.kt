package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull

/** Port of `js/tests/Link.test.js`. */
class LinkTest {
    @Test
    fun linkConstructorWithIdOnly() {
        val link = Link("test")
        assertEquals("test", link.id)
        assertEquals(emptyList(), link.values)
    }

    @Test
    fun linkConstructorWithIdAndValues() {
        val link = Link("parent", listOf(Link("child1"), Link("child2")))
        assertEquals("parent", link.id)
        assertEquals(2, link.values.size)
        assertEquals("child1", link.values[0].id)
        assertEquals("child2", link.values[1].id)
    }

    @Test
    fun linkToStringWithIdOnly() {
        assertEquals("(test)", Link("test").toString())
    }

    @Test
    fun linkToStringWithValuesOnly() {
        assertEquals("(value1 value2)", Link(null, listOf(Link("value1"), Link("value2"))).toString())
    }

    @Test
    fun linkToStringWithIdAndValues() {
        assertEquals("(parent: child1 child2)", Link("parent", listOf(Link("child1"), Link("child2"))).toString())
    }

    @Test
    fun linkEscapeReferenceSimple() {
        assertEquals("simple", escapeReference("simple"))
    }

    @Test
    fun linkEscapeReferenceWithSpecialCharacters() {
        assertEquals("'has:colon'", escapeReference("has:colon"))
        assertEquals("'has space'", escapeReference("has space"))
        assertEquals("'has(paren)'", escapeReference("has(paren)"))
        assertEquals("'has\"quote'", escapeReference("has\"quote"))
        assertEquals("\"has'quote\"", escapeReference("has'quote"))
    }

    @Test
    fun linkSimplify() {
        val simplified = Link(null, listOf(Link("single"))).simplify()
        assertEquals("single", simplified.id)
        assertEquals(emptyList(), simplified.values)
    }

    @Test
    fun linkCombine() {
        val combined = Link("first").combine(Link("second"))
        assertNull(combined.id)
        assertEquals(2, combined.values.size)
        assertEquals("first", combined.values[0].id)
        assertEquals("second", combined.values[1].id)
    }

    @Test
    fun linkEquals() {
        val link1 = Link("test", listOf(Link("child")))
        val link2 = Link("test", listOf(Link("child")))
        val link3 = Link("different", listOf(Link("child")))
        assertEquals(link1, link2)
        assertEquals(link1.hashCode(), link2.hashCode())
        assertNotEquals(link1, link3)
    }
}
