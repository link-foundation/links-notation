use nom::{
    branch::alt,
    bytes::complete::{take_while, take_while1},
    character::complete::{char, line_ending},
    combinator::eof,
    multi::{many0, many1},
    sequence::{preceded, terminated},
    IResult, Parser,
};
use std::cell::RefCell;

/// Represents a reference ID that can be either a single string or a multi-reference (multiple words).
#[derive(Debug, Clone, PartialEq)]
pub enum RefId {
    /// Single-word reference
    Single(String),
    /// Multi-word reference (e.g., "some example" as vec!["some", "example"])
    Multi(Vec<String>),
}

impl RefId {
    /// Check if this is a multi-reference
    pub fn is_multi(&self) -> bool {
        matches!(self, RefId::Multi(parts) if parts.len() > 1)
    }

    /// Get the reference as a single string (joining with space for multi-ref)
    pub fn to_single_string(&self) -> String {
        match self {
            RefId::Single(s) => s.clone(),
            RefId::Multi(parts) => parts.join(" "),
        }
    }

    /// Get parts of the reference
    pub fn parts(&self) -> Vec<String> {
        match self {
            RefId::Single(s) => vec![s.clone()],
            RefId::Multi(parts) => parts.clone(),
        }
    }
}

impl From<String> for RefId {
    fn from(s: String) -> Self {
        RefId::Single(s)
    }
}

