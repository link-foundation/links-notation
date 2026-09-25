using System;
using System.Collections.Generic;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// Parses Links Notation documents into links.
    /// </summary>
    /// <remarks>
    /// The rules live in <c>Parser.peg</c> and are compiled into
    /// <see cref="GeneratedParser"/>; this class runs them and, when a document does not
    /// parse, reports the position the parser stopped at instead of the bare
    /// <see cref="FormatException"/> the generated parser raises.
    /// </remarks>
    public class Parser
    {
        /// <summary>
        /// How deep links may nest when nothing says otherwise.
        /// </summary>
        /// <remarks>
        /// The parser recurses once per level of nesting, and running out of stack ends the
        /// process where no caller can catch it. The limit is set well below what fits in a
        /// 1 MiB thread stack, and it is the same in every Links Notation implementation, so
        /// a document one of them reads is not too deep for another.
        /// </remarks>
        public const int DefaultMaxDepth = 64;

        /// <summary>
        /// Creates a parser.
        /// </summary>
        /// <param name="comments">
        /// When <see langword="false"/>, <c>#</c> is read as an ordinary character
        /// instead of the start of a comment.
        /// </param>
        public Parser(bool comments = true) : this(comments, DefaultMaxDepth)
        {
        }

        /// <summary>
        /// Creates a parser that refuses links nested deeper than <paramref name="maxDepth"/>.
        /// </summary>
        /// <param name="comments">
        /// When <see langword="false"/>, <c>#</c> is read as an ordinary character
        /// instead of the start of a comment.
        /// </param>
        /// <param name="maxDepth">How deep links may nest; see <see cref="MaxDepth"/>.</param>
        /// <exception cref="ArgumentOutOfRangeException"><paramref name="maxDepth"/> is negative.</exception>
        public Parser(bool comments, int maxDepth)
        {
            Comments = comments;
            MaxDepth = maxDepth;
        }

        /// <summary>
        /// Whether <c>#</c> starts a comment that runs to the end of its line.
        /// </summary>
        public bool Comments { get; }

        /// <summary>
        /// How deep links may nest. Every parenthesized group and every indentation level
        /// is one level, and the lines of a document are at level 0, so with a limit of 1
        /// <c>(a)</c> parses while <c>((a))</c>, <c>(a (b))</c> and a group on an indented
        /// line do not. A document nested deeper is refused with a
        /// <see cref="ParseException"/> whose <see cref="ParseException.MaxDepth"/> is set,
        /// rather than recursed into until the stack runs out.
        /// </summary>
        /// <exception cref="ArgumentOutOfRangeException">The value is negative.</exception>
        public int MaxDepth
        {
            get => _maxDepth;
            init => _maxDepth = value >= 0
                ? value
                : throw new ArgumentOutOfRangeException(nameof(MaxDepth), value, "Maximum nesting depth cannot be negative.");
        }

        private readonly int _maxDepth;

        /// <summary>
        /// Parses a Links Notation document.
        /// </summary>
        /// <param name="subject">The document to parse.</param>
        /// <param name="fileName">The optional file name to use in error messages.</param>
        /// <returns>The links the document holds.</returns>
        /// <exception cref="ParseException">
        /// Thrown when the document does not parse, or nests deeper than
        /// <see cref="MaxDepth"/>. The exception carries the line, the column and the
        /// offending line of the position the parser stopped at.
        /// </exception>
        public IList<Link<string>> Parse(string subject, string? fileName = null)
        {
            // Comments are blanked rather than removed, so a position reported for the
            // prepared document is the same position in the document the caller wrote.
            var prepared = Comments ? Notation.Comments.StripComments(subject) : subject;
            var tracer = new FurthestFailureTracer();
            var parser = new GeneratedParser { Tracer = tracer, MaxDepth = MaxDepth };
            try
            {
                return parser.Parse(prepared, fileName);
            }
            catch (GeneratedParser.NestingTooDeepException error)
            {
                throw new ParseException(subject, error.Offset, error.MaxDepth, error);
            }
            catch (FormatException error) when (error is not ParseException)
            {
                throw new ParseException(subject, tracer.Furthest, error);
            }
        }
    }
}
