using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// Provides extension methods for formatting <see cref="Link{TLinkAddress}"/> instances with FormatOptions.
    /// </summary>
    public static class LinkFormatExtensions
    {
        /// <summary>
        /// Gets the ID as a joined string for formatting purposes.
        /// Returns null if Ids is null or empty.
        /// </summary>
        private static string? GetIdString<TLinkAddress>(Link<TLinkAddress> link)
        {
            if (link.Ids == null || link.Ids.Count == 0)
            {
                return null;
            }
            if (link.Ids.Count == 1)
            {
                return link.Ids[0]?.ToString();
            }
            return string.Join(" ", link.Ids.Select(id => id?.ToString()));
        }

        /// <summary>
        /// Format a link using FormatOptions configuration.
        /// </summary>
        /// <typeparam name="TLinkAddress">The type used for link addresses/identifiers.</typeparam>
        /// <param name="link">The link to format.</param>
        /// <param name="options">The FormatOptions to use.</param>
        /// <returns>Formatted string representation.</returns>
        public static string FormatWithOptions<TLinkAddress>(this Link<TLinkAddress> link, FormatOptions options)
        {
            var idStr = GetIdString(link);

            // Empty link
            if (idStr == null && (link.Values == null || link.Values.Count == 0))
            {
                return options.LessParentheses ? "" : "()";
            }

            // Link with only ID, no values
            if (link.Values == null || link.Values.Count == 0)
            {
                var escapedId = Link<TLinkAddress>.EscapeReference(idStr);
                return options.LessParentheses && !NeedsParentheses(idStr) ?
                    escapedId :
                    $"({escapedId})";
            }

            // Check if we should use indented format
            bool shouldIndent = false;
            if (options.ShouldIndentByRefCount(link.Values.Count))
            {
                shouldIndent = true;
            }
            else
            {
                // Try inline format first
                var valuesString = string.Join(" ", link.Values.Select(v => GetValueString(v)));
                string testLine;
                if (idStr != null)
                {
                    var escapedId = Link<TLinkAddress>.EscapeReference(idStr);
                    testLine = options.LessParentheses ? $"{escapedId}: {valuesString}" : $"({escapedId}: {valuesString})";
                }
                else
                {
                    testLine = options.LessParentheses ? valuesString : $"({valuesString})";
                }

                if (options.ShouldIndentByLength(testLine))
                {
                    shouldIndent = true;
                }
            }

            // Format with indentation if needed
            if (shouldIndent && options.PreferInline == false)
            {
                return FormatIndented(link, options);
            }

            // Standard inline formatting
            var values = string.Join(" ", link.Values.Select(v => GetValueString(v)));

            // Link with values only (null id)
            if (idStr == null)
            {
                if (options.LessParentheses)
                {
                    var allSimple = link.Values.All(v => v.Values == null || v.Values.Count == 0);
                    if (allSimple)
                    {
                        return string.Join(" ", link.Values.Select(v => Link<TLinkAddress>.EscapeReference(GetIdString(v))));
                    }
                    return values;
                }
                return $"({values})";
            }

            // Link with ID and values
            var id = Link<TLinkAddress>.EscapeReference(idStr);
            var withColon = $"{id}: {values}";
            return options.LessParentheses && !NeedsParentheses(idStr) ?
                withColon :
                $"({withColon})";
        }

        /// <summary>
        /// Format a link with indentation.
        /// </summary>
        private static string FormatIndented<TLinkAddress>(Link<TLinkAddress> link, FormatOptions options)
        {
            var idStr = GetIdString(link);

            if (idStr == null)
            {
                // Values only - format each on separate line
                var lines = link.Values?.Select(v => options.IndentString + GetValueString(v)) ?? Array.Empty<string>();
                return string.Join(Environment.NewLine, lines);
            }

            // Link with ID - format as id:\n  value1\n  value2
            var escapedId = Link<TLinkAddress>.EscapeReference(idStr);
            var sb = new StringBuilder();
            sb.Append($"{escapedId}:");

            if (link.Values != null)
            {
                foreach (var v in link.Values)
                {
                    sb.Append(Environment.NewLine);
                    sb.Append(options.IndentString);
                    sb.Append(GetValueString(v));
                }
            }

            return sb.ToString();
        }

        /// <summary>
        /// Get the string representation of a value.
        /// </summary>
        private static string GetValueString<TLinkAddress>(Link<TLinkAddress> value)
        {
            return value.ToLinkOrIdString();
        }

        /// <summary>
        /// Check if a string needs to be wrapped in parentheses.
        /// </summary>
        private static bool NeedsParentheses(string s)
        {
            return s != null && (s.Contains(" ") || s.Contains(":") || s.Contains("(") || s.Contains(")"));
        }
    }
}
