using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// Colons inside a bare reference.
    ///
    /// https://github.com/link-foundation/links-notation/issues/444
    ///
    /// A run of colons between two characters of a bare reference belongs to the
    /// reference, so times, URLs and qualified names need no quotes. A colon that
    /// is followed by whitespace, a parenthesis, a quote or a versioned literal
    /// still separates an ID from its values, and a bare reference never starts or
    /// ends with a colon. Mirrors <c>js/tests/BareReferenceColons.test.js</c>.
    /// </summary>
    public static class BareReferenceColonsTests
    {
        private static readonly JsonSerializerOptions Json = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

        private static List<object?> Tree(IEnumerable<Link<string>> links) => links
            .Select(link => (object?)new List<object?> { link.Id }.Concat(Tree(link.Values ?? Array.Empty<Link<string>>())).ToList())
            .ToList();

        private static string Parses(string document) => JsonSerializer.Serialize(Tree(new Parser().Parse(document)), Json);

        private static void Same(string document, string expected) => Assert.Equal(Parses(expected), Parses(document));

        [Fact]
        public static void ATimeIsOneReference()
        {
            Same("time 12:30\n", "time '12:30'\n");
            Same("root:\n  time 12:30\n", "root:\n  time '12:30'\n");
        }

        [Fact]
        public static void AUrlIsOneReference()
        {
            Same("url https://example.com/a#b\n", "url 'https://example.com/a#b'\n");
        }

        [Fact]
        public static void AQualifiedNameIsOneReference()
        {
            Same("type std::string\n", "type 'std::string'\n");
        }

        [Fact]
        public static void AnIdMayHoldAColon()
        {
            Same("a:b: c\n", "'a:b': c\n");
            Same("(a:b: c)", "('a:b': c)");
            Same("a:b\n", "'a:b'\n");
        }

        [Fact]
        public static void AColonBeforeAValueThatCannotContinueAReferenceSeparates()
        {
            Same("a: b\n", "(a: b)");
            Same("a:\"b c\"\n", "(a: 'b c')");
            Same("a:'b'\n", "(a: b)");
            Same("a:(b c)\n", "(a: (b c))");
            Same("a:~1{62}\n", "(a: b)");
            Same("a :b\n", "(a: b)");
        }

        [Fact]
        public static void AValueOfTheLinkMayHoldAColon()
        {
            Same("a: b:c\n", "(a: 'b:c')");
        }

        [Fact]
        public static void ASecondIdOnALineIsStillAnError()
        {
            Assert.ThrowsAny<ParseException>(() => new Parser().Parse("stage: rust: nextest\n"));
            Assert.ThrowsAny<ParseException>(() => new Parser().Parse(": a\n"));
        }

        [Fact]
        public static void AReferenceWithColonsIsWrittenWithQuotes()
        {
            Assert.Equal("(time '12:30')", new Parser().Parse("time 12:30\n").Single().ToString());
            Assert.Equal(
                "(meeting: '12:30' 'https://example.com/a#b')",
                new Parser().Parse("meeting: 12:30 https://example.com/a#b\n").Single().ToString());
        }
    }
}
