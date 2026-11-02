package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertSame
import kotlin.test.assertTrue

/**
 * Port of `js/tests/LinksGroup.test.js`. A JavaScript group's children may be
 * links or groups; a Kotlin group's children are groups, so a child link is
 * written `LinksGroup(link)`.
 */
class LinksGroupTest {
    @Test
    fun linksGroupConstructor() {
        val element = Link("root")
        val children = listOf(LinksGroup(Link("child1")), LinksGroup(Link("child2")))
        val group = LinksGroup(element, children)
        assertSame(element, group.element)
        assertSame(children, group.children)
    }

    @Test
    fun linksGroupToListFlattensStructure() {
        val root = Link("root")
        val child1 = Link("child1")
        val child2 = Link("child2")
        val grandchild = Link("grandchild")
        val group = LinksGroup(root, listOf(LinksGroup(child1), LinksGroup(child2, listOf(LinksGroup(grandchild)))))
        val list = group.toList()
        assertEquals(4, list.size)
        assertSame(root, list[0])
        assertSame(child1, list[1])
        assertSame(child2, list[2])
        assertSame(grandchild, list[3])
    }

    @Test
    fun linksGroupToString() {
        val group = LinksGroup(Link("root"), listOf(LinksGroup(Link("child1")), LinksGroup(Link("child2"))))
        val text = group.toString()
        assertTrue("(root)" in text)
        assertTrue("(child1)" in text)
        assertTrue("(child2)" in text)
    }

    @Test
    fun linksGroupConstructorEquivalentTest() {
        val root = Link("root")
        val children = listOf(Link("child1"), Link("child2"))
        val group = LinksGroup(Link("group"), listOf(LinksGroup(root)) + children.map { LinksGroup(it) })
        assertEquals("group", group.element.id)
        assertEquals(3, group.children.size)
        assertSame(root, group.children[0].element)
    }

    @Test
    fun linksGroupAppendToLinksListTest() {
        val element = Link("root")
        val children = listOf(Link("child1"), Link("child2"))
        val list = ArrayList<Link>()
        list.addAll(LinksGroup(element, children.map { LinksGroup(it) }).toList())
        assertEquals(3, list.size)
        assertSame(element, list[0])
        assertSame(children[0], list[1])
        assertSame(children[1], list[2])
    }

    @Test
    fun parseGroupsKeepsTheIndentationTree() {
        val groups = Parser().parseGroups("root:\n  child\n    grandchild\nother")
        assertEquals(2, groups.size)
        assertEquals("root", groups[0].element.id)
        assertEquals(listOf("child", "grandchild"), groups[0].children[0].toList().map { it.values.single().id })
        assertEquals(listOf(Link(null, listOf(Link("other")))), groups[1].toList())
    }
}
