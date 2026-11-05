using System;
using System.Collections.Generic;
using System.Linq;

namespace Link.Foundation.Links.Notation
{
    /// <summary>Recursive nested formatting. Read by folding groups in a group-aware binding.</summary>
    public static class NestedFormat
    {
        /// <summary>Write nested lines in value order, without a final newline.</summary>
        public static string FormatNested<T>(this IEnumerable<Link<T>> links, string indent = "  ")
        {
            if (string.IsNullOrEmpty(indent) || indent.Any(c => c != ' '))
                throw new ArgumentException("indent must contain only spaces and be nonempty", nameof(indent));
            var lines = new List<string>();
            foreach (var link in links) Write(link, "", indent, false, lines);
            return string.Join("\n", lines);
        }

        private static bool Atom<T>(Link<T> link) => link.Id != null && (link.Values == null || link.Values.Count == 0);
        private static bool CanNest<T>(Link<T> link) => !Atom(link) &&
            !(link.Id == null && link.Values?.Count == 1 && !Atom(link.Values[0]));
        private static bool LineHolds<T>(Link<T> link, int count) =>
            link.Id != null || count >= 2 || (count == 1 && Atom(link.Values![0]));

        private static void Write<T>(Link<T> link, string pad, string indent, bool underName, List<string> lines)
        {
            var values = link.Values ?? Array.Empty<Link<T>>();
            if (!LineHolds(link, values.Count) || (underName && link.Id == null && values.Count == 1))
            {
                lines.Add(pad + link.ToString());
                return;
            }
            int count = values.Count;
            while (count > 0 && CanNest(values[count - 1])) count--;
            while (count < values.Count && !LineHolds(link, count)) count++;
            var parts = values.Take(count).Select(v => Atom(v) ? Link<T>.EscapeReference(v.Id?.ToString()) : v.ToString()).ToList();
            if (link.Id != null) parts.Insert(0, Link<T>.EscapeReference(link.Id.ToString()) + ":");
            lines.Add(pad + string.Join(" ", parts));
            foreach (var value in values.Skip(count)) Write(value, pad + indent, indent, underName || (link.Id != null && count == 0), lines);
        }
    }
}
