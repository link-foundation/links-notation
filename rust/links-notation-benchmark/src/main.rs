//! Token efficiency benchmarks for Links Notation.
//!
//! The benchmark answers one question: how much of a model's context does the
//! same information cost in Links Notation, JSON, YAML, XML and CSV?
//!
//! It is a generator as much as a measurement. `benchmarks/datasets/` holds the
//! data, and this program derives every other representation from it, checks
//! that the derived documents still hold the same value, measures them, and
//! writes both a Markdown report and a machine-readable result file. The
//! benchmarks written in the other supported languages read the files it wrote
//! and have to arrive at the same numbers.
//!
//! ```text
//! cargo run -p links-notation-benchmark --release            # regenerate
//! cargo run -p links-notation-benchmark --release -- --check  # fail on drift
//! ```

mod csv;
mod lino;
mod metrics;
mod report;
mod xml;
mod yaml;

use metrics::{measure, Metrics};
use serde::Serialize;
use serde_json::{Map, Value};
use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

/// Every format the report knows, in the order the tables show them.
pub const FORMATS: [&str; 8] = [
    "lino",
    "lino-min",
    "lino-line",
    "json",
    "json-compact",
    "yaml",
    "xml",
    "csv",
];

/// Version of the result file's schema, so a language reading it can tell that
/// it is reading a shape it understands.
const RESULTS_SCHEMA: u32 = 1;

/// One dataset as `benchmarks/datasets/index.json` describes it.
#[derive(Debug, Clone)]
struct Dataset {
    name: String,
    description: String,
    structure: String,
    profile: String,
    value: Value,
}

/// One dataset's measured formats.
#[derive(Debug, Clone)]
pub struct DatasetResult {
    pub name: String,
    pub description: String,
    pub structure: String,
    pub profile: String,
    pub formats: BTreeMap<String, Metrics>,
}

/// A file this run produces, kept in memory so `--check` can compare without
/// writing anything.
struct GeneratedFile {
    path: PathBuf,
    contents: String,
}

fn main() -> ExitCode {
    let check = env::args().any(|argument| argument == "--check");
    let verbose = env::args().any(|argument| argument == "--verbose")
        || env::var("CI_VERBOSE").is_ok_and(|value| value == "true" || value == "1");

    let root = match locate_benchmarks_directory() {
        Some(root) => root,
        None => {
            eprintln!(
                "error: could not find the benchmarks directory; run this from the repository \
                 or set BENCHMARKS_DIR"
            );
            return ExitCode::FAILURE;
        }
    };
    if verbose {
        eprintln!("benchmarks directory: {}", root.display());
    }

    let datasets = match load_datasets(&root) {
        Ok(datasets) => datasets,
        Err(message) => {
            eprintln!("error: {message}");
            return ExitCode::FAILURE;
        }
    };

    let mut files: Vec<GeneratedFile> = Vec::new();
    let mut results: Vec<DatasetResult> = Vec::new();
    let mut manifest = Vec::new();

    for dataset in &datasets {
        match run_dataset(&root, dataset, verbose) {
            Ok((result, generated, entry)) => {
                results.push(result);
                files.extend(generated);
                manifest.push(entry);
            }
            Err(message) => {
                eprintln!("error: dataset '{}': {message}", dataset.name);
                return ExitCode::FAILURE;
            }
        }
    }

    files.push(GeneratedFile {
        path: root.join("generated").join("index.json"),
        contents: format!(
            "{}\n",
            serde_json::to_string_pretty(&serde_json::json!({
                "schema": RESULTS_SCHEMA,
                "representations": manifest,
            }))
            .expect("manifest serializes")
        ),
    });
    files.push(GeneratedFile {
        path: root.join("results").join("rust.json"),
        contents: results_json(&results),
    });
    files.push(GeneratedFile {
        path: root.join("BENCHMARK_RESULTS.md"),
        contents: report::markdown(&results, env!("CARGO_PKG_VERSION")),
    });

    if check {
        return match compare(&files) {
            Ok(()) => {
                println!(
                    "All {} generated files match this run's output.",
                    files.len()
                );
                ExitCode::SUCCESS
            }
            Err(differences) => {
                eprintln!("Generated files differ from this run's output:");
                for path in differences {
                    eprintln!("  - {}", path.display());
                }
                eprintln!("Run: cargo run -p links-notation-benchmark --release");
                ExitCode::FAILURE
            }
        };
    }

    for file in &files {
        if let Some(parent) = file.path.parent() {
            if let Err(error) = fs::create_dir_all(parent) {
                eprintln!("error: cannot create {}: {error}", parent.display());
                return ExitCode::FAILURE;
            }
        }
        if let Err(error) = fs::write(&file.path, &file.contents) {
            eprintln!("error: cannot write {}: {error}", file.path.display());
            return ExitCode::FAILURE;
        }
    }

    print_summary(&results);
    println!("Wrote {} files under {}", files.len(), root.display());
    ExitCode::SUCCESS
}

