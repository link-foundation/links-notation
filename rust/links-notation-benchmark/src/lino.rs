//! Links Notation object serialization, as `lino-objects-codec` defines it.
//!
//! The benchmark measures the notation people actually write and read, so this
//! module is a faithful port of the readable form of the `lino-objects-codec`
//! package rather than a shape invented to win a comparison. Two forms exist:
//!
//! * [`encode`] - the indented form, one value per line;
//! * [`encode_line`] - the single-line form, where an object names itself with
//!   the `o:` link id because line breaks can no longer separate records.
//!
//! [`decode`] reads the indented form back. The benchmark runs it over every
//! document it generates and refuses to report a number for a document that
//! does not decode back to the value it came from, which is what keeps the
//! comparison between formats a comparison of the same information.

use serde_json::{Map, Number, Value};

/// Indentation used per nesting level, matching the codec's default.
const INDENT: &str = "  ";

/// Link id naming an object in the single-line form, written as `(o: ...)`.
const OBJECT_MARKER: &str = "o";

/// Marker of a string whose unwritable characters are percent-escaped.
const ESCAPED_MARKER: &str = "escaped";

/// Marker of a base64 payload, written by `encodeCompact` and still read here.
const BASE64_MARKER: &str = "base64";

/// How much of a document's text is quoted.
///
/// Both modes write the same information: the benchmark decodes every document
/// it produces and refuses to report a number unless the value that comes back
/// is the value that went in.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Quoting {
    /// Quote every string, which is what `lino-objects-codec` writes today.
    /// A reader never has to know the resolution rules to see that a value is
    /// text.
    Always,
    /// Quote a string only where writing it bare would read back as something
    /// else - the rule YAML plain scalars follow. `papa` stays bare; `40`,
    /// `true` and `a b` are quoted.
    Minimal,
}

/// The form being written: a value may hold a line break in only one of them.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Form {
    /// One value per line, so a string may carry a newline of its own.
    Indented,
    /// One record per line, so a newline has to be escaped.
    Line,
}

/// Encode a JSON value into the indented Links Notation form.
pub fn encode_with(value: &Value, quoting: Quoting) -> String {
    let mut out = String::new();
    write_value(value, 0, quoting, &mut out);
    out
}

/// Encode a JSON value in the form that suits its shape.
///
/// A list of links - an array whose every element is an array of references -
/// is what Links Notation exists for, and its canonical form writes one link
/// per line: `(papa lovesMama)`. Writing such a list as an indented tree would
/// spend four lines on a doublet and measure a layout nobody writes. Every
/// other shape is written as the indented form.
///
/// Both forms are read back by the same [`decode`], and the benchmark checks
/// that they decode to the value they came from, so the choice of layout can
/// never change what a document means.
pub fn encode_document(value: &Value, quoting: Quoting) -> String {
    if let Some(links) = as_link_list(value) {
        return links
            .iter()
            .map(|link| encode_line_with(link, quoting))
            .collect::<Vec<_>>()
            .join("\n");
    }
    encode_with(value, quoting)
}

/// The links of a list of links, or `None` when the value is another shape.
///
/// A list of one link is excluded: a document holding a single value is that
/// value, so `(papa lovesMama)` alone would read back as the link rather than
/// as a list holding it.
fn as_link_list(value: &Value) -> Option<&Vec<Value>> {
    let Value::Array(items) = value else {
        return None;
    };
    let is_link = |item: &Value| match item {
        Value::Array(cells) => {
            !cells.is_empty()
                && cells
                    .iter()
                    .all(|cell| !cell.is_array() && !cell.is_object())
        }
        _ => false,
    };
    (items.len() > 1 && items.iter().all(is_link)).then_some(items)
}

/// Encode a JSON value into the readable, single-line Links Notation form,
/// quoting every string the way `lino-objects-codec` does.
pub fn encode_line(value: &Value) -> String {
    encode_line_with(value, Quoting::Always)
}