impl From<Vec<String>> for RefId {
    fn from(v: Vec<String>) -> Self {
        if v.len() == 1 {
            RefId::Single(v.into_iter().next().unwrap())
        } else {
            RefId::Multi(v)
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Link {
    pub id: Option<RefId>,
    pub values: Vec<Link>,
    pub children: Vec<Link>,
    pub is_indented_id: bool,
    pub is_multi_ref: bool,
}

impl Link {
    pub fn new_singlet(id: String) -> Self {
        Link {
            id: Some(RefId::Single(id)),
            values: vec![],
            children: vec![],
            is_indented_id: false,
            is_multi_ref: false,
        }
    }

    pub fn new_indented_id(id: RefId) -> Self {
        let is_multi = id.is_multi();
        Link {
            id: Some(id),
            values: vec![],
            children: vec![],
            is_indented_id: true,
            is_multi_ref: is_multi,
        }
    }

    pub fn new_value(values: Vec<Link>) -> Self {
        Link {
            id: None,
            values,
            children: vec![],
            is_indented_id: false,
            is_multi_ref: false,
        }
    }

    pub fn new_link(id: Option<RefId>, values: Vec<Link>) -> Self {
        let is_multi = id.as_ref().map(|i| i.is_multi()).unwrap_or(false);
        Link {
            id,
            values,
            children: vec![],
            is_indented_id: false,
            is_multi_ref: is_multi,
        }
    }

    pub fn with_children(mut self, children: Vec<Link>) -> Self {
        self.children = children;
        self
    }

    /// Get ID as String (for backward compatibility)
    pub fn id_string(&self) -> Option<String> {
        self.id.as_ref().map(|id| id.to_single_string())
    }
}

pub struct ParserState {
    indentation_stack: RefCell<Vec<usize>>,
    base_indentation: RefCell<Option<usize>>,
}

impl Default for ParserState {
    fn default() -> Self {
        Self::new()
    }
}

impl ParserState {
    pub fn new() -> Self {
        ParserState {
            indentation_stack: RefCell::new(vec![0]),
            base_indentation: RefCell::new(None),
        }
    }

    pub fn set_base_indentation(&self, indent: usize) {
        let mut base = self.base_indentation.borrow_mut();
        if base.is_none() {
            *base = Some(indent);
        }
    }

    pub fn get_base_indentation(&self) -> usize {
        self.base_indentation.borrow().unwrap_or(0)
    }

    pub fn normalize_indentation(&self, indent: usize) -> usize {
        let base = self.get_base_indentation();
        indent.saturating_sub(base)
    }

    pub fn push_indentation(&self, indent: usize) {
        self.indentation_stack.borrow_mut().push(indent);
    }

    pub fn pop_indentation(&self) {
        let mut stack = self.indentation_stack.borrow_mut();
        if stack.len() > 1 {
            stack.pop();
        }
    }

    pub fn current_indentation(&self) -> usize {
        *self.indentation_stack.borrow().last().unwrap_or(&0)
    }

    pub fn check_indentation(&self, indent: usize) -> bool {
        indent >= self.current_indentation()
    }
}

fn is_whitespace_char(c: char) -> bool {
    c == ' ' || c == '\t' || c == '\n' || c == '\r'
}

fn is_horizontal_whitespace(c: char) -> bool {
    c == ' ' || c == '\t'
}

fn is_reference_char(c: char) -> bool {
    !is_whitespace_char(c) && c != '(' && c != ':' && c != ')'
}

fn horizontal_whitespace(input: &str) -> IResult<&str, &str> {
    take_while(is_horizontal_whitespace)(input)
}

fn whitespace(input: &str) -> IResult<&str, &str> {
    take_while(is_whitespace_char)(input)
}

fn simple_reference(input: &str) -> IResult<&str, String> {
    take_while1(is_reference_char)
        .map(|s: &str| s.to_string())
        .parse(input)
}

/// Parse a multi-quote string with a given quote character and count.
/// For N quotes: opening = N quotes, closing = N quotes, escape = 2*N quotes -> N quotes
fn parse_multi_quote_string(
    input: &str,
    quote_char: char,
    quote_count: usize,
) -> IResult<&str, String> {
    let open_close = quote_char.to_string().repeat(quote_count);
    let escape_seq = quote_char.to_string().repeat(quote_count * 2);
    let escape_val = quote_char.to_string().repeat(quote_count);

    // Check for opening quotes
    if !input.starts_with(&open_close) {
        return Err(nom::Err::Error(nom::error::Error::new(
            input,
            nom::error::ErrorKind::Tag,
        )));
    }

    let mut remaining = &input[open_close.len()..];
    let mut content = String::new();

    loop {
        if remaining.is_empty() {
            return Err(nom::Err::Error(nom::error::Error::new(
                input,
                nom::error::ErrorKind::Tag,
            )));
        }

        // Check for escape sequence (2*N quotes)
        if remaining.starts_with(&escape_seq) {
            content.push_str(&escape_val);
            remaining = &remaining[escape_seq.len()..];
            continue;
        }

        // Check for closing quotes (N quotes not followed by more quotes)
        if remaining.starts_with(&open_close) {
            let after_close = &remaining[open_close.len()..];
            // Make sure this is exactly N quotes (not more)
            if after_close.is_empty() || !after_close.starts_with(quote_char) {
                return Ok((after_close, content));
            }
        }

        // Take the next character
        let c = remaining.chars().next().unwrap();
        content.push(c);
        remaining = &remaining[c.len_utf8()..];
    }
}

/// Parse a quoted string with dynamically detected quote count.
/// Counts opening quotes and uses that count for parsing.
fn parse_dynamic_quote_string(input: &str, quote_char: char) -> IResult<&str, String> {
    // Count opening quotes
    let quote_count = input.chars().take_while(|&c| c == quote_char).count();

    if quote_count == 0 {
        return Err(nom::Err::Error(nom::error::Error::new(
            input,
            nom::error::ErrorKind::Tag,
        )));
    }

    parse_multi_quote_string(input, quote_char, quote_count)
}

fn double_quoted_dynamic(input: &str) -> IResult<&str, String> {
    parse_dynamic_quote_string(input, '"')
}

fn single_quoted_dynamic(input: &str) -> IResult<&str, String> {
    parse_dynamic_quote_string(input, '\'')
}

fn backtick_quoted_dynamic(input: &str) -> IResult<&str, String> {
    parse_dynamic_quote_string(input, '`')
}

fn reference(input: &str) -> IResult<&str, String> {
    // Try quoted strings with dynamic quote detection (supports any N quotes)
    // Then fall back to simple unquoted reference
    alt((
        double_quoted_dynamic,
        single_quoted_dynamic,
        backtick_quoted_dynamic,
        simple_reference,
    ))
    .parse(input)
}

/// Parse a multi-reference ID (multiple space-separated words before colon).
/// Returns RefId::Single for single words, RefId::Multi for multiple words.
/// Stops when it encounters ':' or ')'.
fn multi_ref_id(input: &str) -> IResult<&str, RefId> {
    let (input, first) = reference(input)?;
    let mut parts = vec![first];
    let mut remaining = input;

    // Try to parse more references (space-separated, not followed by ':' immediately)
    loop {
        // Skip horizontal whitespace
        let (after_ws, _) = horizontal_whitespace(remaining)?;

        // Check if we've hit the colon or closing paren - stop here
        if after_ws.starts_with(':') || after_ws.starts_with(')') || after_ws.is_empty() {
            break;
        }

        // Check for end-of-line
        if after_ws.starts_with('\n') || after_ws.starts_with('\r') {
            break;
        }

        // Try to parse another reference
        match reference(after_ws) {
            Ok((rest, ref_str)) => {
                // Check that the next reference is followed by space or colon
                // (not immediately by something else that would indicate nested structure)
                if rest.starts_with(':')
                    || rest.starts_with(')')
                    || rest.is_empty()
                    || rest.starts_with(' ')
                    || rest.starts_with('\t')
                    || rest.starts_with('\n')
                    || rest.starts_with('\r')
                {
                    parts.push(ref_str);
                    remaining = rest;
                } else {
                    break;
                }
            }
            Err(_) => break,
        }
    }

    Ok((remaining, RefId::from(parts)))
}

fn eol(input: &str) -> IResult<&str, &str> {
    alt((
        preceded(horizontal_whitespace, line_ending),
        preceded(horizontal_whitespace, eof),
    ))
    .parse(input)
}

fn reference_or_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    alt((
        |i| multi_line_any_link(i, state),
        reference.map(Link::new_singlet),
    ))
    .parse(input)
}

fn multi_line_value_and_whitespace<'a>(
    input: &'a str,
    state: &ParserState,
) -> IResult<&'a str, Link> {
    terminated(|i| reference_or_link(i, state), whitespace).parse(input)
}

