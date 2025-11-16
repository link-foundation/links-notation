using System;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// FormatOptions for Lino notation formatting.
    /// Provides configuration options for controlling how Link objects are formatted.
    /// </summary>
    public class FormatOptions
    {
        /// <summary>
        /// If true, omit parentheses where safe (default: false)
        /// </summary>
        public bool LessParentheses { get; set; } = false;

        /// <summary>
        /// Maximum line length before auto-indenting (default: 80)
        /// </summary>
        public int MaxLineLength { get; set; } = 80;

        /// <summary>
        /// If true, indent lines exceeding MaxLineLength (default: false)
        /// </summary>
        public bool IndentLongLines { get; set; } = false;

        /// <summary>
        /// Maximum number of references before auto-indenting (default: null = unlimited)
        /// </summary>
        public int? MaxInlineRefs { get; set; } = null;

        /// <summary>
        /// If true, group consecutive links with same ID (default: false)
        /// </summary>
        public bool GroupConsecutive { get; set; } = false;

        /// <summary>
        /// String to use for indentation (default: "  " = two spaces)
        /// </summary>
        public string IndentString { get; set; } = "  ";

        /// <summary>
        /// If true, prefer inline format when under thresholds (default: true)
        /// </summary>
        public bool PreferInline { get; set; } = true;

        /// <summary>
        /// Check if line should be indented based on length
        /// </summary>
        /// <param name="line">The line to check</param>
        /// <returns>True if line should be indented based on length threshold</returns>
        public bool ShouldIndentByLength(string line)
        {
            if (!IndentLongLines)
            {
                return false;
            }
            // Count printable unicode characters
            return line.Length > MaxLineLength;
        }

        /// <summary>
        /// Check if link should be indented based on reference count
        /// </summary>
        /// <param name="refCount">Number of references in the link</param>
        /// <returns>True if link should be indented based on reference count threshold</returns>
        public bool ShouldIndentByRefCount(int refCount)
        {
            if (MaxInlineRefs == null)
            {
                return false;
            }
            return refCount > MaxInlineRefs.Value;
        }
    }
}
