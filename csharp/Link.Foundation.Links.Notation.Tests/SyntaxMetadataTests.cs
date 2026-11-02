using System.Linq;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// Parsed links record how their IDs were written (issue #364), without changing
    /// equality, hashing or formatting.
    /// </summary>
    public static class SyntaxMetadataTests
    {
        [Fact]
        public static void BareAndQuotedReferencesAreEqualButKeepHowTheyWereWritten()
        {
            var link = new Parser().Parse("(t 1 '1')").Single();
            var bare = link.Values![1];
            var quoted = link.Values[2];
            Assert.Equal("1", bare.Id);
            Assert.Equal("1", quoted.Id);
            Assert.Equal("1", bare.RawId);
            Assert.Equal("'1'", quoted.RawId);
            Assert.Null(bare.Quote);
            Assert.Equal('\'', quoted.Quote);
            // Equality, hashing and formatting ignore the metadata.
            Assert.Equal(bare, quoted);
            Assert.True(bare == quoted);
            Assert.Equal(bare.GetHashCode(), quoted.GetHashCode());
            Assert.Equal("(t 1 1)", link.ToString());
            Assert.Equal("(t 1 1)", new[] { link }.Format());
        }

        [Fact]
        public static void RecordsEveryQuoteKindAndRunLength()
        {
            var link = new Parser().Parse("(\"a\": 'b' `c` \"\"d\"\" ~1{65} f)").Single();
            Assert.Equal("\"a\"", link.RawId);
            Assert.Equal('"', link.Quote);
            Assert.Equal(
                new (string?, char?)[] { ("'b'", '\''), ("`c`", '`'), ("\"\"d\"\"", '"'), ("~1{65}", null), ("f", null) },
                link.Values!.Select(value => (value.RawId, value.Quote)).ToArray());
        }

        [Fact]
        public static void KeepsRawTextFromTheSourceNotFromCommentStripping()
        {
            var link = new Parser().Parse("(a 'b # c') # d").Single();
            Assert.Equal("'b # c'", link.Values![1].RawId);
        }

        [Fact]
        public static void LeavesLinksWithoutWrittenIdsWithoutRawText()
        {
            var link = new Parser().Parse("(a b)").Single();
            Assert.Null(link.RawId);
            Assert.Null(link.Quote);
            Assert.Null(new Link<string>("x").RawId);
            Assert.Null(new Link<string>("x").Quote);
        }

        [Fact]
        public static void IndentedPathCombinationsHaveNoRawText()
        {
            // "a" and "(a) (b)": the second link is made by combining the two lines.
            var links = new Parser().Parse("a\n  b");
            Assert.Null(links[0].RawId);
            Assert.Equal("a", links[0].Values![0].RawId);
            Assert.Null(links[1].RawId);
            Assert.Null(links[1].Values![0].RawId);
            Assert.Equal("a", links[1].Values![0].Values![0].RawId);
            Assert.Equal("b", links[1].Values![1].Values![0].RawId);
        }

        [Fact]
        public static void DoesNotChangeEqualityOrFormatting()
        {
            var quoted = new Parser().Parse("('a': 'b')");
            var bare = new Parser().Parse("(a: b)");
            Assert.Equal(bare, quoted);
            Assert.Equal(bare.Format(), quoted.Format());
            Assert.Equal(bare[0].ToString(), quoted[0].ToString());
            Assert.Equal(bare[0].GetHashCode(), quoted[0].GetHashCode());
        }

        [Fact]
        public static void AstModeDropsTheMetadata()
        {
            var parser = new Parser { Syntax = false };
            var link = parser.Parse("('a': 'b')").Single();
            Assert.Null(link.RawId);
            Assert.Null(link.Values![0].RawId);
            Assert.Null(link.Values[0].Quote);
            Assert.Equal(new Parser().Parse("('a': 'b')").Single(), link);
            Assert.True(new Parser().Syntax);
            Assert.False(parser.Syntax);
            Assert.Null(new Parser(false) { Syntax = false }.Parse("'root':\n  'child'").Single().RawId);
        }

        [Fact]
        public static void IndentedIdsAndStreamParserKeepTheMetadata()
        {
            var link = new Parser().Parse("'root':\n  \"child\"").Single();
            Assert.Equal("'root'", link.RawId);
            Assert.Equal("\"child\"", link.Values![0].RawId);
            var stream = new StreamParser();
            stream.Write("(a '");
            stream.Write("b')");
            var streamed = stream.Finish().Single();
            Assert.Equal("'b'", streamed.Values![1].RawId);
            Assert.Equal('\'', streamed.Values[1].Quote);
        }

        [Fact]
        public static void RawIdCanBeSetOnLinksBuiltInCode()
        {
            var link = new Link<string>("a") { RawId = "\"a\"" };
            Assert.Equal('"', link.Quote);
            Assert.Equal(new Link<string>("a"), link);
            var bare = link.WithRawId(null);
            Assert.Null(bare.Quote);
            Assert.Equal("\"a\"", link.RawId);
            Assert.Equal("`a`", bare.WithRawId("`a`").RawId);
        }

        [Fact]
        public static void ReferenceQuoteReadsTheDelimiterOfOneCompleteReference()
        {
            Assert.Equal('\'', Link<string>.ReferenceQuote("'1'"));
            Assert.Equal('"', Link<string>.ReferenceQuote("\"\"a b\"\""));
            Assert.Equal('`', Link<string>.ReferenceQuote("`x`"));
            Assert.Null(Link<string>.ReferenceQuote("1"));
            Assert.Null(Link<string>.ReferenceQuote("~1{31}"));
            Assert.Null(Link<string>.ReferenceQuote("'unclosed"));
            Assert.Null(Link<string>.ReferenceQuote("'a' b"));
            Assert.Null(Link<string>.ReferenceQuote(""));
            Assert.Null(Link<string>.ReferenceQuote(null));
        }
    }
}