/// Encode a JSON value into the single-line form with the chosen quoting.
pub fn encode_line_with(value: &Value, quoting: Quoting) -> String {
    let mut out = String::new();
    write_line_value(value, quoting, &mut out);
    out
}

fn write_value(value: &Value, level: usize, quoting: Quoting, out: &mut String) {
    match value {
        Value::Array(items) => {
            write_rows(items.len(), level, out, |index, out| {
                write_value(&items[index], level + 1, quoting, out);
            });
        }
        Value::Object(entries) => {
            if entries.is_empty() {
                // An empty object spans two lines; `()` on one line is an empty array.
                out.push_str("(\n");
                push_indent(level, out);
                out.push(')');
                return;
            }
            let pairs: Vec<(&String, &Value)> = entries.iter().collect();
            write_rows(pairs.len(), level, out, |index, out| {
                let (key, child) = pairs[index];
                out.push_str(&format_key(key, Form::Indented, quoting));
                out.push(' ');
                write_value(child, level + 1, quoting, out);
            });
        }
        scalar => out.push_str(&format_scalar(scalar, Form::Indented, quoting)),
    }
}

fn write_line_value(value: &Value, quoting: Quoting, out: &mut String) {
    match value {
        Value::Array(items) => {
            out.push('(');
            for (index, item) in items.iter().enumerate() {
                if index > 0 {
                    out.push(' ');
                }
                write_line_value(item, quoting, out);
            }
            out.push(')');
        }
        Value::Object(entries) => {
            if entries.is_empty() {
                // `()` is the empty array, so the empty object keeps its marker.
                out.push_str(&format!("({OBJECT_MARKER}:)"));
                return;
            }
            out.push_str(&format!("({OBJECT_MARKER}:"));
            for (key, child) in entries {
                out.push_str(&format!(" ({} ", format_key(key, Form::Line, quoting)));
                write_line_value(child, quoting, out);
                out.push(')');
            }
            out.push(')');
        }
        scalar => out.push_str(&format_scalar(scalar, Form::Line, quoting)),
    }
}

/// Write a container as `(`, one indented line per item, then `)`.
/// An empty container collapses to `()`, which reads back as an empty array.
fn write_rows<F>(count: usize, level: usize, out: &mut String, mut write_item: F)
where
    F: FnMut(usize, &mut String),
{
    if count == 0 {
        out.push_str("()");
        return;
    }
    out.push('(');
    for index in 0..count {
        out.push('\n');
        push_indent(level + 1, out);
        write_item(index, out);
    }
    out.push('\n');
    push_indent(level, out);
    out.push(')');
}

fn push_indent(level: usize, out: &mut String) {
    for _ in 0..level {
        out.push_str(INDENT);
    }
}

/// Format a scalar. Strings are quoted and everything else stays bare, so the
/// type a value was written with survives the round trip.
fn format_scalar(value: &Value, form: Form, quoting: Quoting) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(flag) => flag.to_string(),
        Value::Number(number) => format_number(number),
        Value::String(text) => format_string(text, form, quoting),
        _ => unreachable!("containers are written by write_value"),
    }
}

/// Write a number the way JavaScript's `String(value)` does, which is the form
/// the codec writes and therefore the form that decodes back unchanged.
fn format_number(number: &Number) -> String {
    number.to_string()
}

fn format_string(value: &str, form: Form, quoting: Quoting) -> String {
    match escape_unwritable(value, form) {
        None if quoting == Quoting::Minimal && reads_back_bare(value) => value.to_string(),
        None => quote(value),
        Some(escaped) => format!("({ESCAPED_MARKER} {})", quote(&escaped)),
    }
}

