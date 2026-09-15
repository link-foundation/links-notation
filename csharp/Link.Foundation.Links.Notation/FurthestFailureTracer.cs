using Pegasus.Common;
using Pegasus.Common.Tracing;

namespace Link.Foundation.Links.Notation
{
    /// <summary>
    /// Remembers the furthest position a parse reached.
    /// </summary>
    /// <remarks>
    /// A parsing expression grammar backtracks, so the cursor the generated parser raises
    /// its error with is the start of the document rather than the place the document
    /// stopped making sense. The furthest position any rule reached is that place, and the
    /// tracer is the only hook the generated parser offers to observe it.
    /// </remarks>
    internal sealed class FurthestFailureTracer : ITracer
    {
        /// <summary>Offset of the furthest position the parse reached.</summary>
        public int Furthest { get; private set; }

        public void TraceRuleEnter(string ruleName, Cursor cursor) => Reach(cursor.Location);

        public void TraceRuleExit<T>(string ruleName, Cursor cursor, IParseResult<T> result)
        {
            if (result != null) Reach(result.EndCursor.Location);
        }

        public void TraceCacheHit<T>(string ruleName, Cursor cursor, CacheKey key, IParseResult<T> result)
        {
            if (result != null) Reach(result.EndCursor.Location);
        }

        public void TraceCacheMiss(string ruleName, Cursor cursor, CacheKey key)
        {
        }

        public void TraceInfo(string ruleName, Cursor cursor, string info)
        {
        }

        private void Reach(int location)
        {
            if (location > Furthest) Furthest = location;
        }
    }
}
