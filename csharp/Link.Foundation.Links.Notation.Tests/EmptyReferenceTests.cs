using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// Conformance tests for the empty reference.
    ///
    /// https://github.com/link-foundation/links-notation/issues/288
    ///
    /// A bare delimiter pair is the empty reference. The three delimiters
    /// <c>"</c>, <c>'</c> and <c>`</c> behave identically, and every longer
    /// n-quote run keeps the meaning it already had. The table below is shared
    /// with the Rust, JavaScript, Python, Go, Java and PHP suites, so a document
    /// written by one implementation reads the same in all of them.
    /// </summary>
    public static class EmptyReferenceTests
    {
        /// <summary>
        /// Renders a parsed node unambiguously: every reference is wrapped in
        /// angle brackets so an empty one is visible as &lt;&gt;.
        /// </summary>
        private static string Render(Link<string> node)
        {
            if (node.Values == null || node.Values.Count == 0)
            {
                return "<" + (node.Id ?? "") + ">";
            }
            var head = node.Id == null ? "" : "<" + node.Id + ">: ";
            return "(" + head + string.Join(" ", node.Values.Select(Render)) + ")";
        }

        private static string Rendered(string source)
        {
            var links = new Parser().Parse(source);
            return string.Join("\n", links.Select(Render));
        }

        private static void AssertParsesAs(string source, string expected)
        {
            Assert.Equal(expected, Rendered(source));
        }

        [Fact]
        public static void BareDelimiterPairIsTheEmptyReference()
        {
            AssertParsesAs("(a \"\" b)", "(<a> <> <b>)");
        }

        [Fact]
        public static void EveryDelimiterStyleYieldsTheSameEmptyReference()
        {
            AssertParsesAs("(a \"\" b)", "(<a> <> <b>)");
            AssertParsesAs("(a '' b)", "(<a> <> <b>)");
            AssertParsesAs("(a `` b)", "(<a> <> <b>)");
        }

        [Fact]
        public static void AdjacentEmptyReferencesStaySeparate()
        {
            AssertParsesAs("(a \"\" \"\" b)", "(<a> <> <> <b>)");
            AssertParsesAs("(a '' '' b)", "(<a> <> <> <b>)");
            AssertParsesAs("(a `` `` b)", "(<a> <> <> <b>)");
            AssertParsesAs("(a \"\"  \"\" b)", "(<a> <> <> <b>)");
        }

        [Fact]
        public static void NestedEmptyReferencesParse()
        {
            AssertParsesAs("(\"\" (\"\" 1))", "(<> (<> <1>))");
            AssertParsesAs("(\"\" ('' 1))", "(<> (<> <1>))");
            AssertParsesAs("(\"x\" (\"\" 1))", "(<x> (<> <1>))");
            AssertParsesAs("(\"\" (\"x\" 1))", "(<> (<x> <1>))");
            AssertParsesAs("(\"\" x (\"\" 1))", "(<> <x> (<> <1>))");
            AssertParsesAs("(\"\" 1 (\"\" 1))", "(<> <1> (<> <1>))");
        }

        [Fact]
        public static void EmptyReferenceIsValidAsAnId()
        {
            AssertParsesAs("(\"\": 1)", "(<>: <1>)");
            AssertParsesAs("(o: (\"\" (o: (\"\" 1))))", "(<o>: (<> (<o>: (<> <1>))))");
        }

        [Fact]
        public static void NQuoteDelimitedBodiesAreUnchanged()
        {
            // A run that encloses a substantive body keeps its n-quote meaning.
            AssertParsesAs("(a \"\"x\"\" b)", "(<a> <x> <b>)");
            AssertParsesAs("(x \"\" \" \"\")", "(<x> < \" >)");
            AssertParsesAs("(x ' \" ')", "(<x> < \" >)");
            // An n-quote-delimited empty is still empty.
            AssertParsesAs("(a \"\"\"\" b)", "(<a> <> <b>)");
        }

        [Fact]
        public static void ASingleSpaceStillReadsAsASpace()
        {
            AssertParsesAs("(a \" \" b)", "(<a> < > <b>)");
        }

        [Fact]
        public static void EmptyReferenceSurvivesARoundTrip()
        {
            var sources = new[]
            {
                "(a \"\" b)",
                "(a \"\" \"\" b)",
                "(\"\" (\"\" 1))",
                "(\"\": 1)",
                "(o: (\"\" (o: (\"\" 1))))",
            };
            foreach (var source in sources)
            {
                var formatted = ((IList<Link<string>>)new Parser().Parse(source)).Format();
                var reparsed = ((IList<Link<string>>)new Parser().Parse(formatted)).Format();
                Assert.Equal(formatted, reparsed);
            }
        }

        [Fact]
        public static void EmptyReferenceIsWrittenAsADelimiterPair()
        {
            var links = (IList<Link<string>>)new Parser().Parse("(a \"\" b)");
            Assert.Equal("(a \"\" b)", links.Format());
        }
    }
}
