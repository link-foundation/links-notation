package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** Port of `js/tests/NestedSelfReference.test.js`. */
class NestedSelfReferenceTest {
    private fun assertPair(pair: Link, first: String, second: String) {
        assertNull(pair.id)
        assertEquals(listOf("str", first), pair.values[0].values.map { it.id })
        assertEquals(listOf("str", second), pair.values[1].values.map { it.id })
    }

    @Test
    fun nestedSelfReferencedObjectInPairValue() {
        val notation = "(obj_0: dict ((str bmFtZQ==) (str ZGljdDE=)) ((str b3RoZXI=) " +
            "(obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))))"
        val links = Parser().parse(notation)
        assertEquals(1, links.size)
        val link = links[0]
        assertEquals("obj_0", link.id)
        assertEquals(3, link.values.size)
        assertEquals("dict", link.values[0].id)
        assertPair(link.values[1], "bmFtZQ==", "ZGljdDE=")

        val pair2 = link.values[2]
        assertNull(pair2.id)
        assertEquals(2, pair2.values.size)
        assertNull(pair2.values[0].id)
        assertEquals(listOf("str", "b3RoZXI="), pair2.values[0].values.map { it.id })

        val obj1 = pair2.values[1]
        assertEquals("obj_1", obj1.id)
        assertEquals(3, obj1.values.size)
        assertEquals("dict", obj1.values[0].id)
        assertPair(obj1.values[1], "bmFtZQ==", "ZGljdDI=")
        val obj1Pair2 = obj1.values[2]
        assertEquals(2, obj1Pair2.values.size)
        assertEquals(listOf("str", "b3RoZXI="), obj1Pair2.values[0].values.map { it.id })
        assertEquals("obj_0", obj1Pair2.values[1].id)
        assertEquals(emptyList(), obj1Pair2.values[1].values)
    }

    @Test
    fun selfReferenceAsDirectChildWorksCorrectly() {
        val links = Parser().parse("(obj_0: list (int 1) (int 2) (obj_1: list (int 3) (int 4) obj_0))")
        assertEquals(1, links.size)
        assertEquals("obj_0", links[0].id)
        assertEquals(4, links[0].values.size)
        val obj1 = links[0].values[3]
        assertEquals("obj_1", obj1.id)
        assertEquals(4, obj1.values.size)
        assertEquals("obj_0", obj1.values[3].id)
    }
}
