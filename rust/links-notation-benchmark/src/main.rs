//! UTF-8 Character Count Benchmark for Links Notation vs JSON, YAML, and XML
//!
//! This benchmark measures the UTF-8 character count efficiency of Links Notation
//! compared to other popular data serialization formats.

use serde::Serialize;
use std::fs;
use std::path::Path;

/// Represents a single benchmark test case with all format representations
#[derive(Debug, Clone)]
struct BenchmarkCase {
    name: String,
    description: String,
    lino: String,
    json: String,
    yaml: String,
    xml: String,
}

/// Represents the character count results for a benchmark case
#[derive(Debug, Clone, Serialize)]
struct BenchmarkResult {
    name: String,
    description: String,
    lino_chars: usize,
    json_chars: usize,
    yaml_chars: usize,
    xml_chars: usize,
    lino_vs_json: f64,
    lino_vs_yaml: f64,
    lino_vs_xml: f64,
}

/// Represents aggregated results across all benchmark cases
#[derive(Debug, Clone, Serialize)]
struct AggregatedResults {
    total_lino_chars: usize,
    total_json_chars: usize,
    total_yaml_chars: usize,
    total_xml_chars: usize,
    avg_lino_vs_json: f64,
    avg_lino_vs_yaml: f64,
    avg_lino_vs_xml: f64,
}

fn count_utf8_chars(s: &str) -> usize {
    s.chars().count()
}

fn calculate_savings(lino_chars: usize, other_chars: usize) -> f64 {
    if other_chars == 0 {
        0.0
    } else {
        ((other_chars as f64 - lino_chars as f64) / other_chars as f64) * 100.0
    }
}

fn load_benchmark_cases(data_dir: &Path) -> Vec<BenchmarkCase> {
    let cases = vec![
        ("employees", "Employee records with nested structure"),
        ("simple_doublets", "Simple doublet links (2-tuples)"),
        ("triplets", "Triplet relations (3-tuples)"),
        ("nested_structure", "Deeply nested company structure"),
        ("config", "Application configuration"),
    ];

    cases
        .into_iter()
        .filter_map(|(name, desc)| {
            let lino_path = data_dir.join(format!("{}.lino", name));
            let json_path = data_dir.join(format!("{}.json", name));
            let yaml_path = data_dir.join(format!("{}.yaml", name));
            let xml_path = data_dir.join(format!("{}.xml", name));

            let lino = fs::read_to_string(&lino_path).ok()?;
            let json = fs::read_to_string(&json_path).ok()?;
            let yaml = fs::read_to_string(&yaml_path).ok()?;
            let xml = fs::read_to_string(&xml_path).ok()?;

            Some(BenchmarkCase {
                name: name.to_string(),
                description: desc.to_string(),
                lino,
                json,
                yaml,
                xml,
            })
        })
        .collect()
}

fn run_benchmark(case: &BenchmarkCase) -> BenchmarkResult {
    let lino_chars = count_utf8_chars(&case.lino);
    let json_chars = count_utf8_chars(&case.json);
    let yaml_chars = count_utf8_chars(&case.yaml);
    let xml_chars = count_utf8_chars(&case.xml);

    BenchmarkResult {
        name: case.name.clone(),
        description: case.description.clone(),
        lino_chars,
        json_chars,
        yaml_chars,
        xml_chars,
        lino_vs_json: calculate_savings(lino_chars, json_chars),
        lino_vs_yaml: calculate_savings(lino_chars, yaml_chars),
        lino_vs_xml: calculate_savings(lino_chars, xml_chars),
    }
}

fn aggregate_results(results: &[BenchmarkResult]) -> AggregatedResults {
    let total_lino_chars: usize = results.iter().map(|r| r.lino_chars).sum();
    let total_json_chars: usize = results.iter().map(|r| r.json_chars).sum();
    let total_yaml_chars: usize = results.iter().map(|r| r.yaml_chars).sum();
    let total_xml_chars: usize = results.iter().map(|r| r.xml_chars).sum();

    let avg_lino_vs_json: f64 =
        results.iter().map(|r| r.lino_vs_json).sum::<f64>() / results.len() as f64;
    let avg_lino_vs_yaml: f64 =
        results.iter().map(|r| r.lino_vs_yaml).sum::<f64>() / results.len() as f64;
    let avg_lino_vs_xml: f64 =
        results.iter().map(|r| r.lino_vs_xml).sum::<f64>() / results.len() as f64;

    AggregatedResults {
        total_lino_chars,
        total_json_chars,
        total_yaml_chars,
        total_xml_chars,
        avg_lino_vs_json,
        avg_lino_vs_yaml,
        avg_lino_vs_xml,
    }
}

