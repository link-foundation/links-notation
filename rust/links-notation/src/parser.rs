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

#[derive(Debug, Clone, PartialEq)]
pub struct Link {
    pub id: Option<String>,
    pub values: Vec<Link>,
    pub children: Vec<Link>,
    pub is_indented_id: bool,
    /// Body of a parenthesized group, kept unflattened until the whole document
    /// is transformed. `None` for every link that is not a parenthesized group.
    pub nested: Option<Vec<Link>>,
}

impl Link {
    pub fn new_singlet(id: String) -> Self {
        Link {
            id: Some(id),
            values: vec![],
            children: vec![],
            is_indented_id: false,
            nested: None,
        }
    }

    pub fn new_indented_id(id: String) -> Self {
        Link {
            id: Some(id),
            values: vec![],
            children: vec![],
            is_indented_id: true,
            nested: None,
        }
    }

    pub fn new_value(values: Vec<Link>) -> Self {
        Link {
            id: None,
            values,
            children: vec![],
            is_indented_id: false,
            nested: None,
        }
    }

    pub fn new_link(id: Option<String>, values: Vec<Link>) -> Self {
        Link {
            id,
            values,
            children: vec![],
            is_indented_id: false,
            nested: None,
        }
    }

    /// Creates a link that stands for a parenthesized group, keeping the links
    /// parsed inside the parentheses as they were written.
    pub fn new_nested(body: Vec<Link>) -> Self {
        Link {
            id: None,
            values: vec![],
            children: vec![],
            is_indented_id: false,
            nested: Some(body),
        }
    }

    pub fn with_children(mut self, children: Vec<Link>) -> Self {
        self.children = children;
        self
    }
}

pub struct ParserState {
    indentation_stack: RefCell<Vec<usize>>,
    base_indentation: RefCell<Option<usize>>,
    nested_depth: RefCell<usize>,
    furthest: RefCell<FurthestFailure>,
}

/// The furthest position any alternative reached before failing, and what could
/// have continued the document there.
///
/// The parser backtracks, so the position the last alternative happens to fail
/// at says little about where the document stops making sense: a defect in the
/// middle of line two is reported by `nom` as "expected end of input" at the
/// start of line two, because that is where the document last parsed cleanly.
/// The furthest position reached is what a PEG parser points at, and it is what
/// the JavaScript port reports.
#[derive(Debug, Clone, Default)]
struct FurthestFailure {
    /// Address of the furthest failing position, as a pointer into the document
    /// being parsed. Turned into an offset once the document is at hand again.
    address: Option<usize>,
    expected: Vec<&'static str>,
}

/// Where the parser stopped, and what it could have accepted there.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParseFailure {
    /// Byte offset into the document the parser stopped at.
    pub offset: usize,
    /// What could have continued the document at `offset`, in the wording used
    /// by the error message. Empty when the failure came from a place that
    /// names no expectation.
    pub expected: Vec<&'static str>,
    /// The `nom` error kind. An internal detail of this parser: it says which
    /// combinator gave up, not what is wrong with the document, so it is kept
    /// out of the error message and reachable only through `Debug`.
    pub kind: Option<nom::error::ErrorKind>,
}

/// Indentation state of the context a parenthesized group was opened in.
pub struct SavedContext {
    indentation_stack: Vec<usize>,
    base_indentation: Option<usize>,
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
            nested_depth: RefCell::new(0),
            furthest: RefCell::new(FurthestFailure::default()),
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

    /// Opens a nested context: the group body starts fresh at indentation level
    /// zero and follows the same rules as the root document.
    pub fn enter_nested_context(&self) -> SavedContext {
        let saved = SavedContext {
            indentation_stack: self.indentation_stack.replace(vec![0]),
            base_indentation: self.base_indentation.replace(None),
        };
        *self.nested_depth.borrow_mut() += 1;
        saved
    }

    /// Restores the context the parenthesized group was opened in.
    pub fn exit_nested_context(&self, saved: SavedContext) {
        *self.indentation_stack.borrow_mut() = saved.indentation_stack;
        *self.base_indentation.borrow_mut() = saved.base_indentation;
        let mut depth = self.nested_depth.borrow_mut();
        if *depth > 0 {
            *depth -= 1;
        }
    }

    pub fn is_inside_nested_context(&self) -> bool {
        *self.nested_depth.borrow() > 0
    }

    /// Records that `what` could have continued the document at `at`, and that
    /// nothing there did. Only the furthest such position is kept; every
    /// expectation recorded at that same position is kept alongside it.
    fn expected_at(&self, at: &str, what: &'static str) {
        let address = at.as_ptr() as usize;
        let mut furthest = self.furthest.borrow_mut();
        match furthest.address {
            Some(recorded) if recorded > address => {}
            Some(recorded) if recorded == address => {
                if !furthest.expected.contains(&what) {
                    furthest.expected.push(what);
                }
            }
            _ => {
                furthest.address = Some(address);
                furthest.expected = vec![what];
            }
        }
    }

