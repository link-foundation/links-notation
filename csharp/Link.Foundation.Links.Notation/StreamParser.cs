using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Link.Foundation.Links.Notation
{
    /// <summary>Incrementally emits complete top-level Links Notation records.</summary>
    public sealed class StreamParser
    {
        private const int DefaultMaxBufferSize = 10 * 1024 * 1024;
        private const string BeforeReference = " \t\n\r(:";
        private const string BeforeComment = " \t\n\r";

        private readonly Parser _parser;
        private readonly StringBuilder _buffer = new();
        private readonly StringBuilder _currentLine = new();
        private readonly List<Link<string>> _links = new();
        private int? _baseIndentation;
        private bool _lineClassified;
        private int _offset;
        private int _line;
        private int _column;
        private int _segmentOffset;
        private int _segmentLine;
        private bool _ended;
        private int _maxBufferSize = DefaultMaxBufferSize;

        /// <summary>Creates a stream backed by a default canonical parser.</summary>
        public StreamParser() : this(new Parser()) { }

        /// <summary>Creates a stream backed by <paramref name="parser"/>.</summary>
        public StreamParser(Parser parser)
        {
            _parser = parser ?? throw new ArgumentNullException(nameof(parser));
            Reset();
        }

        /// <summary>Raised once for every completed link.</summary>
        public event Action<Link<string>>? LinkParsed;

        /// <summary>Whether emitted links are retained for <see cref="Finish()"/> and <see cref="Drain"/>.</summary>
        public bool Collect { get; set; } = true;

        /// <summary>The largest unresolved record accepted by the stream.</summary>
        public int MaxBufferSize
        {
            get => _maxBufferSize;
            set => _maxBufferSize = value > 0
                ? value
                : throw new ArgumentOutOfRangeException(nameof(value), "Maximum buffer size must be positive.");
        }

        /// <summary>The point immediately after the last character written.</summary>
        public StreamPosition Position => new(
            _offset,
            _line,
            _column,
            _buffer.Length + _currentLine.Length);

        /// <summary>Consumes a chunk and returns links made complete by it.</summary>
        public IReadOnlyList<Link<string>> Write(string chunk)
        {
            ArgumentNullException.ThrowIfNull(chunk);
            if (_ended) throw new InvalidOperationException("Cannot write after Finish().");

            var emitted = new List<Link<string>>();
            foreach (var character in chunk)
            {
                _currentLine.Append(character);
                _offset++;

                if (character == '\n')
                {
                    _buffer.Append(_currentLine);
                    _currentLine.Clear();
                    _lineClassified = false;
                    _line++;
                    _column = 1;
                }
                else
                {
                    if (!_lineClassified && character != ' ' && character != '\t' && character != '\r')
                    {
                        _lineClassified = true;
                        if (!(_parser.Comments && character == Comments.Comment))
                        {
                            StartContentLine(LeadingSpaces(_currentLine), emitted);
                        }
                    }
                    _column++;
                }

                if (_buffer.Length + _currentLine.Length > MaxBufferSize)
                {
                    throw new ArgumentException(
                        $"Buffered record exceeds maximum size of {MaxBufferSize} characters.",
                        nameof(chunk));
                }
            }
            return emitted;
        }

        /// <summary>Finishes the stream and returns all undrained links.</summary>
        public IReadOnlyList<Link<string>> Finish() => Finish(string.Empty);

        /// <summary>Consumes a final chunk and finishes the stream.</summary>
        public IReadOnlyList<Link<string>> Finish(string chunk)
        {
            if (_ended)
            {
                if (chunk.Length > 0) throw new InvalidOperationException("Cannot write after Finish().");
                return Collect ? _links.ToArray() : Array.Empty<Link<string>>();
            }

            var emitted = chunk.Length == 0
                ? new List<Link<string>>()
                : new List<Link<string>>(Write(chunk));
            var document = _buffer.ToString() + _currentLine;
            if (document.Length > 0)
            {
                IList<Link<string>> parsed;
                try
                {
                    parsed = _parser.Parse(document);
                }
                catch (ParseException error)
                {
                    throw new StreamParseException(
                        error,
                        _segmentOffset + error.Offset,
                        _segmentLine + error.Line - 1,
                        error.Column);
                }
                Publish(parsed, emitted);
                AdvanceSegment(document);
            }

            _buffer.Clear();
            _currentLine.Clear();
            _baseIndentation = null;
            _ended = true;
            return Collect ? _links.ToArray() : emitted;
        }

        /// <summary>Returns and forgets links retained since the previous call.</summary>
        public IReadOnlyList<Link<string>> Drain()
        {
            var links = _links.ToArray();
            _links.Clear();
            return links;
        }

        /// <summary>Reuses the parser while preserving its options and event handlers.</summary>
        public StreamParser Reset()
        {
            _buffer.Clear();
            _currentLine.Clear();
            _baseIndentation = null;
            _lineClassified = false;
            _links.Clear();
            _offset = 0;
            _line = 1;
            _column = 1;
            _segmentOffset = 0;
            _segmentLine = 1;
            _ended = false;
            return this;
        }

        /// <summary>Lazily parses a sequence of chunks as a native enumerable.</summary>
        public static IEnumerable<Link<string>> ParseChunks(
            IEnumerable<string> chunks,
            Parser? parser = null)
        {
            var stream = new StreamParser(parser ?? new Parser()) { Collect = false };
            foreach (var chunk in chunks)
            {
                foreach (var link in stream.Write(chunk)) yield return link;
            }
            foreach (var link in stream.Finish()) yield return link;
        }

        /// <summary>Lazily parses an asynchronous sequence of chunks.</summary>
        public static async IAsyncEnumerable<Link<string>> ParseChunksAsync(
            IAsyncEnumerable<string> chunks,
            Parser? parser = null,
            [EnumeratorCancellation] CancellationToken cancellationToken = default)
        {
            var stream = new StreamParser(parser ?? new Parser()) { Collect = false };
            await foreach (var chunk in chunks.WithCancellation(cancellationToken))
            {
                foreach (var link in stream.Write(chunk)) yield return link;
            }
            foreach (var link in stream.Finish()) yield return link;
        }

        private void StartContentLine(int indentation, List<Link<string>> emitted)
        {
            if (_buffer.Length > 0 &&
                _baseIndentation.HasValue &&
                indentation <= _baseIndentation.Value &&
                StructurallyComplete(_buffer.ToString(), _parser.Comments))
            {
                try
                {
                    var document = _buffer.ToString();
                    var parsed = _parser.Parse(document);
                    Publish(parsed, emitted);
                    AdvanceSegment(document);
                    _buffer.Clear();
                    _baseIndentation = null;
                }
                catch (ParseException)
                {
                    // A rejected prefix can become valid when more input arrives.
                }
            }

            _baseIndentation ??= indentation;
        }

        private void Publish(IEnumerable<Link<string>> links, List<Link<string>> emitted)
        {
            foreach (var link in links)
            {
                emitted.Add(link);
                if (Collect) _links.Add(link);
                LinkParsed?.Invoke(link);
            }
        }

        private void AdvanceSegment(string document)
        {
            _segmentOffset += document.Length;
            foreach (var character in document)
            {
                if (character == '\n') _segmentLine++;
            }
        }

        private static int LeadingSpaces(StringBuilder line)
        {
            var indentation = 0;
            while (indentation < line.Length && line[indentation] == ' ') indentation++;
            return indentation;
        }

        private static bool StructurallyComplete(string document, bool comments)
        {
            var depth = 0;
            for (var position = 0; position < document.Length; position++)
            {
                var character = document[position];
                if (Quotes.IsQuote(character) && Follows(document, position, BeforeReference))
                {
                    var end = Quotes.ReferenceEnd(document, position);
                    if (end < 0) return false;
                    position = end - 1;
                    continue;
                }
                if (comments && character == Comments.Comment && Follows(document, position, BeforeComment))
                {
                    var newline = document.IndexOf('\n', position);
                    if (newline < 0) break;
                    position = newline;
                    continue;
                }
                if (character == '(') depth++;
                else if (character == ')') depth--;
            }
            return depth == 0;
        }

        private static bool Follows(string document, int position, string allowed) =>
            position == 0 || allowed.IndexOf(document[position - 1]) >= 0;
    }

    /// <summary>An absolute stream position and the unresolved record size.</summary>
    public readonly record struct StreamPosition(int Offset, int Line, int Column, int Buffered);
}
