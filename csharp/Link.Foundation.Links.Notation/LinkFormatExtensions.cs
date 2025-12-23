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
        /// Format a link using FormatOptions configuration.
        /// </summary>
        /// <typeparam name="TLinkAddress">The type used for link addresses/identifiers.</typeparam>
        /// <param name="link">The link to format.</param>
        /// <param name="options">The FormatOptions to use.</param>
        /// <returns>Formatted string representation.</returns>
        public static string FormatWithOptions<TLinkAddress>(this Link<TLinkAddress> link, FormatOptions options)
        {
            // Empty link
            if (link.Id == null && (link.Values == null || link.Values.Count == 0))
            {
                return options.LessParentheses ? "" : "()";
            }

            // Link with only ID, no values
            if (link.Values == null || link.Values.Count == 0)
            {
                var escapedId = Link<TLinkAddress>.EscapeReference(link.Id?.ToString());
                return options.LessParentheses && !NeedsParentheses(link.Id?.ToString()) ?
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
                var valuesStr = string.Join(" ", link.Values.Select(v => GetValueString(v)));
                string testLine;
                if (link.Id != null)
                {
                    var idStr = Link<TLinkAddress>.EscapeReference(link.Id.ToString());
                    testLine = options.LessParentheses ? $"{idStr}: {valuesStr}" : $"({idStr}: {valuesStr})";
                }
                else
                {
                    testLine = options.LessParentheses ? valuesStr : $"({valuesStr})";
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
            if (link.Id == null)
            {
                if (options.LessParentheses)
                {
                    var allSimple = link.Values.All(v => v.Values == null || v.Values.Count == 0);
                    if (allSimple)
                    {
                        return string.Join(" ", link.Values.Select(v => Link<TLinkAddress>.EscapeReference(v.Id?.ToString())));
                    }
                    return values;
                }
                return $"({values})";
            }

            // Link with ID and values
            var id = Link<TLinkAddress>.EscapeReference(link.Id.ToString());
            var withColon = $"{id}: {values}";
            return options.LessParentheses && !NeedsParentheses(link.Id?.ToString()) ?
                withColon :
                $"({withColon})";
        }

        /// <summary>
        /// Format a link with indentation.
        /// </summary>
        private static string FormatIndented<TLinkAddress>(Link<TLinkAddress> link, FormatOptions options)
        {
            if (link.Id == null)
            {
                // Values only - format each on separate line
                var lines = link.Values.Select(v => options.IndentString + GetValueString(v));
                return string.Join(Environment.NewLine, lines);
            }

            // Link with ID - format as id:\n  value1\n  value2
            var idStr = Link<TLinkAddress>.EscapeReference(link.Id.ToString());
            var sb = new StringBuilder();
            sb.Append($"{idStr}:");

            foreach (var v in link.Values)
            {
                sb.Append(Environment.NewLine);
                sb.Append(options.IndentString);
                sb.Append(GetValueString(v));
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