/// Whether writing this text without quotes reads back as that same text.
///
/// A bare reference ends at whitespace, a parenthesis, a colon - the grammar
/// spends it on link ids, see `is_reference_char` in the parser - or a quote,
/// so a string holding one of those has to be quoted. What is left has to
/// survive the reader's own rules: `40` would come back as a number, `true` as
/// a boolean, and the two link ids the format reserves would turn their link
/// into something else.
fn reads_back_bare(value: &str) -> bool {
    if value.is_empty() {
        return false;
    }
    if value.chars().any(|character| {
        character.is_whitespace() || matches!(character, '(' | ')' | ':' | '"' | '\'' | '`')
    }) {
        return false;
    }
    if matches!(value, ESCAPED_MARKER | BASE64_MARKER) {
        return false;
    }
    matches!(reference_to_value(value, false), Value::String(text) if text == value)
}

/// Percent-escape the characters this form cannot carry, or `None` when the
/// text can be written as it is. `%` is escaped too, so escaping is reversible.
fn escape_unwritable(value: &str, form: Form) -> Option<String> {
    if !value
        .chars()
        .any(|character| is_unwritable(character, form))
    {
        return None;
    }
    let mut out = String::new();
    for character in value.chars() {
        if character != '%' && !is_unwritable(character, form) {
            out.push(character);
            continue;
        }
        let mut buffer = [0u8; 4];
        for byte in character.encode_utf8(&mut buffer).as_bytes() {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    Some(out)
}

/// Whether a character has to be escaped. A tab is text a reader can see, and
/// so is a newline in the indented form; a carriage return is escaped because
/// CRLF normalisation rewrites it, and the other control characters because
/// they are not text at all.
fn is_unwritable(character: char, form: Form) -> bool {
    let code = character as u32;
    if !(code <= 0x1f || (0x7f..=0x9f).contains(&code)) {
        return false;
    }
    if character == '\t' {
        return false;
    }
    if character == '\n' {
        return form == Form::Line;
    }
    true
}

/// Quote a value so that both this reader and the notation's own parser read it
/// back unchanged. One delimiter is enough while the text holds none of that
/// kind; when it holds both kinds, a run of at least three opens the n-quote
/// form, where the text is literal and only a longer run closes it.
pub(crate) fn quote(value: &str) -> String {
    if !value.contains('"') {
        return format!("\"{value}\"");
    }
    if !value.contains('\'') {
        return format!("'{value}'");
    }
    let delimiter = if value.starts_with('"') { '\'' } else { '"' };
    let count = (longest_run(value, delimiter) + 1).max(3);
    let run: String = delimiter.to_string().repeat(count);
    format!("{run}{value}{run}")
}

fn longest_run(value: &str, character: char) -> usize {
    let mut longest = 0;
    let mut current = 0;
    for candidate in value.chars() {
        current = if candidate == character {
            current + 1
        } else {
            0
        };
        longest = longest.max(current);
    }
    longest
}

/// Characters that force an object key to be quoted.
fn key_needs_quotes(key: &str) -> bool {
    key.chars().any(|character| {
        character.is_whitespace()
            || matches!(character, '(' | ')' | '\'' | ':' | '`' | '"')
            || (character as u32) <= 0x1f
            || (0x7f..=0x9f).contains(&(character as u32))
    })
}

/// Format an object key. Keys stay bare when they read as plain identifiers.
fn format_key(key: &str, form: Form, quoting: Quoting) -> String {
    let plain =
        !key.is_empty() && key != BASE64_MARKER && key != ESCAPED_MARKER && !key_needs_quotes(key);
    if plain {
        key.to_string()
    } else {
        format_string(key, form, quoting)
    }
}

// === Decoding ===

#[derive(Debug, Clone, PartialEq)]
enum Token {
    Open,
    Close,
    Newline,
    Ref { value: String, quoted: bool },
}

#[derive(Debug, Clone)]
enum Node {
    Reference {
        value: String,
        quoted: bool,
    },
    Link {
        rows: Vec<Vec<Node>>,
        multiline: bool,
        object: bool,
    },
}

/// Decode the readable, indented Links Notation form back into a JSON value.
pub fn decode(text: &str) -> Result<Value, String> {
    let tokens = tokenize(text)?;
    let mut cursor = Cursor {
        tokens: &tokens,
        position: 0,
    };
    let rows = cursor.parse_rows(true)?;
    if cursor.position < tokens.len() {
        return Err("unexpected ')' in readable notation".to_string());
    }
    // A document holding a single value (for example `42`) is that value.
    if rows.len() == 1 && rows[0].len() == 1 {
        return node_to_value(&rows[0][0]);
    }
    rows_to_value(&rows, true, false)
}

fn tokenize(text: &str) -> Result<Vec<Token>, String> {
    let chars: Vec<char> = text.chars().collect();
    let mut tokens = Vec::new();
    let mut index = 0;

    while index < chars.len() {
        let character = chars[index];
        if character == '\n' {
            tokens.push(Token::Newline);
            index += 1;
        } else if character.is_whitespace() {
            index += 1;
        } else if character == '(' {
            tokens.push(Token::Open);
            index += 1;
        } else if character == ')' {
            tokens.push(Token::Close);
            index += 1;
        } else if matches!(character, '"' | '\'' | '`') {
            let (value, next) = read_quoted(&chars, index, character)?;
            tokens.push(Token::Ref {
                value,
                quoted: true,
            });
            index = next;
        } else {
            let start = index;
            while index < chars.len()
                && !chars[index].is_whitespace()
                && chars[index] != '('
                && chars[index] != ')'
                && !matches!(chars[index], '"' | '\'' | '`')
            {
                index += 1;
            }
            tokens.push(Token::Ref {
                value: chars[start..index].iter().collect(),
                quoted: false,
            });
        }
    }

    Ok(tokens)
}

/// Read a quoted reference. The opening run of delimiters says how it is read:
/// one delimiter makes a doubled delimiter literal, two are the empty value,
/// and three or more open the n-quote form, closed by a run at least as long.
fn read_quoted(chars: &[char], start: usize, quote_char: char) -> Result<(String, usize), String> {
    let opening = run_length(chars, start, quote_char);

    if opening == 2 {
        return Ok((String::new(), start + 2));
    }

    if opening == 1 {
        let mut value = String::new();
        let mut index = start + 1;
        while index < chars.len() {
            if chars[index] == quote_char {
                if chars.get(index + 1) == Some(&quote_char) {
                    value.push(quote_char);
                    index += 2;
                    continue;
                }
                return Ok((value, index + 1));
            }
            value.push(chars[index]);
            index += 1;
        }
        return Err(format!(
            "unterminated quoted value starting at character {start}"
        ));
    }

    let mut index = start + opening;
    while index < chars.len() {
        if chars[index] != quote_char {
            index += 1;
            continue;
        }
        let run = run_length(chars, index, quote_char);
        if run >= opening {
            let value: String = chars[start + opening..index + run - opening]
                .iter()
                .collect();
            return Ok((value, index + run));
        }
        index += run;
    }
    Err(format!(
        "unterminated quoted value starting at character {start}"
    ))
}

fn run_length(chars: &[char], start: usize, character: char) -> usize {
    let mut index = start;
    while index < chars.len() && chars[index] == character {
        index += 1;
    }
    index - start
}

struct Cursor<'a> {
    tokens: &'a [Token],
    position: usize,
}

impl Cursor<'_> {
    /// Parse rows until the matching `)`, or the end of input at the top level.
    /// A row is one line: the values written between two newlines.
    fn parse_rows(&mut self, top_level: bool) -> Result<Vec<Vec<Node>>, String> {
        let mut rows: Vec<Vec<Node>> = Vec::new();
        let mut row: Vec<Node> = Vec::new();

        while self.position < self.tokens.len() {
            match self.tokens[self.position] {
                Token::Close => {
                    if top_level {
                        break;
                    }
                    self.position += 1;
                    if !row.is_empty() {
                        rows.push(row);
                    }
                    return Ok(rows);
                }
                Token::Newline => {
                    self.position += 1;
                    if !row.is_empty() {
                        rows.push(std::mem::take(&mut row));
                    }
                }
                _ => row.push(self.parse_node()?),
            }
        }

        if !top_level {
            return Err("unterminated '(' in readable notation".to_string());
        }
        if !row.is_empty() {
            rows.push(row);
        }
        Ok(rows)
    }

    fn parse_node(&mut self) -> Result<Node, String> {
        match &self.tokens[self.position] {
            Token::Ref { value, quoted } => {
                let node = Node::Reference {
                    value: value.clone(),
                    quoted: *quoted,
                };
                self.position += 1;
                Ok(node)
            }
            Token::Open => {
                self.position += 1;
                let object = self.take_object_marker();
                let multiline = self.link_is_multiline();
                let rows = self.parse_rows(false)?;
                Ok(Node::Link {
                    rows,
                    multiline,
                    object,
                })
            }
            _ => Err("unexpected token in readable notation".to_string()),
        }
    }

    /// Consume the `o:` marker if the link that just opened carries one, which
    /// is how the single-line form says "this link is an object, not an array".
    fn take_object_marker(&mut self) -> bool {
        let marker = matches!(
            self.tokens.get(self.position),
            Some(Token::Ref { value, quoted: false }) if value == &format!("{OBJECT_MARKER}:")
        );
        if marker {
            self.position += 1;
        }
        marker
    }

    /// Whether the link that just opened spans more than one line, which tells
    /// an empty object (`(\n)`) from an empty array (`()`).
    fn link_is_multiline(&self) -> bool {
        for token in &self.tokens[self.position..] {
            match token {
                Token::Close => return false,
                Token::Newline => return true,
                _ => {}
            }
        }
        false
    }
}

