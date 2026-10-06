using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Xunit;
using Link.Foundation.Links.Notation.Binary;

using LinoLink = Link.Foundation.Links.Notation.Link<string>;

namespace Link.Foundation.Links.Notation.Tests.Binary;

/// <summary>Binary and text LiNo protocol codecs (issue #105).</summary>
public sealed class BinaryLinoCodecTests
{
    [Fact]
    public void EncoderUsesConfiguredLimits()
    {
        var document = new[] { new LinoLink("abcdef", new[] { new LinoLink("value") }) };
        foreach (var limits in new[]
        {
            new DecodeLimits { MaxNodes = 1 },
            new DecodeLimits { MaxStringBytes = 2 },
            new DecodeLimits { MaxDepth = 1 },
            new DecodeLimits { MaxLinks = 1 },
            new DecodeLimits { MaxReferences = 1 },
        })
        {
            Assert.Throws<BinaryNotationException>(() => new BinaryLinoCodec { Limits = limits }.Encode(document));
        }
        var deep = new LinoLink("a");
        for (var index = 0; index < 70; index++) deep = new LinoLink(null, new[] { deep });
        var model = new[] { deep };
        var codec = new BinaryLinoCodec { Limits = new DecodeLimits { MaxDepth = 80 } };
        Assert.Equal(model, codec.Decode(codec.Encode(model)));
    }

    internal static readonly string[] Corpus =
    {
        "() ((1 1))",
        "((1: 1 1)) ((1: 1 2))",
        "((1 1)) ()",
        "((1: 1 1)) ()",
        "(($i: $s $t)) (($i: $s $t))",
        "((($index: $source $target)) (($index: $target $source)))",
        "(a b c d)",
        "(name: 'with space' \"it's\")",
        "((a))",
        "(((a)))",
        "(a (b c) ((d)))",
        "1\n2\n3",
        "hello",
        "😀 привет 世界",
        "0",
        "007",
        "9223372036854775807",
        "9223372036854775808",
        "18446744073709551615",
        "18446744073709551616",
        "'multi\nline'",
        ".dot",
        "'a''b\"c`d'",
        "(1: (2: 3 4) 5)",
        "() ()",
        "(* *)",
        "(type: type type)",
    };

    internal static IEnumerable<BinaryLinoOptions> AllOptions()
    {
        foreach (var externalReferences in new[] { false, true })
        {
            foreach (var arity in new[] { ArityRange.Doublets, ArityRange.Between(2, 3), ArityRange.AtLeast(1) })
            {
                foreach (var packedWidths in new[] { false, true })
                {
                    yield return new BinaryLinoOptions
                    {
                        ExternalReferences = externalReferences,
                        Arity = arity,
                        PackedWidths = packedWidths,
                    };
                }
            }
        }
    }

    private static IReadOnlyList<LinoLink> Parse(string text) => LinoFormat.ParseDocument(text);

    [Fact]
    public void EveryOptionSetRoundTripsTheCorpus()
    {
        foreach (var text in Corpus)
        {
            var document = Parse(text);
            foreach (var options in AllOptions())
            {
                var binary = new BinaryLinoCodec(options);
                var bytes = binary.Encode(document);
                Assert.InRange(bytes[0], 0x10, 0x1F);
                Assert.True(document.SequenceEqual(binary.Decode(bytes)), $"{text} with {options}");
            }
        }
    }

    [Fact]
    public void CanonicalTextRoundTripsTheCorpus()
    {
        foreach (var text in Corpus)
        {
            var document = Parse(text);
            var canonical = LinoFormat.FormatDocument(document);
            Assert.True(document.SequenceEqual(Parse(canonical)), $"{text} -> {canonical}");
        }
        Assert.Equal("() ((1 1))", LinoFormat.FormatDocument(Parse("(()((1 1)))")));
        Assert.Equal("((1: 1 1)) ((1: 1 2))", LinoFormat.FormatDocument(Parse("((1: 1 1)) ((1: 1 2))")));
        // Only a binary message carries an id without values; links-notation reads its text back as the reference.
        Assert.Equal("(a:)", LinoFormat.FormatDocument(new[] { LinoFormat.Link("a", new List<LinoLink>()) }));
        Assert.True(Parse("(a:)").SequenceEqual(new[] { LinoFormat.Reference("a") }));
    }

    [Fact]
    public void ParsedDocumentsMatchTheRustModel()
    {
        // The C# parser wraps single references in an extra group; the
        // canonical model drops it so both ports decode to equal documents.
        // These structures match the canonical model used by the shared vectors.
        var a = LinoFormat.Reference("a");
        LinoLink Group(LinoLink value) => LinoFormat.Link(null, new List<LinoLink> { value });
        Assert.Equal(new[] { a }, Parse("a"));
        Assert.Equal(new[] { a }, Parse("(a)"));
        Assert.Equal(new[] { Group(a) }, Parse("((a))"));
        Assert.Equal(new[] { Group(Group(a)) }, Parse("(((a)))"));
        Assert.Equal(new[] { LinoFormat.Link("a", new List<LinoLink> { LinoFormat.Reference("b") }) }, Parse("(a: (b))"));
        Assert.Equal(new[] { LinoFormat.Reference("1"), LinoFormat.Reference("2"), LinoFormat.Reference("3") }, Parse("1\n2\n3"));
    }

