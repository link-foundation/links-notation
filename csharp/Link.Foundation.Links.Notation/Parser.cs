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
        /// Creates a parser.
        /// </summary>
        /// <param name="comments">
        /// When <see langword="false"/>, <c>#</c> is read as an ordinary character
        /// instead of the start of a comment.
        /// </param>
        public Parser(bool comments = true) => Comments = comments;

        /// <summary>
        /// Whether <c>#</c> starts a comment that runs to the end of its line.
        /// </summary>
        public bool Comments { get; }

        /// <summary>
        /// Parses a Links Notation document.
        /// </summary>
        /// <param name="subject">The document to parse.</param>
        /// <param name="fileName">The optional file name to use in error messages.</param>
        /// <returns>The links the document holds.</returns>
        /// <exception cref="ParseException">
        /// Thrown when the document does not parse. The exception carries the line, the
        /// column and the offending line of the position the parser stopped at.
        /// </exception>
        public IList<Link<string>> Parse(string subject, string? fileName = null)
        {
            // Comments are blanked rather than removed, so a position reported for the
            // prepared document is the same position in the document the caller wrote.
            var prepared = Comments ? Notation.Comments.StripComments(subject) : subject;
            var tracer = new FurthestFailureTracer();
            var parser = new GeneratedParser { Tracer = tracer };
            try
            {
                return parser.Parse(prepared, fileName);
            }
            catch (FormatException error) when (error is not ParseException)
            {
                throw new ParseException(subject, tracer.Furthest, error);
            }
        }
    }
}
