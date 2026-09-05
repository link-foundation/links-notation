// C# side of the Links Notation token efficiency benchmarks.
//
// The Rust benchmark is the one that writes the documents and the report. Every
// other language answers the two questions that make those numbers portable
// rather than a property of one implementation:
//
//   1. does this language's own links-notation parser accept the generated
//      Links Notation documents;
//   2. does this language's own tokenizer count them the same way.
//
// It writes benchmarks/results/csharp.json and fails when a count differs from
// benchmarks/results/rust.json.
//
// Usage: dotnet run --project benchmarks/csharp -- [--check] [--verbose]
// With --check the results file is compared instead of written, which is what
// CI runs to catch a stale commit.

using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

using Link.Foundation.Links.Notation;
using Microsoft.ML.Tokenizers;

namespace LinksNotation.Benchmark;

public static class Program
{
    private const string Language = "csharp";

    /// <summary>The order the measurements are reported in, shared by every language.</summary>
    private static readonly string[] MetricKeys =
    [
        "tokens_o200k",
        "tokens_cl100k",
        "chars",
        "bytes",
    ];

    public static int Main(string[] arguments)
    {
        var check = arguments.Contains("--check");
        var verbose = arguments.Contains("--verbose")
            || Environment.GetEnvironmentVariable("CI_VERBOSE") == "true";
        try
        {
            Run(check, verbose);
            return 0;
        }
        catch (Exception failure)
        {
            Console.Error.WriteLine($"{Language}: {failure.Message}");
            return 1;
        }
    }

    private static void Run(bool check, bool verbose)
    {
        var root = BenchmarksDirectory();

        var o200k = TiktokenTokenizer.CreateForEncoding("o200k_base");
        var cl100k = TiktokenTokenizer.CreateForEncoding("cl100k_base");

        var index = JsonNode.Parse(ReadText(root, "generated/index.json"))!.AsObject();
        var parser = new Parser();

        var datasets = new JsonArray();
        var totals = new SortedDictionary<string, long[]>(StringComparer.Ordinal);

        foreach (var element in index["representations"]!.AsArray())
        {
            var entry = element!.AsObject();
            var files = entry["files"]!.AsObject();
            var formats = new SortedDictionary<string, long[]>(StringComparer.Ordinal);

            foreach (var file in files.OrderBy(pair => pair.Key, StringComparer.Ordinal))
            {
                var text = ReadText(root, file.Value!.GetValue<string>());
                if (file.Key.StartsWith("lino", StringComparison.Ordinal))
                {
                    // Parsing with this language's own implementation is the
                    // point: a document only counts if the notation is portable.
                    parser.Parse(text);
                }

                var metrics = Measure(text, o200k, cl100k);
                formats[file.Key] = metrics;
                if (!totals.TryGetValue(file.Key, out var running))
                {
                    running = new long[MetricKeys.Length];
                    totals[file.Key] = running;
                }

                for (var position = 0; position < MetricKeys.Length; position++)
                {
                    running[position] += metrics[position];
                }
            }

            if (verbose)
            {
                Console.Error.WriteLine(
                    $"{entry["dataset"]!.GetValue<string>()}: measured {formats.Count} formats");
            }

            var byFormat = new JsonObject();
            foreach (var format in formats)
            {
                byFormat[format.Key] = ToJson(format.Value);
            }

            datasets.Add(new JsonObject
            {
                ["name"] = entry["dataset"]!.GetValue<string>(),
                ["structure"] = entry["structure"]!.GetValue<string>(),
                ["profile"] = entry["profile"]!.GetValue<string>(),
                ["formats"] = byFormat,
            });
        }

        var totalsJson = new JsonObject();
        foreach (var format in totals)
        {
            totalsJson[format.Key] = ToJson(format.Value);
        }

        var results = new JsonObject
        {
            ["schema"] = index["schema"]!.GetValue<int>(),
            ["generator"] = Language,
            ["tokenizers"] = new JsonObject
            {
                ["primary"] = "o200k_base",
                ["secondary"] = "cl100k_base",
            },
            ["datasets"] = datasets,
            ["totals"] = totalsJson,
        };

        var reference = JsonNode.Parse(ReadText(root, "results/rust.json"))!.AsObject();
        var differences = Compare(results, reference);
        if (differences.Count > 0)
        {
            Console.Error.WriteLine(
                $"{Language}: {differences.Count} measurement(s) differ from the Rust results:");
            foreach (var difference in differences.Take(20))
            {
                Console.Error.WriteLine($"  - {difference}");
            }

            throw new InvalidOperationException("results do not agree with Rust");
        }

        var serialized = results.ToJsonString(new JsonSerializerOptions { WriteIndented = true }) + "\n";
        var path = $"results/{Language}.json";
        if (check)
        {
            if (ReadText(root, path) != serialized)
            {
                throw new InvalidOperationException(
                    $"{path} is out of date; run dotnet run --project benchmarks/csharp");
            }

            Console.WriteLine($"{Language}: {path} is up to date and agrees with the Rust results.");
            return;
        }

        File.WriteAllBytes(Path.Combine(root, path), Encoding.UTF8.GetBytes(serialized));
        Console.WriteLine(
            $"{Language}: wrote {path}; every measurement agrees with the Rust results.");
    }