fn node_to_value(node: &Node) -> Result<Value, String> {
    match node {
        Node::Reference { value, quoted } => Ok(reference_to_value(value, *quoted)),
        Node::Link {
            rows,
            multiline,
            object,
        } => rows_to_value(rows, *multiline, *object),
    }
}

fn rows_to_value(
    rows: &[Vec<Node>],
    multiline: bool,
    object_marker: bool,
) -> Result<Value, String> {
    if object_marker {
        return marked_object_to_value(rows);
    }

    if rows.is_empty() {
        return Ok(if multiline {
            Value::Object(Map::new())
        } else {
            Value::Array(Vec::new())
        });
    }

    if let Some(marked) = decode_marked_value(rows)? {
        return Ok(Value::String(marked));
    }

    // Written on one line, a link is a list of values: an object on one line
    // says so with the `o:` marker, which keeps `(key value)` unambiguous.
    if !multiline {
        return flatten_rows(rows);
    }

    // `key value` on every line makes an object; anything else is a list.
    let is_object = rows
        .iter()
        .all(|row| row.len() == 2 && node_to_key(&row[0]).is_some());

    if is_object {
        let mut result = Map::new();
        for row in rows {
            let key = node_to_key(&row[0]).expect("checked above");
            result.insert(key, node_to_value(&row[1])?);
        }
        return Ok(Value::Object(result));
    }

    flatten_rows(rows)
}

