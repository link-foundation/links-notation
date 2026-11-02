package io.github.linkfoundation.linksnotation

/*
 * How a reference is written: ports of `js/src/ReferenceLiteral.js` and
 * `js/src/references.js` of link-foundation/links-notation.
 */

/** Whether [text] has the reserved versioned-literal prefix `~<digits>{` at [start]. */
internal fun hasReferenceLiteralPrefix(text: String, start: Int = 0): Boolean {
    var position = start
    if (position >= text.length || text[position] != '~') return false
    position++
    val digits = position
    while (position < text.length && text[position] in '0'..'9') position++
    return position > digits && position < text.length && text[position] == '{'
}

/**
 * [text] as a version 1 UTF-8 hexadecimal reference literal, `~1{...}`, like
 * JavaScript `encodeReferenceLiteral`.
 *
 * @throws IllegalArgumentException when [text] holds a lone surrogate.
 */
fun encodeReferenceLiteral(text: String): String {
    requireWellFormed(text)
    val hex = StringBuilder("~1{")
    for (byte in text.encodeToByteArray()) {
        val value = byte.toInt() and 0xFF
        hex.append(HEX_DIGITS[value shr 4]).append(HEX_DIGITS[value and 0xF])
    }
    return hex.append('}').toString()
}

private const val HEX_DIGITS = "0123456789abcdef"

/**
 * The text of a complete `~1{<UTF-8 hex>}` literal, like JavaScript
 * `decodeReferenceLiteral`.
 *
 * @throws IllegalArgumentException when [literal] is not a version 1 literal
 *   of well-formed UTF-8.
 */
fun decodeReferenceLiteral(literal: String): String {
    val invalid = "Invalid or unsupported reference literal (expected ~1{UTF-8 hex})"
    require(literal.startsWith("~1{") && literal.endsWith("}")) { invalid }
    val hex = literal.substring(3, literal.length - 1)
    require(hex.length % 2 == 0 && hex.all { it.isHexDigit() }) { invalid }
    val bytes = ByteArray(hex.length / 2) { index -> hex.substring(2 * index, 2 * index + 2).toInt(16).toByte() }
    return try {
        bytes.decodeToString(throwOnInvalidSequence = true)
    } catch (malformed: CharacterCodingException) {
        throw IllegalArgumentException(invalid, malformed)
    }
}

private fun Char.isHexDigit(): Boolean = this in '0'..'9' || this in 'a'..'f' || this in 'A'..'F'

/** Throw [IllegalArgumentException] when [text] holds a lone surrogate, like JavaScript `isWellFormed`. */
private fun requireWellFormed(text: String) {
    var index = 0
    while (index < text.length) {
        val character = text[index]
        if (character.isHighSurrogate()) {
            require(index + 1 < text.length && text[index + 1].isLowSurrogate()) {
                "Reference must be well-formed Unicode text"
            }
            index += 2
        } else {
            require(!character.isLowSurrogate()) { "Reference must be well-formed Unicode text" }
            index++
        }
    }
}

/** Whether [character] is a C0 control character or DEL. */
private fun isControl(character: Char): Boolean = character < ' ' || character == '\u007f'

/** The `White_Space` property of Unicode, plus U+FEFF, as `formatReference` tests it. */
internal fun isSpaceLike(character: Char): Boolean =
    when (character) {
        in '\u0009'..'\u000d', '\u0020', '\u0085', '\u00a0', '\u1680', in '\u2000'..'\u200a',
        '\u2028', '\u2029', '\u202f', '\u205f', '\u3000', '\ufeff',
        -> true
        else -> false
    }

/**
 * [text] written as a reference: as it is when it reads back the same, between
 * the quote that needs the fewest delimiters otherwise, and as a `~1{...}`
 * literal when it is empty or holds a control character.
 */
internal fun formatReference(text: String): String {
    requireWellFormed(text)
    if (text.isEmpty() || text.any(::isControl)) {
        return encodeReferenceLiteral(text)
    }
    if (!text.startsWith('#') &&
        !hasReferenceLiteralPrefix(text) &&
        text.none { isSpaceLike(it) || it in "():\"'`" }
    ) {
        return text
    }
    var choice: Char? = null
    var choiceCount = 0
    for (quote in "'\"`") {
        if (text.startsWith(quote)) continue
        var longest = 0
        var run = 0
        for (character in text) {
            run = if (character == quote) run + 1 else 0
            longest = maxOf(longest, run)
        }
        val count = (longest + 1) or 1
        if (choice == null || count < choiceCount) {
            choice = quote
            choiceCount = count
        }
    }
    val delimiter = choice!!.toString().repeat(choiceCount)
    return delimiter + text + delimiter
}

/**
 * Quote one reference, like JavaScript `escapeReference`. With [minimal],
 * ordinary single-space prose stays unquoted; a null reference is written as
 * nothing.
 */
fun escapeReference(reference: String?, minimal: Boolean = false): String {
    if (reference == null) return ""
    requireWellFormed(reference)
    if (!minimal || reference.isEmpty() || reference.any(::isControl)) {
        return formatReference(reference)
    }
    if (!needsMinimalQuoting(reference)) return reference

    val singleQuotes = reference.count { it == '\'' }
    val doubleQuotes = reference.count { it == '"' }
    var quote = if (singleQuotes <= doubleQuotes) '\'' else '"'
    // The opening delimiter must be a run of exactly one quote.
    if (reference.startsWith(quote)) quote = if (quote == '\'') '"' else '\''
    val doubled = "$quote$quote"
    return quote + reference.replace(quote.toString(), doubled) + quote
}

/** Port of the `needsQuoting` test of minimal `escapeReference`. */
private fun needsMinimalQuoting(reference: String): Boolean {
    for (index in reference.indices) {
        val atTokenStart = index == 0 || reference[index - 1] == ' '
        val character = reference[index]
        if (atTokenStart && hasReferenceLiteralPrefix(reference, index)) return true
        if (atTokenStart && character == '#') return true
        if (character in ":()'\"`") return true
        if (character != ' ' && isSpaceLike(character)) return true
    }
    return reference.startsWith(' ') || reference.endsWith(' ') || reference.contains("  ")
}

/**
 * Decode one complete escaped reference with the parser's delimiter rules, like
 * JavaScript `unescapeReference`. Plain text is returned unchanged. A parsed
 * [Link.id] is already decoded and must not be passed through it again.
 *
 * @throws IllegalArgumentException when [reference] starts with a quote or a
 *   literal prefix but is not one complete quoted reference or literal.
 */
fun unescapeReference(reference: String): String {
    if (hasReferenceLiteralPrefix(reference)) {
        return decodeReferenceLiteral(reference)
    }
    if (reference.isEmpty() || reference[0] !in QUOTES) return reference
    val reading = readReference(reference, 0)
    require(reading != null && reading.length == reference.length) { "Expected one complete quoted reference" }
    return reading.value
}

/**
 * The delimiter a reference was written between, read from the reference as it
 * was written, like JavaScript `referenceQuote`: `'`, `"` or `` ` `` for a
 * quoted reference (however many of them open it), and null for a bare
 * reference, a versioned literal, an unclosed quote, or no text.
 */
fun referenceQuote(raw: String?): String? {
    if (raw.isNullOrEmpty() || raw[0] !in QUOTES) return null
    val reading = readReference(raw, 0)
    return if (reading != null && reading.length == raw.length) raw[0].toString() else null
}
