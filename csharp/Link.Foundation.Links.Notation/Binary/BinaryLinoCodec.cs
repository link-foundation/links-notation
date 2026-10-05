using System.Collections.Generic;
using LinoLink = Link.Foundation.Links.Notation.Link<string>;

namespace Link.Foundation.Links.Notation.Binary;

/// <summary>Convenience codec for complete LiNo packets.</summary>
public sealed record BinaryLinoCodec
{
    public BinaryLinoCodec() { }

    public BinaryLinoCodec(BinaryLinoOptions options) => Options = options;

    /// <summary>Options used when writing.</summary>
    public BinaryLinoOptions Options { get; init; }

    /// <summary>Limits applied when reading.</summary>
    public DecodeLimits Limits { get; init; } = DecodeLimits.Default;

    /// <summary>Encodes the supplied model without canonicalizing its groups.</summary>
    public byte[] Encode(IReadOnlyList<LinoLink> document) => LinoMapping.EncodeDocument(document, Options).ToBytes();

    /// <summary>Decodes exactly one complete packet, rejecting trailing bytes.</summary>
    public IReadOnlyList<LinoLink> Decode(byte[] bytes) =>
        LinoMapping.DecodeDocument(LinksPacket.FromBytes(bytes, Limits), Limits);
}
