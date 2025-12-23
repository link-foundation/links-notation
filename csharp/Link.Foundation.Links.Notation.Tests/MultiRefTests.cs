using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// Multi-Reference Feature Tests (Issue #184)
    /// Tests for multi-word references without quotes:
    /// - (some example: some example is a link)
    /// - ID as multi-word string: "some example"
    /// </summary>
    public static class MultiRefTests
    {
        [Fact]
        public static void ParsesTwoWordMultiReferenceId()
        {
            var parser = new Parser();
            var result = parser.Parse("(some example: value)");
            Assert.Single(result);
            // Multi-word ID should be joined with space
            Assert.Equal("some example", result[0].Id);
            Assert.Single(result[0].Values);
        }

        [Fact]
        public static void ParsesThreeWordMultiReferenceId()
        {
            var parser = new Parser();
            var result = parser.Parse("(new york city: value)");
            Assert.Single(result);
            Assert.Equal("new york city", result[0].Id);
        }

        [Fact]
        public static void ParsesSingleWordIdBackwardCompatible()
        {
            var parser = new Parser();
            var result = parser.Parse("(papa: value)");
            Assert.Single(result);
            Assert.Equal("papa", result[0].Id);
        }

        [Fact]
        public static void ParsesQuotedMultiWordIdBackwardCompatible()
        {
            var parser = new Parser();
            var result = parser.Parse("('some example': value)");
            Assert.Single(result);
            // Quoted ID should be preserved as-is
            Assert.Equal("some example", result[0].Id);
        }

        [Fact]
        public static void FormatMultiReferenceId()
        {
            var parser = new Parser();
            var result = parser.Parse("(some example: value)");
            var formatted = result.Format();
            // Multi-reference IDs are formatted with quotes (normalized form)
            Assert.Equal("('some example': value)", formatted);
        }

        [Fact]
        public static void RoundTripMultiReference()
        {
            var parser = new Parser();
            var input = "(new york city: great)";
            var result = parser.Parse(input);
            var formatted = result.Format();
            // Round-trip normalizes multi-word ID to quoted form
            Assert.Equal("('new york city': great)", formatted);
        }

        [Fact]
        public static void ParsesIndentedSyntaxMultiReference()
        {
            var parser = new Parser();
            var input = "some example:\n  value1\n  value2";
            var result = parser.Parse(input);
            Assert.Single(result);
            Assert.Equal("some example", result[0].Id);
            Assert.Equal(2, result[0].Values?.Count);
        }

        [Fact]
        public static void BackwardCompatibilitySingleLine()
        {
            var parser = new Parser();
            var result = parser.Parse("papa: loves mama");
            Assert.Single(result);
            Assert.Equal("papa", result[0].Id);
            Assert.Equal(2, result[0].Values?.Count);
        }

        [Fact]
        public static void BackwardCompatibilityParenthesized()
        {
            var parser = new Parser();
            var result = parser.Parse("(papa: loves mama)");
            Assert.Single(result);
            Assert.Equal("papa", result[0].Id);
            Assert.Equal(2, result[0].Values?.Count);
        }

        [Fact]
        public static void BackwardCompatibilityNested()
        {
            var parser = new Parser();
            var result = parser.Parse("(outer: (inner: value))");
            Assert.Single(result);
            Assert.Equal("outer", result[0].Id);
            Assert.Single(result[0].Values);
            Assert.Equal("inner", result[0].Values?[0].Id);
        }

        [Fact]
        public static void MultiRefWithMultipleValues()
        {
            var parser = new Parser();
            var result = parser.Parse("(some example: one two three)");
            Assert.Single(result);
            Assert.Equal("some example", result[0].Id);
            Assert.Equal(3, result[0].Values?.Count);
            Assert.Equal("one", result[0].Values?[0].Id);
            Assert.Equal("two", result[0].Values?[1].Id);
            Assert.Equal("three", result[0].Values?[2].Id);
        }
    }
}