fn generate_markdown_report(results: &[BenchmarkResult], aggregated: &AggregatedResults) -> String {
    let mut md = String::new();

    md.push_str("# Links Notation Character Count Benchmark\n\n");
    md.push_str("This benchmark compares the UTF-8 character count of Links Notation (lino) against JSON, YAML, and XML.\n\n");
    md.push_str("## Summary\n\n");
    md.push_str("| Format | Total Characters | vs Lino |\n");
    md.push_str("|--------|------------------|----------|\n");
    md.push_str(&format!(
        "| **Lino** | **{}** | - |\n",
        aggregated.total_lino_chars
    ));
    md.push_str(&format!(
        "| JSON | {} | +{:.1}% |\n",
        aggregated.total_json_chars,
        ((aggregated.total_json_chars as f64 / aggregated.total_lino_chars as f64) - 1.0) * 100.0
    ));
    md.push_str(&format!(
        "| YAML | {} | +{:.1}% |\n",
        aggregated.total_yaml_chars,
        ((aggregated.total_yaml_chars as f64 / aggregated.total_lino_chars as f64) - 1.0) * 100.0
    ));
    md.push_str(&format!(
        "| XML | {} | +{:.1}% |\n",
        aggregated.total_xml_chars,
        ((aggregated.total_xml_chars as f64 / aggregated.total_lino_chars as f64) - 1.0) * 100.0
    ));

    md.push_str("\n## Average Savings with Lino\n\n");
    md.push_str(&format!(
        "- **vs JSON**: {:.1}% fewer characters\n",
        aggregated.avg_lino_vs_json
    ));
    md.push_str(&format!(
        "- **vs YAML**: {:.1}% fewer characters\n",
        aggregated.avg_lino_vs_yaml
    ));
    md.push_str(&format!(
        "- **vs XML**: {:.1}% fewer characters\n",
        aggregated.avg_lino_vs_xml
    ));

    md.push_str("\n## Detailed Results\n\n");
    md.push_str("| Test Case | Description | Lino | JSON | YAML | XML | Lino vs JSON | Lino vs YAML | Lino vs XML |\n");
    md.push_str("|-----------|-------------|------|------|------|-----|--------------|--------------|-------------|\n");

    for result in results {
        md.push_str(&format!(
            "| {} | {} | {} | {} | {} | {} | {:.1}% | {:.1}% | {:.1}% |\n",
            result.name,
            result.description,
            result.lino_chars,
            result.json_chars,
            result.yaml_chars,
            result.xml_chars,
            result.lino_vs_json,
            result.lino_vs_yaml,
            result.lino_vs_xml
        ));
    }

    md.push_str("\n## Test Cases\n\n");

    for result in results {
        md.push_str(&format!("### {}\n\n", result.name));
        md.push_str(&format!("{}\n\n", result.description));
        md.push_str(&format!(
            "| Format | Characters |\n|--------|------------|\n| Lino | {} |\n| JSON | {} |\n| YAML | {} |\n| XML | {} |\n\n",
            result.lino_chars, result.json_chars, result.yaml_chars, result.xml_chars
        ));
    }

    md.push_str("## Methodology\n\n");
    md.push_str("This benchmark counts UTF-8 characters (not bytes) in equivalent data representations across all formats.\n");
    md.push_str("The \"savings\" percentage indicates how much smaller the Lino representation is compared to each format.\n\n");
    md.push_str("A positive savings percentage means Lino uses fewer characters.\n\n");
    md.push_str("---\n\n");
    md.push_str("*Generated automatically by links-notation-benchmark*\n");

    md
}

fn generate_json_report(results: &[BenchmarkResult], aggregated: &AggregatedResults) -> String {
    #[derive(Serialize)]
    struct Report {
        summary: AggregatedResults,
        results: Vec<BenchmarkResult>,
    }

    let report = Report {
        summary: aggregated.clone(),
        results: results.to_vec(),
    };

    serde_json::to_string_pretty(&report).unwrap_or_default()
}

