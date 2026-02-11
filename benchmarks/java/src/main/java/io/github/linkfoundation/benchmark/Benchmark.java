package io.github.linkfoundation.benchmark;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * UTF-8 Character Count Benchmark for Links Notation vs JSON, YAML, and XML
 *
 * This benchmark measures the UTF-8 character count efficiency of Links Notation
 * compared to other popular data serialization formats.
 */
public class Benchmark {

    /**
     * Represents a single benchmark test case.
     */
    record BenchmarkCase(
            String name,
            String description,
            String lino,
            String json,
            String yaml,
            String xml
    ) {}

    /**
     * Represents the results of a single benchmark.
     */
    record BenchmarkResult(
            String name,
            String description,
            int lino_chars,
            int json_chars,
            int yaml_chars,
            int xml_chars,
            double lino_vs_json,
            double lino_vs_yaml,
            double lino_vs_xml
    ) {}

    /**
     * Represents aggregated results across all benchmarks.
     */
    record AggregatedResults(
            int total_lino_chars,
            int total_json_chars,
            int total_yaml_chars,
            int total_xml_chars,
            double avg_lino_vs_json,
            double avg_lino_vs_yaml,
            double avg_lino_vs_xml
    ) {}

    /**
     * Represents the full benchmark report.
     */
    record Report(
            String language,
            AggregatedResults summary,
            List<BenchmarkResult> results
    ) {}

    /**
     * Count UTF-8 characters in a string.
     * In Java, we use codePointCount to get the number of Unicode code points.
     */
    public static int countUtf8Chars(String text) {
        return text.codePointCount(0, text.length());
    }

    /**
     * Calculate the percentage savings of Lino vs another format.
     */
    public static double calculateSavings(int linoChars, int otherChars) {
        if (otherChars == 0) return 0.0;
        return ((double)(otherChars - linoChars) / otherChars) * 100;
    }

    /**
     * Find the data directory by checking multiple possible paths.
     */
    public static Path findDataDir() {
        Path cwd = Paths.get(System.getProperty("user.dir"));

        List<Path> possiblePaths = List.of(
                cwd.resolve("benchmarks/data"),          // CWD is repo root
                cwd.resolve("../data"),                  // CWD is benchmarks/
                cwd.resolve("data"),                     // CWD is benchmarks/
                cwd.resolve("../../benchmarks/data"),    // CWD is benchmarks/java/
                cwd.resolve("../../../benchmarks/data")  // CWD is benchmarks/java/target/
        );

        for (Path path : possiblePaths) {
            Path resolved = path.toAbsolutePath().normalize();
            if (Files.isDirectory(resolved)) {
                return resolved;
            }
        }

        return null;
    }

    /**
     * Find the output directory for reports.
     */
    public static Path findOutputDir() {
        Path cwd = Paths.get(System.getProperty("user.dir"));

        List<Path> possiblePaths = List.of(
                cwd.resolve("benchmarks"),   // CWD is repo root
                cwd.resolve(".."),           // CWD is benchmarks/java/
                cwd                          // Fallback to current directory
        );

        for (Path path : possiblePaths) {
            Path resolved = path.toAbsolutePath().normalize();
            if (Files.isDirectory(resolved)) {
                return resolved;
            }
        }

        return cwd;
    }

    /**
     * Load a file as a UTF-8 string.
     */
    private static String readFile(Path path) throws IOException {
        return Files.readString(path, StandardCharsets.UTF_8);
    }

    /**
     * Load all benchmark test cases from the data directory.
     */
    public static List<BenchmarkCase> loadBenchmarkCases(Path dataDir) {
        record CaseConfig(String name, String description) {}

        List<CaseConfig> casesConfig = List.of(
                new CaseConfig("employees", "Employee records with nested structure"),
                new CaseConfig("simple_doublets", "Simple doublet links (2-tuples)"),
                new CaseConfig("triplets", "Triplet relations (3-tuples)"),
                new CaseConfig("nested_structure", "Deeply nested company structure"),
                new CaseConfig("config", "Application configuration")
        );

        List<BenchmarkCase> cases = new ArrayList<>();

        for (CaseConfig cfg : casesConfig) {
            try {
                String lino = readFile(dataDir.resolve(cfg.name + ".lino"));
                String json = readFile(dataDir.resolve(cfg.name + ".json"));
                String yaml = readFile(dataDir.resolve(cfg.name + ".yaml"));
                String xml = readFile(dataDir.resolve(cfg.name + ".xml"));

                cases.add(new BenchmarkCase(cfg.name, cfg.description, lino, json, yaml, xml));
            } catch (IOException e) {
                System.err.println("Warning: Could not load " + cfg.name + ": " + e.getMessage());
            }
        }

        return cases;
    }