fn flatten_rows(rows: &[Vec<Node>]) -> Result<Value, String> {
    let mut items = Vec::new();
    for row in rows {
        for node in row {
            items.push(node_to_value(node)?);
        }
    }
    Ok(Value::Array(items))
}

/// Build the object a `(o: (key value) ...)` link describes. Every value in it
/// is a pair, so anything else is a malformed document rather than an array.
fn marked_object_to_value(rows: &[Vec<Node>]) -> Result<Value, String> {
    let mut result = Map::new();
    for node in rows.iter().flatten() {
        let Node::Link {
            rows: pair_rows,
            object: false,
            ..
        } = node
        else {
            return Err(format!(
                "an object marked '{OBJECT_MARKER}:' holds (key value) pairs, found a value that is not a pair"
            ));
        };
        if pair_rows.len() != 1 || pair_rows[0].len() != 2 {
            return Err(format!(
                "an object marked '{OBJECT_MARKER}:' holds (key value) pairs, found a malformed pair"
            ));
        }
        let row = &pair_rows[0];
        let key = node_to_key(&row[0]).ok_or_else(|| {
            format!(
                "an object marked '{OBJECT_MARKER}:' holds (key value) pairs, found a pair whose key is not text"
            )
        })?;
        result.insert(key, node_to_value(&row[1])?);
    }
    Ok(Value::Object(result))
}

