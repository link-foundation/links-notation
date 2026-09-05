using System.Text;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// Reads a delimited reference, the shape shared by the grammar and by
    /// <see cref="Comments"/>.
    /// </summary>
    /// <remarks>
    /// Any number N of delimiters opens and closes a reference, and 2N delimiters stand
    /// for N written as content. The grammar reads references through this class, so
    /// blanking comments reaches a reference exactly as far as the parser does.
    /// </remarks>
    internal static class Quotes
    {
        /// <summary>
        /// Reports whether the character is one of the delimiters a reference can be
        /// written between.
        /// </summary>
        /// <param name="character">The character to test.</param>
        /// <returns><see langword="true"/> when the character opens a reference.</returns>
        internal static bool IsQuote(char character) =>
            character == '"' || character == '\'' || character == '`';

        /// <summary>
        /// A body written between an even run of delimiters is substantive when it
        /// holds at least one visible character and does not straddle a parenthesis.
        /// An even run can always be read as delimiter pairs enclosing nothing, so the
        /// n-quote reading is only taken when it carries something the pairs cannot.
        /// </summary>
        /// <param name="content">The body to weigh.</param>
        /// <returns><see langword="true"/> when the body carries something a pair cannot.</returns>
        internal static bool IsSubstantiveBody(string content)
        {
            int depth = 0;
            bool hasVisible = false;

            foreach (var c in content)
            {
                if (c == '(')
                {
                    depth++;
                }
                else if (c == ')')
                {
                    depth--;
                    if (depth < 0) return false;
                }

                if (!char.IsWhiteSpace(c)) hasVisible = true;
            }

            return hasVisible && depth == 0;
        }

        /// <summary>
        /// Reads the reference starting at the given position.
        /// </summary>
        /// <param name="subject">The whole document being read.</param>
        /// <param name="start">The position of the opening delimiter.</param>
        /// <param name="value">The content of the reference, without its delimiters.</param>
        /// <param name="length">How many characters the reference spans.</param>
        /// <returns><see langword="true"/> when a reference was read at that position.</returns>
        internal static bool TryParse(string? subject, int start, out string? value, out int length)
        {
            value = null;
            length = 0;
            if (subject == null || start >= subject.Length || !IsQuote(subject[start])) return false;

            char quoteChar = subject[start];

            // Count opening quotes
            int quoteCount = 0;
            int pos = start;
            while (pos < subject.Length && subject[pos] == quoteChar)
            {
                quoteCount++;
                pos++;
            }

            bool isEvenRun = quoteCount % 2 == 0;

            string openClose = new string(quoteChar, quoteCount);
            string escapeSeq = new string(quoteChar, quoteCount * 2);

            var content = new StringBuilder();
            while (pos < subject.Length)
            {
                // Check for escape sequence (2*N quotes)
                if (pos + escapeSeq.Length <= subject.Length &&
                    string.CompareOrdinal(subject, pos, escapeSeq, 0, escapeSeq.Length) == 0)
                {
                    content.Append(openClose); // 2*N quotes become N quotes
                    pos += escapeSeq.Length;
                    continue;
                }

                // Check for closing quotes (exactly N quotes, not more)
                if (pos + quoteCount <= subject.Length &&
                    string.CompareOrdinal(subject, pos, openClose, 0, quoteCount) == 0)
                {
                    int afterClose = pos + quoteCount;
                    if (afterClose >= subject.Length || subject[afterClose] != quoteChar)
                    {
                        // Found valid closing
                        if (isEvenRun && !IsSubstantiveBody(content.ToString()))
                        {
                            return SetEmptyReference(isEvenRun, quoteCount, out value, out length);
                        }

                        value = content.ToString();
                        length = afterClose - start;
                        return true;
                    }
                }

                // Take next character
                content.Append(subject[pos]);
                pos++;
            }

            // No valid closing found
            return SetEmptyReference(isEvenRun, quoteCount, out value, out length);
        }

        /// <summary>
        /// Finds where the reference starting at the given position ends.
        /// </summary>
        /// <param name="subject">The whole document being read.</param>
        /// <param name="start">The position of the opening delimiter.</param>
        /// <returns>
        /// The position right after the closing delimiters, or -1 when no reference
        /// starts there.
        /// </returns>
        internal static int ReferenceEnd(string subject, int start) =>
            TryParse(subject, start, out var ignored, out var length) ? start + length : -1;

        /// <summary>
        /// A run of an even number of delimiters that does not open a reference with a
        /// substantive body is the empty reference: the shortest reading, a bare
        /// delimiter pair enclosing nothing, wins over a longer n-quote delimiter.
        /// </summary>
        private static bool SetEmptyReference(bool isEvenRun, int quoteCount, out string? value, out int length)
        {
            if (!isEvenRun)
            {
                value = null;
                length = 0;
                return false;
            }

            value = string.Empty;
            length = quoteCount;
            return true;
        }
    }
}