    /// Turns everything recorded during a failed parse into a position in
    /// `document`.
    ///
    /// `nom`'s own error position is the fallback and the floor: the parser
    /// reached at least that far, whatever the tracked alternatives say.
    fn failure(&self, document: &str, error: &nom::Err<nom::error::Error<&str>>) -> ParseFailure {
        let base = document.as_ptr() as usize;
        let (nom_offset, kind) = match error {
            nom::Err::Error(e) | nom::Err::Failure(e) => (
                (e.input.as_ptr() as usize).saturating_sub(base),
                Some(e.code),
            ),
            nom::Err::Incomplete(_) => (document.len(), None),
        };
        let furthest = self.furthest.borrow();
        let tracked = furthest
            .address
            .map(|address| address.saturating_sub(base))
            .unwrap_or(0);
        let offset = tracked.max(nom_offset).min(document.len());
        let expected = if tracked == offset {
            furthest.expected.clone()
        } else {
            // The tracked expectations belong to an earlier position, so they
            // do not describe the place being reported.
            Vec::new()
        };
        ParseFailure {
            offset,
            expected,
            kind,
        }
    }
}

/// Fails the way `nom` does, after recording what was expected at `input`.
fn expected<'a, T>(
    input: &'a str,
    state: &ParserState,
    what: &'static str,
    kind: nom::error::ErrorKind,
) -> IResult<&'a str, T> {
    state.expected_at(input, what);
    Err(nom::Err::Error(nom::error::Error::new(input, kind)))
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

/// A body written between an even run of delimiters is substantive when it
/// holds at least one visible character and does not straddle a parenthesis.
/// An even run can always be read as delimiter pairs enclosing nothing, so the
/// n-quote reading is only taken when it carries something the pairs cannot.
fn is_substantive_body(content: &str) -> bool {
    let mut depth: isize = 0;
    let mut has_visible = false;

    for c in content.chars() {
        match c {
            '(' => depth += 1,
            ')' => {
                depth -= 1;
                if depth < 0 {
                    return false;
                }
            }
            _ => {}
        }
        if !c.is_whitespace() {
            has_visible = true;
        }
    }

    has_visible && depth == 0
}

/// Parse a quoted string with dynamically detected quote count.
///
/// Counts opening quotes and uses that count for parsing. A run of an even
/// number of delimiters that does not open a reference with a substantive body
/// is the empty reference: the shortest reading, a bare delimiter pair
/// enclosing nothing, wins over a longer n-quote delimiter.
fn parse_dynamic_quote_string(input: &str, quote_char: char) -> IResult<&str, String> {
    // Count opening quotes
    let quote_count = input.chars().take_while(|&c| c == quote_char).count();

    if quote_count == 0 {
        return Err(nom::Err::Error(nom::error::Error::new(
            input,
            nom::error::ErrorKind::Tag,
        )));
    }

    let is_even_run = quote_count % 2 == 0;

    if let Ok((rest, content)) = parse_multi_quote_string(input, quote_char, quote_count) {
        if !is_even_run || is_substantive_body(&content) {
            return Ok((rest, content));
        }
    }

    if is_even_run {
        return Ok((&input[quote_count * quote_char.len_utf8()..], String::new()));
    }

    Err(nom::Err::Error(nom::error::Error::new(
        input,
        nom::error::ErrorKind::Tag,
    )))
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

fn reference<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, String> {
    // Try quoted strings with dynamic quote detection (supports any N quotes)
    // Then fall back to simple unquoted reference
    let parsed = alt((
        double_quoted_dynamic,
        single_quoted_dynamic,
        backtick_quoted_dynamic,
        simple_reference,
    ))
    .parse(input);
    if parsed.is_err() {
        state.expected_at(input, "a reference");
    }
    parsed
}

fn eol<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, &'a str> {
    let parsed = alt((
        preceded(horizontal_whitespace, line_ending),
        preceded(horizontal_whitespace, eof),
        |i| nested_group_end(i, state),
    ))
    .parse(input);
    if parsed.is_err() {
        state.expected_at(input, "end of line");
    }
    parsed
}

/// Inside a parenthesized group the closing parenthesis ends the last line,
/// just like a line break does at the root.
fn nested_group_end<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, &'a str> {
    if !state.is_inside_nested_context() {
        return Err(nom::Err::Error(nom::error::Error::new(
            input,
            nom::error::ErrorKind::Verify,
        )));
    }
    let (rest, _) = horizontal_whitespace(input)?;
    if rest.starts_with(')') {
        Ok((rest, ""))
    } else {
        expected(rest, state, "\")\"", nom::error::ErrorKind::Char)
    }
}

/// Skips the line breaks and blank lines that separate `(` from the first line
/// of the group body.
fn skip_empty_lines(input: &str) -> &str {
    let mut rest = input;
    loop {
        let line_start = rest.trim_start_matches(is_horizontal_whitespace);
        match strip_line_ending(line_start) {
            Some(next) => rest = next,
            None => return rest,
        }
    }
}

fn strip_line_ending(input: &str) -> Option<&str> {
    input
        .strip_prefix("\r\n")
        .or_else(|| input.strip_prefix('\n'))
}

