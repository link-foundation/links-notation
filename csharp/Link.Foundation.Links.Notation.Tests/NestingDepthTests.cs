using System;
using System.Linq;
using System.Threading;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// Reading nested groups must take time that grows with the size of the document,
    /// not with two to the power of its nesting depth
    /// (<see href="https://github.com/link-foundation/links-notation/issues/314">#314</see>).
    /// Before the fix, every level of nesting doubled the work: a document nested six
    /// levels deep took seconds. Each case runs on its own thread and fails when it has
    /// not finished within the budget, so a regression fails instead of hanging.
    /// </summary>
    public class NestingDepthTests
    {
        /// Generous enough for a debug build on a slow machine, and far below what the
        /// exponential reading took at the depths used here.
        private static readonly TimeSpan Budget = TimeSpan.FromSeconds(5);

        /// The depth used for the shapes that used to take exponential time.
        private const int Deep = 32;

        /// A depth that shows the reading stays linear well past the shallow cases.
        private const int VeryDeep = 256;

        private static string Closed(int depth) => new string('(', depth) + "a" + new string(')', depth);

        private static string ValueAfter(int depth) => new string('(', depth) + "a" + string.Concat(Enumerable.Repeat(") b", depth));

        private static string Unclosed(int depth) => new string('(', depth) + "a";

        /// Unclosed groups on lines that are each indented one space deeper.
        private static string IndentedUnclosed(int depth) =>
            string.Join("\n", Enumerable.Range(0, depth).Select(level => new string(' ', level) + "(a"));

        /// Formats the parsed document, or names the exception parsing raised.
        private static string ReadWithinBudget(string what, string source)
        {
            string? outcome = null;
            var reader = new Thread(() =>
            {
                try
                {
                    outcome = new Parser().Parse(source).Format();
                }
                catch (Exception error)
                {
                    outcome = error.GetType().Name;
                }
            }, 512 * 1024 * 1024)
            {
                // A reader that runs past the budget must not keep the test run alive.
                IsBackground = true,
            };
            reader.Start();
            Assert.True(reader.Join(Budget), $"{what} did not finish within {Budget}");
            return outcome!;
        }

        [Fact]
        public void ClosedGroupsReadInLinearTime()
        {
            var source = Closed(Deep);
            Assert.Equal(source, ReadWithinBudget("closed groups", source));
        }

        [Fact]
        public void ValuesAfterGroupsReadInLinearTime()
        {
            var source = ValueAfter(Deep);
            Assert.Equal($"({source})", ReadWithinBudget("values after groups", source));
        }

        [Fact]
        public void UnclosedGroupsFailInLinearTime()
        {
            Assert.Equal(nameof(ParseException), ReadWithinBudget("unclosed groups", Unclosed(Deep)));
        }

        [Fact]
        public void UnclosedGroupsOnIndentedLinesFailInLinearTime()
        {
            Assert.Equal(nameof(ParseException), ReadWithinBudget("unclosed indented groups", IndentedUnclosed(Deep)));
        }

        [Fact]
        public void ValuesAfterVeryDeepGroupsReadInLinearTime()
        {
            var source = ValueAfter(VeryDeep);
            Assert.Equal($"({source})", ReadWithinBudget("very deep values after groups", source));
        }

        [Fact]
        public void GroupFollowedByValuesKeepsItsStructure()
        {
            var cases = new[]
            {
                new[] { "(a) b", "((a) b)" },
                new[] { "(a) (b) c", "((a) (b) c)" },
                new[] { "((a) b) c", "(((a) b) c)" },
                new[] { "(a: b) c", "((a: b) c)" },
                new[] { "(a)\n(b) c", "(a)\n((b) c)" },
                new[] { "x\n  (a) b\n  (c)", "(x)\n((x) ((a) b))\n((x) (c))" },
            };

            var parser = new Parser();
            foreach (var testCase in cases)
            {
                Assert.Equal(testCase[1], parser.Parse(testCase[0]).Format());
            }
        }
    }
}
