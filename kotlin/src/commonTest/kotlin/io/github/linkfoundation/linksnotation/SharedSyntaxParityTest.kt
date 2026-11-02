package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Port of `js/tests/SharedSyntaxParity.test.js`: the shared syntax corpus,
 * `parity/syntax-fixtures.json`, which `generateParityCases` turns into
 * [SYNTAX_CASES].
 */
class SharedSyntaxParityTest {
    @Test
    fun sharedSyntaxParityRawReferencesAndConcreteSyntaxTrees() {
        assertEquals(15, SYNTAX_CASES.size)
        for (case in SYNTAX_CASES) {
            val parser = Parser()
            assertEquals(case.links, syntaxTree(parser.parse(case.input)), case.id)
            val cst = parser.parseCst(case.input)
            assertEquals(case.cst, cst.toSExpression(), case.id)
            assertEquals(case.input, cst.toString(), case.id)
            val stream = StreamParser()
            for (character in case.input) stream.write(character.toString())
            assertEquals(case.links, syntaxTree(stream.end()), case.id)
        }
    }

    @Test
    fun everySharedInputIsRecoveredExactlyFromItsConcreteSyntaxTree() {
        for ((id, input) in PARITY_CASES.map { it.id to it.input } + SYNTAX_CASES.map { it.id to it.input }) {
            val cst = Parser().parseCst(input)
            assertEquals(input, cst.toString(), id)
            assertEquals(input, cst.tokens().joinToString("") { it.text }, id)
        }
    }

    @Test
    fun astModeLeavesTheMetadataOutAndEqualityIgnoresIt() {
        for (case in SYNTAX_CASES) {
            val syntax = Parser().parse(case.input)
            val ast = Parser(ParserOptions(syntax = false)).parse(case.input)
            assertEquals(syntax, ast, case.id)
            assertEquals(syntax.hashCode(), ast.hashCode(), case.id)
            assertEquals(formatLinks(syntax), formatLinks(ast), case.id)

            fun noMetadata(links: List<Link>) {
                for (link in links) {
                    assertNull(link.rawId, case.id)
                    assertNull(link.quote, case.id)
                    noMetadata(link.values)
                }
            }
            noMetadata(ast)
        }
        assertTrue(SYNTAX_CASES.any { case -> hasRaw(Parser().parse(case.input)) })
    }

    private fun hasRaw(links: List<Link>): Boolean = links.any { it.rawId != null || hasRaw(it.values) }

    private fun syntaxTree(links: List<Link>): List<SyntaxLink> = links.map { SyntaxLink(it.id, it.rawId, it.quote, syntaxTree(it.values)) }
}
