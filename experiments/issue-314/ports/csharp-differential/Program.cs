// Reads one document per line of stdin, with line breaks written as \n (as
// printed by random-documents.mjs), and prints what the C# parser makes of it:
// the formatted links and their structure, or the error message.
// Build it against two versions of the parser and diff the outputs:
//   dotnet run -c Release -p:LinksNotationRoot=/path/to/other/checkout < documents
using System.Text;
using Link.Foundation.Links.Notation;

static string Dump(Link<string> link)
{
    var builder = new StringBuilder("[").Append(link.Id ?? "_");
    if (link.Values != null)
    {
        builder.Append(':');
        foreach (var value in link.Values) builder.Append(' ').Append(Dump(value));
    }
    return builder.Append(']').ToString();
}

var parser = new Parser();
var output = new StreamWriter(Console.OpenStandardOutput());
string? line;
while ((line = Console.ReadLine()) != null)
{
    var document = line.Replace("\\n", "\n");
    try
    {
        var links = parser.Parse(document);
        output.WriteLine($"ok {links.Format().Replace("\n", "\\n")} {string.Join(" ", links.Select(Dump))}");
    }
    catch (Exception error)
    {
        output.WriteLine($"{error.GetType().Name} {error.Message.Replace("\n", "\\n")}");
    }
}
output.Flush();