/// Build, validate and measure every representation of one dataset.
#[allow(clippy::type_complexity)]
fn run_dataset(
    root: &Path,
    dataset: &Dataset,
    verbose: bool,
) -> Result<(DatasetResult, Vec<GeneratedFile>, Value), String> {
    let source_path = format!("datasets/{}.json", dataset.name);
    let pretty_json = format!(
        "{}\n",
        serde_json::to_string_pretty(&dataset.value).map_err(|error| error.to_string())?
    );

    let lino_document = lino::encode_document(&dataset.value, lino::Quoting::Always);
    let lino_minimal = lino::encode_document(&dataset.value, lino::Quoting::Minimal);
    let lino_line = lino::encode_line(&dataset.value);
    let compact_json = serde_json::to_string(&dataset.value).map_err(|error| error.to_string())?;
    let yaml_document = yaml::encode(&dataset.value);
    let xml_document = xml::encode(&dataset.value);
    let csv_document = csv::encode(&dataset.value);

    validate(
        dataset,
        &[
            ("indented", &lino_document),
            ("minimally quoted", &lino_minimal),
            ("single-line", &lino_line),
        ],
        &compact_json,
    )?;
    if verbose {
        eprintln!(
            "{}: validated, {} bytes of lino",
            dataset.name,
            lino_document.len()
        );
    }

    let mut files = Vec::new();
    let mut formats: BTreeMap<String, Metrics> = BTreeMap::new();
    let mut paths: Map<String, Value> = Map::new();

    // The indented JSON is the dataset file itself, so it is measured where it
    // already lives instead of being written a second time.
    if pretty_json != read_text(&root.join(&source_path))? {
        return Err(format!(
            "datasets/{}.json is not the 2-space indented form of its own value; \
             run node benchmarks/tools/generate-datasets.mjs",
            dataset.name
        ));
    }
    formats.insert("json".to_string(), measure(&pretty_json));
    paths.insert("json".to_string(), Value::String(source_path));

    let mut emit = |format: &str, extension: &str, contents: String| {
        let relative = format!("generated/{}{}", dataset.name, extension);
        formats.insert(format.to_string(), measure(&contents));
        paths.insert(format.to_string(), Value::String(relative.clone()));
        files.push(GeneratedFile {
            path: root.join(&relative),
            contents,
        });
    };

    emit("lino", ".lino", format!("{lino_document}\n"));
    emit("lino-min", ".min.lino", format!("{lino_minimal}\n"));
    emit("lino-line", ".line.lino", format!("{lino_line}\n"));
    emit("json-compact", ".min.json", format!("{compact_json}\n"));
    emit("yaml", ".yaml", yaml_document);
    emit("xml", ".xml", xml_document);
    if let Some(document) = csv_document {
        emit("csv", ".csv", document);
    }

    let entry = serde_json::json!({
        "dataset": dataset.name,
        "description": dataset.description,
        "structure": dataset.structure,
        "profile": dataset.profile,
        "files": Value::Object(paths),
    });

    Ok((
        DatasetResult {
            name: dataset.name.clone(),
            description: dataset.description.clone(),
            structure: dataset.structure.clone(),
            profile: dataset.profile.clone(),
            formats,
        },
        files,
        entry,
    ))
}

/// Refuse to report a number for a document that does not hold the same value
/// it was built from, or that the notation's own parser does not accept.
///
/// This is what makes the comparison fair rather than flattering: a writer can
/// always make a document shorter by leaving something out, so every Links
/// Notation document the benchmark measures has to survive a round trip through
/// the reader before its size is allowed to count.
fn validate(
    dataset: &Dataset,
    lino_documents: &[(&str, &str)],
    compact_json: &str,
) -> Result<(), String> {
    for (label, document) in lino_documents {
        links_notation::parse_lino(document).map_err(|error| {
            format!("the links-notation parser rejects the {label} document: {error}")
        })?;
        if lino::decode(document)? != dataset.value {
            return Err(format!(
                "the {label} Links Notation document does not decode back to its source value"
            ));
        }
    }

    let reparsed: Value = serde_json::from_str(compact_json).map_err(|error| error.to_string())?;
    if reparsed != dataset.value {
        return Err(
            "the compact JSON document does not parse back to its source value".to_string(),
        );
    }

    Ok(())
}

