using Link.Foundation.Links.Notation;

string[] docs =
{
    "# a b\n",
    "# a: b\n",
    "a: b # note\n",
    "a#b\n",
    "\"#\" a\n",
    "parent\n  # what the child is for\n  child\n"
};
foreach (var doc in docs)
{
    var shown = doc.Replace("\n", "\\n");
    try
    {
        var links = new Parser().Parse(doc);
        Console.WriteLine($"\"{shown}\" -> PARSED [{string.Join(" ", links)}]");
    }
    catch (ParseException error)
    {
        Console.WriteLine($"\"{shown}\" -> {error.Message.Split('\n')[0]}");
    }
}
