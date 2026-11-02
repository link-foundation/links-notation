package io.github.linkfoundation.linksnotation

/**
 * What the grammar reads, before [Parser] turns it into links: the objects the
 * actions of `js/src/grammar.pegjs` return. A null field is a field the
 * JavaScript object does not have.
 *
 * - `{ id, rawId }`: a reference, and the text it was written as;
 * - `{ id, values }`: a link with an ID (an indented ID has no values);
 * - `{ values }`: an anonymous link;
 * - `{ nested }`: a parenthesised group and the links read inside it;
 * - any of these with `children`: the lines indented under it.
 */
internal class RawItem(
    val id: String? = null,
    val rawId: String? = null,
    val values: List<RawItem>? = null,
    val nested: List<RawItem>? = null,
    val children: List<RawItem>? = null,
) {
    fun withChildren(children: List<RawItem>): RawItem = RawItem(id, rawId, values, nested, children)
}
