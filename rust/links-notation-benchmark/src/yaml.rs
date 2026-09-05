//! YAML 1.2 block-style emitter used to build the YAML baseline.
//!
//! The baseline has to be the YAML a real emitter writes, otherwise the
//! comparison measures this file's verbosity instead of the format's. The
//! output therefore follows the conventions of the widely used emitters: block
//! style, two-space indentation, compact sequence items (`- key: value`), and
//! plain scalars wherever the YAML core schema reads them back unchanged.
//!
//! `benchmarks/tools/verify-representations.mjs` parses the result with the
//! `yaml` package and compares it to the source dataset, so a scalar quoted too
//! little - or a document indented wrongly - fails the build rather than
//! quietly shrinking the baseline.

use serde_json::Value;

const INDENT: &str = "  ";

/// Encode a JSON value as a YAML 1.2 block-style document.
pub fn encode(value: &Value) -> String {
    let lines = block_lines(value, 0);
    if lines.is_empty() {
        return format!("{}\n", inline_scalar(value));
    }
    format!("{}\n", lines.join("\n"))
}

/// The lines of a container, each already carrying its indentation.
/// A scalar has no lines of its own; it is written by its parent.
fn block_lines(value: &Value, level: usize) -> Vec<String> {
    match value {
        Value::Object(entries) if !entries.is_empty() => {
            let mut lines = Vec::new();
            for (key, child) in entries {
                let prefix = format!("{}{}:", pad(level), format_key(key));
                match inline_form(child) {
                    Some(scalar) => lines.push(format!("{prefix} {scalar}")),
                    None => {
                        lines.push(prefix);
                        lines.extend(block_lines(child, level + 1));
                    }
                }
            }
            lines
        }
        Value::Array(items) if !items.is_empty() => {
            let mut lines = Vec::new();
            for item in items {
                match inline_form(item) {
                    Some(scalar) => lines.push(format!("{}- {scalar}", pad(level))),
                    None => {
                        // A sequence item that is a container starts on the
                        // dash line, which is what block emitters do by default.
                        let child = block_lines(item, level + 1);
                        let head = child[0]
                            .strip_prefix(&pad(level + 1))
                            .expect("child lines carry their indentation");
                        lines.push(format!("{}- {head}", pad(level)));
                        lines.extend(child.into_iter().skip(1));
                    }
                }
            }
            lines
        }
        _ => Vec::new(),
    }
}

/// The one-line form of a value, or `None` when it needs a block of its own.
fn inline_form(value: &Value) -> Option<String> {
    match value {
        Value::Object(entries) if entries.is_empty() => Some("{}".to_string()),
        Value::Array(items) if items.is_empty() => Some("[]".to_string()),
        Value::Object(_) | Value::Array(_) => None,
        scalar => Some(inline_scalar(scalar)),
    }
}

fn inline_scalar(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(flag) => flag.to_string(),
        Value::Number(number) => number.to_string(),
        Value::String(text) => format_string(text),
        _ => String::new(),
    }
}

fn pad(level: usize) -> String {
    INDENT.repeat(level)
}

fn format_key(key: &str) -> String {
    format_string(key)
}

/// Write a string plainly when the YAML core schema reads it back as that same
/// string, and single-quote it otherwise. Single quotes are enough for every
/// text without control characters, and they cost one character less to escape
/// than the double-quoted style.
fn format_string(value: &str) -> String {
    if is_plain_safe(value) {
        return value.to_string();
    }
    if value.chars().any(|character| character.is_control()) {
        return format!("\"{}\"", escape_double_quoted(value));
    }
    format!("'{}'", value.replace('\'', "''"))
}

/// Whether a string can be written as a plain scalar: it must not be empty,
/// must not start or end with a space, must not open with an indicator
/// character, must not hold `: ` or ` #`, and must not resolve to a value of
/// another type under the core schema.
fn is_plain_safe(value: &str) -> bool {
    if value.is_empty() || value.trim() != value {
        return false;
    }
    if value.chars().any(|character| character.is_control()) {
        return false;
    }
    let first = value.chars().next().expect("non-empty");
    if "-?:,[]{}#&*!|>'\"%@`".contains(first) {
        return false;
    }
    if value.contains(": ") || value.ends_with(':') || value.contains(" #") {
        return false;
    }
    !resolves_to_non_string(value)
}

/// Whether the YAML core schema reads this text as a null, a boolean or a
/// number rather than as a string.
fn resolves_to_non_string(value: &str) -> bool {
    if matches!(
        value,
        "null" | "Null" | "NULL" | "~" | "true" | "True" | "TRUE" | "false" | "False" | "FALSE"
    ) {
        return true;
    }
    let core_number = value.strip_prefix(['+', '-']).unwrap_or(value);
    if core_number.is_empty() {
        return false;
    }
    if core_number.parse::<f64>().is_ok() {
        return true;
    }
    // The core schema also reads octal and hexadecimal integers.
    core_number.starts_with("0o") || core_number.starts_with("0x")
}

fn escape_double_quoted(value: &str) -> String {
    let mut out = String::new();
    for character in value.chars() {
        match character {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            control if control.is_control() => out.push_str(&format!("\\x{:02x}", control as u32)),
            plain => out.push(plain),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn writes_nested_mappings_as_blocks() {
        let value = json!({ "server": { "host": "127.0.0.1", "port": 18878 } });
        assert_eq!(
            encode(&value),
            "server:\n  host: 127.0.0.1\n  port: 18878\n"
        );
    }

    #[test]
    fn starts_a_sequence_item_on_the_dash_line() {
        let value = json!({ "rows": [{ "a": 1, "b": 2 }, { "a": 3, "b": 4 }] });
        assert_eq!(
            encode(&value),
            "rows:\n  - a: 1\n    b: 2\n  - a: 3\n    b: 4\n"
        );
    }

    #[test]
    fn quotes_text_that_would_read_back_as_another_type() {
        let value = json!({ "version": "1.3", "postalCode": "54321", "flag": "true" });
        assert_eq!(
            encode(&value),
            "version: '1.3'\npostalCode: '54321'\nflag: 'true'\n"
        );
    }

    #[test]
    fn leaves_dates_and_timestamps_plain() {
        let value = json!({ "at": "2026-01-01T00:00:00Z", "on": "2026-01-01" });
        assert_eq!(encode(&value), "at: 2026-01-01T00:00:00Z\non: 2026-01-01\n");
    }

    #[test]
    fn keeps_empty_containers_on_one_line() {
        let value = json!({ "tags": [], "meta": {} });
        assert_eq!(encode(&value), "tags: []\nmeta: {}\n");
    }

    #[test]
    fn writes_nested_sequences_of_scalars() {
        let value = json!([["a", "b"], ["c", "d"]]);
        assert_eq!(encode(&value), "- - a\n  - b\n- - c\n  - d\n");
    }
}
