// UTF-8 Character Count Benchmark for Links Notation vs JSON, YAML, and XML
//
// This benchmark measures the UTF-8 character count efficiency of Links Notation
// compared to other popular data serialization formats.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"unicode/utf8"
)

// BenchmarkCase represents a single benchmark test case
type BenchmarkCase struct {
	Name        string
	Description string
	Lino        string
	JSON        string
	YAML        string
	XML         string
}

// BenchmarkResult represents the results of a single benchmark
type BenchmarkResult struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	LinoChars   int     `json:"lino_chars"`
	JSONChars   int     `json:"json_chars"`
	YAMLChars   int     `json:"yaml_chars"`
	XMLChars    int     `json:"xml_chars"`
	LinoVsJSON  float64 `json:"lino_vs_json"`
	LinoVsYAML  float64 `json:"lino_vs_yaml"`
	LinoVsXML   float64 `json:"lino_vs_xml"`
}

// AggregatedResults represents aggregated results across all benchmarks
type AggregatedResults struct {
	TotalLinoChars int     `json:"total_lino_chars"`
	TotalJSONChars int     `json:"total_json_chars"`
	TotalYAMLChars int     `json:"total_yaml_chars"`
	TotalXMLChars  int     `json:"total_xml_chars"`
	AvgLinoVsJSON  float64 `json:"avg_lino_vs_json"`
	AvgLinoVsYAML  float64 `json:"avg_lino_vs_yaml"`
	AvgLinoVsXML   float64 `json:"avg_lino_vs_xml"`
}

// Report represents the full benchmark report
type Report struct {
	Language string             `json:"language"`
	Summary  AggregatedResults  `json:"summary"`
	Results  []BenchmarkResult  `json:"results"`
}

// countUTF8Chars counts UTF-8 characters (runes) in a string
func countUTF8Chars(s string) int {
	return utf8.RuneCountInString(s)
}

// calculateSavings calculates the percentage savings of Lino vs another format
func calculateSavings(linoChars, otherChars int) float64 {
	if otherChars == 0 {
		return 0.0
	}
	return (float64(otherChars-linoChars) / float64(otherChars)) * 100
}

// findDataDir finds the data directory by checking multiple possible paths
func findDataDir() string {
	// Get executable directory
	execPath, err := os.Executable()
	execDir := ""
	if err == nil {
		execDir = filepath.Dir(execPath)
	}

	cwd, _ := os.Getwd()

	possiblePaths := []string{
		filepath.Join(execDir, "../data"),          // Running from benchmarks/go/
		filepath.Join(execDir, "../../benchmarks/data"), // Running from deeper nested
		filepath.Join(cwd, "benchmarks/data"),      // CWD is repo root
		filepath.Join(cwd, "../data"),              // CWD is benchmarks/
		filepath.Join(cwd, "data"),                 // CWD is benchmarks/
		filepath.Join(cwd, "../../benchmarks/data"), // CWD is benchmarks/go/
	}

	for _, path := range possiblePaths {
		absPath, err := filepath.Abs(path)
		if err != nil {
			continue
		}
		if info, err := os.Stat(absPath); err == nil && info.IsDir() {
			return absPath
		}
	}

	return ""
}

// findOutputDir finds the output directory for reports
func findOutputDir() string {
	execPath, err := os.Executable()
	execDir := ""
	if err == nil {
		execDir = filepath.Dir(execPath)
	}

	cwd, _ := os.Getwd()

	possiblePaths := []string{
		filepath.Join(execDir, ".."),      // Running from benchmarks/go/
		filepath.Join(cwd, "benchmarks"),  // CWD is repo root
		cwd,                               // Fallback to current directory
	}

	for _, path := range possiblePaths {
		absPath, err := filepath.Abs(path)
		if err != nil {
			continue
		}
		if info, err := os.Stat(absPath); err == nil && info.IsDir() {
			return absPath
		}
	}

	return cwd
}

