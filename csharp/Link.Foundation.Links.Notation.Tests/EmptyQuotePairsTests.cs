using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// An empty quoted value at the end of a line must not swallow the lines
    /// after it.
    ///
    /// https://github.com/link-foundation/links-notation/issues/443
    ///
    /// An even run of quotes (<c>""</c>, <c>''</c>, <c>""""</c>, ...) followed by
    /// whitespace up to the end of its line is the empty reference, however later
    /// lines continue. A run followed directly by text (<c>""x</c>) still opens a
    /// reference that may reach across lines, so multiline references keep
    /// working. Mirrors <c>js/tests/EmptyQuotePairs.test.js</c>.
    /// </summary>
    public static class EmptyQuotePairsTests
    {
        private static readonly JsonSerializerOptions Json = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

        private static List<object?> Tree(IEnumerable<Link<string>> links) => links
            .Select(link => (object?)new List<object?> { link.Id }.Concat(Tree(link.Values ?? Array.Empty<Link<string>>())).ToList())
            .ToList();

        private static string Parses(string document) => JsonSerializer.Serialize(Tree(new Parser().Parse(document)), Json);

        private static string Written(IEnumerable<Link<string>> links) => string.Join("\n", links.Select(link => link.ToString()));

        [Fact]
        public static void EmptyValuesOnConsecutiveIndentedLinesStayOnTheirLines()
        {
            const string expected = """[["root",[null,["a"],[""]],[null,["b"],[""]]]]""";
            Assert.Equal(expected, Parses("root:\n  a \"\"\n  b \"\"\n"));
            Assert.Equal(expected, Parses("root:\n  a ''\n  b ''\n"));
            Assert.Equal(expected, Parses("root:\n  a \"\"\n  b \"\""));
        }

        [Fact]
        public static void AnEmptyValueBeforeAQuotedValueKeepsBothValues()
        {
            var root = new Parser().Parse("root:\n  a \"\"\n  b \"x y\"\n").Single();
            var values = root.Values!.Select(link => link.Values!.Select(value => value.Id).ToArray()).ToArray();
            Assert.Equal(new[] { new[] { "a", "" }, new[] { "b", "x y" } }, values);
        }

        [Fact]
        public static void AnEmptyValueAtTheEndOfATopLevelLineStaysOnItsLine()
        {
            Assert.Equal("(a ~1{})\n(b ~1{})", Written(new Parser().Parse("a \"\"\nb \"\"\n")));
            Assert.Equal("(a ~1{})\n(b ~1{})", Written(new Parser().Parse("a \"\" \nb \"\"\n")));
            Assert.Equal("(a ~1{})", Written(new Parser().Parse("a \"\"")));
        }

        [Fact]
        public static void ALongerEvenRunAtTheEndOfALineIsEmptyToo()
        {
            Assert.Equal("(a ~1{})\n(b ~1{})", Written(new Parser().Parse("a \"\"\"\"\nb \"\"\"\"\n")));
        }

        [Fact]
        public static void DoubledQuotesThatNothingClosesAreTheEmptyReference()
        {
            Assert.Equal("""[["a",[""]]]""", Parses("(a: \"\"\"\")"));
            Assert.Equal("""[["a",[""]]]""", Parses("(a: \"\"\"\"\"\")"));
        }

        [Fact]
        public static void ASingleQuoteCharacterIsWrittenBetweenTheOtherQuotes()
        {
            Assert.Equal("""[["a",["\""]]]""", Parses("(a: '\"')"));
            Assert.Equal("""[["a",["'"]]]""", Parses("(a: \"'\")"));
            Assert.Equal("""[["a",["\""]]]""", Parses("(a: `\"`)"));
        }

        [Fact]
        public static void AnEvenRunFollowedByTextStillOpensAMultilineReference()
        {
            Assert.Equal("""[[null,["a"],["x\ny"]]]""", Parses("a \"\"x\ny\"\"\n"));
        }

        [Fact]
        public static void AnEvenRunStillHoldsWhatTheSameLineCloses()
        {
            Assert.Equal("""[[null,["x"],[" \" "]]]""", Parses("(x \"\" \" \"\")"));
            Assert.Equal("""[[null,["a"],[" b "]]]""", Parses("a \"\" b \"\""));
        }

        [Fact]
        public static void TheStreamEmitsALineThatEndsWithAnEmptyValueAtOnce()
        {
            var stream = new StreamParser();
            var emitted = new List<Link<string>>();
            foreach (var character in "a \"\"\nb \"\"\nc\n")
            {
                emitted.AddRange(stream.Write(character.ToString()));
            }
            Assert.Equal("(a ~1{})\n(b ~1{})", Written(emitted));
            Assert.Equal("(a ~1{})\n(b ~1{})\n(c)", Written(stream.Finish()));
        }
    }
}
