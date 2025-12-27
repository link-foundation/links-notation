using System;
using Xunit;
using System.Collections.Generic;

namespace Link.Foundation.Links.Notation.Tests
{
    public static class LinkTests
    {
        [Fact]
        public static void LinkConstructorWithIdOnlyTest()
        {
            var link = new Link<string>("test", null);
            Assert.Equal("test", link.Id);
            Assert.Null(link.Values);
        }

        [Fact]
        public static void LinkConstructorWithIdAndValuesTest()
        {
            var values = new List<Link<string>> { new Link<string>("value1"), new Link<string>("value2") };
            var link = new Link<string>("parent", values);
            Assert.Equal("parent", link.Id);
            Assert.Equal(2, link.Values?.Count);
        }

        [Fact]
        public static void LinkToStringWithIdOnlyTest()
        {
            var link = new Link<string>("test");
            Assert.Equal("(test)", link.ToString());
        }

        [Fact]
        public static void LinkToStringWithValuesOnlyTest()
        {
            var values = new List<Link<string>> { new Link<string>("value1"), new Link<string>("value2") };
            var link = new Link<string>((string?)null, values);
            Assert.Equal("(value1 value2)", link.ToString());
        }

        [Fact]
        public static void LinkToStringWithIdAndValuesTest()
        {
            var values = new List<Link<string>> { new Link<string>("child1"), new Link<string>("child2") };
            var link = new Link<string>("parent", values);
            Assert.Equal("(parent: child1 child2)", link.ToString());
        }

        [Fact]
        public static void LinkEqualsTest()
        {
            var link1 = new Link<string>("test");
            var link2 = new Link<string>("test");
            var link3 = new Link<string>("other");

            Assert.Equal(link1, link2);
            Assert.NotEqual(link1, link3);
        }

        [Fact]
        public static void LinkCombineTest()
        {
            var link1 = new Link<string>("first");
            var link2 = new Link<string>("second");
            var combined = link1.Combine(link2);

            Assert.Null(combined.Id);
            Assert.Equal(2, combined.Values?.Count);
            Assert.Equal("first", combined.Values?[0].Id);
            Assert.Equal("second", combined.Values?[1].Id);
        }

        [Fact]
        public static void LinkEscapeReferenceSimpleTest()
        {
            Assert.Equal("test", Link<string>.EscapeReference("test"));
            Assert.Equal("test123", Link<string>.EscapeReference("test123"));
        }

        [Fact]
        public static void LinkEscapeReferenceWithSpecialCharactersTest()
        {
            Assert.Equal("'has space'", Link<string>.EscapeReference("has space"));
            Assert.Equal("'has:colon'", Link<string>.EscapeReference("has:colon"));
            Assert.Equal("'has(paren)'", Link<string>.EscapeReference("has(paren)"));
            Assert.Equal("'has)paren'", Link<string>.EscapeReference("has)paren"));
            Assert.Equal("\"has'quote\"", Link<string>.EscapeReference("has'quote"));
            Assert.Equal("'has\"quote'", Link<string>.EscapeReference("has\"quote"));
        }

        [Fact]
        public static void LinkSimplifyTest()
        {
            // Test simplify with empty values
            var link1 = new Link<string>("test", null);
            var simplified1 = link1.Simplify();
            Assert.Equal(link1, simplified1);

            // Test simplify with single value
            var link2 = new Link<string>((string?)null, new List<Link<string>> { new Link<string>("single", null) });
            var simplified2 = link2.Simplify();
            Assert.Equal("single", simplified2.Id);
            Assert.Null(simplified2.Values);
        }
    }
}