fn main() {
    // Determine the data directory - try multiple possible locations
    let possible_paths = [
        "benchmarks/data",          // Running from repo root
        "../benchmarks/data",       // Running from rust/
        "../../benchmarks/data",    // Running from rust/links-notation-benchmark/
        "../../../benchmarks/data", // Running from rust/links-notation-benchmark/src/
    ];

    let data_dir = possible_paths
        .iter()
        .find(|p| Path::new(p).exists())
        .map(Path::new);

    let data_dir = match data_dir {
        Some(path) => path,
        None => {
            eprintln!("Error: Could not find benchmarks/data directory");
            eprintln!("Searched in: {:?}", possible_paths);
            eprintln!("Please run from the repository root");
            std::process::exit(1);
        }
    };

    println!("Loading benchmark cases from {:?}...", data_dir);
    let cases = load_benchmark_cases(data_dir);

    if cases.is_empty() {
        eprintln!("Error: No benchmark cases found in {:?}", data_dir);
        std::process::exit(1);
    }

    println!("Running {} benchmark cases...\n", cases.len());

    let results: Vec<BenchmarkResult> = cases.iter().map(run_benchmark).collect();
    let aggregated = aggregate_results(&results);

    // Print summary to console
    println!("=== Links Notation Character Count Benchmark ===\n");
    println!("Summary:");
    println!("  Total Lino characters:  {}", aggregated.total_lino_chars);
    println!("  Total JSON characters:  {}", aggregated.total_json_chars);
    println!("  Total YAML characters:  {}", aggregated.total_yaml_chars);
    println!("  Total XML characters:   {}", aggregated.total_xml_chars);
    println!();
    println!("Average savings with Lino:");
    println!(
        "  vs JSON: {:.1}% fewer characters",
        aggregated.avg_lino_vs_json
    );
    println!(
        "  vs YAML: {:.1}% fewer characters",
        aggregated.avg_lino_vs_yaml
    );
    println!(
        "  vs XML:  {:.1}% fewer characters",
        aggregated.avg_lino_vs_xml
    );
    println!();

    // Generate reports
    let markdown_report = generate_markdown_report(&results, &aggregated);
    let json_report = generate_json_report(&results, &aggregated);

    // Determine output directory using the same search logic
    let output_possible_paths = [
        "benchmarks",       // Running from repo root
        "../benchmarks",    // Running from rust/
        "../../benchmarks", // Running from rust/links-notation-benchmark/
    ];

    let output_dir = output_possible_paths
        .iter()
        .find(|p| Path::new(p).exists())
        .map(|p| Path::new(*p))
        .unwrap_or(Path::new("."));

    // Write markdown report
    let md_path = output_dir.join("BENCHMARK_RESULTS.md");
    if let Err(e) = fs::write(&md_path, &markdown_report) {
        eprintln!(
            "Warning: Could not write markdown report to {:?}: {}",
            md_path, e
        );
    } else {
        println!("Markdown report written to {:?}", md_path);
    }

    // Write JSON report
    let json_path = output_dir.join("benchmark_results.json");
    if let Err(e) = fs::write(&json_path, &json_report) {
        eprintln!(
            "Warning: Could not write JSON report to {:?}: {}",
            json_path, e
        );
    } else {
        println!("JSON report written to {:?}", json_path);
    }

    println!("\nBenchmark completed successfully!");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_count_utf8_chars() {
        assert_eq!(count_utf8_chars("hello"), 5);
        assert_eq!(count_utf8_chars("hello world"), 11);
        assert_eq!(count_utf8_chars(""), 0);
        // Test with unicode characters
        assert_eq!(count_utf8_chars("привет"), 6);
        assert_eq!(count_utf8_chars("你好"), 2);
        assert_eq!(count_utf8_chars("🎉"), 1);
    }

    #[test]
    fn test_calculate_savings() {
        assert_eq!(calculate_savings(100, 200), 50.0);
        assert_eq!(calculate_savings(50, 100), 50.0);
        assert_eq!(calculate_savings(100, 100), 0.0);
        assert_eq!(calculate_savings(0, 0), 0.0);
    }

    #[test]
    fn test_aggregate_results() {
        let results = vec![
            BenchmarkResult {
                name: "test1".to_string(),
                description: "Test 1".to_string(),
                lino_chars: 100,
                json_chars: 150,
                yaml_chars: 120,
                xml_chars: 200,
                lino_vs_json: 33.33,
                lino_vs_yaml: 16.67,
                lino_vs_xml: 50.0,
            },
            BenchmarkResult {
                name: "test2".to_string(),
                description: "Test 2".to_string(),
                lino_chars: 50,
                json_chars: 80,
                yaml_chars: 60,
                xml_chars: 100,
                lino_vs_json: 37.5,
                lino_vs_yaml: 16.67,
                lino_vs_xml: 50.0,
            },
        ];

        let aggregated = aggregate_results(&results);
        assert_eq!(aggregated.total_lino_chars, 150);
        assert_eq!(aggregated.total_json_chars, 230);
        assert_eq!(aggregated.total_yaml_chars, 180);
        assert_eq!(aggregated.total_xml_chars, 300);
    }
}