/// The key a node in key position spells: a reference is the key itself, and a
/// marked link is the text its marker escapes.
fn node_to_key(node: &Node) -> Option<String> {
    match node {
        Node::Reference { value, .. } => Some(value.clone()),
        Node::Link { object: true, .. } => None,
        Node::Link { rows, .. } => decode_marked_value(rows).ok().flatten(),
    }
}

/// Recognise a marked value: `(escaped "...")`, whose text is written as it is
/// except for the percent-escaped characters, and `(base64 "...")`, which
/// versions up to 0.6.0 wrote and which is still read.
fn decode_marked_value(rows: &[Vec<Node>]) -> Result<Option<String>, String> {
    if rows.len() != 1 || rows[0].len() != 2 {
        return Ok(None);
    }
    let (
        Node::Reference {
            value: marker,
            quoted: false,
        },
        Node::Reference {
            value: payload,
            quoted: true,
        },
    ) = (&rows[0][0], &rows[0][1])
    else {
        return Ok(None);
    };
    if marker == ESCAPED_MARKER {
        return unescape(payload).map(Some);
    }
    if marker == BASE64_MARKER {
        return Err(
            "base64 payloads are written by encodeCompact, not by this benchmark".to_string(),
        );
    }
    Ok(None)
}

/// Undo the percent-escaping of an `(escaped "...")` payload. Escapes stand for
/// bytes, so a character outside ASCII is read back from its UTF-8 bytes.
fn unescape(payload: &str) -> Result<String, String> {
    let chars: Vec<char> = payload.chars().collect();
    let mut bytes: Vec<u8> = Vec::new();
    let mut index = 0;

    while index < chars.len() {
        if chars[index] != '%' {
            let mut buffer = [0u8; 4];
            bytes.extend_from_slice(chars[index].encode_utf8(&mut buffer).as_bytes());
            index += 1;
            continue;
        }
        if index + 2 >= chars.len() {
            return Err(format!(
                "truncated escape at character {index} of an escaped value"
            ));
        }
        let escape: String = chars[index + 1..index + 3].iter().collect();
        let byte = u8::from_str_radix(&escape, 16)
            .map_err(|_| format!("invalid escape '%{escape}' in an escaped value"))?;
        bytes.push(byte);
        index += 3;
    }

    String::from_utf8(bytes).map_err(|_| "invalid UTF-8 escaped value".to_string())
}

/// Convert a reference to a value. Quoted references are always strings; bare
/// references keep the type they were written with.
fn reference_to_value(value: &str, quoted: bool) -> Value {
    if quoted {
        return Value::String(value.to_string());
    }
    match value {
        "null" | "undefined" => return Value::Null,
        "true" => return Value::Bool(true),
        "false" => return Value::Bool(false),
        _ => {}
    }
    if looks_like_integer(value) {
        // JavaScript only keeps integers exactly up to 2^53 - 1, and the codec
        // leaves anything longer as text, so this reader does the same.
        if let Ok(integer) = value.parse::<i64>() {
            if integer.abs() <= 9_007_199_254_740_991 {
                return Value::Number(Number::from(integer));
            }
        }
        return Value::String(value.to_string());
    }
    if looks_like_number(value) {
        if let Some(number) = value.parse::<f64>().ok().and_then(Number::from_f64) {
            return Value::Number(number);
        }
    }
    Value::String(value.to_string())
}

