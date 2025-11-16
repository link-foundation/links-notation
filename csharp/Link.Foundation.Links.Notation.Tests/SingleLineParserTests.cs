using System;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public static class SingleLineParserTests
    {
        [Fact]
        public static void SingleLinkTest()
        {
            var source = @"(address: source target)";
            var parser = new Parser();
            var links = parser.Parse(source);
            var target = links.Format();
            Assert.Equal(source, target);
        }

        [Fact]
        public static void TripletSingleLinkTest()
        {
            var source = @"(papa has car)";
            var parser = new Parser();
            var links = parser.Parse(source);
            var target = links.Format();
            Assert.Equal(source, target);
        }

        [Fact]
        public static void BugTest1()
        {
            var source = @"(ignore conan-center-index repository)";
            var links = new Parser().Parse(source);
            var target = links.Format();
            Assert.Equal(source,target);
        }

        [Fact]
        public static void QuotedReferencesTest()
        {
            var source = @"(a: 'b' ""c"")";
            var target = @"(a: b c)";
            var parser = new Parser();
            var links = parser.Parse(source);
            var formattedLinks = links.Format();
            Assert.Equal(target, formattedLinks);
        }

        [Fact]
        public static void QuotedReferencesWithSpacesTest()
        {
            var source = @"('a a': 'b b' ""c c"")";
            var target = @"('a a': 'b b' 'c c')";
            var parser = new Parser();
            var links = parser.Parse(source);
            var formattedLinks = links.Format();
            Assert.Equal(target, formattedLinks);
        }

        [Fact]
        public static void ParseSimpleReferenceTest()
        {
            var source = "test";
            var parser = new Parser();
            var links = parser.Parse(source);
            Assert.NotNull(links);
            Assert.Single(links);
            // Simple reference creates a singlet link with null Id and one value
            Assert.Null(links[0].Id);
            Assert.NotNull(links[0].Values);
            Assert.Single(links[0].Values);
            Assert.Equal("test", links[0].Values?[0].Id);
            Assert.Null(links[0].Values?[0].Values);
        }

        [Fact]
        public static void ParseReferenceWithColonAndValuesTest()
        {
            var source = "parent: child1 child2";
            var parser = new Parser();
            var links = parser.Parse(source);
            Assert.NotNull(links);
            Assert.Single(links);
            Assert.Equal("parent", links[0].Id);
            Assert.NotNull(links[0].Values);
            Assert.Equal(2, links[0].Values!.Count);
            Assert.Equal("child1", links[0].Values![0].Id);
            Assert.Equal("child2", links[0].Values![1].Id);
        }

        [Fact]
        public static void ParseMultilineLinkTest()
        {
            var source = "(parent: child1 child2)";
            var parser = new Parser();
            var links = parser.Parse(source);
            Assert.NotNull(links);
            Assert.Single(links);
            Assert.Equal("parent", links[0].Id);
            Assert.NotNull(links[0].Values);
            Assert.Equal(2, links[0].Values!.Count);
        }

        [Fact]
        public static void ParseValuesOnlyTest()
        {
            var source = ": value1 value2";
            var parser = new Parser();
            // Standalone ':' is now forbidden and should throw an exception
            Assert.Throws<FormatException>(() => parser.Parse(source));
        }

        [Fact]
        public static void SingletLinkTest()
        {
            // Test singlet link
            var input = "(singlet)";
            var result = new Parser().Parse(input);
            Assert.Single(result);
            Assert.Null(result[0].Id);
            Assert.NotNull(result[0].Values);
            Assert.Single(result[0].Values);
            Assert.Equal("singlet", result[0].Values?[0].Id);
            Assert.Null(result[0].Values?[0].Values);
        }

        [Fact]
        public static void ValueLinkTest()
        {
            // Test value link
            var input = "(value1 value2 value3)";
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void QuotedReferencesWithSpecialCharsTest()
        {
            // Test quoted references
            var input = @"(""id with spaces"": ""value with spaces"")";
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void SingleQuotedReferencesTest()
        {
            // Test single-quoted references
            var input = "('id': 'value')";
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void ParseQuotedReferencesValuesOnlyTest()
        {
            var source = "\"has space\" 'has:colon'";
            var parser = new Parser();
            var links = parser.Parse(source);
            Assert.NotNull(links);
            Assert.Single(links);
            Assert.Null(links[0].Id);
            Assert.NotNull(links[0].Values);
            Assert.Equal(2, links[0].Values!.Count);
            Assert.Equal("has space", links[0].Values![0].Id);
            Assert.Equal("has:colon", links[0].Values![1].Id);
            var formatted = links.Format();
            Assert.Equal("('has space' 'has:colon')", formatted);
        }

        [Fact]
        public static void NestedLinksTest()
        {
            // Test nested links
            var input = "(outer: (inner: value))";
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void HyphenatedIdentifiersTest()
        {
            // Test support for hyphenated identifiers like in BugTest1
            var source = @"(conan-center-index: repository info)";
            var parser = new Parser();
            var links = parser.Parse(source);
            var target = links.Format();
            Assert.Equal(source, target);
        }

        [Fact]
        public static void MultipleWordsInQuotesTest()
        {
            var source = @"(""New York"": city state)";
            var parser = new Parser();
            var links = parser.Parse(source);
            var target = links.Format();
            // Should preserve quotes for multi-word references
            Assert.Contains("New York", target);
        }

        [Fact]
        public static void SpecialCharactersInQuotesTest()
        {
            var input = @"(""key:with:colons"": ""value(with)parens"")";
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
            
            input = @"('key with spaces': 'value: with special chars')";
            result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void DeeplyNestedTest()
        {
            var input = "(a: (b: (c: (d: (e: value)))))";
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void SingleLineWithIdTest()
        {
            // Test single-line link with id
            var input = "id: value1 value2";
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void SingleLineWithoutIdTest()
        {
            // Test link without id (single-line) - now forbidden
            var input = ": value1 value2";
            Assert.Throws<FormatException>(() => new Parser().Parse(input));
        }

        [Fact]
        public static void MultilineWithoutIdTest()
        {
            // Test link without id (multi-line) - now forbidden
            var input = "(: value1 value2)";
            Assert.Throws<FormatException>(() => new Parser().Parse(input));
        }

        [Fact]
        public static void SimpleRefTest()
        {
            var input = "simple_ref";
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void MultiLineLinkWithIdTest()
        {
            var input = "(id: value1 value2)";
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void LinkWithoutIdMultiLineTest()
        {
            var input = "(: value1 value2)";
            Assert.Throws<FormatException>(() => new Parser().Parse(input));
        }

        [Fact]
        public static void SimpleReferenceParserTest()
        {
            var input = "hello";
            var result = new Parser().Parse(input);
            Assert.Single(result);
            Assert.Null(result[0].Id);
            Assert.NotNull(result[0].Values);
            Assert.Single(result[0].Values);
            Assert.Equal("hello", result[0].Values?[0].Id);
        }

        [Fact]
        public static void QuotedReferenceParserTest()
        {
            var input = "\"hello world\"";
            var result = new Parser().Parse(input);
            Assert.Single(result);
            Assert.Null(result[0].Id);
            Assert.NotNull(result[0].Values);
            Assert.Single(result[0].Values);
            Assert.Equal("hello world", result[0].Values?[0].Id);
        }

        [Fact]
        public static void SingletLinkParserTest()
        {
            var input = "(singlet)";
            var result = new Parser().Parse(input);
            Assert.Single(result);
            Assert.Null(result[0].Id);
            Assert.NotNull(result[0].Values);
            Assert.Single(result[0].Values);
            Assert.Equal("singlet", result[0].Values?[0].Id);
            Assert.Null(result[0].Values?[0].Values);
        }

        [Fact]
        public static void ValueLinkParserTest()
        {
            var input = "(a b c)";
            var result = new Parser().Parse(input);
            Assert.Single(result);
            Assert.Null(result[0].Id);
            Assert.Equal(3, result[0].Values?.Count);
        }
    }
}