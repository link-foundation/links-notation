using System;
using System.Collections.Generic;
using System.Linq;
using Link.Foundation.Links.Notation;

// Print the canonical rendering of every case in issue #288.
class Program
{
    static readonly string[] Cases = new[]
    {
        "(a \" \" b)", "(a \"\" b)", "(a '' b)", "(a `` b)",
        "(a \"\" \"\" b)", "(a '' '' b)", "(a `` `` b)",
        "(a \"\"x\"\" b)", "(a \"\"\"\" b)", "(x \"\" \" \"\")", "(x ' \" ')",
        "(\"\" (\"\" 1))", "(\"\" ('' 1))", "(\"x\" (\"\" 1))", "(\"\" (\"x\" 1))",
        "(\"\" x (\"\" 1))", "(\"\" 1 (\"\" 1))", "(o: (\"\" (o: (\"\" 1))))",
        "(a \" b)", "(a \"\"\" b)", "(\"\")", "(\"\": 1)", "(a \"\"  \"\" b)", "(\"\" \"\")",
    };

    static string Render(Link<string> node)
    {
        if (node.Values == null || node.Values.Count == 0)
        {
            return "<" + (node.Id ?? "") + ">";
        }
        var head = node.Id == null ? "" : "<" + node.Id + ">: ";
        return "(" + head + string.Join(" ", node.Values.Select(Render)) + ")";
    }

    static void Main()
    {
        var parser = new Parser();
        foreach (var source in Cases)
        {
            try
            {
                var links = (IList<Link<string>>)parser.Parse(source);
                Console.WriteLine($"{source,-24} => {string.Join("\n", links.Select(Render))}");
            }
            catch (Exception e)
            {
                Console.WriteLine($"{source,-24} => Err({e.GetType().Name}: {e.Message.Split('\n')[0]})");
            }
        }
    }
}
