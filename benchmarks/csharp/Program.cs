// UTF-8 Character Count Benchmark for Links Notation vs JSON, YAML, and XML
//
// This benchmark measures the UTF-8 character count efficiency of Links Notation
// compared to other popular data serialization formats.

using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LinksNotation.Benchmark;

public record BenchmarkCase(
    string Name,
    string Description,
    string Lino,
    string Json,
    string Yaml,
    string Xml
);

public record BenchmarkResult(
    string Name,
    string Description,
    int LinoChars,
    int JsonChars,
    int YamlChars,
    int XmlChars,
    double LinoVsJson,
    double LinoVsYaml,
    double LinoVsXml
);

public record AggregatedResults(
    int TotalLinoChars,
    int TotalJsonChars,
    int TotalYamlChars,
    int TotalXmlChars,
    double AvgLinoVsJson,
    double AvgLinoVsYaml,
    double AvgLinoVsXml
);

public class Report
{
    [JsonPropertyName("language")]
    public string Language { get; set; } = "C#";

    [JsonPropertyName("summary")]
    public SummaryData? Summary { get; set; }

    [JsonPropertyName("results")]
    public List<ResultData>? Results { get; set; }
}

public class SummaryData
{
    [JsonPropertyName("total_lino_chars")]
    public int TotalLinoChars { get; set; }

    [JsonPropertyName("total_json_chars")]
    public int TotalJsonChars { get; set; }

    [JsonPropertyName("total_yaml_chars")]
    public int TotalYamlChars { get; set; }

    [JsonPropertyName("total_xml_chars")]
    public int TotalXmlChars { get; set; }

    [JsonPropertyName("avg_lino_vs_json")]
    public double AvgLinoVsJson { get; set; }

    [JsonPropertyName("avg_lino_vs_yaml")]
    public double AvgLinoVsYaml { get; set; }

    [JsonPropertyName("avg_lino_vs_xml")]
    public double AvgLinoVsXml { get; set; }
}

public class ResultData
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("lino_chars")]
    public int LinoChars { get; set; }

    [JsonPropertyName("json_chars")]
    public int JsonChars { get; set; }

    [JsonPropertyName("yaml_chars")]
    public int YamlChars { get; set; }

    [JsonPropertyName("xml_chars")]
    public int XmlChars { get; set; }

    [JsonPropertyName("lino_vs_json")]
    public double LinoVsJson { get; set; }

    [JsonPropertyName("lino_vs_yaml")]
    public double LinoVsYaml { get; set; }

    [JsonPropertyName("lino_vs_xml")]
    public double LinoVsXml { get; set; }
}

public static class Program
{
    /// <summary>
    /// Count UTF-8 characters in a string.
    /// In C#, we use StringInfo.LengthInTextElements to get the count of text elements (grapheme clusters),
    /// which corresponds to what users perceive as "characters".
    /// </summary>
    public static int CountUtf8Chars(string text)
    {
        return new StringInfo(text).LengthInTextElements;
    }

    /// <summary>
    /// Calculate the percentage savings of Lino vs another format.
    /// </summary>
    public static double CalculateSavings(int linoChars, int otherChars)
    {
        if (otherChars == 0) return 0.0;
        return ((double)(otherChars - linoChars) / otherChars) * 100;
    }

    /// <summary>
    /// Find the data directory by checking multiple possible paths.
    /// </summary>
    public static string? FindDataDir()
    {
        var baseDir = AppDomain.CurrentDomain.BaseDirectory;
        var cwd = Directory.GetCurrentDirectory();

        var possiblePaths = new[]
        {
            Path.Combine(baseDir, "../../../data"),         // Running from bin/Debug/net8.0/
            Path.Combine(baseDir, "../../../../data"),      // Running from deeper nested
            Path.Combine(cwd, "benchmarks/data"),           // CWD is repo root
            Path.Combine(cwd, "../data"),                   // CWD is benchmarks/
            Path.Combine(cwd, "data"),                      // CWD is benchmarks/
            Path.Combine(cwd, "../../benchmarks/data"),     // CWD is benchmarks/csharp/
        };

        foreach (var path in possiblePaths)
        {
            var resolved = Path.GetFullPath(path);
            if (Directory.Exists(resolved))
            {
                return resolved;
            }
        }

        return null;
    }

    /// <summary>
    /// Find the output directory for reports.
    /// </summary>
    public static string FindOutputDir()
    {
        var baseDir = AppDomain.CurrentDomain.BaseDirectory;
        var cwd = Directory.GetCurrentDirectory();

        var possiblePaths = new[]
        {
            Path.Combine(baseDir, "../../.."),              // Running from bin/Debug/net8.0/
            Path.Combine(cwd, "benchmarks"),                // CWD is repo root
            cwd,                                            // Fallback to current directory
        };

        foreach (var path in possiblePaths)
        {
            var resolved = Path.GetFullPath(path);
            if (Directory.Exists(resolved))
            {
                return resolved;
            }
        }

        return cwd;
    }

