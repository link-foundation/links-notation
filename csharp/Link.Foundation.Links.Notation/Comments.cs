namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// Comments, and the rule that decides where one starts.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <c>#</c> starts a comment when it opens a token and is not a value:
    /// </para>
    /// <list type="bullet">
    /// <item><description>at the start of a line, after any indentation, a <c>#</c>
    /// always starts one;</description></item>
    /// <item><description>later on a line, after a space or a tab, a <c>#</c> starts one
    /// only when no character that could continue a bare reference follows it, that is
    /// when whitespace, the end of the document, <c>(</c>, <c>)</c> or <c>:</c> comes
    /// next. So <c>a: b # why</c> and <c>a: b #</c> hold a comment, while
    /// <c>tag #release</c> is the link of <c>tag</c> and <c>#release</c> (issue #444): a
    /// value is never silently dropped.</description></item>
    /// </list>
    /// <para>
    /// A <c>#</c> written inside a token (<c>issue#1047</c>) or inside a delimited
    /// reference (<c>"# not a comment"</c>) is an ordinary character.
    /// </para>
    /// </remarks>
    public static class Comments
    {
        /// <summary>
        /// The character that starts a comment.
        /// </summary>
        public const char Comment = '#';

        /// <summary>
        /// What ends a bare reference. A token starts after one of these, at the start of
        /// the document, and right after a delimited reference or a versioned literal: the
        /// places the grammar reads a reference from.
        /// </summary>
        internal const string Separators = " \t\n\r(:)";

        /// <summary>
        /// What a comment may start after.
        /// </summary>
        private const string BeforeComment = " \t\n\r";

        /// <summary>
        /// Indentation: what may stand between the start of a line and a comment.
        /// </summary>
        private const string Indentation = " \t";

        /// <summary>
        /// Reports whether the <c>#</c> at <paramref name="position"/> starts a comment: it
        /// opens a token, and either only indentation stands before it on its line or no
        /// character that could continue a bare reference follows it. The comment reader,
        /// the stream parser and the concrete syntax tree all judge a <c>#</c> with this
        /// one rule.
        /// </summary>
        /// <param name="document">The document being read.</param>
        /// <param name="position">The position of the character being judged.</param>
        /// <returns><see langword="true"/> when a comment starts at the position.</returns>
        /// <example>
        /// <code>
        /// OpensComment("# note", 0);       // true: the start of a line
        /// OpensComment("a #", 2);          // true: nothing follows it
        /// OpensComment("a # why", 2);      // true: a space follows it
        /// OpensComment("tag #release", 4); // false: a value
        /// OpensComment("issue#1047", 5);   // false: inside a token
        /// </code>
        /// </example>
        internal static bool OpensComment(string document, int position)
        {
            if (position < 0 || position >= document.Length || document[position] != Comment) return false;
            if (!Follows(document, position, BeforeComment)) return false;
            int before = position - 1;
            while (before >= 0 && Indentation.IndexOf(document[before]) >= 0) before--;
            if (before < 0 || document[before] == '\n' || document[before] == '\r') return true;
            int next = position + 1;
            return next >= document.Length || Separators.IndexOf(document[next]) >= 0;
        }

        /// <summary>
        /// Blanks every comment of a document.
        /// </summary>
        /// <param name="document">The document to read.</param>
        /// <returns>
        /// The same document with the characters of every comment replaced by spaces.
        /// </returns>
        /// <remarks>
        /// Every character of a comment is replaced rather than removed, so every later
        /// character keeps the position it had in the document the caller wrote, and
        /// anything the parser reports about a position still points at what the reader
        /// can see. The document is read token by token, the way the grammar reads it, so
        /// a <c>#</c> inside a delimited reference that starts right after a group,
        /// another reference or a literal is content, as it is in one that starts after a
        /// space (issue #377). Where a comment starts is decided by
        /// <see cref="OpensComment"/>, so <c>StripComments("tag #release # note\n")</c>
        /// keeps <c>#release</c> and blanks <c># note</c> (issue #444).
        /// </remarks>
        public static string StripComments(string document)
        {
            char[]? blanked = null;
            int position = 0;
            // Whether a token may start at the position.
            bool tokenStart = true;

            while (position < document.Length)
            {
                char character = document[position];

                if (character == Comment && OpensComment(document, position))
                {
                    blanked ??= document.ToCharArray();
                    while (position < document.Length &&
                           document[position] != '\n' &&
                           document[position] != '\r')
                    {
                        blanked[position] = ' ';
                        position++;
                    }

                    continue;
                }

                if (Separators.IndexOf(character) >= 0)
                {
                    tokenStart = true;
                    position++;
                    continue;
                }

                if (tokenStart)
                {
                    int end = DelimitedTokenEnd(document, position);
                    if (end >= 0)
                    {
                        position = end;
                        continue;
                    }
                }

                // Anything else is part of a bare reference, which runs to a separator.
                tokenStart = false;
                position++;
            }

            return blanked == null ? document : new string(blanked);
        }

        /// <summary>
        /// The position just past the versioned literal or delimited reference that starts
        /// the token at <paramref name="start"/>, or -1 when the token there is a bare
        /// reference: a delimiter run that never closes is read as one, as the grammar
        /// reads it.
        /// </summary>
        private static int DelimitedTokenEnd(string document, int start)
        {
            int literal = ReferenceLiteral.End(document, start);
            if (literal >= 0) return literal;
            return Quotes.IsQuote(document[start]) ? Quotes.ReferenceEnd(document, start) : -1;
        }

        /// <summary>
        /// Reports whether the character before the position is one of the allowed ones,
        /// the start of the document counting as allowed.
        /// </summary>
        private static bool Follows(string document, int position, string allowed) =>
            position == 0 || allowed.IndexOf(document[position - 1]) >= 0;
    }
}
