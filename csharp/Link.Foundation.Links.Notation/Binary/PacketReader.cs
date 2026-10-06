using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
namespace Link.Foundation.Links.Notation.Binary;

/// <summary>
/// A buffered reader for consecutive binary packets. Reuse it across reads
/// so bytes buffered from the following packet remain available.
/// </summary>
public sealed class PacketReader
{
    private readonly Stream _stream;
    private readonly byte[] _buffer;
    private int _position;
    private int _length;

    public PacketReader(Stream stream, int bufferSize = 8192)
    {
        ArgumentNullException.ThrowIfNull(stream);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(bufferSize);
        _stream = stream;
        _buffer = new byte[bufferSize];
    }

    /// <summary>Wraps a byte array, e.g. a whole encoded message.</summary>
    public static PacketReader FromBytes(byte[] bytes) => new(new MemoryStream(bytes, writable: false));

    /// <summary>The next byte without consuming it, or -1 at the end of the stream.</summary>
    public int PeekByte() => Fill() ? _buffer[_position] : -1;

    /// <summary>The next byte, or -1 at the end of the stream.</summary>
    public int ReadByte() => Fill() ? _buffer[_position++] : -1;

    /// <summary>True when every byte of the stream has been consumed.</summary>
    public bool AtEnd => !Fill();

    /// <summary>Fills <paramref name="destination"/>; a short stream is a malformed message.</summary>
    public void ReadExactly(Span<byte> destination)
    {
        while (!destination.IsEmpty)
        {
            if (!Fill())
            {
                throw BinaryNotationException.Malformed("unexpected end of packet");
            }
            var count = Math.Min(destination.Length, _length - _position);
            _buffer.AsSpan(_position, count).CopyTo(destination);
            _position += count;
            destination = destination[count..];
        }
    }

    private bool Fill()
    {
        if (_position < _length)
        {
            return true;
        }
        try
        {
            _length = _stream.Read(_buffer, 0, _buffer.Length);
        }
        catch (IOException exception)
        {
            throw new BinaryNotationException(BinaryErrorKind.Io, exception.Message, exception);
        }
        catch (ObjectDisposedException exception)
        {
            throw new BinaryNotationException(BinaryErrorKind.Io, exception.Message, exception);
        }
        _position = 0;
        return _length > 0;
    }
}
