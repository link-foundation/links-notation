using System;
using System.Linq;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    /// <summary>
    /// Multi-Reference Feature Tests (Issue #184)
    /// Tests for multi-word references without quotes:
    /// - (some example: some example is a link)
    /// - Ids as array: ["some", "example"]
    /// - Id property throws for multi-refs, use Ids instead
    /// </summary>
    public static class MultiRefTests
    {
        [Fact]
        public static void ParsesTwoWordMultiReferenceId()
        {
            var parser = new Parser();
            var result = parser.Parse("(some example: value)");
            Assert.Single(result);
            // Use Ids property for multi-references
            Assert.NotNull(result[0].Ids);
            Assert.Equal(2, result[0].Ids.Count);
            Assert.Equal(new[] { "some", "example" }, result[0].Ids);
            Assert.Single(result[0].Values);
        }

        [Fact]
        public static void ParsesThreeWordMultiReferenceId()
        {
            var parser = new Parser();
            var result = parser.Parse("(new york city: value)");
            Assert.Single(result);
            Assert.NotNull(result[0].Ids);
            Assert.Equal(3, result[0].Ids.Count);
            Assert.Equal(new[] { "new", "york", "city" }, result[0].Ids);
        }

        [Fact]
        public static void IdPropertyThrowsForMultiRef()
        {
            var parser = new Parser();
            var result = parser.Parse("(some example: value)");
            Assert.Single(result);
            // Id property should throw MultiReferenceException for multi-refs
            var ex = Assert.Throws<MultiReferenceException>(() => result[0].Id);
            Assert.Equal(2, ex.ReferenceCount);
            Assert.Contains("Use the 'Ids' property instead of 'Id'", ex.Message);
        }

        [Fact]
        public static void ParsesSingleWordIdBackwardCompatible()
        {
            var parser = new Parser();
            var result = parser.Parse("(papa: value)");
            Assert.Single(result);
            // Single-word: Id returns string, Ids returns array with single element
            Assert.Equal("papa", result[0].Id);
            Assert.NotNull(result[0].Ids);
            Assert.Single(result[0].Ids);
            Assert.Equal(new[] { "papa" }, result[0].Ids);
        }

        [Fact]
        public static void ParsesQuotedMultiWordIdBackwardCompatible()
        {
            var parser = new Parser();
            var result = parser.Parse("('some example': value)");
            Assert.Single(result);
            // Quoted multi-word is a single reference, so Id works
            Assert.Equal("some example", result[0].Id);
            Assert.NotNull(result[0].Ids);
            Assert.Single(result[0].Ids);
            Assert.Equal(new[] { "some example" }, result[0].Ids);
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
            Assert.NotNull(result[0].Ids);
            Assert.Equal(new[] { "some", "example" }, result[0].Ids);
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
            // Ids should contain the multi-ref parts
            Assert.NotNull(result[0].Ids);
            Assert.Equal(new[] { "some", "example" }, result[0].Ids);
            // Id should throw for multi-ref
            Assert.Throws<MultiReferenceException>(() => result[0].Id);
            // Values should be 3 separate references
            Assert.Equal(3, result[0].Values?.Count);
            Assert.Equal("one", result[0].Values?[0].Id);
            Assert.Equal("two", result[0].Values?[1].Id);
            Assert.Equal("three", result[0].Values?[2].Id);
        }

        [Fact]
        public static void MultiRefValuesAreSeparateReferences()
        {
            // Per issue #184 feedback: context-aware parsing is out of scope
            var parser = new Parser();
            var result = parser.Parse("(some example: some example is a link)");
            Assert.NotNull(result[0].Ids);
            Assert.Equal(new[] { "some", "example" }, result[0].Ids);
            // Values should be 5 separate references (no context-aware grouping)
            Assert.Equal(5, result[0].Values?.Count);
            Assert.Equal("some", result[0].Values?[0].Id);
            Assert.Equal("example", result[0].Values?[1].Id);
            Assert.Equal("is", result[0].Values?[2].Id);
            Assert.Equal("a", result[0].Values?[3].Id);
            Assert.Equal("link", result[0].Values?[4].Id);
        }
    }
}
