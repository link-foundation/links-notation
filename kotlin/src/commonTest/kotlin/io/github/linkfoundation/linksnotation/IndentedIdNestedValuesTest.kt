package io.github.linkfoundation.linksnotation

import kotlin.test.Test
import kotlin.test.assertEquals

/** Port of `js/tests/IndentedIdNestedValues.test.js`. */
class IndentedIdNestedValuesTest {
    @Test
    fun indentedIdRetainsNestedValues() {
        for ((source, expected) in listOf(
            "outer:\n  inner:\n    value1\n    value2\n  value3" to "(outer: (inner: value1 value2) value3)",
            "statement:\n  subject:\n    I\n  verb:\n    love\n  object:\n    you:\n      very\n      much" to
                "(statement: (subject: I) (verb: love) (object: (you: very much)))",
            "document:\n  (metadata: title author date)\n  content:\n    paragraph1\n" +
                "    (paragraph2: text (with: nested structure))\n    paragraph3" to
                "(document: (metadata: title author date) (content: paragraph1 " +
                "(paragraph2: text (with: nested structure)) paragraph3))",
            "image:\n    file: .gitpod.Dockerfile\n    context: ./docker-content" to
                "(image: (file: .gitpod.Dockerfile) (context: ./docker-content))",
            "level1:\n  level2:\n    level3a\n    level3b\n  level2b" to "(level1: (level2: level3a level3b) level2b)",
            "root:\n  child1\n  child2\n    grandchild" to "(root: child1 (child2 grandchild))",
        )) {
            val parser = Parser()
            assertEquals(expected, formatLinks(parser.parse(source)))
            assertEquals(parser.parse(expected), parser.parse(source))
        }
    }
}
