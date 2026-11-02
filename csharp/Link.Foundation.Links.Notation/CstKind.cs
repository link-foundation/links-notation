using System;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// The kinds of nodes and tokens of a concrete syntax tree; see <see cref="CstNode"/>.
    /// </summary>
    public enum CstKind
    {
        /// <summary>The whole document: its lines.</summary>
        Document,

        /// <summary>One line: its tokens and groups, up to and including its line ending.</summary>
        Line,

        /// <summary>A parenthesized group: <c>(</c>, the lines inside it, and <c>)</c>.</summary>
        Group,

        /// <summary>A run of spaces and tabs.</summary>
        Whitespace,

        /// <summary>One line ending: <c>\n</c>, <c>\r\n</c> or <c>\r</c>.</summary>
        Newline,

        /// <summary>A comment, from <c>#</c> up to the line ending.</summary>
        Comment,

        /// <summary><c>(</c></summary>
        OpenParen,

        /// <summary><c>)</c></summary>
        CloseParen,

        /// <summary><c>:</c></summary>
        Colon,

        /// <summary>A bare, quoted or versioned literal reference.</summary>
        Reference,
    }

    /// <summary>
    /// Provides the names every Links Notation implementation gives the kinds of
    /// <see cref="CstKind"/>.
    /// </summary>
    public static class CstKindExtensions
    {
        /// <summary>
        /// The name of the kind as <see cref="CstNode.ToSExpression"/> writes it, the same in
        /// every implementation: <c>document</c>, <c>line</c>, <c>group</c>,
        /// <c>whitespace</c>, <c>newline</c>, <c>comment</c>, <c>open_paren</c>,
        /// <c>close_paren</c>, <c>colon</c> or <c>reference</c>.
        /// </summary>
        /// <param name="kind">The kind to name.</param>
        /// <returns>The shared name of the kind.</returns>
        public static string ToName(this CstKind kind) => kind switch
        {
            CstKind.Document => "document",
            CstKind.Line => "line",
            CstKind.Group => "group",
            CstKind.Whitespace => "whitespace",
            CstKind.Newline => "newline",
            CstKind.Comment => "comment",
            CstKind.OpenParen => "open_paren",
            CstKind.CloseParen => "close_paren",
            CstKind.Colon => "colon",
            CstKind.Reference => "reference",
            _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Unknown concrete syntax tree kind."),
        };

        /// <summary>
        /// Whether nodes of the kind hold children (<see cref="CstKind.Document"/>,
        /// <see cref="CstKind.Line"/> and <see cref="CstKind.Group"/>) rather than text.
        /// </summary>
        /// <param name="kind">The kind to test.</param>
        /// <returns><see langword="true"/> for a node kind, <see langword="false"/> for a token kind.</returns>
        public static bool IsNode(this CstKind kind) =>
            kind is CstKind.Document or CstKind.Line or CstKind.Group;
    }
}
