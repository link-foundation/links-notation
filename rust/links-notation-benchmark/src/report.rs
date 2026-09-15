//! The Markdown and JSON reports the benchmark writes.
//!
//! Both are generated files: the Markdown one is what a reader opens, and the
//! JSON one is what the benchmarks written in the other supported languages are
//! compared against, so that seven implementations have to agree on every
//! number before a result is published.

use crate::metrics::{savings, Metrics};
use crate::{DatasetResult, FORMATS};
use std::collections::BTreeMap;
use std::fmt::Write as _;

/// The format every other one is compared against in the headline tables.
pub const BASELINE: &str = "json";

/// The compact baseline, shown next to the indented one because a document
/// pasted into a prompt is often minified first.
pub const COMPACT_BASELINE: &str = "json-compact";

/// Sum the metrics of one format across the datasets that have it.
pub fn total(results: &[DatasetResult], format: &str) -> Option<Metrics> {
    let mut total = Metrics {
        tokens_o200k: 0,
        tokens_cl100k: 0,
        chars: 0,
        bytes: 0,
    };
    let mut seen = false;
    for result in results {
        let Some(metrics) = result.formats.get(format) else {
            continue;
        };
        seen = true;
        total.tokens_o200k += metrics.tokens_o200k;
        total.tokens_cl100k += metrics.tokens_cl100k;
        total.chars += metrics.chars;
        total.bytes += metrics.bytes;
    }
    seen.then_some(total)
}

/// Whether a format is present in every one of these datasets, which is what
/// makes a total comparable with the other totals in the same table.
fn covers_all(results: &[DatasetResult], format: &str) -> bool {
    results
        .iter()
        .all(|result| result.formats.contains_key(format))
}

fn percent(value: f64) -> String {
    format!("{value:.1}%")
}

fn format_label(format: &str) -> &'static str {
    match format {
        "lino" => "Links Notation",
        "lino-min" => "Links Notation (minimal quoting)",
        "lino-line" => "Links Notation (single line)",
        "json" => "JSON (indented)",
        "json-compact" => "JSON (compact)",
        "yaml" => "YAML",
        "xml" => "XML (indented)",
        "csv" => "CSV (reference floor)",
        _ => "unknown",
    }
}

/// One table of totals over a set of datasets.
fn totals_table(results: &[DatasetResult], out: &mut String) {
    let baseline = total(results, BASELINE);
    let compact = total(results, COMPACT_BASELINE);

    out.push_str("| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |\n");
    out.push_str("| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n");

    for format in FORMATS {
        let Some(metrics) = total(results, format) else {
            continue;
        };
        let partial = if covers_all(results, format) {
            ""
        } else {
            " *"
        };
        let against_baseline = baseline
            .map(|base| percent(savings(metrics.tokens_o200k, base.tokens_o200k)))
            .unwrap_or_else(|| "-".to_string());
        let against_compact = compact
            .map(|base| percent(savings(metrics.tokens_o200k, base.tokens_o200k)))
            .unwrap_or_else(|| "-".to_string());
        let _ = writeln!(
            out,
            "| {}{} | {} | {} | {} | {} | {} | {} |",
            format_label(format),
            partial,
            metrics.tokens_o200k,
            metrics.tokens_cl100k,
            metrics.chars,
            metrics.bytes,
            against_baseline,
            against_compact,
        );
    }
}

/// Whether any format in this set is missing from some dataset, which the
/// tables mark with an asterisk and this footnote explains.
fn needs_partial_note(results: &[DatasetResult]) -> bool {
    FORMATS
        .iter()
        .any(|format| total(results, format).is_some() && !covers_all(results, format))
}

fn partial_note(results: &[DatasetResult], out: &mut String) {
    if needs_partial_note(results) {
        out.push_str(
            "\n\\* Not available for every dataset in this group, so its total covers fewer datasets than the others.\n",
        );
    }
}

