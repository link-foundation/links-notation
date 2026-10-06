using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
namespace Link.Foundation.Links.Notation.Binary;

/// <summary>What went wrong while encoding, decoding or exchanging a LiNo message.</summary>
public enum BinaryErrorKind
{
    /// <summary>The underlying transport failed.</summary>
    Io,
    /// <summary>The peer sent bytes that are not a valid message.</summary>
    Malformed,
    /// <summary>The message text is not valid LiNo.</summary>
    InvalidLino,
    /// <summary>The message exceeds one of the configured <see cref="DecodeLimits"/>.</summary>
    LimitExceeded,
    /// <summary>The document cannot be represented with the chosen options.</summary>
    Unencodable,
}

/// <summary>Raised by the binary links notation codecs.</summary>
public sealed class BinaryNotationException : Exception
{
    public BinaryNotationException()
        : this(BinaryErrorKind.Malformed, "unknown protocol error")
    {
    }

    public BinaryNotationException(string message)
        : this(BinaryErrorKind.Malformed, message)
    {
    }

    public BinaryNotationException(string message, Exception innerException)
        : this(BinaryErrorKind.Io, message, innerException)
    {
    }

    public BinaryNotationException(BinaryErrorKind kind, string detail, Exception? innerException = null)
        : base($"{Describe(kind)}: {detail}", innerException)
    {
        Kind = kind;
        Detail = detail;
    }

    /// <summary>The category of the failure.</summary>
    public BinaryErrorKind Kind { get; }

    /// <summary>The message without the category prefix.</summary>
    public string Detail { get; }

    internal static BinaryNotationException Malformed(string detail) => new(BinaryErrorKind.Malformed, detail);

    internal static BinaryNotationException Limit(string detail) => new(BinaryErrorKind.LimitExceeded, detail);

    internal static BinaryNotationException Unencodable(string detail) => new(BinaryErrorKind.Unencodable, detail);

    private static string Describe(BinaryErrorKind kind) => kind switch
    {
        BinaryErrorKind.Io => "I/O error",
        BinaryErrorKind.Malformed => "malformed message",
        BinaryErrorKind.InvalidLino => "invalid LiNo",
        BinaryErrorKind.LimitExceeded => "limit exceeded",
        BinaryErrorKind.Unencodable => "cannot encode",
        _ => kind.ToString(),
    };
}
