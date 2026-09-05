//! XML emitter used to build the XML baseline.
//!
//! JSON has no single canonical XML projection, so this module uses the
//! mechanical mapping the common converters use, and documents it here so the
//! numbers can be reproduced:
//!
//! * the document is wrapped in a single `<root>` element;
//! * an object writes one child element per entry, named after the key;
//! * an array under a key repeats that key's element once per item, which is
//!   how XML expresses repetition without an extra container;
//! * an array item that is itself an array, or an item of a root-level array,
//!   is written as `<item>`, because it has no key to be named after;
//! * `null`, an empty object and an empty array are the empty element `<key/>`;
//!   an empty array keeps its element rather than disappearing, so the XML
//!   carries the same keys as every other representation.
//!
//! The output is indented with two spaces, so it is compared against the other
//! indented documents rather than against a minified one.

use serde_json::Value;

const INDENT: &str = "  ";

/// Encode a JSON value as an indented XML document wrapped in `<root>`.
pub fn encode(value: &Value) -> String {
    let mut out = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    // The document has exactly one root, so the root value is written as a
    // single element even when it is an array.
    write_single("root", value, 0, &mut out);
    out
}

/// Write an element for a value. An array repeats the element once per item.
fn write_element(name: &str, value: &Value, level: usize, out: &mut String) {
    match value {
        // An empty array would repeat the element zero times and take the key
        // out of the document, so it is written as one empty element instead.
        Value::Array(items) if !items.is_empty() => {
            for item in items {
                write_single(name, item, level, out);
            }
        }
        single => write_single(name, single, level, out),
    }
}

/// Write exactly one element, whatever the value is.
fn write_single(name: &str, value: &Value, level: usize, out: &mut String) {
    let pad = INDENT.repeat(level);
    match value {
        Value::Null => out.push_str(&format!("{pad}<{name}/>\n")),
        Value::Object(entries) if entries.is_empty() => {
            out.push_str(&format!("{pad}<{name}/>\n"));
        }
        Value::Object(entries) => {
            out.push_str(&format!("{pad}<{name}>\n"));
            for (key, child) in entries {
                write_element(key, child, level + 1, out);
            }
            out.push_str(&format!("{pad}</{name}>\n"));
        }
        Value::Array(items) if items.is_empty() => {
            out.push_str(&format!("{pad}<{name}/>\n"));
        }
        Value::Array(items) => {
            // An array with no key of its own names its items `<item>`.
            out.push_str(&format!("{pad}<{name}>\n"));
            for item in items {
                write_single("item", item, level + 1, out);
            }
            out.push_str(&format!("{pad}</{name}>\n"));
        }
        scalar => {
            out.push_str(&format!(
                "{pad}<{name}>{}</{name}>\n",
                escape(&text_of(scalar))
            ));
        }
    }
}

fn text_of(value: &Value) -> String {
    match value {
        Value::Bool(flag) => flag.to_string(),
        Value::Number(number) => number.to_string(),
        Value::String(text) => text.clone(),
        _ => String::new(),
    }
}

fn escape(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for character in text.chars() {
        match character {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
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
    fn repeats_the_key_element_for_an_array() {
        let value = json!({ "employees": [{ "id": 1 }, { "id": 2 }] });
        assert_eq!(
            encode(&value),
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<root>\n  <employees>\n    <id>1</id>\n  </employees>\n  <employees>\n    <id>2</id>\n  </employees>\n</root>\n"
        );
    }

    #[test]
    fn wraps_a_root_array_in_one_root_element() {
        let value = json!([["a", "b"], ["c", "d"]]);
        assert_eq!(
            encode(&value),
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<root>\n  <item>\n    <item>a</item>\n    <item>b</item>\n  </item>\n  <item>\n    <item>c</item>\n    <item>d</item>\n  </item>\n</root>\n"
        );
    }

    #[test]
    fn keeps_the_key_of_an_empty_array() {
        let value = json!({ "tags": [] });
        assert!(encode(&value).contains("<tags/>"));
    }

    #[test]
    fn escapes_markup_characters() {
        let value = json!({ "note": "a < b & c > d" });
        assert!(encode(&value).contains("<note>a &lt; b &amp; c &gt; d</note>"));
    }
}
