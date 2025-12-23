using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;
using Platform.Collections;
using Platform.Collections.Lists;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// Represents a link in the Links Notation with an optional identifier and nested values.
    /// Links can represent simple references, complex nested structures, or relationships between references to links.
    /// </summary>
    /// <typeparam name="TLinkAddress">The type used for link addresses/identifiers. This can be any type that uniquely identifies a link, such as string, int, or Guid.</typeparam>
    public struct Link<TLinkAddress> : IEquatable<Link<TLinkAddress>>
    {
        private static readonly EqualityComparer<TLinkAddress> EqualityComparerInstance = EqualityComparer<TLinkAddress>.Default;

        /// <summary>
        /// Gets the identifier or address of this link. Can be null for anonymous links.
        /// </summary>
        public readonly TLinkAddress? Id;

        /// <summary>
        /// Gets the collection of nested link values. Can be null or empty for simple reference links.
        /// </summary>
        public readonly IList<Link<TLinkAddress>>? Values;

        /// <summary>
        /// Initializes a new link with the specified identifier and values.
        /// </summary>
        /// <param name="id">The link identifier or address.</param>
        /// <param name="values">The nested link values.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public Link(TLinkAddress? id, IList<Link<TLinkAddress>>? values) => (Id, Values) = (id, values);

        /// <summary>
        /// Initializes a new anonymous link with the specified values.
        /// </summary>
        /// <param name="values">The nested link values.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public Link(IList<Link<TLinkAddress>> values) : this(default!, values) { }

        /// <summary>
        /// Initializes a new anonymous link with the specified array of values.
        /// </summary>
        /// <param name="values">The nested link values as a parameter array.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public Link(params Link<TLinkAddress>[] values) : this(default!, values) { }

        /// <summary>
        /// Initializes a new simple reference link with the specified identifier.
        /// </summary>
        /// <param name="id">The link identifier or address.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public Link(TLinkAddress id) : this(id, default!) { }

        /// <summary>
        /// Returns the string representation of this link in Links Notation format.
        /// </summary>
        /// <returns>A string representation of the link with proper escaping and formatting.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public override string ToString() => Id == null ?
         $"({GetValuesString()})" :
            (Values == null || Values.Count == 0) ?
                $"({EscapeReference(Id.ToString())})" :
                $"({EscapeReference(Id.ToString())}: {GetValuesString()})";

        /// <summary>
        /// Gets the string representation of the link's values.
        /// </summary>
        /// <returns>A space-separated string of the values, or empty string if no values exist.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public string GetValuesString()
        {
            if (Values == null || Values.Count == 0)
            {
                return "";
            }
            var sb = new StringBuilder();
            for (int i = 0; i < Values.Count; i++)
            {
                if (i > 0)
                {
                    sb.Append(' ');
                }
                sb.Append(GetValueString(Values[i]));
            }
            return sb.ToString();
        }

        /// <summary>
        /// Simplifies the link structure by unwrapping single-value containers and recursively simplifying nested values.
        /// </summary>
        /// <returns>A simplified version of this link.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public Link<TLinkAddress> Simplify()
        {
            if (Values == null || Values.Count == 0)
            {
                return this;
            }
            else if (Values.Count == 1)
            {
                return Values[0];
            }
            else
            {
                var newValues = new Link<TLinkAddress>[Values.Count];
                for (int i = 0; i < Values.Count; i++)
                {
                    newValues[i] = Values[i].Simplify();
                }
                return new Link<TLinkAddress>(Id, newValues);
            }
        }

        /// <summary>
        /// Combines this link with another link to create a new link containing both as values.
        /// </summary>
        /// <param name="other">The other link to combine with.</param>
        /// <returns>A new link containing both links as values.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public Link<TLinkAddress> Combine(Link<TLinkAddress> other) => new Link<TLinkAddress>(this, other);

        /// <summary>
        /// Gets the string representation of a link value, choosing the appropriate format.
        /// </summary>
        /// <param name="value">The link value to convert to string.</param>
        /// <returns>The string representation of the link value.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static string GetValueString(Link<TLinkAddress> value) => value.ToLinkOrIdString();

        /// <summary>
        /// Escapes a reference string for safe use in Links Notation format by adding quotes if necessary.
        /// </summary>
        /// <param name="reference">The reference string to escape.</param>
        /// <returns>The escaped reference string with appropriate quoting.</returns>
        public static string EscapeReference(string? reference)
        {
            if (string.IsNullOrWhiteSpace(reference))
            {
                return "";
            }
            if (
                    reference.Contains(":") ||
                    reference.Contains("(") ||
                    reference.Contains(")") ||
                    reference.Contains(" ") ||
                    reference.Contains("\t") ||
                    reference.Contains("\n") ||
                    reference.Contains("\r") ||
                    reference.Contains("\"")
                )
            {
                return $"'{reference}'";
            }
            else if (reference.Contains("'"))
            {
                return $"\"{reference}\"";
            }
            else
            {
                return reference;
            }
        }

        /// <summary>
        /// Converts the link to its string representation, choosing between simple reference format or full link format.
        /// </summary>
        /// <returns>A string representation optimized for the link's content.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public string ToLinkOrIdString() => (Values == null || Values.Count == 0) ? (Id == null ? "" : EscapeReference(Id?.ToString())) : ToString();

        /// <summary>
        /// Implicitly converts a value to a simple reference link.
        /// </summary>
        /// <param name="value">The value to convert.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator Link<TLinkAddress>(TLinkAddress value) => new Link<TLinkAddress>(value);

        /// <summary>
        /// Implicitly converts a tuple of identifier and values to a link.
        /// </summary>
        /// <param name="value">The tuple containing identifier and values.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator Link<TLinkAddress>((TLinkAddress, IList<Link<TLinkAddress>>) value) => new(value.Item1, value.Item2);

        /// <summary>
        /// Implicitly converts a source-target pair to an anonymous link.
        /// </summary>
        /// <param name="value">The tuple containing source and target links.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator Link<TLinkAddress>((Link<TLinkAddress> source, Link<TLinkAddress> target) value) => new(value.source, value.target);

        /// <summary>
        /// Implicitly converts a tuple of identifier, source, and target to a link.
        /// </summary>
        /// <param name="value">The tuple containing id, source and target.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator Link<TLinkAddress>((id<TLinkAddress> id, Link<TLinkAddress> source, Link<TLinkAddress> target) value) => new(value.id.Id, new[] { value.source, value.target });

        /// <summary>
        /// Implicitly converts a source-linker-target triplet to an anonymous link.
        /// </summary>
        /// <param name="value">The tuple containing source, linker, and target links.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator Link<TLinkAddress>((Link<TLinkAddress> source, Link<TLinkAddress> linker, Link<TLinkAddress> target) value) => new(value.source, value.linker, value.target);

        /// <summary>
        /// Implicitly converts a tuple of identifier, source, linker, and target to a link.
        /// </summary>
        /// <param name="value">The tuple containing id, source, linker, and target.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator Link<TLinkAddress>((id<TLinkAddress> id, Link<TLinkAddress> source, Link<TLinkAddress> linker, Link<TLinkAddress> target) value) => new(value.id.Id, new[] { value.source, value.linker, value.target });

        /// <summary>
        /// Determines whether the specified object is equal to this link.
        /// </summary>
        /// <param name="obj">The object to compare with this link.</param>
        /// <returns>True if the specified object is equal to this link; otherwise, false.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public override bool Equals(object? obj) => obj is Link<TLinkAddress> link && Equals(link);

        /// <summary>
        /// Returns the hash code for this link.
        /// </summary>
        /// <returns>A hash code for this link.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public override int GetHashCode() => (Id, (Values ?? Array.Empty<Link<TLinkAddress>>()).GenerateHashCode()).GetHashCode();

        /// <summary>
        /// Indicates whether the current link is equal to another link.
        /// Two anonymous links (both with null Ids) are considered equal if their values are equal.
        /// </summary>
        /// <param name="other">The link to compare with this link.</param>
        /// <returns>True if the current link is equal to the other parameter; otherwise, false.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public bool Equals(Link<TLinkAddress> other)
        {
            // Both have null IDs - compare only values
            if (Id == null && other.Id == null)
            {
                return (Values ?? Array.Empty<Link<TLinkAddress>>()).EqualTo(other.Values ?? Array.Empty<Link<TLinkAddress>>());
            }

            // Only one has null ID - not equal
            if (Id == null || other.Id == null)
            {
                return false;
            }

            // Both have IDs - compare IDs and values
            return EqualityComparerInstance.Equals(Id, other.Id) &&
                   (Values ?? Array.Empty<Link<TLinkAddress>>()).EqualTo(other.Values ?? Array.Empty<Link<TLinkAddress>>());
        }

        /// <summary>
        /// Determines whether two link instances are equal.
        /// </summary>
        /// <param name="left">The first link to compare.</param>
        /// <param name="right">The second link to compare.</param>
        /// <returns>True if the links are equal; otherwise, false.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static bool operator ==(Link<TLinkAddress> left, Link<TLinkAddress> right) => left.Equals(right);

        /// <summary>
        /// Determines whether two link instances are not equal.
        /// </summary>
        /// <param name="left">The first link to compare.</param>
        /// <param name="right">The second link to compare.</param>
        /// <returns>True if the links are not equal; otherwise, false.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static bool operator !=(Link<TLinkAddress> left, Link<TLinkAddress> right) => !(left == right);
    }
}
