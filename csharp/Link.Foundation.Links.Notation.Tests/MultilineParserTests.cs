using System;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public static class MultilineParserTests
    {
        [Fact]
        public static void TwoLinksTest()
        {
            var source = @"(first: x y)
(second: a b)";
            var parser = new Parser();
            var links = parser.Parse(source);
            var target = links.Format();
            Assert.Equal(source, target);
        }

        [Fact]
        public static void ParseAndStringifyTest()
        {
            var source = @"(papa (lovesMama: loves mama))
(son lovesMama)
(daughter lovesMama)
(all (love mama))";
            var parser = new Parser();
            var links = parser.Parse(source);
            var target = links.Format();
            Assert.Equal(source, target);
        }

        [Fact]
        public static void ParseAndStringifyTest2()
        {
            var source = @"father (lovesMom: loves mom)
son lovesMom
daughter lovesMom
all (love mom)";
            var links = new Parser().Parse(source);
            var target = links.Format(lessParentheses: true);
            Assert.Equal(source,target);
        }

        [Fact]
        public static void ParseAndStringifyWithLessParenthesesTest()
        {
            var source = @"lovesMama: loves mama
papa lovesMama
son lovesMama
daughter lovesMama
all (love mama)";
            var parser = new Parser();
            var links = parser.Parse(source);
            var target = links.Format(lessParentheses: true);
            Assert.Equal(source, target);
        }

        [Fact]
        public static void DuplicateIdentifiersTest()
        {
            var source = @"(a: a b)
(a: b c)";
            var target = @"(a: a b)
(a: b c)";
            var parser = new Parser();
            var links = parser.Parse(source);
            var formattedLinks = links.Format();
            Assert.Equal(target, formattedLinks);
        }

        [Fact]
        public static void ComplexStructureTest()
        {
            var input = @"(Type: Type Type)
  Number
  String
  Array
  Value
    (property: name type)
    (method: name params return)";
            
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void MixedFormatsTest()
        {
            // Mix of single-line and multi-line formats
            var input = @"id1: value1
(id2: value2 value3)
simple_ref
(complex: 
  nested1
  nested2
)";
            
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void MultilineWithIdTest()
        {
            // Test multi-line link with id
            var input = "(id: value1 value2)";
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void MultipleTopLevelElementsTest()
        {
            // Test multiple top-level elements
            var input = "(elem1: val1)\n(elem2: val2)";
            var result = new Parser().Parse(input);
            Assert.NotEmpty(result);
        }

        [Fact]
        public static void MultilineSimpleLinksTest()
        {
            var input = "(1: 1 1)\n(2: 2 2)";
            var parser = new Parser();
            var parsed = parser.Parse(input);
            Assert.NotEmpty(parsed);
            
            // Validate regular formatting
            var output = parsed.Format();
            Assert.Contains("(1: 1 1)", output);
            Assert.Contains("(2: 2 2)", output);
            
            // Validate alternate formatting matches input
            var outputAlternate = parsed.Format();
            Assert.Equal(input, outputAlternate);
        }

        [Fact]
        public static void IndentedChildrenTest()
        {
            var input = "parent\n  child1\n  child2";
            var parser = new Parser();
            var parsed = parser.Parse(input);
            
            // The parsed structure should have parent with children
            Assert.NotEmpty(parsed);
        }
    }
}