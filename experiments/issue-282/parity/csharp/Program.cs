// Print what the C# implementation makes of the document.
using Link.Foundation.Links.Notation;

var document = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "document.lino"));
var links = new Parser().Parse(document);
Console.WriteLine(string.Concat(links.Select(link => link.ToString())));
