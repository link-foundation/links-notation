// Times the C# parser on the nesting shapes from #314, or on the documents
// named on the command line (for example benchmarks/generated/*.lino).
// Usage: dotnet run -c Release [-- files...] (from this directory)
using System.Diagnostics;
using Link.Foundation.Links.Notation;

if (args.Length > 0)
{
    var documents = args.Select(File.ReadAllText).ToList();
    var reader = new Parser();
    for (var round = 0; round < 5; round++)
    {
        var total = Stopwatch.StartNew();
        for (var i = 0; i < 20; i++) foreach (var document in documents) reader.Parse(document);
        Console.WriteLine($"round {round}: {total.Elapsed.TotalMilliseconds / 20:F1} ms per pass over {documents.Count} documents");
    }
    return;
}

var shapes = new (string Name, Func<int, string> Shape)[]
{
    ("closed", d => new string('(', d) + "a" + new string(')', d)),
    ("value after", d => new string('(', d) + "a" + string.Concat(Enumerable.Repeat(") b", d))),
    ("unclosed", d => new string('(', d) + "a"),
    ("indented", d => string.Join("\n", Enumerable.Range(0, d).Select(i => new string(' ', i) + "(a"))),
};
var parser = new Parser();
foreach (var (name, shape) in shapes)
{
    Console.Write($"{name,-12}");
    foreach (var d in new[] { 1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 64, 256, 1024 })
    {
        var watch = Stopwatch.StartNew();
        string outcome;
        try { parser.Parse(shape(d)); outcome = "ok"; }
        catch (Exception e) { outcome = e.GetType().Name; }
        watch.Stop();
        Console.Write($" {d}: {watch.Elapsed.TotalMilliseconds:F1} ms ({outcome}),");
        if (watch.Elapsed.TotalSeconds > 1) break;
    }
    Console.WriteLine();
}
