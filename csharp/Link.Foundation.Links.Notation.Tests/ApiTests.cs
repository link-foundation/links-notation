using System;
using System.Collections.Generic;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public static class ApiTests
    {
        [Fact]
        public static void IsRefEquivalentTest()
        {
            // C# doesn't have separate Ref/Link types, but we can test simple link behavior
            var simpleLink = new Link<string>("some_value", null);
            Assert.Equal("some_value", simpleLink.Id);
            Assert.Null(simpleLink.Values);
        }

        [Fact]
        public static void IsLinkEquivalentTest()
        {
            // Test link with values
            var values = new List<Link<string>> { new Link<string>("child", null) };
            var link = new Link<string>("id", values);
            Assert.Equal("id", link.Id);
            Assert.Single(link.Values);
            Assert.Equal("child", link.Values?[0].Id);
        }

        [Fact]
        public static void EmptyLinkTest()
        {
            var link = new Link<string>(null, new List<Link<string>>());
            var output = link.ToString();
            Assert.Equal("()", output);
        }

        [Fact]
        public static void SimpleLinkTest()
        {
            var input = "(1: 1 1)";
            var parser = new Parser();
            var parsed = parser.Parse(input);
            
            // Validate regular formatting
            var output = parsed.Format();
            Assert.Contains("1:", output);
            Assert.Contains("1", output);
        }

        [Fact]
        public static void LinkWithSourceTargetTest()
        {
            var input = "(index: source target)";
            var parser = new Parser();
            var parsed = parser.Parse(input);
            
            // Validate regular formatting
            var output = parsed.Format();
            Assert.Equal(input, output);
        }

        [Fact]
        public static void LinkWithSourceTypeTargetTest()
        {
            var input = "(index: source type target)";
            var parser = new Parser();
            var parsed = parser.Parse(input);
            
            // Validate regular formatting
            var output = parsed.Format();
            Assert.Equal(input, output);
        }

        [Fact]
        public static void SingleLineFormatTest()
        {
            var input = "id: value1 value2";
            var parser = new Parser();
            var parsed = parser.Parse(input);
            
            // The parser should handle single-line format
            var output = parsed.Format();
            Assert.Contains("id", output);
            Assert.Contains("value1", output);
            Assert.Contains("value2", output);
        }

        [Fact]
        public static void QuotedReferencesTest()
        {
            var input = @"(""quoted id"": ""value with spaces"")";
            var parser = new Parser();
            var parsed = parser.Parse(input);
            
            var output = parsed.Format();
            Assert.Contains("quoted id", output);
            Assert.Contains("value with spaces", output);
        }
    }
}