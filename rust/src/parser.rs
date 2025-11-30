use nom::{
    branch::alt,
    bytes::complete::{is_not, take_while, take_while1},
    character::complete::{char, line_ending},
    combinator::eof,
    multi::{many0, many1},
    sequence::{delimited, preceded, terminated},
    IResult, Parser,
};
use std::cell::RefCell;

#[derive(Debug, Clone, PartialEq)]
pub struct Link {
    pub id: Option<String>,
    pub values: Vec<Link>,
    pub children: Vec<Link>,
    pub is_indented_id: bool,
}

impl Link {
    pub fn new_singlet(id: String) -> Self {
        Link {
            id: Some(id),
            values: vec![],
            children: vec![],
            is_indented_id: false,
        }
    }

    pub fn new_indented_id(id: String) -> Self {
        Link {
            id: Some(id),
            values: vec![],
            children: vec![],
            is_indented_id: true,
        }
    }

    pub fn new_value(values: Vec<Link>) -> Self {
        Link {
            id: None,
            values,
            children: vec![],
            is_indented_id: false,
        }
    }

    pub fn new_link(id: Option<String>, values: Vec<Link>) -> Self {
        Link {
            id,
            values,
            children: vec![],
            is_indented_id: false,
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
        if indent >= base {
            indent - base
        } else {
            0
        }
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

fn double_quoted_reference(input: &str) -> IResult<&str, String> {
    delimited(char('"'), is_not("\""), char('"'))
        .map(|s: &str| s.to_string())
        .parse(input)
}

fn single_quoted_reference(input: &str) -> IResult<&str, String> {
    delimited(char('\''), is_not("'"), char('\''))
        .map(|s: &str| s.to_string())
        .parse(input)
}

fn reference(input: &str) -> IResult<&str, String> {
    alt((
        double_quoted_reference,
        single_quoted_reference,
        simple_reference,
    ))
    .parse(input)
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
        reference,
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
        reference,
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
                Link::new_singlet(values[0].id.clone().unwrap())
            } else {
                Link::new_value(values)
            }
        })
        .parse(input)
}

fn indented_id_link<'a>(input: &'a str, _state: &ParserState) -> IResult<&'a str, Link> {
    (reference, horizontal_whitespace, char(':'), eol)
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
                Link::new_singlet(values[0].id.clone().unwrap())
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
    let input = input.trim_start_matches(|c: char| c == '\n' || c == '\r');

    // Handle empty or whitespace-only documents
    if input.trim().is_empty() {
        return Ok(("", vec![]));
    }

    let (input, result) = links(input, &state)?;
    let (input, _) = whitespace(input)?;
    let (input, _) = eof(input)?;

    Ok((input, result))
}
