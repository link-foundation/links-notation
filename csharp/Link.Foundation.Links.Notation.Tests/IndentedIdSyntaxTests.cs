using System;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public static class IndentedIdSyntaxTests
    {
        [Fact]
        public static void BasicIndentedIdSyntaxTest()
        {
            var indentedSyntax = @"3:
  papa
  loves
  mama";
            var inlineSyntax = "(3: papa loves mama)";

            var parser = new Parser();
            var indentedResult = parser.Parse(indentedSyntax);
            var inlineResult = parser.Parse(inlineSyntax);

            var indentedFormatted = indentedResult.Format();
            var inlineFormatted = inlineResult.Format();

            Assert.Equal(inlineFormatted, indentedFormatted);
            Assert.Equal("(3: papa loves mama)", indentedFormatted);
        }

        [Fact]
        public static void IndentedIdSyntaxWithSingleValueTest()
        {
            var input = @"greeting:
  hello";

            var parser = new Parser();
            var result = parser.Parse(input);
            var formatted = result.Format();

            Assert.Equal("(greeting: hello)", formatted);
            Assert.Single(result);
            Assert.Equal("greeting", result[0].Id);
            Assert.Single(result[0].Values);
            Assert.Equal("hello", result[0].Values[0].Id);
        }

        [Fact]
        public static void IndentedIdSyntaxWithMultipleValuesTest()
        {
            var input = @"action:
  run
  fast
  now";

            var parser = new Parser();
            var result = parser.Parse(input);
            var formatted = result.Format();

            Assert.Equal("(action: run fast now)", formatted);
            Assert.Single(result);
            Assert.Equal("action", result[0].Id);
            Assert.Equal(3, result[0].Values.Count);
        }

        [Fact]
        public static void IndentedIdSyntaxWithNumericIdTest()
        {
            var input = @"42:
  answer
  to
  everything";

            var parser = new Parser();
            var result = parser.Parse(input);
            var formatted = result.Format();

            Assert.Equal("(42: answer to everything)", formatted);
        }

        [Fact]
        public static void IndentedIdSyntaxWithQuotedIdTest()
        {
            var input = @"""complex id"":
  value1
  value2";

            var parser = new Parser();
            var result = parser.Parse(input);
            var formatted = result.Format();

            Assert.Equal("('complex id': value1 value2)", formatted);
        }

        [Fact]
        public static void MultipleIndentedIdLinksTest()
        {
            var input = @"first:
  a
  b
second:
  c
  d";

            var parser = new Parser();
            var result = parser.Parse(input);
            var formatted = result.Format();

            Assert.Equal(2, result.Count);
            Assert.Contains("(first: a b)", formatted);
            Assert.Contains("(second: c d)", formatted);
        }

        [Fact]
        public static void MixedIndentedAndRegularSyntaxTest()
        {
            var input = @"first:
  a
  b
(second: c d)
third value";

            var parser = new Parser();
            var result = parser.Parse(input);

            Assert.Equal(3, result.Count);

            var formatted = result.Format();
            Assert.Contains("(first: a b)", formatted);
            Assert.Contains("(second: c d)", formatted);
            Assert.Contains("third value", formatted);
        }

        [Fact]
        public static void UnsupportedColonOnlySyntaxShouldFailTest()
        {
            var input = @":
  papa
  loves
  mama";

            var parser = new Parser();
            Assert.Throws<FormatException>(() => parser.Parse(input));
        }

        [Fact]
        public static void EmptyIndentedIdShouldWorkTest()
        {
            var input = "empty:";

            var parser = new Parser();
            var result = parser.Parse(input);

            Assert.Single(result);
            Assert.Equal("empty", result[0].Id);
            Assert.True(result[0].Values == null || result[0].Values.Count == 0);

            var formatted = result.Format();
            Assert.Equal("(empty)", formatted);
        }

        [Fact]
        public static void EquivalenceTestComprehensiveTest()
        {
            var testCases = new[]
            {
                new { Indented = "test:\n  one", Inline = "(test: one)" },
                new { Indented = "x:\n  a\n  b\n  c", Inline = "(x: a b c)" },
                new { Indented = "\"quoted\":\n  value", Inline = "(\"quoted\": value)" }
            };

            var parser = new Parser();

            foreach (var testCase in testCases)
            {
                var indentedResult = parser.Parse(testCase.Indented);
                var inlineResult = parser.Parse(testCase.Inline);

                var indentedFormatted = indentedResult.Format();
                var inlineFormatted = inlineResult.Format();

                Assert.Equal(inlineFormatted, indentedFormatted);
            }
        }

        [Fact]
        public static void IndentedIdWithDeeperNestingTest()
        {
            var input = @"root:
  child1
  child2
    grandchild";

            var parser = new Parser();
            var result = parser.Parse(input);

            Assert.NotEmpty(result);

            var rootLink = result[0];
            Assert.Equal("root", rootLink.Id);
            Assert.Equal(2, rootLink.Values.Count);
        }
    }
}
