using System;
using System.Linq;
using System.Threading;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// Links nested too deeply are refused with an error rather than recursed into until
    /// the stack overflows, which ends the process where no catch block sees it
    /// (https://github.com/link-foundation/links-notation/issues/315).
    /// </summary>
    /// <remarks>
    /// Every parenthesized group and every indentation level is one level, and the lines of
    /// a document start at level 0. The positions asserted here are the ones the Rust and
    /// JavaScript ports report for the same input.
    /// </remarks>
    public static class NestingDepthTests
    {
        private static string Parens(int depth) => new string('(', depth) + "a" + new string(')', depth);

        private static string Values(int depth) =>
            string.Concat(Enumerable.Repeat("(a ", depth)) + "b" + new string(')', depth);

        private static string Indentation(int depth) =>
            string.Concat(Enumerable.Range(0, depth + 1).Select(level => new string(' ', level) + "a\n"));

        private static ParseException TooDeep(string document, int maxDepth)
        {
            var error = Assert.Throws<ParseException>(() => new Parser(true, maxDepth).Parse(document));
            Assert.Equal(maxDepth, error.MaxDepth);
            return error;
        }

        private static bool Accepted(string document, int maxDepth) =>
            new Parser(true, maxDepth).Parse(document).Count > 0;

        [Fact]
        public static void DefaultLimitIsSharedByEveryImplementationTest()
        {
            Assert.Equal(64, Parser.DefaultMaxDepth);
            Assert.Equal(Parser.DefaultMaxDepth, new Parser().MaxDepth);
            Assert.Equal(Parser.DefaultMaxDepth, new Parser(comments: false).MaxDepth);
            Assert.Equal(3, new Parser { MaxDepth = 3 }.MaxDepth);
        }

        [Fact]
        public static void NegativeLimitIsRejectedTest()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new Parser(true, -1));
            Assert.Throws<ArgumentOutOfRangeException>(() => new Parser { MaxDepth = -1 });
        }

        [Fact]
        public static void ParenthesesUpToTheLimitAreAcceptedTest()
        {
            Assert.True(Accepted(Parens(3), 3));
            Assert.True(Accepted(Values(3), 3));
            Assert.NotEmpty(new Parser().Parse(Parens(Parser.DefaultMaxDepth)));
            Assert.NotEmpty(new Parser().Parse(Values(Parser.DefaultMaxDepth)));
        }

        [Fact]
        public static void EveryGroupAndEveryIndentationLevelIsOneLevelTest()
        {
            Assert.True(Accepted("(a)", 1));
            Assert.True(Accepted("a b c", 0));
            TooDeep("(a)", 0);
            TooDeep("((a))", 1);
            TooDeep("(a (b))", 1);
            TooDeep("a\n  (b)\n", 1);
        }

        [Fact]
        public static void ParenthesesPastTheLimitAreRefusedAtTheGroupThatIsTooDeepTest()
        {
            var error = TooDeep(Parens(4), 3);

            Assert.Equal((1, 4, 3), (error.Line, error.Column, error.Offset));
            Assert.Equal("line 1, column 4: nesting depth exceeds the maximum of 3", error.Summary);
            Assert.Equal("1 | ((((a))))\n  |    ^", error.Snippet);
            Assert.Equal(
                "Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3\n" +
                "1 | ((((a))))\n" +
                "  |    ^",
                error.Message);
        }

        [Fact]
        public static void GroupsInValuePositionCountLikeAnyOtherGroupTest()
        {
            var error = TooDeep(Values(4), 3);

            Assert.Equal((1, 10), (error.Line, error.Column));
        }

        [Fact]
        public static void IndentationUpToTheLimitIsAcceptedTest()
        {
            Assert.True(Accepted(Indentation(3), 3));
            Assert.NotEmpty(new Parser().Parse(Indentation(Parser.DefaultMaxDepth)));
        }

        [Fact]
        public static void IndentationPastTheLimitIsRefusedAtTheLineThatIsTooDeepTest()
        {
            var error = TooDeep(Indentation(4), 3);

            Assert.Equal((5, 5), (error.Line, error.Column));
            Assert.Equal("    a", error.LineText);
        }

        [Fact]
        public static void GroupsAndIndentationAddUpTest()
        {
            // `(b)` on the line indented once is at level 2.
            Assert.True(Accepted("a\n  (b)\n", 2));
            var error = TooDeep("a\n  (b)\n", 1);

            Assert.Equal((2, 3), (error.Line, error.Column));
        }

        [Fact]
        public static void IndentationInsideAGroupCountsOnTopOfTheGroupTest()
        {
            // `b` is inside one group and indented once within it.
            Assert.True(Accepted("(a\n  b)\n", 2));
            var error = TooDeep("(a\n  b)\n", 1);

            Assert.Equal((2, 3), (error.Line, error.Column));
        }

        [Fact]
        public static void TrailingSpacesOnADeepLineAreNotADeeperLineTest()
        {
            Assert.True(Accepted("a\n  b\n    c   \n", 2));
            Assert.True(Accepted("a\n  b\n    c\n      ", 2));
        }

        [Fact]
        public static void SyntaxErrorIsNotMistakenForNestingThatIsTooDeepTest()
        {
            var error = Assert.Throws<ParseException>(() => new Parser().Parse("a: b: c"));

            Assert.Null(error.MaxDepth);
            Assert.StartsWith("Syntax error at ", error.Message);
        }

        [Fact]
        public static void RefusesADocumentFarPastTheLimitWithoutOverflowingTheStackTest()
        {
            // Before the limit existed each of these overflowed the stack, which ends the
            // process. The documents are parsed on a 1 MiB stack, smaller than any thread
            // .NET starts by default.
            string?[] messages = new string?[3];
            Exception? unexpected = null;
            var thread = new Thread(() =>
            {
                try
                {
                    var documents = new[] { Parens(100_000), Values(100_000), Indentation(2_000) };
                    for (var index = 0; index < documents.Length; index++)
                    {
                        var error = Assert.Throws<ParseException>(() => new Parser().Parse(documents[index]));
                        Assert.Equal(Parser.DefaultMaxDepth, error.MaxDepth);
                        messages[index] = error.Message;
                    }
                }
                catch (Exception error)
                {
                    unexpected = error;
                }
            }, 1 << 20);
            thread.Start();
            thread.Join();

            Assert.Null(unexpected);
            Assert.All(messages, message => Assert.StartsWith("Nesting too deep at ", message));
        }

        [Fact]
        public static void StreamParserReportsWhereTheNestingIsTooDeepTest()
        {
            var stream = new StreamParser(new Parser(true, 1));
            stream.Write("a\nb ((c))\n");

            var error = Assert.Throws<StreamParseException>(() => stream.Finish());

            Assert.Equal(1, error.ParseError.MaxDepth);
            Assert.Equal((2, 4, 5), (error.Line, error.Column, error.Offset));
        }
    }
}
