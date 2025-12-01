using Platform.Collections;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// Provides extension methods for formatting collections of <see cref="Link{TLinkAddress}"/> instances.
    /// </summary>
    public static class IListExtensions
    {
        /// <summary>
        /// Formats a collection of links as a multi-line string with each link on a separate line.
        /// </summary>
        /// <typeparam name="TLinkAddress">The type used for link addresses/identifiers.</typeparam>
        /// <param name="links">The collection of links to format.</param>
        /// <returns>A multi-line string representation of the links.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static string Format<TLinkAddress>(this IList<Link<TLinkAddress>> links) => string.Join(Environment.NewLine, links.Select(l => l.ToString()));

        /// <summary>
        /// Formats a collection of links as a multi-line string with optional parentheses trimming for cleaner output.
        /// </summary>
        /// <typeparam name="TLinkAddress">The type used for link addresses/identifiers.</typeparam>
        /// <param name="links">The collection of links to format.</param>
        /// <param name="lessParentheses">True to remove outer parentheses from each link for cleaner formatting; false to use standard formatting.</param>
        /// <returns>A multi-line string representation of the links.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static string Format<TLinkAddress>(this IList<Link<TLinkAddress>> links, bool lessParentheses)
        {
            if (lessParentheses == false)
            {
                return links.Format();
            }
            else
            {
                return string.Join(Environment.NewLine, links.Select(l => l.ToString().TrimSingle('(').TrimSingle(')')));
            }
        }

        /// <summary>
        /// Formats a collection of links using FormatOptions configuration.
        /// </summary>
        /// <typeparam name="TLinkAddress">The type used for link addresses/identifiers.</typeparam>
        /// <param name="links">The collection of links to format.</param>
        /// <param name="options">The FormatOptions to use for formatting.</param>
        /// <returns>A multi-line string representation of the links.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static string Format<TLinkAddress>(this IList<Link<TLinkAddress>> links, FormatOptions options)
        {
            if (links == null || links.Count == 0)
            {
                return string.Empty;
            }

            // Apply consecutive link grouping if enabled
            var linksToFormat = options.GroupConsecutive ? GroupConsecutiveLinks(links) : links;

            // Format each link with options
            var formattedLinks = linksToFormat.Select(l => l.FormatWithOptions(options));
            return string.Join(Environment.NewLine, formattedLinks);
        }

        /// <summary>
        /// Group consecutive links with the same ID.
        /// </summary>
        private static List<Link<TLinkAddress>> GroupConsecutiveLinks<TLinkAddress>(IList<Link<TLinkAddress>> links)
        {
            if (links == null || links.Count == 0)
            {
                return new List<Link<TLinkAddress>>();
            }

            var grouped = new List<Link<TLinkAddress>>();
            int i = 0;

            while (i < links.Count)
            {
                var current = links[i];

                // Look ahead for consecutive links with same ID
                if (current.Id != null && current.Values != null && current.Values.Count > 0)
                {
                    // Collect all values with same ID
                    var sameIdValues = new List<Link<TLinkAddress>>(current.Values);
                    int j = i + 1;

                    while (j < links.Count)
                    {
                        var nextLink = links[j];
                        if (EqualityComparer<TLinkAddress>.Default.Equals(nextLink.Id, current.Id) &&
                            nextLink.Values != null && nextLink.Values.Count > 0)
                        {
                            sameIdValues.AddRange(nextLink.Values);
                            j++;
                        }
                        else
                        {
                            break;
                        }
                    }

                    // If we found consecutive links, create grouped link
                    if (j > i + 1)
                    {
                        var groupedLink = new Link<TLinkAddress>(current.Id, sameIdValues);
                        grouped.Add(groupedLink);
                        i = j;
                        continue;
                    }
                }

                grouped.Add(current);
                i++;
            }

            return grouped;
        }
    }
}