    /// <summary>
    /// Load all benchmark test cases from the data directory.
    /// </summary>
    public static List<BenchmarkCase> LoadBenchmarkCases(string dataDir)
    {
        var casesConfig = new[]
        {
            ("employees", "Employee records with nested structure"),
            ("simple_doublets", "Simple doublet links (2-tuples)"),
            ("triplets", "Triplet relations (3-tuples)"),
            ("nested_structure", "Deeply nested company structure"),
            ("config", "Application configuration"),
        };

        var cases = new List<BenchmarkCase>();

        foreach (var (name, description) in casesConfig)
        {
            try
            {
                var lino = File.ReadAllText(Path.Combine(dataDir, $"{name}.lino"), Encoding.UTF8);
                var json = File.ReadAllText(Path.Combine(dataDir, $"{name}.json"), Encoding.UTF8);
                var yaml = File.ReadAllText(Path.Combine(dataDir, $"{name}.yaml"), Encoding.UTF8);
                var xml = File.ReadAllText(Path.Combine(dataDir, $"{name}.xml"), Encoding.UTF8);

                cases.Add(new BenchmarkCase(name, description, lino, json, yaml, xml));
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Warning: Could not load {name}: {ex.Message}");
            }
        }

        return cases;
    }

    /// <summary>
    /// Run the benchmark for a single test case.
    /// </summary>
    public static BenchmarkResult RunBenchmark(BenchmarkCase testCase)
    {
        var linoChars = CountUtf8Chars(testCase.Lino);
        var jsonChars = CountUtf8Chars(testCase.Json);
        var yamlChars = CountUtf8Chars(testCase.Yaml);
        var xmlChars = CountUtf8Chars(testCase.Xml);

        return new BenchmarkResult(
            testCase.Name,
            testCase.Description,
            linoChars,
            jsonChars,
            yamlChars,
            xmlChars,
            CalculateSavings(linoChars, jsonChars),
            CalculateSavings(linoChars, yamlChars),
            CalculateSavings(linoChars, xmlChars)
        );
    }

    /// <summary>
    /// Aggregate results across all benchmark cases.
    /// </summary>
    public static AggregatedResults AggregateResults(List<BenchmarkResult> results)
    {
        var totalLino = results.Sum(r => r.LinoChars);
        var totalJson = results.Sum(r => r.JsonChars);
        var totalYaml = results.Sum(r => r.YamlChars);
        var totalXml = results.Sum(r => r.XmlChars);

        var avgVsJson = results.Average(r => r.LinoVsJson);
        var avgVsYaml = results.Average(r => r.LinoVsYaml);
        var avgVsXml = results.Average(r => r.LinoVsXml);

        return new AggregatedResults(
            totalLino,
            totalJson,
            totalYaml,
            totalXml,
            avgVsJson,
            avgVsYaml,
            avgVsXml
        );
    }

    public static void Main(string[] args)
    {
        var dataDir = FindDataDir();
        if (dataDir == null)
        {
            Console.Error.WriteLine("Error: Could not find benchmarks/data directory");
            Console.Error.WriteLine("Please run from the repository root or benchmarks directory");
            Environment.Exit(1);
        }

        Console.WriteLine($"Loading benchmark cases from {dataDir}...");
        var cases = LoadBenchmarkCases(dataDir);

        if (cases.Count == 0)
        {
            Console.Error.WriteLine("Error: No benchmark cases found");
            Environment.Exit(1);
        }

        Console.WriteLine($"Running {cases.Count} benchmark cases...\n");

        var results = cases.Select(RunBenchmark).ToList();
        var aggregated = AggregateResults(results);

        // Print summary to console
        Console.WriteLine("=== Links Notation Character Count Benchmark (C#) ===\n");
        Console.WriteLine("Summary:");
        Console.WriteLine($"  Total Lino characters:  {aggregated.TotalLinoChars}");
        Console.WriteLine($"  Total JSON characters:  {aggregated.TotalJsonChars}");
        Console.WriteLine($"  Total YAML characters:  {aggregated.TotalYamlChars}");
        Console.WriteLine($"  Total XML characters:   {aggregated.TotalXmlChars}");
        Console.WriteLine();
        Console.WriteLine("Average savings with Lino:");
        Console.WriteLine($"  vs JSON: {aggregated.AvgLinoVsJson:F1}% fewer characters");
        Console.WriteLine($"  vs YAML: {aggregated.AvgLinoVsYaml:F1}% fewer characters");
        Console.WriteLine($"  vs XML:  {aggregated.AvgLinoVsXml:F1}% fewer characters");
        Console.WriteLine();

        // Generate JSON report
        var report = new Report
        {
            Language = "C#",
            Summary = new SummaryData
            {
                TotalLinoChars = aggregated.TotalLinoChars,
                TotalJsonChars = aggregated.TotalJsonChars,
                TotalYamlChars = aggregated.TotalYamlChars,
                TotalXmlChars = aggregated.TotalXmlChars,
                AvgLinoVsJson = aggregated.AvgLinoVsJson,
                AvgLinoVsYaml = aggregated.AvgLinoVsYaml,
                AvgLinoVsXml = aggregated.AvgLinoVsXml,
            },
            Results = results.Select(r => new ResultData
            {
                Name = r.Name,
                Description = r.Description,
                LinoChars = r.LinoChars,
                JsonChars = r.JsonChars,
                YamlChars = r.YamlChars,
                XmlChars = r.XmlChars,
                LinoVsJson = r.LinoVsJson,
                LinoVsYaml = r.LinoVsYaml,
                LinoVsXml = r.LinoVsXml,
            }).ToList(),
        };

        var outputDir = FindOutputDir();
        var jsonPath = Path.Combine(outputDir, "benchmark_results_csharp.json");

        try
        {
            var options = new JsonSerializerOptions { WriteIndented = true };
            var jsonContent = JsonSerializer.Serialize(report, options);
            File.WriteAllText(jsonPath, jsonContent, Encoding.UTF8);
            Console.WriteLine($"JSON report written to {jsonPath}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Warning: Could not write JSON report: {ex.Message}");
        }

        Console.WriteLine("\nBenchmark completed successfully!");
    }
}
