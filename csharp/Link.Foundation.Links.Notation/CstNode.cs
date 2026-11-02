using System;
using System.Collections.Generic;
using System.Text;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// One node or token of the concrete syntax tree of a Links Notation document.
    /// </summary>
    /// <remarks>
    /// Every character of a document belongs to exactly one token, so the text of the
    /// tree is the document itself, comments, blank lines, indentation, quotes and line
    /// endings included. A <see cref="CstKind.Document"/> holds <see cref="CstKind.Line"/>
    /// nodes; a line holds the tokens up to and including its line ending, and a
    /// parenthesized <see cref="CstKind.Group"/> holds its own parentheses and the lines
    /// written between them. A group is part of the line it opens on, however many lines
    /// it spans. Read a tree with <see cref="Parser.ParseCst"/>.
    /// </remarks>
    public sealed class CstNode
    {
        private static readonly IReadOnlyList<CstNode> NoChildren = Array.Empty<CstNode>();

        private readonly List<CstNode>? _children;
        private readonly string _text;

        /// <summary>
        /// Creates a token.
        /// </summary>
        /// <param name="kind">A token kind.</param>
        /// <param name="text">The token's text exactly as written.</param>
        /// <param name="value">What a reference token means; <see langword="null"/> otherwise.</param>
        /// <param name="quote">The delimiter of a quoted reference token; <see langword="null"/> otherwise.</param>
        /// <exception cref="ArgumentException"><paramref name="kind"/> is a node kind.</exception>
        public CstNode(CstKind kind, string text, string? value = null, char? quote = null)
        {
            if (kind.IsNode())
            {
                throw new ArgumentException($"{kind.ToName()} is a node, not a token.", nameof(kind));
            }
            Kind = kind;
            _text = text ?? throw new ArgumentNullException(nameof(text));
            Value = value;
            Quote = quote;
        }

        /// <summary>
        /// Creates a node.
        /// </summary>
        /// <param name="kind">A node kind.</param>
        /// <param name="children">The node's children, in document order.</param>
        /// <exception cref="ArgumentException"><paramref name="kind"/> is a token kind.</exception>
        public CstNode(CstKind kind, IEnumerable<CstNode>? children = null)
        {
            if (!kind.IsNode())
            {
                throw new ArgumentException($"{kind.ToName()} is a token, not a node.", nameof(kind));
            }
            Kind = kind;
            _text = string.Empty;
            _children = children == null ? new List<CstNode>() : new List<CstNode>(children);
        }

        /// <summary>The kind of this node or token.</summary>
        public CstKind Kind { get; }

        /// <summary>The children of a node, in document order; empty for a token.</summary>
        public IReadOnlyList<CstNode> Children => _children ?? NoChildren;

        /// <summary>
        /// What a reference token means, its delimiters and escapes resolved: the ID a
        /// parsed link has. <see langword="null"/> for every other node and token.
        /// </summary>
        public string? Value { get; }

        /// <summary>
        /// The delimiter a quoted reference token was written between (<c>'</c>, <c>"</c> or
        /// <c>`</c>); <see langword="null"/> for a bare or literal reference and every other kind.
        /// </summary>
        public char? Quote { get; }

        /// <summary>Whether this is a token rather than a node with children.</summary>
        public bool IsToken => _children == null;

        /// <summary>
        /// The exact text this node or token was read from: a token's own text, and the
        /// text of its children one after another for a node.
        /// </summary>
        public string Text
        {
            get
            {
                if (_children == null)
                {
                    return _text;
                }
                var text = new StringBuilder();
                AppendText(text);
                return text.ToString();
            }
        }

        /// <summary>The exact text this node or token was read from; see <see cref="Text"/>.</summary>
        /// <returns>The text of this node or token.</returns>
        public override string ToString() => Text;

        /// <summary>
        /// Every token of this subtree, in document order; a token yields just itself.
        /// </summary>
        /// <returns>The tokens of this subtree.</returns>
        public IReadOnlyList<CstNode> Tokens()
        {
            var tokens = new List<CstNode>();
            AppendTokens(tokens);
            return tokens;
        }

        /// <summary>
        /// The tree as an S-expression: <c>(kind child ...)</c> for a node and
        /// <c>kind:"text"</c> for a token, the text with <c>\</c>, <c>"</c>, line feeds,
        /// carriage returns and tabs escaped. Every Links Notation implementation writes the
        /// same S-expression for the same document, and two trees are the same exactly when
        /// their S-expressions are.
        /// </summary>
        /// <returns>The S-expression of this subtree.</returns>
        /// <example>
        /// <c>new Parser().ParseCst("a '1'").ToSExpression()</c> is
        /// <c>(document (line reference:"a" whitespace:" " reference:"'1'"))</c>.
        /// </example>
        public string ToSExpression()
        {
            var expression = new StringBuilder();
            AppendSExpression(expression);
            return expression.ToString();
        }

        /// <summary>Appends a child; only the builder adds children once a tree is made.</summary>
        internal void Add(CstNode child) => _children!.Add(child);

        private void AppendText(StringBuilder text)
        {
            if (_children == null)
            {
                text.Append(_text);
                return;
            }
            foreach (var child in _children)
            {
                child.AppendText(text);
            }
        }

        private void AppendTokens(List<CstNode> tokens)
        {
            if (_children == null)
            {
                tokens.Add(this);
                return;
            }
            foreach (var child in _children)
            {
                child.AppendTokens(tokens);
            }
        }

        private void AppendSExpression(StringBuilder expression)
        {
            if (_children == null)
            {
                expression.Append(Kind.ToName()).Append(":\"");
                foreach (var character in _text)
                {
                    switch (character)
                    {
                        case '\\': expression.Append("\\\\"); break;
                        case '"': expression.Append("\\\""); break;
                        case '\n': expression.Append("\\n"); break;
                        case '\r': expression.Append("\\r"); break;
                        case '\t': expression.Append("\\t"); break;
                        default: expression.Append(character); break;
                    }
                }
                expression.Append('"');
                return;
            }
            expression.Append('(').Append(Kind.ToName());
            foreach (var child in _children)
            {
                expression.Append(' ');
                child.AppendSExpression(expression);
            }
            expression.Append(')');
        }
    }
}
