using Link.Foundation.Links.Notation;

string[] docs = { "# ok line\n# break: two\nci_gate x\n", "a: b: c", "a (b\n", "a b)\n", ":" };
foreach (var doc in docs)
{
    var shown = doc.Replace("\n", "\\n");
    try
    {
        var links = new Parser().Parse(doc);
        Console.WriteLine($"\"{shown}\" -> PARSED {links.Count} links");
    }
    catch (ParseException error)
    {
        Console.WriteLine($"\"{shown}\" -> offset {error.Offset}");
        Console.WriteLine(error.Message);
    }
}
