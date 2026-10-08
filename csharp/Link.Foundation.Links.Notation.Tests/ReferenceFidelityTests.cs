using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Link.Foundation.Links.Notation.Binary;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests;

public static class ReferenceFidelityTests
{
    private static IEnumerable<string> Fixtures() =>
        File.ReadLines(Path.Combine(AppContext.BaseDirectory, "Protocol", "reference-literals.txt"))
            .Where(line => !line.StartsWith('#'))
            .Select(line => line == "-" ? "" : Encoding.UTF8.GetString(Convert.FromHexString(line)));

    [Fact]
    public static void NativeReferenceFidelity()
    {
        foreach (var reference in Fixtures())
        {
            var original = new[] { new Link<string>(reference, new[] { new Link<string>(reference), new Link<string>("nested", new[] { new Link<string>(reference) }) }) };
            Assert.Equal(original, new Parser().Parse(original[0].ToString()));
            Assert.Equal(original, new Parser().Parse(original.Format(true)));
            Assert.Equal(original, new Parser().Parse(original.Format(new FormatConfig { MaxInlineRefs = 1, PreferInline = false })));
        }
    }

    [Fact(Timeout = 30000)]
    public static void ReferenceLiteralsAtEveryChunkSplit()
    {
        foreach (var reference in Fixtures())
        {
            Assert.Equal(reference, ReferenceLiteral.Decode(ReferenceLiteral.Encode(reference)));
            foreach (var literal in new[] { Link<string>.EscapeReference(reference), LinoFormat.FormatReference(reference), ReferenceLiteral.Encode(reference) })
            {
                var text = $"(root: {literal})\n({literal}: fixture)";
                var expected = new[] { new Link<string>("root", new[] { new Link<string>(reference) }), new Link<string>(reference, new[] { new Link<string>("fixture") }) };
                Assert.Equal(expected, new Parser().Parse(text));
                for (var split = 0; split <= text.Length; split++)
                {
                    TestContext.Current.CancellationToken.ThrowIfCancellationRequested();
                    var stream = new StreamParser();
                    stream.Write(text[..split]);
                    stream.Write(text[split..]);
                    Assert.Equal(expected, stream.Finish());
                }
            }
        }
    }

    [Fact]
    public static void BinaryReferenceFidelity()
    {
        var codec = new BinaryLinoCodec();
        foreach (var reference in Fixtures())
        {
            var original = new[] { new Link<string>(reference, new[] { new Link<string>(reference) }) };
            var decoded = codec.Decode(codec.Encode(original));
            Assert.Equal(original, decoded);
            Assert.Equal(original, LinoFormat.ParseDocument(LinoFormat.FormatDocument(decoded)));
        }
    }

    [Fact]
    public static void MalformedReferenceLiteralsAreRejected()
    {
        foreach (var literal in File.ReadLines(Path.Combine(AppContext.BaseDirectory, "Protocol", "invalid-reference-literals.txt")).Where(line => !line.StartsWith('#')))
        {
            Assert.Throws<FormatException>(() => ReferenceLiteral.Decode(literal));
            Assert.ThrowsAny<Exception>(() => new Parser().Parse(literal));
        }
        Assert.Equal("é", ReferenceLiteral.Decode("~1{C3A9}"));
        Assert.Throws<EncoderFallbackException>(() => ReferenceLiteral.Encode("\ud800"));
        Assert.Throws<EncoderFallbackException>(() => Link<string>.EscapeReference("\ud800"));
    }
}
