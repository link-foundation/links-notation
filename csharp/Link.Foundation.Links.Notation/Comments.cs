namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// Comments, and the rule that decides where one starts.
    /// </summary>
    /// <remarks>
    /// <c>#</c> starts a comment when it opens a token: at the start of the document or
    /// after a space, a tab or a line break. A <c>#</c> written inside a token
    /// (<c>issue#1047</c>) or inside a delimited reference (<c>"# not a comment"</c>) is
    /// an ordinary character.
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
        /// space (issue #377).
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

                if (character == Comment && Follows(document, position, BeforeComment))
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
