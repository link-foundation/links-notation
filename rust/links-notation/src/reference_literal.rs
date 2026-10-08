//! Version 1 lossless UTF-8 reference literals, with readable legacy quoting.

/// Encodes exact Unicode text as a version 1 UTF-8 hexadecimal reference.
pub fn encode_reference_literal(text: &str) -> String {
    use std::fmt::Write;
    let mut result = String::with_capacity(text.len() * 2 + 4);
    result.push_str("~1{");
    for byte in text.bytes() {
        write!(result, "{byte:02x}").expect("writing to a string cannot fail");
    }
    result.push('}');
    result
}

/// Decodes a complete literal, rejecting malformed UTF-8 and unsupported versions.
pub fn decode_reference_literal(literal: &str) -> Result<String, &'static str> {
    let prefix = prefix_end(literal).ok_or("invalid reference literal")?;
    if &literal[..prefix] != "~1{" || !literal.ends_with('}') {
        return Err("invalid or unsupported reference literal");
    }
    let hex = &literal[prefix..literal.len() - 1];
    if !hex.len().is_multiple_of(2) || !hex.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("reference literal requires an even number of hex digits");
    }
    let bytes = (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).expect("validated hex"))
        .collect();
    String::from_utf8(bytes).map_err(|_| "reference literal must contain valid UTF-8")
}

pub(crate) fn prefix_end(text: &str) -> Option<usize> {
    let bytes = text.as_bytes();
    if bytes.first() != Some(&b'~') {
        return None;
    }
    let mut position = 1;
    while bytes.get(position).is_some_and(u8::is_ascii_digit) {
        position += 1;
    }
    (position > 1 && bytes.get(position) == Some(&b'{')).then_some(position + 1)
}

pub(crate) fn format_reference(text: &str) -> String {
    if text.is_empty() || text.chars().any(|c| c < ' ' || c == '\u{7f}') {
        return encode_reference_literal(text);
    }
    if prefix_end(text).is_none()
        && !text.starts_with('#')
        && !text.chars().any(|c| {
            c.is_whitespace() || matches!(c, '\u{feff}' | '(' | ')' | ':' | '\'' | '"' | '`')
        })
    {
        return text.to_string();
    }
    let first = text.chars().next();
    let (quote, count) = ['\'', '"', '`']
        .into_iter()
        .filter(|&quote| first != Some(quote))
        .map(|quote| {
            let (mut longest, mut current) = (0, 0);
            for c in text.chars() {
                current = if c == quote { current + 1 } else { 0 };
                longest = longest.max(current);
            }
            (quote, (longest + 1) | 1)
        })
        .min_by_key(|&(_, count)| count)
        .expect("at least two eligible delimiters");
    let delimiter = quote.to_string().repeat(count);
    format!("{delimiter}{text}{delimiter}")
}