    /**
     * Run the benchmark for a single test case.
     */
    public static BenchmarkResult runBenchmark(BenchmarkCase testCase) {
        int linoChars = countUtf8Chars(testCase.lino);
        int jsonChars = countUtf8Chars(testCase.json);
        int yamlChars = countUtf8Chars(testCase.yaml);
        int xmlChars = countUtf8Chars(testCase.xml);

        return new BenchmarkResult(
                testCase.name,
                testCase.description,
                linoChars,
                jsonChars,
                yamlChars,
                xmlChars,
                calculateSavings(linoChars, jsonChars),
                calculateSavings(linoChars, yamlChars),
                calculateSavings(linoChars, xmlChars)
        );
    }

    /**
     * Aggregate results across all benchmark cases.
     */
    public static AggregatedResults aggregateResults(List<BenchmarkResult> results) {
        int totalLino = results.stream().mapToInt(BenchmarkResult::lino_chars).sum();
        int totalJson = results.stream().mapToInt(BenchmarkResult::json_chars).sum();
        int totalYaml = results.stream().mapToInt(BenchmarkResult::yaml_chars).sum();
        int totalXml = results.stream().mapToInt(BenchmarkResult::xml_chars).sum();

        double avgVsJson = results.stream().mapToDouble(BenchmarkResult::lino_vs_json).average().orElse(0);
        double avgVsYaml = results.stream().mapToDouble(BenchmarkResult::lino_vs_yaml).average().orElse(0);
        double avgVsXml = results.stream().mapToDouble(BenchmarkResult::lino_vs_xml).average().orElse(0);

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

    public static void main(String[] args) {
        Path dataDir = findDataDir();
        if (dataDir == null) {
            System.err.println("Error: Could not find benchmarks/data directory");
            System.err.println("Please run from the repository root or benchmarks directory");
            System.exit(1);
        }

        System.out.println("Loading benchmark cases from " + dataDir + "...");
        List<BenchmarkCase> cases = loadBenchmarkCases(dataDir);

        if (cases.isEmpty()) {
            System.err.println("Error: No benchmark cases found");
            System.exit(1);
        }

        System.out.println("Running " + cases.size() + " benchmark cases...\n");

        List<BenchmarkResult> results = cases.stream()
                .map(Benchmark::runBenchmark)
                .toList();
        AggregatedResults aggregated = aggregateResults(results);

        // Print summary to console
        System.out.println("=== Links Notation Character Count Benchmark (Java) ===\n");
        System.out.println("Summary:");
        System.out.println("  Total Lino characters:  " + aggregated.total_lino_chars());
        System.out.println("  Total JSON characters:  " + aggregated.total_json_chars());
        System.out.println("  Total YAML characters:  " + aggregated.total_yaml_chars());
        System.out.println("  Total XML characters:   " + aggregated.total_xml_chars());
        System.out.println();
        System.out.println("Average savings with Lino:");
        System.out.printf("  vs JSON: %.1f%% fewer characters%n", aggregated.avg_lino_vs_json());
        System.out.printf("  vs YAML: %.1f%% fewer characters%n", aggregated.avg_lino_vs_yaml());
        System.out.printf("  vs XML:  %.1f%% fewer characters%n", aggregated.avg_lino_vs_xml());
        System.out.println();

        // Generate JSON report
        Report report = new Report("Java", aggregated, results);

        Path outputDir = findOutputDir();
        Path jsonPath = outputDir.resolve("benchmark_results_java.json");

        Gson gson = new GsonBuilder().setPrettyPrinting().create();
        try {
            Files.writeString(jsonPath, gson.toJson(report), StandardCharsets.UTF_8);
            System.out.println("JSON report written to " + jsonPath);
        } catch (IOException e) {
            System.err.println("Warning: Could not write JSON report: " + e.getMessage());
        }

        System.out.println("\nBenchmark completed successfully!");
    }
}
