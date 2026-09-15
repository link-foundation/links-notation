//! CSV emitter, used only where CSV can carry the data at all.
//!
//! CSV is the floor of a token comparison: it writes each field name once and
//! nothing else, but it also cannot carry nesting, cannot carry types, and
//! cannot carry the key a table sits under. It is therefore reported as a
//! reference floor rather than as an interchangeable format, and only for the
//! datasets that are genuinely tabular:
//!
//! * an array of objects that all share the same keys and hold only scalars;
//! * an array of equal-length arrays of scalars;
//! * an object with exactly one entry whose value is one of those, in which
//!   case the entry's key is not written and the row set is what remains.

use serde_json::Value;

/// Encode a value as RFC 4180 CSV, or `None` when CSV cannot carry it.
pub fn encode(value: &Value) -> Option<String> {
    let rows = tabular_rows(value)?;
    Some(rows.join("\r\n") + "\r\n")
}

fn tabular_rows(value: &Value) -> Option<Vec<String>> {
    match value {
        Value::Object(entries) if entries.len() == 1 => {
            let (_, inner) = entries.iter().next().expect("one entry");
            tabular_rows(inner)
        }
        Value::Array(items) if !items.is_empty() => {
            rows_of_objects(items).or_else(|| rows_of_arrays(items))
        }
        _ => None,
    }
}

fn rows_of_objects(items: &[Value]) -> Option<Vec<String>> {
    let Value::Object(first) = &items[0] else {
        return None;
    };
    let header: Vec<String> = first.keys().cloned().collect();

    let mut rows = vec![join(&header)];
    for item in items {
        let Value::Object(entries) = item else {
            return None;
        };
        if entries.len() != header.len() {
            return None;
        }
        let mut fields = Vec::with_capacity(header.len());
        for key in &header {
            let field = entries.get(key)?;
            fields.push(scalar_text(field)?);
        }
        rows.push(join(&fields));
    }
    Some(rows)
}

fn rows_of_arrays(items: &[Value]) -> Option<Vec<String>> {
    let Value::Array(first) = &items[0] else {
        return None;
    };
    let width = first.len();
    let mut rows = Vec::with_capacity(items.len());
    for item in items {
        let Value::Array(cells) = item else {
            return None;
        };
        if cells.len() != width {
            return None;
        }
        let mut fields = Vec::with_capacity(width);
        for cell in cells {
            fields.push(scalar_text(cell)?);
        }
        rows.push(join(&fields));
    }
    Some(rows)
}

fn scalar_text(value: &Value) -> Option<String> {
    match value {
        Value::Null => Some(String::new()),
        Value::Bool(flag) => Some(flag.to_string()),
        Value::Number(number) => Some(number.to_string()),
        Value::String(text) => Some(text.clone()),
        _ => None,
    }
}

fn join(fields: &[String]) -> String {
    fields
        .iter()
        .map(|field| quote(field))
        .collect::<Vec<_>>()
        .join(",")
}

fn quote(field: &str) -> String {
    if field.contains([',', '"', '\r', '\n']) {
        return format!("\"{}\"", field.replace('"', "\"\""));
    }
    field.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn writes_a_header_once_for_uniform_records() {
        let value = json!({ "rows": [{ "a": 1, "b": "x" }, { "a": 2, "b": "y" }] });
        assert_eq!(encode(&value).unwrap(), "a,b\r\n1,x\r\n2,y\r\n");
    }

    #[test]
    fn writes_tuples_without_a_header() {
        let value = json!([["papa", "lovesMama"], ["son", "hasCar"]]);
        assert_eq!(encode(&value).unwrap(), "papa,lovesMama\r\nson,hasCar\r\n");
    }

    #[test]
    fn refuses_nested_and_ragged_data() {
        assert!(encode(&json!({ "rows": [{ "a": { "b": 1 } }] })).is_none());
        assert!(encode(&json!([["a"], ["b", "c"]])).is_none());
        assert!(encode(&json!({ "site": "x", "rows": [{ "a": 1 }] })).is_none());
    }

    #[test]
    fn quotes_fields_holding_a_separator() {
        let value = json!([["a,b", "c\"d"]]);
        assert_eq!(encode(&value).unwrap(), "\"a,b\",\"c\"\"d\"\r\n");
    }
}
