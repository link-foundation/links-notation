using System;
using System.Collections.Generic;
using Xunit;

namespace Link.Foundation.Links.Notation.Tests
{
    public static class LinksGroupTests
    {
        [Fact]
        public static void LinksGroupConstructorTest()
        {
            var element = new Link<string>("root", null);
            var groups = new List<LinksGroup<string>>
            {
                new LinksGroup<string>(new Link<string>("child1", null)),
                new LinksGroup<string>(new Link<string>("child2", null))
            };
            var group = new LinksGroup<string>(element, groups);
            
            Assert.Equal(element, group.Link);
            Assert.Equal(groups, group.Groups);
        }

        [Fact]
        public static void LinksGroupToListFlattensStructureTest()
        {
            var root = new Link<string>("root", null);
            var child1 = new Link<string>("child1", null);
            var child2 = new Link<string>("child2", null);
            var grandchild = new Link<string>("grandchild", null);
            
            var childGroup = new LinksGroup<string>(child2, new List<LinksGroup<string>> 
            { 
                new LinksGroup<string>(grandchild) 
            });
            
            var group = new LinksGroup<string>(root, new List<LinksGroup<string>>
            {
                new LinksGroup<string>(child1),
                childGroup
            });
            
            var list = group.ToLinksList();
            // The C# implementation creates a hierarchical structure
            // root, root.Combine(child1), root.Combine(child2), root.Combine(child2).Combine(grandchild)
            Assert.Equal(4, list.Count);
            Assert.Equal(root, list[0]);
        }

        [Fact]
        public static void LinksGroupAppendToLinksListTest()
        {
            var element = new Link<string>("root", null);
            var children = new List<LinksGroup<string>>
            {
                new LinksGroup<string>(new Link<string>("child1", null)),
                new LinksGroup<string>(new Link<string>("child2", null))
            };
            var group = new LinksGroup<string>(element, children);

            var list = new List<Link<string>>();
            group.AppendToLinksList(list);

            Assert.Equal(3, list.Count);
            Assert.Equal(element, list[0]);
        }

        [Fact]
        public static void LinksGroupToStringTest()
        {
            var element = new Link<string>("root", null);
            var children = new List<LinksGroup<string>>
            {
                new LinksGroup<string>(new Link<string>("child1", null)),
                new LinksGroup<string>(new Link<string>("child2", null))
            };
            var group = new LinksGroup<string>(element, children);

            var str = group.ToString();
            Assert.Contains("root", str);
            Assert.Contains("child1", str);
            Assert.Contains("child2", str);
        }

        [Fact]
        public static void LinksGroupConstructorEquivalentTest()
        {
            // Test creating a LinksGroup structure in an equivalent way
            var root = new Link<string>("root", null);
            var children = new List<Link<string>>
            {
                new Link<string>("child1", null),
                new Link<string>("child2", null)
            };

            // Create a group with an id
            var groupElement = new Link<string>("group", null);
            var childGroups = new List<LinksGroup<string>>
            {
                new LinksGroup<string>(root),
                new LinksGroup<string>(children[0]),
                new LinksGroup<string>(children[1])
            };
            var group = new LinksGroup<string>(groupElement, childGroups);

            Assert.Equal("group", group.Link.Id);
            Assert.Equal(3, group.Groups.Count);
            Assert.Equal(root, group.Groups[0].Link);
        }
    }
}