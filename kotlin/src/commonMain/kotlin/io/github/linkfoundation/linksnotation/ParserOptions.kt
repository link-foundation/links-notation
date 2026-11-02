package io.github.linkfoundation.linksnotation

/**
 * How a [Parser] reads a document.
 *
 * @property maxDepth How deep links may nest: every parenthesised group and
 *   every indentation level is one level. The same default as every other
 *   Links Notation implementation, so a document one reads is not too deep
 *   for another.
 * @property maxInputSize The longest document read, in UTF-16 code units;
 *   null means the JavaScript default of 10 MiB.
 * @property comments Whether `#` at the start of a token starts a comment.
 * @property syntax Whether links record how their IDs were written. When
 *   false, links are read as a bare abstract syntax tree: [Link.rawId] and
 *   [Link.quote] are null.
 */
data class ParserOptions(
    val maxDepth: Int = DEFAULT_MAX_DEPTH,
    val maxInputSize: Int? = null,
    val comments: Boolean = true,
    val syntax: Boolean = true,
) {
    init {
        require(maxDepth >= 0) { "maxDepth must not be negative" }
        require(maxInputSize == null || maxInputSize >= 0) { "maxInputSize must not be negative" }
    }

    companion object {
        /** How deep links may nest when nothing says otherwise. */
        const val DEFAULT_MAX_DEPTH: Int = 64

        /** The longest document read when nothing says otherwise: 10 MiB. */
        const val DEFAULT_MAX_INPUT_SIZE: Int = 10 * 1024 * 1024
    }
}