fn multi_line_values<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Vec<Link>> {
    preceded(
        whitespace,
        many0(|i| multi_line_value_and_whitespace(i, state)),
    )
    .parse(input)
}

fn single_line_value_and_whitespace<'a>(
    input: &'a str,
    state: &ParserState,
) -> IResult<&'a str, Link> {
    preceded(horizontal_whitespace, |i| reference_or_link(i, state)).parse(input)
}

fn single_line_values<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Vec<Link>> {
    many1(|i| single_line_value_and_whitespace(i, state)).parse(input)
}

fn single_line_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    (
        horizontal_whitespace,
        multi_ref_id,
        horizontal_whitespace,
        char(':'),
        |i| single_line_values(i, state),
    )
        .map(|(_, id, _, _, values)| Link::new_link(Some(id), values))
        .parse(input)
}

fn multi_line_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    (
        char('('),
        whitespace,
        multi_ref_id,
        whitespace,
        char(':'),
        |i| multi_line_values(i, state),
        whitespace,
        char(')'),
    )
        .map(|(_, _, id, _, _, values, _, _)| Link::new_link(Some(id), values))
        .parse(input)
}

fn single_line_value_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    (|i| single_line_values(i, state))
        .map(|values| {
            if values.len() == 1
                && values[0].id.is_some()
                && values[0].values.is_empty()
                && values[0].children.is_empty()
            {
                Link::new_singlet(values[0].id.as_ref().unwrap().to_single_string())
            } else {
                Link::new_value(values)
            }
        })
        .parse(input)
}

fn indented_id_link<'a>(input: &'a str, _state: &ParserState) -> IResult<&'a str, Link> {
    (multi_ref_id, horizontal_whitespace, char(':'), eol)
        .map(|(id, _, _, _)| Link::new_indented_id(id))
        .parse(input)
}

fn multi_line_value_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    (
        char('('),
        |i| multi_line_values(i, state),
        whitespace,
        char(')'),
    )
        .map(|(_, values, _, _)| {
            if values.len() == 1
                && values[0].id.is_some()
                && values[0].values.is_empty()
                && values[0].children.is_empty()
            {
                Link::new_singlet(values[0].id.as_ref().unwrap().to_single_string())
            } else {
                Link::new_value(values)
            }
        })
        .parse(input)
}

fn multi_line_any_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    alt((
        |i| multi_line_value_link(i, state),
        |i| multi_line_link(i, state),
    ))
    .parse(input)
}

fn single_line_any_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    alt((
        terminated(|i| single_line_link(i, state), eol),
        terminated(|i| single_line_value_link(i, state), eol),
    ))
    .parse(input)
}

fn any_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    alt((
        terminated(|i| multi_line_any_link(i, state), eol),
        |i| indented_id_link(i, state),
        |i| single_line_any_link(i, state),
    ))
    .parse(input)
}

fn count_indentation(input: &str) -> IResult<&str, usize> {
    take_while(|c| c == ' ').map(|s: &str| s.len()).parse(input)
}

fn push_indentation<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, ()> {
    let (input, spaces) = count_indentation(input)?;
    let normalized_spaces = state.normalize_indentation(spaces);
    let current = state.current_indentation();

    if normalized_spaces > current {
        state.push_indentation(normalized_spaces);
        Ok((input, ()))
    } else {
        Err(nom::Err::Error(nom::error::Error::new(
            input,
            nom::error::ErrorKind::Verify,
        )))
    }
}

fn check_indentation<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, ()> {
    let (input, spaces) = count_indentation(input)?;
    let normalized_spaces = state.normalize_indentation(spaces);

    if state.check_indentation(normalized_spaces) {
        Ok((input, ()))
    } else {
        Err(nom::Err::Error(nom::error::Error::new(
            input,
            nom::error::ErrorKind::Verify,
        )))
    }
}

fn element<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    let (input, link) = any_link(input, state)?;

    if let Ok((input, _)) = push_indentation(input, state) {
        let (input, children) = links(input, state)?;
        Ok((input, link.with_children(children)))
    } else {
        Ok((input, link))
    }
}

fn first_line<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    // Set base indentation from the first line
    let (_, spaces) = count_indentation(input)?;
    state.set_base_indentation(spaces);
    element(input, state)
}

fn line<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    preceded(|i| check_indentation(i, state), |i| element(i, state)).parse(input)
}

fn links<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Vec<Link>> {
    let (input, first) = first_line(input, state)?;
    let (input, rest) = many0(|i| line(i, state)).parse(input)?;

    state.pop_indentation();

    let mut result = vec![first];
    result.extend(rest);
    Ok((input, result))
}

pub fn parse_document(input: &str) -> IResult<&str, Vec<Link>> {
    let state = ParserState::new();

    // Skip leading whitespace but preserve the line structure
    let input = input.trim_start_matches(['\n', '\r']);

    // Handle empty or whitespace-only documents
    if input.trim().is_empty() {
        return Ok(("", vec![]));
    }

    let (input, result) = links(input, &state)?;
    let (input, _) = whitespace(input)?;
    let (input, _) = eof(input)?;

    Ok((input, result))
}