    [Fact]
    public void ReferencesAreQuotedOnlyWhenNeeded()
    {
        Assert.Equal("plain", LinoFormat.FormatReference("plain"));
        Assert.Equal("$x", LinoFormat.FormatReference("$x"));
        Assert.Equal("''", LinoFormat.FormatReference(""));
        Assert.Equal("'a b'", LinoFormat.FormatReference("a b"));
        Assert.Equal("\"it's\"", LinoFormat.FormatReference("it's"));
        Assert.Equal("`'\"`", LinoFormat.FormatReference("'\""));
        Assert.Equal("\"\"\"'\"`\"\"\"", LinoFormat.FormatReference("'\"`"));
        foreach (var reference in new[]
        {
            "", "a b", "a:b", "(x)", "it's", "'\"", "'\"`", "tab\there", "a\nb", "'x", "x'", "'", "''", "'''",
            "\"'`x`'\"", "a''''b\"\"`", "`'\"\"\"'''``", "(a) ''",
        })
        {
            var formatted = LinoFormat.FormatReference(reference);
            var document = Parse(formatted);
            Assert.Equal(formatted, LinoFormat.FormatDocument(document));
            Assert.Equal(new[] { LinoFormat.Reference(reference) }, document);
        }
    }

    [Fact]
    public void EveryShortReferenceOverDelimitersRoundTrips()
    {
        var alphabet = new[] { '\'', '"', '`', 'a', ' ', '(', ')', ':' };
        var stack = new Stack<string>();
        stack.Push(string.Empty);
        while (stack.TryPop(out var reference))
        {
            if (reference.Length > 0)
            {
                var formatted = LinoFormat.FormatReference(reference);
                var document = Parse(formatted);
                Assert.True(
                    document.Count == 1 && document[0].Equals(LinoFormat.Reference(reference)),
                    $"{reference} as {formatted}");
            }
            if (reference.Length < 5)
            {
                foreach (var character in alphabet)
                {
                    stack.Push(reference + character);
                }
            }
        }
    }

    [Fact]
    public void CommentReferencesSurviveBinaryAndTextRoundTrips()
    {
        foreach (var reference in new[] { "#", "#tag", "# with space", "issue#1047" })
        {
            var document = new[] { LinoFormat.Reference(reference) };
            var codec = new BinaryLinoCodec();
            var decoded = codec.Decode(codec.Encode(document));
            Assert.Equal(document, decoded);
            Assert.Equal(document, Parse(LinoFormat.FormatDocument(decoded)));
        }
    }

    [Fact]
    public void TextHelpersPreserveUnicodeWhitespaceReferences()
    {
        foreach (var reference in new[] { "\u00a0", "\u2003", "\u2028" })
        {
            var document = new[] { LinoFormat.Reference(reference) };
            Assert.Equal(document, Parse(reference));
            Assert.Equal(document, Parse(LinoFormat.FormatDocument(document)));
        }
    }
    [Fact]
    public void NativeParserGroupsRoundTripWithoutCanonicalization()
    {
        foreach (var text in Corpus)
        {
            var document = new Parser().Parse(text).ToList();
            foreach (var options in AllOptions())
            {
                var codec = new BinaryLinoCodec(options);
                Assert.Equal(document, codec.Decode(codec.Encode(document)));
            }
        }
    }

    [Fact]
    public void InvalidEncoderModelsAreErrors()
    {
        var link = LinoFormat.Reference("a");
        for (var depth = 0; depth < DecodeLimits.Default.MaxDepth; depth++)
        {
            link = LinoFormat.Link(null, new List<LinoLink> { link });
        }
        Assert.Equal(BinaryErrorKind.Unencodable, Assert.Throws<BinaryNotationException>(() => new BinaryLinoCodec().Encode(new[] { link })).Kind);
        var invalid = new BinaryLinoOptions().WithArity(ArityRange.Between(0, 2));
        Assert.Equal(BinaryErrorKind.Unencodable, Assert.Throws<BinaryNotationException>(() => new BinaryLinoCodec(invalid).Encode(Array.Empty<LinoLink>())).Kind);
        Assert.Equal(BinaryErrorKind.Unencodable, Assert.Throws<BinaryNotationException>(() => new BinaryLinoCodec().Encode(new[] { LinoFormat.Reference("\ud800") })).Kind);
    }

