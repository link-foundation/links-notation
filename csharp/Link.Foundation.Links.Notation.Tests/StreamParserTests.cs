using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public static class StreamParserTests
    {
        private const string Document =
            "first loves data\n" +
            "# streamed comment\n" +
            "profile:\n" +
            "  name Ada\n" +
            "  note \"line one\nline two\"\n" +
            "(nested:\n  child value)\n" +
            "last sees first";

        private static string[] Render(IEnumerable<Link<string>> links) =>
            links.Select(link => link.ToString()).ToArray();

        [Fact]
        public static void MatchesCanonicalParserOneSymbolAtATime()
        {
            var stream = new StreamParser();
            foreach (var character in Document)
            {
                stream.Write(character.ToString());
            }

            Assert.Equal(Render(new Parser().Parse(Document)), Render(stream.Finish()));
        }

        [Fact]
        public static void EmitsOnlyCompleteRecords()
        {
            var seen = new List<Link<string>>();
            var stream = new StreamParser();
            stream.LinkParsed += seen.Add;

            Assert.Empty(stream.Write("profile:\n  name Ada\n  note \"first\nsecond\"\n"));
            var emitted = stream.Write("n");

            Assert.Single(emitted);
            Assert.Equal(emitted, seen);
        }

        [Fact]
        public static void SupportsLineChunksFinalRecordAndPosition()
        {
            var stream = new StreamParser();
            foreach (var line in Document.SplitAfter('\n'))
            {
                stream.Write(line);
            }

            Assert.Equal(Render(new Parser().Parse(Document)), Render(stream.Finish()));
            Assert.Equal(Document.Length, stream.Position.Offset);
            Assert.Equal(0, stream.Position.Buffered);
        }

        [Fact]
        public static void SupportsDrainResetAndBoundedMemory()
        {
            var seen = new List<Link<string>>();
            var stream = new StreamParser { Collect = false, MaxBufferSize = 8 };
            stream.LinkParsed += seen.Add;
            for (var index = 0; index < 100; index++) stream.Write("a\n");

            Assert.Empty(stream.Drain());
            Assert.Single(stream.Finish());
            Assert.Equal(100, seen.Count);

            stream.Reset();
            Assert.Throws<ArgumentException>(() => { stream.Write("123456789"); });
        }

        [Fact]
        public static void ProvidesLazyAdapters()
        {
            var actual = StreamParser.ParseChunks(new[] { "one link\n", "two link" });

            Assert.Equal(new[] { "(one link)", "(two link)" }, Render(actual));
        }

        [Fact]
        public static void RejectsWritesAfterFinish()
        {
            var stream = new StreamParser();
            stream.Finish("one");

            Assert.Throws<InvalidOperationException>(() => stream.Write("two"));
        }

        [Fact]
        public static async Task ProvidesAnAsyncEnumerableAdapter()
        {
            static async IAsyncEnumerable<string> Chunks()
            {
                yield return "one link\n";
                await Task.Yield();
                yield return "two link";
            }

            var actual = new List<Link<string>>();
            await foreach (var link in StreamParser.ParseChunksAsync(
                Chunks(),
                cancellationToken: TestContext.Current.CancellationToken)) actual.Add(link);

            Assert.Equal(new[] { "(one link)", "(two link)" }, Render(actual));
        }
    }
}

internal static class StreamingTestStringExtensions
{
    public static IEnumerable<string> SplitAfter(this string value, char delimiter)
    {
        var start = 0;
        for (var index = 0; index < value.Length; index++)
        {
            if (value[index] != delimiter) continue;
            yield return value.Substring(start, index - start + 1);
            start = index + 1;
        }
        if (start < value.Length) yield return value.Substring(start);
    }
}