fn reference_or_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    alt((
        |i| nested_group(i, state),
        (|i| reference(i, state)).map(Link::new_singlet),
    ))
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
    let (input, _) = horizontal_whitespace(input)?;
    let (input, id) = reference(input, state)?;
    let (input, _) = horizontal_whitespace(input)?;
    let (input, _) = colon(input, state)?;
    let (input, values) = single_line_values(input, state)?;
    Ok((input, Link::new_link(Some(id), values)))
}

/// The colon that separates an identifier from its values.
fn colon<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, char> {
    character(':', input, state, "\":\"")
}

/// Matches one character, recording what was expected when it is not there.
fn character<'a>(
    wanted: char,
    input: &'a str,
    state: &ParserState,
    what: &'static str,
) -> IResult<&'a str, char> {
    let parsed: IResult<&'a str, char> = char(wanted).parse(input);
    match parsed {
        Ok(parsed) => Ok(parsed),
        Err(_) => expected(input, state, what, nom::error::ErrorKind::Char),
    }
}

fn single_line_value_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    (|i| single_line_values(i, state))
        .map(|values| {
            if values.len() == 1
                && values[0].id.is_some()
                && values[0].values.is_empty()
                && values[0].children.is_empty()
            {
                Link::new_singlet(values[0].id.clone().unwrap())
            } else {
                Link::new_value(values)
            }
        })
        .parse(input)
}

fn indented_id_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    let (input, id) = reference(input, state)?;
    let (input, _) = horizontal_whitespace(input)?;
    let (input, _) = colon(input, state)?;
    let (input, _) = eol(input, state)?;
    Ok((input, Link::new_indented_id(id)))
}

/// A parenthesized group opens a nested context: its body starts fresh at
/// indentation level zero and is parsed with the same rules as the root
/// document, so indentation is structural inside parentheses as well.
fn nested_group<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    let (body_input, _) = character('(', input, state, "\"(\"")?;
    let saved = state.enter_nested_context();
    let result = nested_group_body(body_input, state);
    state.exit_nested_context(saved);
    result
}

fn nested_group_body<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    if let Ok((rest, body)) = links(skip_empty_lines(input), state) {
        let (rest, _) = whitespace(rest)?;
        let (rest, _) = closing_parenthesis(rest, state)?;
        return Ok((rest, Link::new_nested(body)));
    }
    let (rest, _) = whitespace(input)?;
    let (rest, _) = closing_parenthesis(rest, state)?;
    Ok((rest, Link::new_nested(vec![])))
}

/// The parenthesis that closes a group.
fn closing_parenthesis<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, char> {
    character(')', input, state, "\")\"")
}

fn single_line_any_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    alt((
        terminated(|i| single_line_link(i, state), |i| eol(i, state)),
        terminated(|i| single_line_value_link(i, state), |i| eol(i, state)),
    ))
    .parse(input)
}

fn any_link<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    alt((
        terminated(|i| nested_group(i, state), |i| eol(i, state)),
        |i| indented_id_link(i, state),
        |i| single_line_any_link(i, state),
    ))
    .parse(input)
}

fn count_indentation(input: &str) -> IResult<&str, usize> {
    take_while(|c| c == ' ').map(|s: &str| s.len()).parse(input)
}

fn push_indentation<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, ()> {
    let (input, spaces) = count_indentation(skip_empty_lines(input))?;
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
    // Set base indentation from the first line and consume it, so that the first
    // line is parsed exactly like every following line.
    let (input, spaces) = count_indentation(input)?;
    state.set_base_indentation(spaces);
    element(input, state)
}

fn line<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Link> {
    // Blank lines do not break a document, they are simply skipped
    preceded(|i| check_indentation(i, state), |i| element(i, state)).parse(skip_empty_lines(input))
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
    document(input, &state)
}

/// Parses a document and, when it does not parse, says where it stopped.
///
/// `parse_document` reports a failure the way `nom` does: with the whole
/// unconsumed remainder of the input and the combinator that gave up. Neither
/// tells a reader which line to look at, and the remainder grows with the size
/// of the document. This is the entry point the library uses.
pub fn parse_document_with_diagnostics(input: &str) -> Result<Vec<Link>, ParseFailure> {
    let state = ParserState::new();
    match document(input, &state) {
        Ok((_, links)) => Ok(links),
        Err(error) => Err(state.failure(input, &error)),
    }
}

fn document<'a>(input: &'a str, state: &ParserState) -> IResult<&'a str, Vec<Link>> {
    // Skip leading blank lines but preserve the line structure
    let document = skip_empty_lines(input);

    // Handle empty or whitespace-only documents
    if document.trim().is_empty() {
        return Ok(("", vec![]));
    }

    let (rest, result) = links(document, state)?;
    let (rest, _) = whitespace(rest)?;
    let end: IResult<&'a str, &'a str> = eof(rest);
    let (rest, _) = match end {
        Ok(parsed) => parsed,
        Err(_) => return expected(rest, state, "end of input", nom::error::ErrorKind::Eof),
    };

    Ok((rest, result))
}
