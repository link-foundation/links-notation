using System;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public static class NestedSelfReferenceTests
    {
        [Fact]
        public static void NestedSelfReferencedObjectInPairValueTest()
        {
            // Test case from PARSER_BUG.md
            // This should parse a dict with two pairs, where the second pair's value
            // is itself a self-referenced dict definition (obj_1: dict ...)
            var notation = "(obj_0: dict ((str bmFtZQ==) (str ZGljdDE=)) ((str b3RoZXI=) (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))))";

            var parser = new Parser();
            var links = parser.Parse(notation);

            // Should parse exactly one top-level link
            Assert.Single(links);

            var link = links[0];

            // Top-level link should have ID "obj_0"
            Assert.Equal("obj_0", link.Id);

            // Should have: type marker + 2 pairs = 3 values
            Assert.Equal(3, link.Values.Count);

            // First value is the type marker "dict"
            Assert.Equal("dict", link.Values[0].Id);

            // Second and third values are the two pairs
            var pair1 = link.Values[1];
            var pair2 = link.Values[2];

            // Pair 1: ((str bmFtZQ==) (str ZGljdDE=))
            // This is a parenthesized expression containing two sub-expressions
            Assert.Null(pair1.Id);
            Assert.Equal(2, pair1.Values.Count);

            // First element of pair1: (str bmFtZQ==)
            Assert.Null(pair1.Values[0].Id);
            Assert.Equal(2, pair1.Values[0].Values.Count);
            Assert.Equal("str", pair1.Values[0].Values[0].Id);
            Assert.Equal("bmFtZQ==", pair1.Values[0].Values[1].Id);

            // Second element of pair1: (str ZGljdDE=)
            Assert.Null(pair1.Values[1].Id);
            Assert.Equal(2, pair1.Values[1].Values.Count);
            Assert.Equal("str", pair1.Values[1].Values[0].Id);
            Assert.Equal("ZGljdDE=", pair1.Values[1].Values[1].Id);

            // Pair 2: ((str b3RoZXI=) (obj_1: dict ...))
            // This is the critical test - the second element should be a self-referenced dict
            Assert.Null(pair2.Id);
            Assert.Equal(2, pair2.Values.Count);

            // First element of pair2: (str b3RoZXI=)
            Assert.Null(pair2.Values[0].Id);
            Assert.Equal(2, pair2.Values[0].Values.Count);
            Assert.Equal("str", pair2.Values[0].Values[0].Id);
            Assert.Equal("b3RoZXI=", pair2.Values[0].Values[1].Id);

            // Second element of pair2: (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))
            // THIS IS THE KEY TEST - obj_1 should have its ID preserved
            var obj1 = pair2.Values[1];
            Assert.Equal("obj_1", obj1.Id);
            Assert.NotNull(obj1.Values);
            Assert.Equal(3, obj1.Values.Count); // type marker + 2 pairs

            // obj_1's type marker
            Assert.Equal("dict", obj1.Values[0].Id);

            // obj_1's first pair: ((str bmFtZQ==) (str ZGljdDI=))
            var obj1Pair1 = obj1.Values[1];
            Assert.Equal(2, obj1Pair1.Values.Count);
            Assert.Null(obj1Pair1.Values[0].Id);
            Assert.Equal(2, obj1Pair1.Values[0].Values.Count);
            Assert.Equal("str", obj1Pair1.Values[0].Values[0].Id);
            Assert.Equal("bmFtZQ==", obj1Pair1.Values[0].Values[1].Id);
            Assert.Null(obj1Pair1.Values[1].Id);
            Assert.Equal(2, obj1Pair1.Values[1].Values.Count);
            Assert.Equal("str", obj1Pair1.Values[1].Values[0].Id);
            Assert.Equal("ZGljdDI=", obj1Pair1.Values[1].Values[1].Id);

            // obj_1's second pair: ((str b3RoZXI=) obj_0) - reference back to obj_0
            var obj1Pair2 = obj1.Values[2];
            Assert.Equal(2, obj1Pair2.Values.Count);
            Assert.Null(obj1Pair2.Values[0].Id);
            Assert.Equal(2, obj1Pair2.Values[0].Values.Count);
            Assert.Equal("str", obj1Pair2.Values[0].Values[0].Id);
            Assert.Equal("b3RoZXI=", obj1Pair2.Values[0].Values[1].Id);
            Assert.Equal("obj_0", obj1Pair2.Values[1].Id);
            Assert.Null(obj1Pair2.Values[1].Values); // Just a reference, no nested values
        }

        [Fact]
        public static void SelfReferenceAsDirectChildWorksCorrectlyTest()
        {
            // This pattern should work (and did work before)
            var notation = "(obj_0: list (int 1) (int 2) (obj_1: list (int 3) (int 4) obj_0))";

            var parser = new Parser();
            var links = parser.Parse(notation);

            Assert.Single(links);
            Assert.Equal("obj_0", links[0].Id);
            Assert.Equal(4, links[0].Values.Count); // list + 1 + 2 + obj_1

            // The fourth value should be obj_1 with a self-reference
            var obj1 = links[0].Values[3];
            Assert.Equal("obj_1", obj1.Id);
            Assert.Equal(4, obj1.Values.Count); // list + 3 + 4 + obj_0
            Assert.Equal("obj_0", obj1.Values[3].Id); // Reference to obj_0
        }
    }
}
