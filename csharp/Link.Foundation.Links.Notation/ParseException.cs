using System;
using System.Text;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// The error raised when a document does not parse, carrying the position the parser
    /// stopped at.
    /// </summary>
    /// <remarks>
    /// The position is the furthest one the parser reached, which is the character the
    /// document stops making sense at rather than the point the last alternative gave up
    /// on. It derives from <see cref="FormatException"/>, the exception the generated
    /// parser raised on its own, so code that catches that keeps working.
    /// </remarks>
    public class ParseException : FormatException
    {
        /// <summary>The number of characters a quoted line is cut down to.</summary>
        private const int QuotedLineWidth = 80;

        /// <summary>What a message writes in place of the part of a long line it left out.</summary>
        private const string Ellipsis = "...";

        /// <summary>
        /// Creates an exception describing where <paramref name="subject"/> stopped parsing.
        /// </summary>
        /// <param name="subject">The document that failed to parse.</param>
        /// <param name="offset">Offset of the position the parser stopped at.</param>
        /// <param name="innerException">The error the generated parser raised, if any.</param>
        public ParseException(string subject, int offset, Exception? innerException = null)
            : this(Locate(subject ?? string.Empty, offset), innerException)
        {
        }

        private ParseException(Position position, Exception? innerException)
            : base(Describe(position), innerException)
        {
            Offset = position.Offset;
            Line = position.Line;
            Column = position.Column;
            Found = position.Found;
            LineText = position.LineText;
        }

        /// <summary>Offset of the offending position from the start of the document.</summary>
        public int Offset { get; }

        /// <summary>Line the offending position is on, counted from 1.</summary>
        public int Line { get; }

        /// <summary>Column the offending position is at, counted from 1.</summary>
        public int Column { get; }

        /// <summary>The character found instead, or null at the end of the document.</summary>
        public char? Found { get; }

        /// <summary>The offending line, as written, without its line ending.</summary>
        public string LineText { get; }

        /// <summary>The one-line summary: where the parser stopped and what stands there.</summary>
        public string Summary => Summarize(new Position(Offset, Line, Column, Found, LineText));

        /// <summary>
        /// The offending line with a caret under the offending column, quoted the way a
        /// compiler quotes source. A long line is shown as a window around the caret, so the
        /// message stays the same size whether the document has ten lines or fifteen hundred.
        /// </summary>
        public string Snippet => Quote(new Position(Offset, Line, Column, Found, LineText));

        /// <summary>Where the parser stopped, and what the document holds there.</summary>
        private readonly record struct Position(
            int Offset,
            int Line,
            int Column,
            char? Found,
            string LineText);

        /// <summary>The message the exception carries: the summary and the quoted line.</summary>
        private static string Describe(Position position) =>
            $"Syntax error at {Summarize(position)}\n{Quote(position)}";

        private static string Summarize(Position position)
        {
            var found = position.Found.HasValue
                ? $"\"{Escape(position.Found.Value)}\""
                : "end of input";
            return $"line {position.Line}, column {position.Column}: unexpected {found}";
        }

        private static string Quote(Position position)
        {
            var (quoted, column) = QuoteLine(position.LineText, position.Column);
            var number = position.Line.ToString();
            var gutter = new string(' ', number.Length);
            return $"{number} | {quoted}\n{gutter} | {new string(' ', column - 1)}^";
        }

        private static string Escape(char character) => character switch
        {
            '\n' => "\\n",
            '\r' => "\\r",
            '\t' => "\\t",
            '"' => "\\\"",
            '\\' => "\\\\",
            _ => character.ToString(),
        };

        /// <summary>
        /// Turns the position the parser stopped at into a line, a column and the line
        /// itself, so the message can point at the defect instead of quoting the rest of the
        /// document.
        /// </summary>
        private static Position Locate(string document, int offset)
        {
            offset = Math.Max(0, Math.Min(offset, document.Length));

            var line = 1;
            var lineStart = 0;
            for (var index = 0; index < offset; index++)
            {
                if (document[index] == '\n')
                {
                    line++;
                    lineStart = index + 1;
                }
            }

            var lineEnd = document.IndexOf('\n', lineStart);
            if (lineEnd < 0) lineEnd = document.Length;

            var lineText = document.Substring(lineStart, lineEnd - lineStart).TrimEnd('\r');
            var found = offset < document.Length ? document[offset] : (char?)null;
            return new Position(offset, line, offset - lineStart + 1, found, lineText);
        }

        /// <summary>
        /// Cuts <paramref name="line"/> down to a window around <paramref name="column"/>, and
        /// says which column the offending character sits at in that window. Both columns
        /// count from 1.
        /// </summary>
        private static (string Quoted, int Column) QuoteLine(string line, int column)
        {
            if (line.Length <= QuotedLineWidth) return (line, column);

            var target = column - 1;
            var lastStart = line.Length - QuotedLineWidth;
            var start = Math.Min(Math.Max(target - (QuotedLineWidth / 2), 0), lastStart);
            var end = start + QuotedLineWidth;

            var quoted = new StringBuilder();
            if (start > 0) quoted.Append(Ellipsis);
            quoted.Append(line, start, QuotedLineWidth);
            if (end < line.Length) quoted.Append(Ellipsis);

            var shift = start > 0 ? Ellipsis.Length : 0;
            return (quoted.ToString(), target - start + shift + 1);
        }
    }
}
