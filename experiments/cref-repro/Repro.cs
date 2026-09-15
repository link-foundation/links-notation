namespace N
{
    using System;
    using System.Collections.Generic;

    /// <summary>A link.</summary>
    /// <typeparam name="T">The value type.</typeparam>
    public class Link<T> { }

    /// <summary>
    ///  Probes which shapes of the C# <c>cref</c> brace shorthand actually bind.
    ///  Build with <c>dotnet build</c> and read the CS1584/CS1658 warnings, then
    ///  read bin/Debug/net8.0/p.xml: an unbound cref is written out with a
    ///  <c>!:</c> prefix.
    /// </summary>
    public class Probe
    {
        /// <summary>What Pegasus 4.1.0 emits for a `IList&lt;Link&lt;string&gt;&gt;` start rule.</summary>
        /// <returns><see cref="IList{Link{string}}" /></returns>
        public int Nested() => 0;

        /// <summary>Nesting alone is enough to break it, even without a keyword.</summary>
        /// <returns><see cref="IList{Link{String}}" /></returns>
        public int NestedNoKeyword() => 0;

        /// <summary>A single level is not safe either: `string` is not an identifier.</summary>
        /// <returns><see cref="IList{string}" /></returns>
        public int Keyword() => 0;

        /// <summary>A qualified type argument fails too.</summary>
        /// <returns><see cref="IList{System.String}" /></returns>
        public int Qualified() => 0;

        /// <summary>This one binds — but to the *open* generic IList`1.</summary>
        /// <returns><see cref="IList{String}" /></returns>
        public int BareIdentifier() => 0;

        /// <summary>The documentation-ID form binds exactly, at any nesting depth.</summary>
        /// <returns><see cref="T:System.Collections.Generic.IList{N.Link{System.String}}" /></returns>
        public int DocumentationId() => 0;
    }
}
