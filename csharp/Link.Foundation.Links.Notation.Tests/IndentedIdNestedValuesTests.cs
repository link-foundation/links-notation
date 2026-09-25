using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public class IndentedIdNestedValuesTests
    {
        [Fact]
        public void IndentedIdRetainsNestedValues()
        {
            var cases = new[]
            {
                new[] { "outer:\n  inner:\n    value1\n    value2\n  value3", "(outer: (inner: value1 value2) value3)" },
                new[] { "statement:\n  subject:\n    I\n  verb:\n    love\n  object:\n    you:\n      very\n      much", "(statement: (subject: I) (verb: love) (object: (you: very much)))" },
                new[] { "document:\n  (metadata: title author date)\n  content:\n    paragraph1\n    (paragraph2: text (with: nested structure))\n    paragraph3", "(document: (metadata: title author date) (content: paragraph1 (paragraph2: text (with: nested structure)) paragraph3))" },
                new[] { "image:\n    file: .gitpod.Dockerfile\n    context: ./docker-content", "(image: (file: .gitpod.Dockerfile) (context: ./docker-content))" },
                new[] { "level1:\n  level2:\n    level3a\n    level3b\n  level2b", "(level1: (level2: level3a level3b) level2b)" },
                new[] { "root:\n  child1\n  child2\n    grandchild", "(root: child1 (child2 grandchild))" },
            };

            var parser = new Parser();
            foreach (var testCase in cases)
            {
                Assert.Equal(testCase[1], parser.Parse(testCase[0]).Format());
            }
        }
    }
}
