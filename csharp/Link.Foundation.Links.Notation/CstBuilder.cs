using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// Builds the concrete syntax tree of a document that has already been parsed.
    /// </summary>
    /// <remarks>
    /// The tokens are read with the rules the grammar uses: comments are found by
    /// <see cref="Comments.StripComments"/>, delimited references by <see cref="Quotes"/>
    /// and versioned literals by <see cref="ReferenceLiteral"/>, so the tree agrees with
    /// what <see cref="Parser.Parse"/> reads. Every token's text is taken from the document
    /// as written, never from the copy with its comments blanked.
    /// </remarks>
    internal static class CstBuilder
    {
        /// <summary>A versioned literal at the position the match starts at.</summary>
        private static readonly Regex Literal = new(@"\G~[0-9]+\{[^} \t\r\n()]*\}", RegexOptions.CultureInvariant);

        /// <summary>What ends a bare reference.</summary>
        private const string BareReferenceEnd = " \t\r\n(:)";

        /// <summary>An open container (the document or a group) and the line being filled in it.</summary>
        private sealed class Container
        {
            public Container(CstNode node) => Node = node;

            public CstNode Node { get; }

            public CstNode? Line { get; set; }
        }

        /// <summary>
        /// Reads <paramref name="input"/> into its concrete syntax tree.
        /// </summary>
        /// <param name="input">The document as written.</param>
        /// <param name="comments">Whether <c>#</c> starts a comment.</param>
        /// <returns>The <see cref="CstKind.Document"/> node.</returns>
        /// <exception cref="ParseException">The parentheses of the document are unbalanced.</exception>
        internal static CstNode Build(string input, bool comments)
        {
            // References are read in the document the grammar reads: the one with its
            // comments blanked, which keeps every position of the one written.
            var prepared = comments ? Notation.Comments.StripComments(input) : input;
            var document = new CstNode(CstKind.Document);
            // The open containers, innermost last.
            var containers = new List<Container> { new Container(document) };

            void Add(CstNode node)
            {
                var container = containers[^1];
                if (container.Line == null)
                {
                    container.Line = new CstNode(CstKind.Line);
                    container.Node.Add(container.Line);
                }
                container.Line.Add(node);
            }

            var position = 0;
            while (position < input.Length)
            {
                var character = input[position];
                var end = position + 1;

                if (comments && character == Notation.Comments.Comment && prepared[position] != Notation.Comments.Comment)
                {
                    // A blanked '#' opens a comment, which runs to the line ending.
                    while (end < input.Length && input[end] != '\n' && input[end] != '\r')
                    {
                        end++;
                    }
                    Add(Token(CstKind.Comment, input, position, end));
                }
                else if (character == '\r' || character == '\n')
                {
                    if (character == '\r' && end < input.Length && input[end] == '\n')
                    {
                        end++;
                    }
                    Add(Token(CstKind.Newline, input, position, end));
                    containers[^1].Line = null;
                }
                else if (character == ' ' || character == '\t')
                {
                    while (end < input.Length && (input[end] == ' ' || input[end] == '\t'))
                    {
                        end++;
                    }
                    Add(Token(CstKind.Whitespace, input, position, end));
                }
                else if (character == '(')
                {
                    var group = new CstNode(CstKind.Group);
                    group.Add(Token(CstKind.OpenParen, input, position, end));
                    Add(group);
                    containers.Add(new Container(group));
                }
                else if (character == ')')
                {
                    if (containers.Count == 1)
                    {
                        throw new ParseException(input, position);
                    }
                    containers[^1].Node.Add(Token(CstKind.CloseParen, input, position, end));
                    containers.RemoveAt(containers.Count - 1);
                }
                else if (character == ':')
                {
                    Add(Token(CstKind.Colon, input, position, end));
                }
                else
                {
                    Add(ReadReference(input, prepared, position, out end));
                }
                position = end;
            }

            if (containers.Count != 1)
            {
                throw new ParseException(input, input.Length);
            }
            return document;
        }

        private static CstNode Token(CstKind kind, string input, int start, int end) =>
            new(kind, input.Substring(start, end - start));

        /// <summary>
        /// Reads the reference that starts at <paramref name="start"/> the way the grammar
        /// reads it: a versioned literal, a delimited reference, or else a bare one.
        /// </summary>
        private static CstNode ReadReference(string input, string prepared, int start, out int end)
        {
            if (prepared[start] == '~')
            {
                var literal = Literal.Match(prepared, start);
                if (literal.Success)
                {
                    end = start + literal.Length;
                    var text = input.Substring(start, end - start);
                    return new CstNode(CstKind.Reference, text, ReferenceLiteral.Decode(text));
                }
            }
            if (Quotes.IsQuote(prepared[start]) && Quotes.TryParse(prepared, start, out var value, out var length))
            {
                end = start + length;
                return new CstNode(CstKind.Reference, input.Substring(start, length), value, prepared[start]);
            }
            end = start + 1;
            while (end < prepared.Length && BareReferenceEnd.IndexOf(prepared[end]) < 0)
            {
                end++;
            }
            var bare = input.Substring(start, end - start);
            return new CstNode(CstKind.Reference, bare, bare);
        }
    }
}
