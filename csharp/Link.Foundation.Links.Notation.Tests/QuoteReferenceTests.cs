using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// Quoting a reference, and reading every quoted reference back.
    ///
    /// https://github.com/link-foundation/links-notation/issues/443
    /// https://github.com/link-foundation/links-notation/issues/444
    ///
    /// <see cref="Link{TLinkAddress}.QuoteReference"/> writes one reference so a
    /// parser reads it back as exactly that text;
    /// <see cref="Link{TLinkAddress}.NeedsQuoting"/> says whether the text can be
    /// written bare. The property tests feed seeded random text built from the
    /// characters that matter to the grammar through the formatter and read it
    /// back in the ID and the value position of parenthesised, single-line and
    /// indented links. Mirrors <c>js/tests/QuoteReference.test.js</c>.
    /// </summary>
    public static class QuoteReferenceTests
    {
        private static readonly JsonSerializerOptions Json = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

        private static List<object?> Tree(IEnumerable<Link<string>> links) => links
            .Select(link => (object?)new List<object?> { link.Id }.Concat(Tree(link.Values ?? Array.Empty<Link<string>>())).ToList())
            .ToList();

        private static string TreeText(IEnumerable<Link<string>> links) => JsonSerializer.Serialize(Tree(links), Json);

        private static string ReadBack(string document) => TreeText(new Parser().Parse(document));

        /// <summary>The tree of a document that holds one link.</summary>
        private static string Expected(object?[] link) => JsonSerializer.Serialize(new object?[] { link }, Json);

        [Fact]
        public static void TextThatNeedsNoDelimitersIsWrittenAsItIs()
        {
            foreach (var text in new[] { "plain", "issue#1047", "a-b_c.d", "π", "~1" })
            {
                Assert.Equal(text, Link<string>.QuoteReference(text));
                Assert.False(Link<string>.NeedsQuoting(text));
            }
        }

        [Fact]
        public static void TextAParserWouldReadDifferentlyIsQuoted()
        {
            Assert.Equal("'has space'", Link<string>.QuoteReference("has space"));
            Assert.Equal("'12:30'", Link<string>.QuoteReference("12:30"));
            Assert.Equal("'#release'", Link<string>.QuoteReference("#release"));
            Assert.Equal("'(a)'", Link<string>.QuoteReference("(a)"));
            Assert.Equal("'\"'", Link<string>.QuoteReference("\""));
            Assert.Equal("\"'\"", Link<string>.QuoteReference("'"));
            Assert.Equal("~1{}", Link<string>.QuoteReference(""));
            Assert.Equal("~1{610a62}", Link<string>.QuoteReference("a\nb"));
            foreach (var text in new[] { "has space", "12:30", "#release", "", "\"", "a\nb" })
            {
                Assert.True(Link<string>.NeedsQuoting(text));
            }
        }

        [Fact]
        public static void QuoteReferenceIsEscapeReference()
        {
            foreach (var text in new[] { "a b", "a", "it's", "", "#x", "x:y" })
            {
                Assert.Equal(Link<string>.EscapeReference(text), Link<string>.QuoteReference(text));
            }
            Assert.Equal("", Link<string>.QuoteReference(null));
        }

        [Fact]
        public static void NeedsQuotingRefusesNull()
        {
            Assert.Throws<ArgumentNullException>(() => Link<string>.NeedsQuoting(null!));
        }

        /// <summary>
        /// A small, seeded generator (the one the JavaScript suite uses), so a
        /// failure names the text that broke and the same texts are tried on
        /// every run.
        /// </summary>
        private static Func<double> Random(uint seed)
        {
            var state = seed;
            return () =>
            {
                unchecked
                {
                    state += 0x6d2b79f5;
                    var value = state;
                    value = (value ^ (value >> 15)) * (value | 1);
                    value ^= value + (value ^ (value >> 7)) * (value | 61);
                    return (value ^ (value >> 14)) / 4294967296.0;
                }
            };
        }

        private static readonly string[] Alphabet =
        {
            "a", "b", "1", " ", " ", "\t", "\n", "\r", "\"", "\"", "'", "'", "`",
            "#", ":", "(", ")", "~", "{", "}", "é", "😀",
        };

        private static IEnumerable<string> Texts(int count, uint seed)
        {
            var next = Random(seed);
            for (var index = 0; index < count; index++)
            {
                var length = (int)Math.Floor(next() * 9);
                var text = "";
                for (var position = 0; position < length; position++)
                {
                    text += Alphabet[(int)Math.Floor(next() * Alphabet.Length)];
                }
                yield return text;
            }
        }

        /// <summary>Texts that broke a parser or a formatter before, or came close.</summary>
        private static readonly string[] Tricky =
        {
            "", " ", "\"", "'", "`", "\"\"", "''", "\"\"\"\"", "\"'", "'\"", "#", "#x",
            "a #b", ":", "a:", ":a", "12:30", "a: b", "(", ")", "~1{}", "~1{61}",
            "a\nb", "\"\" ", " \"\"", "\"\n", "it's", "say \"hi\"",
        };

        [Fact(Timeout = 60000)]
        public static void EveryQuotedReferenceReadsBackInEveryPosition()
        {
            foreach (var text in Tricky.Concat(Texts(2000, 443444)))
            {
                TestContext.Current.CancellationToken.ThrowIfCancellationRequested();
                var written = Link<string>.QuoteReference(text);
                var message = JsonSerializer.Serialize(new { text, written });

                var link = Expected(new object?[] { text, new object?[] { text }, new object?[] { "x" } });
                AssertReadsBack(link, $"({written}: {written} x)", message);
                AssertReadsBack(link, $"{written}: {written} x", message);
                AssertReadsBack(link, $"{written}: {written} x\n", message);
                AssertReadsBack(link, $"{written}:\n  {written}\n  x\n", message);
                // Two lines that each end with the reference: the shape of issue #443.
                AssertReadsBack(
                    Expected(new object?[]
                    {
                        "root",
                        new object?[] { null, new object?[] { "a" }, new object?[] { text } },
                        new object?[] { null, new object?[] { "b" }, new object?[] { text } },
                    }),
                    $"root:\n  a {written}\n  b {written}\n",
                    message);
                AssertReadsBack(
                    Expected(new object?[]
                    {
                        null,
                        new object?[] { "a" },
                        new object?[] { null, new object?[] { text }, new object?[] { text } },
                        new object?[] { "b" },
                    }),
                    $"(a ({written} {written}) b)",
                    message);
            }
        }

        private static void AssertReadsBack(string expected, string document, string message)
        {
            string actual;
            try
            {
                actual = ReadBack(document);
            }
            catch (Exception error)
            {
                throw new Xunit.Sdk.XunitException($"{message} in {JsonSerializer.Serialize(document)}: {error.Message}");
            }
            Assert.True(expected == actual, $"{message} in {JsonSerializer.Serialize(document)}: expected {expected}, got {actual}");
        }

        [Fact(Timeout = 60000)]
        public static void EveryFormattedLinkReadsBackAsTheSameLink()
        {
            var pool = Tricky.Concat(Texts(400, 445)).ToArray();
            for (var index = 0; index + 2 < pool.Length; index += 3)
            {
                TestContext.Current.CancellationToken.ThrowIfCancellationRequested();
                IList<Link<string>> links = new[]
                {
                    new Link<string>(pool[index], new[] { new Link<string>(pool[index + 1]), new Link<string>("x") }),
                    new Link<string>(null, new[] { new Link<string>(pool[index + 2]), new Link<string>(pool[index]) }),
                };
                var message = JsonSerializer.Serialize(pool.Skip(index).Take(3));
                foreach (var document in new[] { links.Format(), links.Format(true) })
                {
                    var parsed = new Parser().Parse(document);
                    Assert.True(links.Count == parsed.Count, message + document);
                    for (var at = 0; at < links.Count; at++)
                    {
                        Assert.True(links[at].Equals(parsed[at]), message + document);
                    }
                }
                // The nested writer puts every value on a line of its own.
                Assert.True(
                    TreeText(new Parser().Parse(links.Format())) == TreeText(new Parser().Parse(links.FormatNested())),
                    message);
            }
        }
    }
}