/// Build the Markdown report.
pub fn markdown(results: &[DatasetResult], generated_at_version: &str) -> String {
    let mut out = String::new();

    out.push_str("# Token efficiency benchmarks\n\n");
    let _ = writeln!(
        out,
        "How much of a model's context each format spends on the same information. \
         Links Notation is compared against JSON, YAML, XML and CSV over {} datasets \
         that cover the shapes real payloads have: uniform records, semi-uniform records, \
         nested records, deeply nested configuration, keyed maps and tuples.\n",
        results.len()
    );
    out.push_str(
        "> This file is generated. Run `cargo run -p links-notation-benchmark --release` \
         from the `rust` directory to rebuild it; CI regenerates it on every push to `main` \
         and commits it when it changes.\n\n",
    );

    out.push_str("## What is measured\n\n");
    out.push_str(
        "Every representation is produced from the same source dataset by the benchmark \
         itself, so no format silently carries less information than another. Each document \
         is then measured four ways:\n\n\
         - **Tokens (o200k)** - the `o200k_base` encoding, used by GPT-5, GPT-4.1 and GPT-4o. \
         This is the headline number: it is what a document costs in a context window.\n\
         - **Tokens (cl100k)** - the `cl100k_base` encoding, used by GPT-4 and GPT-3.5, so a \
         result that depends on one vocabulary is visible as such.\n\
         - **Characters** - Unicode scalar values of the UTF-8 text.\n\
         - **Bytes** - the length of the UTF-8 text.\n\n",
    );
    out.push_str(
        "Links Notation appears in three rows because a writer has a real choice to make. \
         **Links Notation** is what `lino-objects-codec` writes today: every string is \
         quoted, so a reader never has to know the resolution rules to tell text from a \
         number. **Links Notation (minimal quoting)** quotes a string only where writing it \
         bare would read back as something else, which is the rule YAML plain scalars follow \
         and therefore the like-for-like comparison against YAML. **Links Notation (single \
         line)** is the one-line form. All three decode back to the same value; the \
         difference is how much the writer pays for making the types obvious in the text.\n\n",
    );

    out.push_str("## Totals across all datasets\n\n");
    totals_table(results, &mut out);
    partial_note(results, &mut out);

    out.push_str("\n## Totals by data shape\n\n");
    let mut groups: BTreeMap<&str, Vec<DatasetResult>> = BTreeMap::new();
    for result in results {
        groups
            .entry(result.structure.as_str())
            .or_default()
            .push(result.clone());
    }
    for (structure, group) in &groups {
        let names: Vec<&str> = group.iter().map(|result| result.name.as_str()).collect();
        let _ = writeln!(
            out,
            "### {} ({})\n",
            shape_label(structure),
            names.join(", ")
        );
        totals_table(group, &mut out);
        partial_note(group, &mut out);
        out.push('\n');
    }

    out.push_str("## Per dataset\n\n");
    for result in results {
        let _ = writeln!(out, "### {}\n", result.name);
        let _ = writeln!(
            out,
            "{}. Shape: {}. Source: [`datasets/{}.json`](datasets/{}.json).\n",
            result.description,
            shape_label(&result.structure),
            result.name,
            result.name
        );
        totals_table(std::slice::from_ref(result), &mut out);
        out.push('\n');
    }

    out.push_str("## How the numbers are kept honest\n\n");
    out.push_str(
        "- **One source of truth.** `benchmarks/datasets/` holds the data; every other \
         representation is derived from it. A dataset cannot gain a field in one format and \
         lose it in another.\n\
         - **Round-trip checked.** All three Links Notation forms and the compact JSON are \
         decoded back and compared with the source value before any number is reported. A \
         document that loses information is a failure, not a smaller number.\n\
         - **Parsed by the real parser.** Every `.lino` document is parsed by the \
         `links-notation` crate, so the benchmark measures notation the implementation \
         actually accepts.\n\
         - **Checked by real libraries.** `benchmarks/tools/verify-representations.mjs` parses \
         the generated YAML and XML with established third-party parsers and compares the \
         result with the source dataset.\n\
         - **Reproduced in every language.** All seven supported languages parse every \
         generated Links Notation document with their own implementation and re-count every \
         document with their own tokenizer, then fail unless every number matches the ones \
         reported here. The seven results files under `benchmarks/results/` differ only in \
         which language wrote them.\n\
         - **CSV is a floor, not a rival.** It cannot carry nesting, types or the key a table \
         sits under, so it is reported only for genuinely tabular datasets and only as a \
         reference.\n\n",
    );

    out.push_str("## What this does not measure\n\n");
    out.push_str(
        "- **Whether a model reads the format correctly.** Fewer tokens is a cost, not a \
         capability. Choosing a format for a task also needs an accuracy measurement against \
         the models in question, which needs paid inference and is deliberately not run \
         here; nothing in this report is evidence that one format is understood \
         better than another.\n\
         - **Vocabularies outside OpenAI's.** Both encodings are OpenAI BPE, because those \
         are the two a tokenizer exists for in all seven implementations, and cross-language \
         agreement is what keeps these numbers honest. Anthropic, Google and Meta models \
         segment text differently, so the percentages would move on them.\n\
         - **The rest of the prompt.** Only the document is counted: no system prompt, no \
         code fence, no schema description and no instructions. Those add a cost every \
         format pays alike.\n\
         - **Speed and memory.** This is a size benchmark. How fast each format parses is a \
         separate question with a separate answer.\n\n",
    );

    let _ = writeln!(
        out,
        "Generated by `links-notation-benchmark` against `links-notation` {generated_at_version}."
    );

    out
}

fn shape_label(structure: &str) -> &'static str {
    match structure {
        "uniform" => "Uniform records",
        "semi-uniform" => "Semi-uniform records",
        "nested" => "Nested records",
        "deeply-nested" => "Deeply nested",
        "keyed" => "Keyed maps",
        "tuples" => "Tuples",
        _ => "Other",
    }
}