fn results_json(results: &[DatasetResult]) -> String {
    #[derive(Serialize)]
    struct Output<'a> {
        schema: u32,
        generator: &'a str,
        tokenizers: BTreeMap<&'a str, &'a str>,
        datasets: Vec<DatasetOutput<'a>>,
        totals: BTreeMap<&'a str, Metrics>,
    }

    #[derive(Serialize)]
    struct DatasetOutput<'a> {
        name: &'a str,
        structure: &'a str,
        profile: &'a str,
        formats: &'a BTreeMap<String, Metrics>,
    }

    let mut tokenizers = BTreeMap::new();
    tokenizers.insert("primary", "o200k_base");
    tokenizers.insert("secondary", "cl100k_base");

    let mut totals = BTreeMap::new();
    for format in FORMATS {
        if let Some(metrics) = report::total(results, format) {
            totals.insert(format, metrics);
        }
    }

    let output = Output {
        schema: RESULTS_SCHEMA,
        generator: "rust",
        tokenizers,
        datasets: results
            .iter()
            .map(|result| DatasetOutput {
                name: &result.name,
                structure: &result.structure,
                profile: &result.profile,
                formats: &result.formats,
            })
            .collect(),
        totals,
    };

    format!(
        "{}\n",
        serde_json::to_string_pretty(&output).expect("results serialize")
    )
}

fn print_summary(results: &[DatasetResult]) {
    println!(
        "Totals across {} datasets (tokens, o200k_base):",
        results.len()
    );
    let baseline = report::total(results, report::BASELINE);
    for format in FORMATS {
        let Some(metrics) = report::total(results, format) else {
            continue;
        };
        let against = baseline
            .map(|base| {
                format!(
                    "{:>6.1}% vs JSON",
                    metrics::savings(metrics.tokens_o200k, base.tokens_o200k)
                )
            })
            .unwrap_or_default();
        println!("  {:<14} {:>8}   {against}", format, metrics.tokens_o200k);
    }
}

fn compare(files: &[GeneratedFile]) -> Result<(), Vec<PathBuf>> {
    let differences: Vec<PathBuf> = files
        .iter()
        .filter(|file| {
            fs::read_to_string(&file.path).ok().as_deref() != Some(file.contents.as_str())
        })
        .map(|file| file.path.clone())
        .collect();
    if differences.is_empty() {
        Ok(())
    } else {
        Err(differences)
    }
}

fn load_datasets(root: &Path) -> Result<Vec<Dataset>, String> {
    let index_path = root.join("datasets").join("index.json");
    let index: Value = serde_json::from_str(&read_text(&index_path)?)
        .map_err(|error| format!("{}: {error}", index_path.display()))?;
    let entries = index
        .get("datasets")
        .and_then(Value::as_array)
        .ok_or_else(|| format!("{}: expected a 'datasets' array", index_path.display()))?;

    let mut datasets = Vec::with_capacity(entries.len());
    for entry in entries {
        let field = |name: &str| -> Result<String, String> {
            entry
                .get(name)
                .and_then(Value::as_str)
                .map(str::to_string)
                .ok_or_else(|| format!("{}: a dataset entry has no '{name}'", index_path.display()))
        };
        let name = field("name")?;
        let file = field("file")?;
        let value: Value = serde_json::from_str(&read_text(&root.join("datasets").join(&file))?)
            .map_err(|error| format!("datasets/{file}: {error}"))?;
        datasets.push(Dataset {
            name,
            description: field("description")?,
            structure: field("structure")?,
            profile: field("profile")?,
            value,
        });
    }
    Ok(datasets)
}

fn read_text(path: &Path) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| format!("{}: {error}", path.display()))
}

/// Find `benchmarks/` by walking up from the current directory, so the binary
/// works from the repository root, from `rust/`, or from wherever CI runs it.
fn locate_benchmarks_directory() -> Option<PathBuf> {
    if let Ok(explicit) = env::var("BENCHMARKS_DIR") {
        let path = PathBuf::from(explicit);
        return path
            .join("datasets")
            .join("index.json")
            .exists()
            .then_some(path);
    }
    let mut starts = vec![env::current_dir().ok()?];
    starts.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")));
    for start in starts {
        let mut directory = Some(start.as_path());
        while let Some(current) = directory {
            let candidate = current.join("benchmarks");
            if candidate.join("datasets").join("index.json").exists() {
                return Some(candidate);
            }
            directory = current.parent();
        }
    }
    None
}
