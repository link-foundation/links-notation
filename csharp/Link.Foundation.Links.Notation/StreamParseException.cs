using System;

namespace Link.Foundation.Links.Notation
{
    /// <summary>A parser error located relative to the complete input stream.</summary>
    public sealed class StreamParseException : FormatException
    {
        internal StreamParseException(ParseException error, int offset, int line, int column)
            : base($"Stream parse error at line {line}, column {column}: {error.Message}", error)
        {
            Offset = offset;
            Line = line;
            Column = column;
            ParseError = error;
        }

        /// <summary>The canonical parser error raised for the buffered record.</summary>
        public ParseException ParseError { get; }

        /// <summary>Absolute character offset from the start of the stream.</summary>
        public int Offset { get; }

        /// <summary>One-based line number in the complete stream.</summary>
        public int Line { get; }

        /// <summary>One-based column number in the complete stream.</summary>
        public int Column { get; }
    }
}
