using System;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public static class MultilineQuotedStringTests
    {
        [Fact]
        public static void TestMultilineDoubleQuotedReference()
        {
            var input = @"(
  ""long
string literal representing
the reference""

  'another
long string literal
as another reference'
)";
            var parser = new Parser();
            var result = parser.Parse(input);

            Assert.NotEmpty(result);
            Assert.Single(result);

            var link = result[0];
            Assert.Null(link.Id);
            Assert.NotNull(link.Values);
            Assert.Equal(2, link.Values.Count);

            // The two references sit on separate lines inside the parentheses, so the
            // nested context turns each of them into its own link.
            Assert.Equal(@"long
string literal representing
the reference", link.Values![0].Values![0].Id);

            Assert.Equal(@"another
long string literal
as another reference", link.Values![1].Values![0].Id);
        }

        [Fact]
        public static void TestSimpleMultilineDoubleQuoted()
        {
            var input = @"(""line1
line2"")";
            var parser = new Parser();
            var result = parser.Parse(input);

            Assert.NotEmpty(result);
            Assert.Single(result);

            var link = result[0];
            Assert.Null(link.Id);
            Assert.NotNull(link.Values);
            Assert.Single(link.Values);
            Assert.Equal("line1\nline2", link.Values[0].Id);
        }

        [Fact]
        public static void TestSimpleMultilineSingleQuoted()
        {
            var input = @"('line1
line2')";
            var parser = new Parser();
            var result = parser.Parse(input);

            Assert.NotEmpty(result);
            Assert.Single(result);

            var link = result[0];
            Assert.Null(link.Id);
            Assert.NotNull(link.Values);
            Assert.Single(link.Values);
            Assert.Equal("line1\nline2", link.Values[0].Id);
        }

        [Fact]
        public static void TestMultilineQuotedAsId()
        {
            var input = @"(""multi
line
id"": value1 value2)";
            var parser = new Parser();
            var result = parser.Parse(input);

            Assert.NotEmpty(result);
            Assert.Single(result);

            var link = result[0];
            Assert.Equal("multi\nline\nid", link.Id);
            Assert.NotNull(link.Values);
            Assert.Equal(2, link.Values.Count);
        }
    }
}