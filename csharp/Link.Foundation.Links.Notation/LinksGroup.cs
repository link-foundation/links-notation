using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using Platform.Collections;
using Platform.Collections.Lists;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// Represents a group of links with hierarchical structure, where each group contains a primary link and optional nested groups.
    /// This structure supports the indentation-based syntax of the Links Notation.
    /// </summary>
    /// <typeparam name="TLinkAddress">The type used for link addresses/identifiers. This can be any type that uniquely identifies a link, such as string, int, or Guid.</typeparam>
    public struct LinksGroup<TLinkAddress> : IEquatable<LinksGroup<TLinkAddress>>
    {
        /// <summary>
        /// Gets or sets the primary link of this group.
        /// </summary>
        public Link<TLinkAddress> Link
        {
            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            get;
            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            set;
        }

        /// <summary>
        /// Gets or sets the collection of nested groups within this group. Can be null if no nested groups exist.
        /// </summary>
        public IList<LinksGroup<TLinkAddress>>? Groups
        {
            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            get;
            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            set;
        }

        /// <summary>
        /// Initializes a new links group with the specified link and nested groups.
        /// </summary>
        /// <param name="link">The primary link of this group.</param>
        /// <param name="groups">The nested groups within this group.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public LinksGroup(Link<TLinkAddress> link, IList<LinksGroup<TLinkAddress>>? groups)
        {
            Link = link;
            Groups = groups;
        }

        /// <summary>
        /// Initializes a new links group with the specified link and no nested groups.
        /// </summary>
        /// <param name="link">The primary link of this group.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public LinksGroup(Link<TLinkAddress> link) : this(link, null) { }

        /// <summary>
        /// Implicitly converts a links group to a list of links by flattening the hierarchical structure.
        /// </summary>
        /// <param name="value">The links group to convert.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator List<Link<TLinkAddress>>(LinksGroup<TLinkAddress> value) => value.ToLinksList();

        /// <summary>
        /// Converts this links group to a flat list of links, preserving the hierarchical relationships.
        /// </summary>
        /// <returns>A list of links representing the flattened structure of this group.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public List<Link<TLinkAddress>> ToLinksList()
        {
            var list = new List<Link<TLinkAddress>>();
            AppendToLinksList(list);
            return list;
        }

        /// <summary>
        /// Appends this links group to the specified list as flattened links.
        /// </summary>
        /// <param name="list">The list to append the links to.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public void AppendToLinksList(List<Link<TLinkAddress>> list) => AppendToLinksList(list, Link, this);

        /// <summary>
        /// Recursively appends a links group to a list, combining dependencies with nested groups to create a flattened structure.
        /// </summary>
        /// <param name="list">The list to append the links to.</param>
        /// <param name="dependency">The dependency link to combine with nested groups.</param>
        /// <param name="group">The links group to process.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static void AppendToLinksList(List<Link<TLinkAddress>> list, Link<TLinkAddress> dependency, LinksGroup<TLinkAddress> group)
        {
            list.Add(dependency);
            var groups = group.Groups;
            if (groups != null && !groups.IsNullOrEmpty())
            {
                for (int i = 0; i < groups.Count; i++)
                {
                    var innerGroup = groups[i];
                    AppendToLinksList(list, dependency.Combine(innerGroup.Link), innerGroup);
                }
            }
        }

        /// <summary>
        /// Determines whether the specified object is equal to this links group.
        /// </summary>
        /// <param name="obj">The object to compare with this links group.</param>
        /// <returns>True if the specified object is equal to this links group; otherwise, false.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public override bool Equals(object? obj) => obj is LinksGroup<TLinkAddress> linksGroup ? Equals(linksGroup) : false;

        /// <summary>
        /// Returns the hash code for this links group.
        /// </summary>
        /// <returns>A hash code for this links group.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public override int GetHashCode() => (Link, (Groups ?? Array.Empty<LinksGroup<TLinkAddress>>()).GenerateHashCode()).GetHashCode();

        /// <summary>
        /// Indicates whether the current links group is equal to another links group.
        /// </summary>
        /// <param name="other">The links group to compare with this links group.</param>
        /// <returns>True if the current links group is equal to the other parameter; otherwise, false.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public bool Equals(LinksGroup<TLinkAddress> other) => Link.Equals(other.Link) && (Groups ?? Array.Empty<LinksGroup<TLinkAddress>>()).EqualTo(other.Groups ?? Array.Empty<LinksGroup<TLinkAddress>>());

        /// <summary>
        /// Determines whether two links group instances are equal.
        /// </summary>
        /// <param name="left">The first links group to compare.</param>
        /// <param name="right">The second links group to compare.</param>
        /// <returns>True if the links groups are equal; otherwise, false.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static bool operator ==(LinksGroup<TLinkAddress> left, LinksGroup<TLinkAddress> right) => left.Equals(right);

        /// <summary>
        /// Determines whether two links group instances are not equal.
        /// </summary>
        /// <param name="left">The first links group to compare.</param>
        /// <param name="right">The second links group to compare.</param>
        /// <returns>True if the links groups are not equal; otherwise, false.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static bool operator !=(LinksGroup<TLinkAddress> left, LinksGroup<TLinkAddress> right) => !(left == right);

        /// <summary>
        /// Returns a string representation of this links group.
        /// </summary>
        /// <returns>A string representation of this links group.</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public override string ToString() => ToLinksList().Format();
    }
}