    [Fact]
    public void IdsDoNotAddAnExtraModelNestingLevel()
    {
        var link = LinoFormat.Link("id", new List<LinoLink>());
        for (var depth = 1; depth < DecodeLimits.Default.MaxDepth; depth++)
        {
            link = LinoFormat.Link(null, new List<LinoLink> { link });
        }
        var document = new[] { link };
        foreach (var options in AllOptions())
        {
            var codec = new BinaryLinoCodec(options);
            Assert.Equal(document, codec.Decode(codec.Encode(document)));
        }
    }

    [Fact]
    public void InMemoryPacketsObeyLimits()
    {
        var packet = LinoMapping.EncodeDocument(Parse("(a b)"));
        foreach (var limits in new[] { new DecodeLimits { MaxLinks = 0 }, new DecodeLimits { MaxReferences = 0 } })
        {
            Assert.Equal(BinaryErrorKind.LimitExceeded, Assert.Throws<BinaryNotationException>(() => LinoMapping.DecodeDocument(packet, limits)).Kind);
        }
        var links = new List<(ulong, PacketReference[])> { (6, new[] { PacketReference.Null, PacketReference.Null }) };
        for (ulong address = 7; address < 80; address++)
        {
            links.Add((address, new[] { PacketReference.Internal(address - 1), PacketReference.Null }));
        }
        var deep = LinksPacket.Pack(false, links, false);
        Assert.Equal(BinaryErrorKind.LimitExceeded, Assert.Throws<BinaryNotationException>(() => LinoMapping.DecodeDocument(deep)).Kind);
        Assert.Equal(BinaryErrorKind.Unencodable, Assert.Throws<BinaryNotationException>(() => LinksPacket.Pack(false, new[] { (ulong.MaxValue, new[] { PacketReference.Null }) }, false)).Kind);
    }

    [Fact]
    public void InMemoryPacketsRejectInvalidWireShapes()
    {
        foreach (var kind in new[] { "external", "width", "arity" })
        {
            var packet = LinksPacket.Pack(true, new[] { (6UL, new[] { PacketReference.External(3) }) }, false);
            if (kind == "external") packet.ExternalReferences = false;
            if (kind == "width") packet.Sections[0].Width = 3;
            if (kind == "arity") packet.Sections[0].Arity = ArityRange.Doublets;
            Assert.Equal(BinaryErrorKind.Malformed, Assert.Throws<BinaryNotationException>(() => LinoMapping.DecodeDocument(packet)).Kind);
        }
    }

    [Fact]
    public void CompactAddressOverflowIsRejectedBeforeReadingLinks()
    {
        var bytes = new List<byte> { 0x10 };
        LinksPacket.WriteLeb128(bytes, ulong.MaxValue);
        var exception = Assert.Throws<BinaryNotationException>(() => LinksPacket.FromBytes(bytes.ToArray(), DecodeLimits.Unlimited));
        Assert.Equal(BinaryErrorKind.Malformed, exception.Kind);
        Assert.Contains("addresses overflow", exception.Detail);
    }

    [Fact]
    public void RepeatedReferencesObeyATotalUtf8ExpansionBudget()
    {
        foreach (var reference in new[] { "😀", "12" })
        {
            var document = new[] { LinoFormat.Reference(reference), LinoFormat.Reference(reference) };
            foreach (var options in AllOptions())
            {
                var packet = LinoMapping.EncodeDocument(document, options);
                var bytes = System.Text.Encoding.UTF8.GetByteCount(reference) * 2;
                Assert.Equal(document, LinoMapping.DecodeDocument(packet, new DecodeLimits { MaxStringBytes = bytes }));
                Assert.Equal(BinaryErrorKind.LimitExceeded, Assert.Throws<BinaryNotationException>(() => LinoMapping.DecodeDocument(packet, new DecodeLimits { MaxStringBytes = bytes - 1 })).Kind);
            }
        }
    }

    [Fact]
    public void StringBudgetStopsBeforeLaterScalars()
    {
        var bytes = Convert.FromHexString("13024605011001030000009fffffff9effffff0028ffff06");
        var codec = new BinaryLinoCodec { Limits = new DecodeLimits { MaxStringBytes = 1 } };
        Assert.Equal(BinaryErrorKind.LimitExceeded, Assert.Throws<BinaryNotationException>(() => codec.Decode(bytes)).Kind);
    }

    [Fact]
    public void StreamPacketsAreReadOneAtATimeAndTruncationIsRejected()
    {
        var bytes = new BinaryLinoCodec().Encode(Parse("(a b)"));
        for (var end = 0; end < bytes.Length; end++)
        {
            Assert.Throws<BinaryNotationException>(() => LinksPacket.FromBytes(bytes[..end]));
        }
        var reader = PacketReader.FromBytes(bytes.Concat(bytes).ToArray());
        Assert.NotNull(LinksPacket.ReadFrom(reader));
        Assert.NotNull(LinksPacket.ReadFrom(reader));
        Assert.Null(LinksPacket.ReadFrom(reader));
    }
}
