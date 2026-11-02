package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals

/** Port of `js/tests/IndentationConsistency.test.js` (issue #135). */
class IndentationConsistencyTest {
    private val parser = Parser()

    private fun assertSameLinks(
        first: String,
        second: String,
    ) {
        assertEquals(formatLinks(parser.parse(second)), formatLinks(parser.parse(first)))
    }

    @Test
    fun leadingSpacesVsNoLeadingSpaces() {
        val withLeading =
            """
            |  TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
            |  TELEGRAM_ALLOWED_CHATS:
            |    -1002975819706
            |    -1002861722681
            |  TELEGRAM_HIVE_OVERRIDES:
            |    --all-issues
            |    --once
            |  TELEGRAM_BOT_VERBOSE: true
            """.trimMargin()
        val withoutLeading =
            """
            |TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
            |TELEGRAM_ALLOWED_CHATS:
            |  -1002975819706
            |  -1002861722681
            |TELEGRAM_HIVE_OVERRIDES:
            |  --all-issues
            |  --once
            |TELEGRAM_BOT_VERBOSE: true
            """.trimMargin()
        assertSameLinks(withLeading, withoutLeading)
    }

    @Test
    fun twoSpacesVsFourSpacesIndentation() {
        val keys =
            listOf(
                "TELEGRAM_ALLOWED_CHATS:" to listOf("-1002975819706", "-1002861722681"),
                "TELEGRAM_HIVE_OVERRIDES:" to
                    listOf(
                        "--all-issues",
                        "--once",
                        "--auto-fork",
                        "--skip-issues-with-prs",
                        "--attach-logs",
                        "--verbose",
                        "--no-tool-check",
                    ),
                "TELEGRAM_SOLVE_OVERRIDES:" to
                    listOf(
                        "--auto-fork",
                        "--auto-continue",
                        "--attach-logs",
                        "--verbose",
                        "--no-tool-check",
                    ),
            )

        fun document(indent: String) =
            buildString {
                append("TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\n")
                for ((key, values) in keys) {
                    append(key).append('\n')
                    for (value in values) append(indent).append(value).append('\n')
                }
                append("TELEGRAM_BOT_VERBOSE: true")
            }
        assertSameLinks(document("  "), document("    "))
    }

    @Test
    fun simpleTwoVsFourSpacesIndentation() {
        assertSameLinks("parent:\n  child1\n  child2", "parent:\n    child1\n    child2")
    }

    @Test
    fun threeLevelNestingWithDifferentIndentation() {
        assertSameLinks(
            "level1:\n  level2:\n    level3a\n    level3b\n  level2b",
            "level1:\n    level2:\n        level3a\n        level3b\n    level2b",
        )
    }
}
