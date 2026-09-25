using System.Diagnostics;
using Link.Foundation.Links.Notation;

// Reproduces issue #315 for C#: a stack overflow in .NET ends the process, and no
// catch block sees it. `dotnet run -- <shape> <depth> [maxDepth|off]` parses one
// document on a thread with a 1 MiB stack; `dotnet run -- probe <shape>` finds the
// deepest one that thread survives with the depth limit turned off.
static string Document(string shape, int depth) => shape switch
{
    "parens" => new string('(', depth) + "a" + new string(')', depth),
    "values" => string.Concat(Enumerable.Repeat("(a ", depth)) + "b" + new string(')', depth),
    "indent" => string.Concat(Enumerable.Range(0, depth + 1).Select(level => new string(' ', level) + "a\n")),
    _ => throw new ArgumentException("shape is parens, values or indent"),
};

if (args[0] == "probe")
{
    // Run as `dotnet Probe.dll`, the process is the dotnet host, so pass it the assembly.
    var exe = Environment.ProcessPath!;
    var host = Path.GetFileNameWithoutExtension(exe) == "dotnet" ? $"\"{typeof(Parser).Assembly.Location.Replace("Link.Foundation.Links.Notation.dll", "Probe.dll")}\" " : "";
    bool Survives(int depth)
    {
        var info = new ProcessStartInfo(exe, $"{host}{args[1]} {depth} off") { RedirectStandardOutput = true, RedirectStandardError = true };
        using var child = Process.Start(info)!;
        child.StandardOutput.ReadToEnd();
        child.StandardError.ReadToEnd();
        child.WaitForExit();
        return child.ExitCode == 0;
    }
    int low = 1, high = 1;
    while (Survives(high)) { low = high; high *= 2; if (high > 1 << 16) { Console.WriteLine($"{args[1]}: survives {low}"); return; } }
    while (high - low > 1) { var middle = (low + high) / 2; if (Survives(middle)) low = middle; else high = middle; }
    Console.WriteLine($"{args[1]}: deepest nesting a 1 MiB stack survives with no limit: {low}");
    return;
}

var source = Document(args[0], int.Parse(args[1]));
var maxDepth = args.Length < 3 ? Parser.DefaultMaxDepth : args[2] == "off" ? int.MaxValue : int.Parse(args[2]);
var thread = new Thread(() =>
{
    try
    {
        var links = new Parser(true, maxDepth).Parse(source);
        Console.WriteLine($"depth {args[1]}: parsed {links.Count} link(s)");
    }
    catch (Exception error)
    {
        Console.WriteLine($"depth {args[1]}: {error.GetType().Name}: {error.Message.Split('\n')[0]}");
    }
}, 1 << 20);
thread.Start();
thread.Join();
