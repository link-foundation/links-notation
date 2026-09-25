using System.Diagnostics;
using Link.Foundation.Links.Notation;

// Reproduces issue #315 for C#: a stack overflow in .NET ends the process, and no
// catch block sees it. `dotnet run -- <shape> <depth>` parses one document;
// `dotnet run -- probe <shape>` finds the deepest one that the main thread survives.
static string Document(string shape, int depth) => shape switch
{
    "parens" => new string('(', depth) + "a" + new string(')', depth),
    "values" => string.Concat(Enumerable.Repeat("(a ", depth)) + "b" + new string(')', depth),
    "indent" => string.Concat(Enumerable.Range(0, depth + 1).Select(level => new string(' ', level) + "a\n")),
    _ => throw new ArgumentException("shape is parens, values or indent"),
};

if (args[0] == "probe")
{
    var exe = Environment.ProcessPath!;
    bool Survives(int depth)
    {
        var info = new ProcessStartInfo(exe, $"{args[1]} {depth}") { RedirectStandardOutput = true, RedirectStandardError = true };
        using var child = Process.Start(info)!;
        child.StandardOutput.ReadToEnd();
        child.StandardError.ReadToEnd();
        child.WaitForExit();
        return child.ExitCode == 0;
    }
    int low = 1, high = 1;
    while (Survives(high)) { low = high; high *= 2; if (high > 1 << 16) { Console.WriteLine($"{args[1]}: survives {low}"); return; } }
    while (high - low > 1) { var middle = (low + high) / 2; if (Survives(middle)) low = middle; else high = middle; }
    Console.WriteLine($"{args[1]}: deepest nesting the main thread survives: {low}");
    return;
}

var source = Document(args[0], int.Parse(args[1]));
try
{
    var links = new Parser().Parse(source);
    Console.WriteLine($"depth {args[1]}: parsed {links.Count} link(s)");
}
catch (Exception error)
{
    Console.WriteLine($"depth {args[1]}: {error.GetType().Name}: {error.Message.Split('\n')[0]}");
}