    /// <summary>
    /// The four measurements taken of every document, in <see cref="MetricKeys"/> order.
    /// </summary>
    /// <remarks>
    /// <c>chars</c> counts Unicode scalar values rather than UTF-16 code units, so a
    /// character outside the basic plane counts once here and once in every other
    /// language.
    /// </remarks>
    private static long[] Measure(string text, TiktokenTokenizer o200k, TiktokenTokenizer cl100k)
    {
        var chars = 0L;
        for (var position = 0; position < text.Length; position += char.IsHighSurrogate(text[position]) ? 2 : 1)
        {
            chars++;
        }

        return
        [
            o200k.CountTokens(text),
            cl100k.CountTokens(text),
            chars,
            Encoding.UTF8.GetByteCount(text),
        ];
    }

    private static JsonObject ToJson(long[] metrics)
    {
        var json = new JsonObject();
        for (var position = 0; position < MetricKeys.Length; position++)
        {
            json[MetricKeys[position]] = metrics[position];
        }

        return json;
    }

    /// <summary>Every measurement that differs from the reference results.</summary>
    private static List<string> Compare(JsonObject results, JsonObject reference)
    {
        var byName = new Dictionary<string, JsonObject>(StringComparer.Ordinal);
        foreach (var element in reference["datasets"]!.AsArray())
        {
            var dataset = element!.AsObject();
            byName[dataset["name"]!.GetValue<string>()] = dataset;
        }

        var differences = new List<string>();
        foreach (var element in results["datasets"]!.AsArray())
        {
            var dataset = element!.AsObject();
            var name = dataset["name"]!.GetValue<string>();
            if (!byName.TryGetValue(name, out var expected))
            {
                differences.Add($"{name}: missing from the Rust results");
                continue;
            }

            var expectedFormats = expected["formats"]!.AsObject();
            foreach (var format in dataset["formats"]!.AsObject())
            {
                var other = expectedFormats[format.Key]?.AsObject();
                foreach (var key in MetricKeys)
                {
                    var value = format.Value![key]!.GetValue<long>();
                    var reported = other?[key]?.GetValue<long>();
                    if (reported != value)
                    {
                        differences.Add(string.Format(
                            CultureInfo.InvariantCulture,
                            "{0}/{1}/{2}: {3} here, {4} in Rust",
                            name,
                            format.Key,
                            key,
                            value,
                            reported));
                    }
                }
            }
        }

        return differences;
    }

    /// <summary>
    /// The benchmarks directory, found from the working directory so the command
    /// runs from the repository root as well as from its own directory.
    /// </summary>
    private static string BenchmarksDirectory()
    {
        var fromEnvironment = Environment.GetEnvironmentVariable("BENCHMARKS_DIR");
        if (!string.IsNullOrEmpty(fromEnvironment))
        {
            return fromEnvironment;
        }

        var current = Directory.GetCurrentDirectory();
        while (current is not null)
        {
            if (File.Exists(Path.Combine(current, "benchmarks", "generated", "index.json")))
            {
                return Path.Combine(current, "benchmarks");
            }

            if (File.Exists(Path.Combine(current, "generated", "index.json")))
            {
                return current;
            }

            current = Path.GetDirectoryName(current);
        }

        throw new InvalidOperationException("no benchmarks directory above the working directory");
    }

    /// <summary>
    /// The bytes of a file decoded as UTF-8, with no newline translation, so the
    /// CRLF line endings RFC 4180 asks of CSV are counted rather than collapsed.
    /// </summary>
    private static string ReadText(string root, string path) =>
        Encoding.UTF8.GetString(File.ReadAllBytes(Path.Combine(root, path)));
}
