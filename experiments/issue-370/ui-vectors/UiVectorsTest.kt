package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * link-foundation/ui's ui-dialect/0 parser vectors, which its vendored copy of
 * this port (native/kotlin/links-notation, SpecVectorsTest.kt) checked before
 * the port moved here. `ui-vectors.init.gradle` puts them in [PARITY_CASES].
 */
class UiVectorsTest {
    @Test
    fun everyUiVectorReadsFormatsAndFailsLikeJavaScript() {
        assertEquals(50, PARITY_CASES.size)
        for (case in PARITY_CASES) {
            assertCase(case, ParserOptions(maxDepth = 64, maxInputSize = 1024 * 1024))
        }
        assertEquals(
            listOf("errors/syntax-colon-in-value", "errors/syntax-depth-exceeded", "errors/syntax-unquoted-hex"),
            PARITY_CASES.filter { it.error }.map { it.id },
        )
    }
}
