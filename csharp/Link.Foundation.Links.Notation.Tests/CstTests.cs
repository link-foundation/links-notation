using System.Linq;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// The lossless concrete syntax tree of a document (issue #364).
    /// </summary>
    public static class CstTests
    {
        private static string RoundTrip(string input) => new Parser().ParseCst(input).ToString();

        [Fact]
        public static void IsTheLosslessViewOfADocument()
        {
            const string input = "(t 1 '1')";
            var cst = new Parser().ParseCst(input);
            Assert.Equal(CstKind.Document, cst.Kind);
            Assert.False(cst.IsToken);
            Assert.Equal(input, cst.ToString());
            Assert.Equal(input, cst.Text);
            Assert.Equal(
                "(document (line (group open_paren:\"(\" (line reference:\"t\" whitespace:\" \" reference:\"1\" whitespace:\" \" reference:\"'1'\") close_paren:\")\")))",
                cst.ToSExpression());
        }

        [Fact]
        public static void EmptyDocumentHasNoLines()
        {
            var cst = new Parser().ParseCst("");
            Assert.Empty(cst.Children);
            Assert.Equal("(document)", cst.ToSExpression());
        }

        [Fact]
        public static void ReferenceTokensCarryTheirValueAndDelimiter()
        {
            var references = new Parser()
                .ParseCst("(a \"b c\" ~1{64} ''e''''f'')")
                .Tokens()
                .Where(token => token.Kind == CstKind.Reference)
                .Select(token => (token.Text, token.Value, token.Quote))
                .ToArray();
            Assert.Equal(
                new (string, string?, char?)[]
                {
                    ("a", "a", null),
                    ("\"b c\"", "b c", '"'),
                    ("~1{64}", "d", null),
                    ("''e''''f''", "e''f", '\''),
                },
                references);
        }

        [Fact]
        public static void TokensHaveNoChildrenAndOnlyReferencesHaveValues()
        {
            foreach (var token in new Parser().ParseCst("a: (b) # c\n").Tokens())
            {
                Assert.True(token.IsToken);
                Assert.Empty(token.Children);
                Assert.Equal(token.Kind == CstKind.Reference, token.Value != null);
                Assert.Equal(token.Text, token.ToString());
            }
        }

        [Theory]
        [InlineData("")]
        [InlineData(" \t ")]
        [InlineData("\n\n")]
        [InlineData("a\r\nb\rc\r\n")]
        [InlineData("a\t b  \n")]
        [InlineData("# head\na: b # tail\n  # inner\n  c\n# end")]
        [InlineData("(note: \"one\n  two\r\nthree\")")]
        [InlineData("(a (b\n  (c d)\n) e)\n")]
        [InlineData("root:\n  child:\n    leaf\n  tail")]
        [InlineData("(~1{} ~1{e6a0b9})")]
        [InlineData("('#a' \"b # c\" `#`)")]
        [InlineData("(根: café 🙂)\n")]
        public static void RecoversTheDocumentExactly(string input) => Assert.Equal(input, RoundTrip(input));

        [Fact]
        public static void WithoutCommentSupportHashIsPartOfReferences()
        {
            const string input = "a #b";
            var cst = new Parser(comments: false).ParseCst(input);
            Assert.Equal(input, cst.ToString());
            Assert.Equal(
                new[] { CstKind.Reference, CstKind.Whitespace, CstKind.Reference },
                cst.Tokens().Select(token => token.Kind).ToArray());
            Assert.Equal(
                new[] { CstKind.Reference, CstKind.Whitespace, CstKind.Comment },
                new Parser().ParseCst(input).Tokens().Select(token => token.Kind).ToArray());
        }

        [Fact]
        public static void AGroupBelongsToTheLineItOpensOn()
        {
            var cst = new Parser().ParseCst("a (b\nc)\nd");
            Assert.Equal(new[] { "a (b\nc)\n", "d" }, cst.Children.Select(line => line.ToString()).ToArray());
            var group = cst.Children[0].Children[2];
            Assert.Equal(CstKind.Group, group.Kind);
            Assert.Equal(
                new[] { CstKind.OpenParen, CstKind.Line, CstKind.Line, CstKind.CloseParen },
                group.Children.Select(child => child.Kind).ToArray());
        }

        [Fact]
        public static void UnclosedQuoteIsABareReference()
        {
            var references = new Parser().ParseCst("('x y)").Tokens()
                .Where(token => token.Kind == CstKind.Reference)
                .Select(token => (token.Text, token.Quote))
                .ToArray();
            Assert.Equal(new (string, char?)[] { ("'x", null), ("y", null) }, references);
        }

        [Fact]
        public static void KindsHaveTheSharedNames()
        {
            Assert.Equal(
                "document line group whitespace newline comment open_paren close_paren colon reference",
                string.Join(" ", System.Enum.GetValues<CstKind>().Select(kind => kind.ToName())));
        }

        [Fact]
        public static void RejectsWhatParseRejects()
        {
            Assert.Throws<ParseException>(() => new Parser().ParseCst("(a"));
            Assert.Throws<ParseException>(() => new Parser().ParseCst("a)"));
            var tooDeep = Assert.Throws<ParseException>(() => new Parser(true, 1).ParseCst("((a))"));
            Assert.Equal(1, tooDeep.MaxDepth);
        }
    }
}
