using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// Tests for indentation inside parentheses.
    ///
    /// See https://github.com/link-foundation/links-notation/issues/282
    ///
    /// Indentation is structural at the root, so it must be structural inside parentheses too:
    /// a parenthesized group opens a nested context that starts fresh at indentation level zero
    /// and follows exactly the root's rules.
    /// </summary>
    public class NestedIndentationTests
    {
        private static string FormatSource(string source) => new Parser().Parse(source).Format();

        private static void AssertFormat(string source, string expected) => Assert.Equal(expected, FormatSource(source));

        [Fact]
        public void ParenthesesReproduceRootIndentation()
        {
            AssertFormat("a\n  b\nc\n  d", "(a)\n((a) (b))\n(c)\n((c) (d))");

            // The same lines inside parentheses keep the same structure, nested under
            // the link the group belongs to.
            AssertFormat("array (\n  a\n    b\n  c\n    d\n)", "(array ((a) ((a) (b)) (c) ((c) (d))))");
        }

        [Fact]
        public void ParenthesesKeepRecordBoundaries()
        {
            var source = "value (\n  id \"1\"\n  label \"one\"\n)";
            AssertFormat(source, "(value ((id 1) (label one)))");

            var links = new Parser().Parse(source);
            Assert.Single(links);

            var group = links[0].Values![1];
            Assert.Null(group.Id);
            Assert.Equal(2, group.Values!.Count);
            Assert.Equal("id", group.Values[0].Values![0].Id);
            Assert.Equal("1", group.Values[0].Values![1].Id);
            Assert.Equal("label", group.Values[1].Values![0].Id);
            Assert.Equal("one", group.Values[1].Values![1].Id);
        }

        [Fact]
        public void ParenthesesKeepSeveralRecordsSeparate()
        {
            AssertFormat(
                "value (\n  (id \"1\" label \"one\")\n  (id \"2\" label \"two\")\n)",
                "(value ((id 1 label one) (id 2 label two)))");
        }

        [Fact]
        public void ParenthesesNestDeeply()
        {
            AssertFormat("outer (\n  inner (\n    x 1\n    y 2\n  )\n  z 3\n)", "(outer ((inner ((x 1) (y 2))) (z 3)))");
        }

        [Fact]
        public void SingleLineParenthesesAreUnchanged()
        {
            AssertFormat("(a b c)", "(a b c)");
            AssertFormat("(1: 2 3)", "(1: 2 3)");
            AssertFormat("(a: b c)", "(a: b c)");
            AssertFormat("((a b))", "((a b))");
            AssertFormat("(a)", "(a)");
            AssertFormat("()", "()");
        }

        [Fact]
        public void ParenthesesWithIndentedIdSyntax()
        {
            AssertFormat("(\n  a:\n    b\n    c\n)", "(a: b c)");
        }

        [Fact]
        public void EmployeeRecordsKeepTheirFields()
        {
            var source = "empInfo\n  employees:\n    (\n      name (James Kirk)\n      age 40\n    )\n"
                + "    (\n      name (Jean-Luc Picard)\n      age 45\n    )";
            var expected = "(empInfo)\n((empInfo) (employees: ((name (James Kirk)) (age 40))"
                + " ((name (Jean-Luc Picard)) (age 45))))";
            AssertFormat(source, expected);
        }
    }
}