// loadBenchmarkCases loads all benchmark test cases from the data directory
func loadBenchmarkCases(dataDir string) []BenchmarkCase {
	casesConfig := []struct {
		name        string
		description string
	}{
		{"employees", "Employee records with nested structure"},
		{"simple_doublets", "Simple doublet links (2-tuples)"},
		{"triplets", "Triplet relations (3-tuples)"},
		{"nested_structure", "Deeply nested company structure"},
		{"config", "Application configuration"},
	}

	var cases []BenchmarkCase

	for _, cfg := range casesConfig {
		lino, err := os.ReadFile(filepath.Join(dataDir, cfg.name+".lino"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Warning: Could not load %s.lino: %v\n", cfg.name, err)
			continue
		}

		jsonData, err := os.ReadFile(filepath.Join(dataDir, cfg.name+".json"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Warning: Could not load %s.json: %v\n", cfg.name, err)
			continue
		}

		yaml, err := os.ReadFile(filepath.Join(dataDir, cfg.name+".yaml"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Warning: Could not load %s.yaml: %v\n", cfg.name, err)
			continue
		}

		xml, err := os.ReadFile(filepath.Join(dataDir, cfg.name+".xml"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Warning: Could not load %s.xml: %v\n", cfg.name, err)
			continue
		}

		cases = append(cases, BenchmarkCase{
			Name:        cfg.name,
			Description: cfg.description,
			Lino:        string(lino),
			JSON:        string(jsonData),
			YAML:        string(yaml),
			XML:         string(xml),
		})
	}

	return cases
}

// runBenchmark runs the benchmark for a single test case
func runBenchmark(testCase BenchmarkCase) BenchmarkResult {
	linoChars := countUTF8Chars(testCase.Lino)
	jsonChars := countUTF8Chars(testCase.JSON)
	yamlChars := countUTF8Chars(testCase.YAML)
	xmlChars := countUTF8Chars(testCase.XML)

	return BenchmarkResult{
		Name:        testCase.Name,
		Description: testCase.Description,
		LinoChars:   linoChars,
		JSONChars:   jsonChars,
		YAMLChars:   yamlChars,
		XMLChars:    xmlChars,
		LinoVsJSON:  calculateSavings(linoChars, jsonChars),
		LinoVsYAML:  calculateSavings(linoChars, yamlChars),
		LinoVsXML:   calculateSavings(linoChars, xmlChars),
	}
}

// aggregateResults aggregates results across all benchmark cases
func aggregateResults(results []BenchmarkResult) AggregatedResults {
	var totalLino, totalJSON, totalYAML, totalXML int
	var sumVsJSON, sumVsYAML, sumVsXML float64

	for _, r := range results {
		totalLino += r.LinoChars
		totalJSON += r.JSONChars
		totalYAML += r.YAMLChars
		totalXML += r.XMLChars
		sumVsJSON += r.LinoVsJSON
		sumVsYAML += r.LinoVsYAML
		sumVsXML += r.LinoVsXML
	}

	n := float64(len(results))
	return AggregatedResults{
		TotalLinoChars: totalLino,
		TotalJSONChars: totalJSON,
		TotalYAMLChars: totalYAML,
		TotalXMLChars:  totalXML,
		AvgLinoVsJSON:  sumVsJSON / n,
		AvgLinoVsYAML:  sumVsYAML / n,
		AvgLinoVsXML:   sumVsXML / n,
	}
}

func main() {
	dataDir := findDataDir()
	if dataDir == "" {
		fmt.Fprintln(os.Stderr, "Error: Could not find benchmarks/data directory")
		fmt.Fprintln(os.Stderr, "Please run from the repository root or benchmarks directory")
		os.Exit(1)
	}

	fmt.Printf("Loading benchmark cases from %s...\n", dataDir)
	cases := loadBenchmarkCases(dataDir)

	if len(cases) == 0 {
		fmt.Fprintln(os.Stderr, "Error: No benchmark cases found")
		os.Exit(1)
	}

	fmt.Printf("Running %d benchmark cases...\n\n", len(cases))

	var results []BenchmarkResult
	for _, testCase := range cases {
		results = append(results, runBenchmark(testCase))
	}
	aggregated := aggregateResults(results)

	// Print summary to console
	fmt.Println("=== Links Notation Character Count Benchmark (Go) ===")
	fmt.Println()
	fmt.Println("Summary:")
	fmt.Printf("  Total Lino characters:  %d\n", aggregated.TotalLinoChars)
	fmt.Printf("  Total JSON characters:  %d\n", aggregated.TotalJSONChars)
	fmt.Printf("  Total YAML characters:  %d\n", aggregated.TotalYAMLChars)
	fmt.Printf("  Total XML characters:   %d\n", aggregated.TotalXMLChars)
	fmt.Println()
	fmt.Println("Average savings with Lino:")
	fmt.Printf("  vs JSON: %.1f%% fewer characters\n", aggregated.AvgLinoVsJSON)
	fmt.Printf("  vs YAML: %.1f%% fewer characters\n", aggregated.AvgLinoVsYAML)
	fmt.Printf("  vs XML:  %.1f%% fewer characters\n", aggregated.AvgLinoVsXML)
	fmt.Println()

	// Generate JSON report
	report := Report{
		Language: "Go",
		Summary:  aggregated,
		Results:  results,
	}

	outputDir := findOutputDir()
	jsonPath := filepath.Join(outputDir, "benchmark_results_go.json")

	jsonData, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Could not marshal JSON report: %v\n", err)
	} else {
		if err := os.WriteFile(jsonPath, jsonData, 0644); err != nil {
			fmt.Fprintf(os.Stderr, "Warning: Could not write JSON report: %v\n", err)
		} else {
			fmt.Printf("JSON report written to %s\n", jsonPath)
		}
	}

	fmt.Println("\nBenchmark completed successfully!")
}