/// `^[+-]?\d+$`, spelled out so the reader does not depend on a regular
/// expression engine and matches the codec character for character.
fn looks_like_integer(value: &str) -> bool {
    let digits = value.strip_prefix(['+', '-']).unwrap_or(value);
    !digits.is_empty() && digits.bytes().all(|byte| byte.is_ascii_digit())
}

/// `^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$`, spelled out for the same reason.
/// Rust's own float parser is more permissive - it reads `inf` and `NaN` - so
/// using it directly would make this reader disagree with the codec.
fn looks_like_number(value: &str) -> bool {
    let body = value.strip_prefix(['+', '-']).unwrap_or(value);
    let (mantissa, exponent) = match body.split_once(['e', 'E']) {
        Some((mantissa, exponent)) => (mantissa, Some(exponent)),
        None => (body, None),
    };
    if let Some(exponent) = exponent {
        let digits = exponent.strip_prefix(['+', '-']).unwrap_or(exponent);
        if digits.is_empty() || !digits.bytes().all(|byte| byte.is_ascii_digit()) {
            return false;
        }
    }
    let all_digits = |text: &str| text.bytes().all(|byte| byte.is_ascii_digit());
    match mantissa.split_once('.') {
        // `\d+\.?\d*` and `\.\d+`
        Some((whole, fraction)) => {
            if whole.is_empty() {
                !fraction.is_empty() && all_digits(fraction)
            } else {
                all_digits(whole) && all_digits(fraction)
            }
        }
        None => !mantissa.is_empty() && all_digits(mantissa),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn round_trip(value: Value) {
        let document = encode_with(&value, Quoting::Always);
        let decoded = decode(&document).expect("document decodes");
        assert_eq!(decoded, value, "document was:\n{document}");
    }

    #[test]
    fn encodes_a_nested_object_the_way_the_codec_does() {
        let value = json!({ "server": { "host": "127.0.0.1", "port": 18878 } });
        assert_eq!(
            encode_with(&value, Quoting::Always),
            "(\n  server (\n    host \"127.0.0.1\"\n    port 18878\n  )\n)"
        );
    }

    #[test]
    fn encodes_an_array_as_one_value_per_line() {
        let value = json!({ "models": ["claude-haiku", "claude-opus"] });
        assert_eq!(
            encode_with(&value, Quoting::Always),
            "(\n  models (\n    \"claude-haiku\"\n    \"claude-opus\"\n  )\n)"
        );
    }

    #[test]
    fn writes_the_single_line_form_with_the_object_marker() {
        let value = json!({ "type": "RouterState", "models": ["a", "b"] });
        assert_eq!(
            encode_line(&value),
            "(o: (type \"RouterState\") (models (\"a\" \"b\")))"
        );
    }

    #[test]
    fn keeps_empty_containers_apart() {
        assert_eq!(
            encode_with(&json!({ "tags": [] }), Quoting::Always),
            "(\n  tags ()\n)"
        );
        assert_eq!(
            encode_with(&json!({ "meta": {} }), Quoting::Always),
            "(\n  meta (\n  )\n)"
        );
        round_trip(json!({ "tags": [], "meta": {} }));
    }

    #[test]
    fn round_trips_scalars_of_every_type() {
        round_trip(
            json!({ "text": "x", "int": 42, "float": 1.5, "yes": true, "no": false, "nothing": null }),
        );
    }

    #[test]
    fn round_trips_numeric_looking_text() {
        round_trip(json!({ "version": "1.3", "postalCode": "54321" }));
    }

    #[test]
    fn round_trips_tuples() {
        round_trip(json!([["papa", "lovesMama"], ["son", "hasCar"]]));
    }

    #[test]
    fn quotes_only_what_would_read_back_as_something_else() {
        let value = json!([["papa", "lovesMama"], ["age", "40"], ["note", "two words"]]);
        assert_eq!(
            encode_document(&value, Quoting::Minimal),
            "(papa lovesMama)\n(age \"40\")\n(note \"two words\")"
        );
        assert_eq!(
            decode(&encode_document(&value, Quoting::Minimal)).unwrap(),
            value
        );
    }

    #[test]
    fn keeps_the_minimal_form_readable_as_the_same_object() {
        let value = json!({"name": "ada", "age": 36, "tags": ["math", "true"]});
        let document = encode_with(&value, Quoting::Minimal);
        assert_eq!(
            document,
            "(\n  name ada\n  age 36\n  tags (\n    math\n    \"true\"\n  )\n)"
        );
        assert_eq!(decode(&document).unwrap(), value);
    }

    #[test]
    fn reads_numbers_the_way_the_codec_does() {
        assert!(looks_like_number("1e5"));
        assert!(looks_like_number(".5"));
        assert!(looks_like_number("5."));
        assert!(!looks_like_number("Infinity"));
        assert!(!looks_like_number("NaN"));
        assert!(!looks_like_number("0x10"));
        // Rust's own float parser accepts these three, which is why the reader
        // does not use it.
        assert!(reads_back_bare("Infinity"));
        assert!(reads_back_bare("NaN"));
        assert!(!reads_back_bare("1e5"));
        // The grammar spends the colon on link ids, so a timestamp cannot be
        // written bare even though nothing would misread its type.
        assert!(!reads_back_bare("2026-01-01T00:00:00Z"));
        assert!(reads_back_bare("2026-01-01"));
    }

    #[test]
    fn writes_a_list_of_links_one_link_per_line() {
        let value = json!([["papa", "lovesMama"], ["son", "hasCar"]]);
        assert_eq!(
            encode_document(&value, Quoting::Always),
            "(\"papa\" \"lovesMama\")\n(\"son\" \"hasCar\")"
        );
        assert_eq!(
            decode(&encode_document(&value, Quoting::Always)).unwrap(),
            value
        );
    }

    #[test]
    fn writes_every_other_shape_as_the_indented_form() {
        let value = json!({ "rows": [["a", "b"]] });
        assert_eq!(
            encode_document(&value, Quoting::Always),
            encode_with(&value, Quoting::Always)
        );
        // A single link would read back as the link itself, not as a list.
        let single = json!([["a", "b"]]);
        assert_eq!(
            encode_document(&single, Quoting::Always),
            encode_with(&single, Quoting::Always)
        );
    }

    #[test]
    fn round_trips_a_single_pair_object_inside_an_array() {
        round_trip(json!({ "rows": [{ "a": 1 }, { "b": 2 }] }));
    }

    #[test]
    fn quotes_text_holding_a_quote() {
        assert_eq!(quote("say \"hi\""), "'say \"hi\"'");
        assert_eq!(quote("both \" and '"), "\"\"\"both \" and '\"\"\"");
        round_trip(json!({ "quip": "say \"hi\"", "mixed": "both \" and '" }));
    }

    #[test]
    fn escapes_only_the_characters_the_form_cannot_carry() {
        let value = json!({ "log": "first\u{0}second" });
        assert!(encode_with(&value, Quoting::Always).contains("(escaped "));
        round_trip(value);
    }

    #[test]
    fn keeps_a_newline_in_the_indented_form_but_escapes_it_on_one_line() {
        let value = json!({ "note": "one\ntwo" });
        assert!(encode_with(&value, Quoting::Always).contains("one\ntwo"));
        assert!(encode_line(&value).contains("one%0Atwo"));
    }
}
