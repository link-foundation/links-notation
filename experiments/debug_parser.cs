using System;
using Link.Foundation.Links.Notation;

class DebugParser
{
    static void Main()
    {
        var notation = "(obj_0: dict ((str bmFtZQ==) (str ZGljdDE=)) ((str b3RoZXI=) (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))))";

        var parser = new Parser();
        var links = parser.Parse(notation);

        Console.WriteLine("Parsed links count: " + links.Count);
        PrintLink(links[0], 0);
    }

    static void PrintLink(Link link, int indent)
    {
        var prefix = new string(' ', indent * 2);
        Console.WriteLine($"{prefix}Link ID: '{link.Id}'");
        Console.WriteLine($"{prefix}Values count: {link.Values.Count}");
        for (int i = 0; i < link.Values.Count; i++)
        {
            Console.WriteLine($"{prefix}Value[{i}]:");
            PrintLink(link.Values[i], indent + 1);
        }
    }
}