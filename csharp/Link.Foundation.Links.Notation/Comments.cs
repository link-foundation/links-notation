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
        /// What a delimited reference may start after.
        /// </summary>
        private const string BeforeReference = " \t\n\r(:";

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
        /// can see.
        /// </remarks>
        public static string StripComments(string document)
        {
            char[]? blanked = null;
            int position = 0;

            while (position < document.Length)
            {
                char character = document[position];

                if (Quotes.IsQuote(character) && Follows(document, position, BeforeReference))
                {
                    int end = Quotes.ReferenceEnd(document, position);
                    position = end < 0 ? position + 1 : end;
                    continue;
                }

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

                position++;
            }

            return blanked == null ? document : new string(blanked);
        }

        /// <summary>
        /// Reports whether the character before the position is one of the allowed ones,
        /// the start of the document counting as allowed.
        /// </summary>
        private static bool Follows(string document, int position, string allowed) =>
            position == 0 || allowed.IndexOf(document[position - 1]) >= 0;
    }
}
