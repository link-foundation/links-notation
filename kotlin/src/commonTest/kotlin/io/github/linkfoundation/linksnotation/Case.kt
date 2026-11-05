package io.github.linkfoundation.linksnotation

/**
 * One case of `parity/text-fixtures.json`, as `generateParityCases` writes it
 * into `ParityCases.kt`. A case with [error] has no [expected] and no
 * [format]; it has a diagnostic [code] (`syntax-error` or `depth-exceeded`)
 * and the [line] and [column] the JavaScript reference parser reports, and
 * may give a [message] the error message must contain. Only the shared corpus
 * has [lessParentheses], the exact text with less parentheses.
 */
internal data class Case(
    val id: String,
    val input: String,
    val expected: List<Link>?,
    val format: String?,
    val error: Boolean = false,
    val code: String? = null,
    val line: Int = 0,
    val column: Int = 0,
    val message: String? = null,
    val lessParentheses: String? = null,
)

/** One case of `parity/syntax-fixtures.json`: the links with how they were written, and the CST. */
internal data class SyntaxCase(
    val id: String,
    val input: String,
    val links: List<SyntaxLink>,
    val cst: String,
)

/** A link of a [SyntaxCase]: its ID, the text it was written as, and its quote. */
internal data class SyntaxLink(
    val id: String?,
    val raw: String?,
    val quote: String?,
    val values: List<SyntaxLink>,
)
