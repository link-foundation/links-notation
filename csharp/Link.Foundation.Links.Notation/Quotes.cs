using System.Text;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// Reads a delimited reference, the shape shared by the grammar and by
    /// <see cref="Comments"/>.
    /// </summary>
    /// <remarks>
    /// Any number N of delimiters opens and closes a reference, and 2N delimiters stand
    /// for N written as content. An even run followed by whitespace up to its line break
    /// is the empty reference, whatever later lines hold (issue #443). The grammar reads references through this class, so
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

            if (isEvenRun && StaysOnItsLine(subject, start))
            {
                // A pair, or a longer even run, that ends its line (or is followed by
                // whitespace up to a line break before anything closes it) is the empty
                // reference however later lines continue (issue #443).
                value = string.Empty;
                length = quoteCount;
                return true;
            }

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
        /// Reports whether the reference opened at <paramref name="start"/> is settled: a
        /// later run closes it, or it is an even run that stays on its line and so is the
        /// empty reference whatever follows it (issue #443). A reference that is not
        /// settled may still change what it holds when more of the document is written.
        /// </summary>
        /// <param name="subject">The whole document being read.</param>
        /// <param name="start">The position of the opening delimiter.</param>
        /// <returns><see langword="true"/> when no later text changes the reference.</returns>
        internal static bool IsSettled(string subject, int start)
        {
            if (ClosingRunEnd(subject, start, subject.Length) >= 0) return true;
            return RunLength(subject, start) % 2 == 0 && StaysOnItsLine(subject, start);
        }

        /// <summary>
        /// The position just past the first run of delimiters that closes the reference
        /// opened at <paramref name="start"/>, or -1 when no run closes it: a run of R
        /// closes a reference opened by N exactly when R / N is odd. An even run nothing
        /// closes is the empty reference, until a closing run is written after it. Only
        /// runs that start before <paramref name="limit"/> are looked at.
        /// </summary>
        private static int ClosingRunEnd(string subject, int start, int limit)
        {
            char quote = subject[start];
            int count = RunLength(subject, start);
            int position = start + count;
            while (position < limit)
            {
                position = subject.IndexOf(quote, position, limit - position);
                if (position < 0) return -1;
                int length = RunLength(subject, position);
                if (length / count % 2 == 1) return position + length;
                position += length;
            }
            return -1;
        }

        /// <summary>The number of delimiters in a row from <paramref name="start"/>.</summary>
        private static int RunLength(string subject, int start)
        {
            int length = 0;
            while (start + length < subject.Length && subject[start + length] == subject[start]) length++;
            return length;
        }

        /// <summary>
        /// Reports whether the even run opened at <paramref name="start"/> has to be read
        /// as the empty reference because its n-quoted reading would leave the line without
        /// opening a multiline reference: whitespace (or the end of the document) follows
        /// the run directly, and a line break comes before the closing run, or no run
        /// closes it at all (issue #443). A run holds no line break, so that is when no run
        /// that starts before the end of the line closes the reference, and only the rest
        /// of the line is read.
        /// </summary>
        private static bool StaysOnItsLine(string subject, int start)
        {
            int bodyStart = start + RunLength(subject, start);
            if (bodyStart < subject.Length && " \t\n\r".IndexOf(subject[bodyStart]) < 0) return false;
            int lineEnd = subject.IndexOfAny(LineBreaks, bodyStart);
            return ClosingRunEnd(subject, start, lineEnd < 0 ? subject.Length : lineEnd) < 0;
        }

        /// <summary>The characters that end a line.</summary>
        private static readonly char[] LineBreaks = { '\n', '\r' };

        /// <summary>
        /// The delimiter of a reference written as <paramref name="raw"/>, when
        /// <paramref name="raw"/> is exactly one delimited reference.
        /// </summary>
        /// <param name="raw">One reference exactly as written.</param>
        /// <returns>The first character when reading a reference there consumes all of
        /// <paramref name="raw"/>; otherwise <see langword="null"/>.</returns>
        internal static char? ReferenceQuote(string? raw) =>
            raw != null && raw.Length > 0 && IsQuote(raw[0]) && ReferenceEnd(raw, 0) == raw.Length
                ? raw[0]
                : null;

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
