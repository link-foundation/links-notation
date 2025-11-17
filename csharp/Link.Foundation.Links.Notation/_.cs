using System.Runtime.CompilerServices;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// A utility struct that provides convenient implicit conversions for creating links from various tuple combinations.
    /// The underscore name follows functional programming conventions for placeholder/utility types.
    /// </summary>
    /// <typeparam name="TLinkAddress">The type used for link addresses/identifiers. This can be any type that uniquely identifies a link, such as string, int, or Guid.</typeparam>
    public struct _<TLinkAddress>
    {
        /// <summary>
        /// Gets the underlying link represented by this utility struct.
        /// </summary>
        public readonly Link<TLinkAddress> Link;

        /// <summary>
        /// Initializes a new instance with the specified link.
        /// </summary>
        /// <param name="id">The link to wrap.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public _(Link<TLinkAddress> id) => Link = id;

        /// <summary>
        /// Implicitly converts a link to this utility struct.
        /// </summary>
        /// <param name="value">The link to convert.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator _<TLinkAddress>(Link<TLinkAddress> value) => new(value);

        /// <summary>
        /// Implicitly converts a link address to this utility struct.
        /// </summary>
        /// <param name="id">The link address to convert.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator _<TLinkAddress>(TLinkAddress id) => new(id);

        /// <summary>
        /// Implicitly converts a tuple of address and link to this utility struct.
        /// </summary>
        /// <param name="value">The tuple containing address and link.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator _<TLinkAddress>((TLinkAddress, Link<TLinkAddress>) value) => new Link<TLinkAddress>(value.Item1, new[] { value.Item2 });

        /// <summary>
        /// Implicitly converts a tuple of address and two links to this utility struct.
        /// </summary>
        /// <param name="value">The tuple containing address and two links.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator _<TLinkAddress>((TLinkAddress, Link<TLinkAddress>, Link<TLinkAddress>) value) => new Link<TLinkAddress>(value.Item1, new[] { value.Item2, value.Item3 });

        /// <summary>
        /// Implicitly converts a tuple of address and three links to this utility struct.
        /// </summary>
        /// <param name="value">The tuple containing address and three links.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator _<TLinkAddress>((TLinkAddress, Link<TLinkAddress>, Link<TLinkAddress>, Link<TLinkAddress>) value) => new Link<TLinkAddress>(value.Item1, new[] { value.Item2, value.Item3, value.Item4 });

        /// <summary>
        /// Implicitly converts this utility struct back to a link.
        /// </summary>
        /// <param name="value">The utility struct to convert.</param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static implicit operator Link<TLinkAddress>(_<TLinkAddress> value) => value.Link;
    }
}
