//! The concrete syntax tree of a Links Notation document.
//!
//! Every byte of a document belongs to exactly one token, so the text of the
//! tree is the document itself, comments, blank lines, indentation, quotes and
//! line endings included. A document is a list of `line` nodes; a line holds the
//! tokens up to and including its line ending, and a parenthesized `group` node
//! holds its own parentheses and the lines written between them. A group is part
//! of the line it opens on, however many lines it spans.
//!
//! The tree records how a document was written; [`parse_lino_to_links`] reads
//! what it means. They agree because a document is parsed before its tree is
//! built, and the tokens are read with the same rules the parser uses: comments
//! are found by [`strip_comments`], delimited references by the parser's own
//! reader and versioned literals by the same prefix.
//!
//! [`parse_lino_to_links`]: crate::parse_lino_to_links
//! [`strip_comments`]: crate::comments::strip_comments

use crate::comments::COMMENT;
use crate::quotes::{DelimitedReferences, QUOTES};
use crate::reference_literal::{decode_reference_literal, reference_literal_end};
use crate::{ParseError, ParserConfig, check_document};
use std::fmt;

/// The kinds of nodes and tokens of a concrete syntax tree.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum CstKind {
    /// The whole document: its lines.
    Document,
    /// One line: its tokens and groups, up to and including its line ending.
    Line,
    /// A parenthesized group: `(`, the lines inside it, and `)`.
    Group,
    /// A run of spaces and tabs.
    Whitespace,
    /// One line ending: `\n`, `\r\n` or `\r`.
    Newline,
    /// A comment, from `#` up to the line ending.
    Comment,
    /// `(`
    OpenParen,
    /// `)`
    CloseParen,
    /// `:`
    Colon,
    /// A bare, quoted or versioned literal reference.
    Reference,
}

impl CstKind {
    /// The name every Links Notation implementation gives this kind, as used in
    /// [`CstNode::to_s_expression`]: `document`, `line`, `group`, `whitespace`,
    /// `newline`, `comment`, `open_paren`, `close_paren`, `colon` or
    /// `reference`.
    pub fn as_str(self) -> &'static str {
        match self {
            CstKind::Document => "document",
            CstKind::Line => "line",
            CstKind::Group => "group",
            CstKind::Whitespace => "whitespace",
            CstKind::Newline => "newline",
            CstKind::Comment => "comment",
            CstKind::OpenParen => "open_paren",
            CstKind::CloseParen => "close_paren",
            CstKind::Colon => "colon",
            CstKind::Reference => "reference",
        }
    }

    /// Whether this kind is a token, rather than a node with children.
    pub fn is_token(self) -> bool {
        !matches!(self, CstKind::Document | CstKind::Line | CstKind::Group)
    }
}

impl fmt::Display for CstKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// One node or token of a concrete syntax tree.
///
/// Its [`Display`](fmt::Display) writes the exact text it was read from.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CstNode {
    /// What this node or token is.
    pub kind: CstKind,
    /// The children of a node, in document order; empty for a token.
    pub children: Vec<CstNode>,
    /// What a reference token means, its delimiters and escapes resolved and a
    /// versioned literal decoded (the ID a parsed link has); `None` for every
    /// other node and token.
    pub value: Option<String>,
    /// The delimiter a quoted reference token was written between (`'`, `"` or
    /// `` ` ``); `None` for a bare or literal reference and every other kind.
    pub quote: Option<char>,
    /// A token's text exactly as written; empty for a node.
    token_text: String,
}

impl CstNode {
    fn node(kind: CstKind, children: Vec<CstNode>) -> Self {
        CstNode {
            kind,
            children,
            value: None,
            quote: None,
            token_text: String::new(),
        }
    }

    fn token(kind: CstKind, text: &str) -> Self {
        CstNode {
            kind,
            children: Vec::new(),
            value: None,
            quote: None,
            token_text: text.to_owned(),
        }
    }

    /// Whether this is a token rather than a node with children.
    pub fn is_token(&self) -> bool {
        self.kind.is_token()
    }

    /// The exact text this node or token was read from: a token's own text, and
    /// the text of a node's children one after the other.
    pub fn text(&self) -> String {
        self.to_string()
    }

    /// Every token of this subtree, in document order.
    pub fn tokens(&self) -> Vec<&CstNode> {
        let mut tokens = Vec::new();
        self.collect_tokens(&mut tokens);
        tokens
    }

    fn collect_tokens<'a>(&'a self, tokens: &mut Vec<&'a CstNode>) {
        if self.is_token() {
            tokens.push(self);
        } else {
            for child in &self.children {
                child.collect_tokens(tokens);
            }
        }
    }

    /// The tree as an S-expression: `(kind child ...)` for a node and
    /// `kind:"text"` for a token, the text escaped as a JSON string would escape
    /// `\`, `"`, line feeds, carriage returns and tabs. Two trees are the same
    /// exactly when their S-expressions are.
    ///
    /// # Examples
    /// ```
    /// use links_notation::parse_lino_to_cst;
    ///
    /// assert_eq!(
    ///     parse_lino_to_cst("a '1'").unwrap().to_s_expression(),
    ///     r#"(document (line reference:"a" whitespace:" " reference:"'1'"))"#
    /// );
    /// ```
    pub fn to_s_expression(&self) -> String {
        let mut out = String::new();
        self.write_s_expression(&mut out);
        out
    }

    fn write_s_expression(&self, out: &mut String) {
        if self.is_token() {
            out.push_str(self.kind.as_str());
            out.push_str(":\"");
            for c in self.token_text.chars() {
                match c {
                    '\\' => out.push_str("\\\\"),
                    '"' => out.push_str("\\\""),
                    '\n' => out.push_str("\\n"),
                    '\r' => out.push_str("\\r"),
                    '\t' => out.push_str("\\t"),
                    _ => out.push(c),
                }
            }
            out.push('"');
            return;
        }
        out.push('(');
        out.push_str(self.kind.as_str());
        for child in &self.children {
            out.push(' ');
            child.write_s_expression(out);
        }
        out.push(')');
    }
}

impl fmt::Display for CstNode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.is_token() {
            return f.write_str(&self.token_text);
        }
        for child in &self.children {
            fmt::Display::fmt(child, f)?;
        }
        Ok(())
    }
}

/// Reads a document, with comments, as a lossless concrete syntax tree.
///
/// Every character of the document, comments and whitespace included, belongs
/// to exactly one token, so `parse_lino_to_cst(document)?.to_string()` is the
/// document. The document is parsed first, so it is refused exactly when
/// [`parse_lino_to_links`](crate::parse_lino_to_links) refuses it, with the
/// same error.
///
/// # Examples
/// ```
/// use links_notation::{CstKind, parse_lino_to_cst};
///
/// let document = "# config\nname: 'my app' # quoted\n";
/// let cst = parse_lino_to_cst(document).unwrap();
/// assert_eq!(cst.to_string(), document);
/// assert_eq!(cst.kind, CstKind::Document);
///
/// let quoted = cst
///     .tokens()
///     .into_iter()
///     .find(|token| token.quote.is_some())
///     .unwrap();
/// assert_eq!(quoted.text(), "'my app'");
/// assert_eq!(quoted.value.as_deref(), Some("my app"));
///
/// assert!(parse_lino_to_cst("(a").is_err());
/// ```
pub fn parse_lino_to_cst(document: &str) -> Result<CstNode, ParseError> {
    parse_lino_to_cst_with_config(document, &ParserConfig::default())
}

/// Reads a document the way `config` says to as a lossless concrete syntax
/// tree; see [`parse_lino_to_cst`].
///
/// Without comments, a `#` is read as part of a reference, as the parser reads
/// it.
///
/// # Examples
/// ```
/// use links_notation::{CstKind, ParserConfig, parse_lino_to_cst_with_config};
///
/// let cst = parse_lino_to_cst_with_config("a #b", &ParserConfig::without_comments()).unwrap();
/// let kinds: Vec<CstKind> = cst.tokens().iter().map(|token| token.kind).collect();
/// assert_eq!(kinds, [CstKind::Reference, CstKind::Whitespace, CstKind::Reference]);
/// assert_eq!(cst.to_string(), "a #b");
/// ```
pub fn parse_lino_to_cst_with_config(
    document: &str,
    config: &ParserConfig,
) -> Result<CstNode, ParseError> {
    let prepared = check_document(document, config)?;
    build_cst(document, &prepared, config.comments)
}

/// A container being filled: the document or a group, with its line that is
/// still open.
struct Container {
    kind: CstKind,
    children: Vec<CstNode>,
    line: Option<Vec<CstNode>>,
}

impl Container {
    fn new(kind: CstKind, children: Vec<CstNode>) -> Self {
        Container {
            kind,
            children,
            line: None,
        }
    }

    /// The line being filled, started when there is none.
    fn line(&mut self) -> &mut Vec<CstNode> {
        self.line.get_or_insert_with(Vec::new)
    }

    /// Adds the open line, if any, to the children.
    fn close_line(&mut self) {
        if let Some(line) = self.line.take() {
            self.children.push(CstNode::node(CstKind::Line, line));
        }
    }

    fn finish(mut self) -> CstNode {
        self.close_line();
        CstNode::node(self.kind, self.children)
    }
}

/// The bytes that end a bare reference.
const BARE_REFERENCE_END: &[u8] = b" \t\r\n(:)";

/// The concrete syntax tree of `document`, which has already been parsed.
/// `prepared` is the document the parser read: the same bytes, with its
/// comments blanked when `comments` is on.
fn build_cst(document: &str, prepared: &str, comments: bool) -> Result<CstNode, ParseError> {
    // Blanking a comment keeps every byte where it was, so a position in one is
    // the same position in the other.
    debug_assert_eq!(document.len(), prepared.len());
    let input = document.as_bytes();
    let blanked = prepared.as_bytes();
    // Bare references end where they end in the document the parser read.
    // Delimited references and literals are read, as the parser reads them, in
    // the document as written, so a comment never changes what a reference
    // holds (issue #377).
    let references = DelimitedReferences::new(document);
    // The open containers, innermost last. A group joins the line it opens on
    // when it closes; that line stays open until then, since every line break
    // in between belongs to the group.
    let mut containers = vec![Container::new(CstKind::Document, Vec::new())];
    let mut position = 0;

    while position < input.len() {
        let byte = input[position];
        let mut end = position + 1;
        let innermost = containers.len() - 1;

        if comments && byte == COMMENT as u8 && blanked[position] != byte {
            // A blanked `#` opens a comment, which runs to the line ending.
            while end < input.len() && input[end] != b'\n' && input[end] != b'\r' {
                end += 1;
            }
            let token = CstNode::token(CstKind::Comment, &document[position..end]);
            containers[innermost].line().push(token);
        } else if byte == b'\r' || byte == b'\n' {
            if byte == b'\r' && input.get(end) == Some(&b'\n') {
                end += 1;
            }
            let token = CstNode::token(CstKind::Newline, &document[position..end]);
            containers[innermost].line().push(token);
            containers[innermost].close_line();
        } else if byte == b' ' || byte == b'\t' {
            while end < input.len() && (input[end] == b' ' || input[end] == b'\t') {
                end += 1;
            }
            let token = CstNode::token(CstKind::Whitespace, &document[position..end]);
            containers[innermost].line().push(token);
        } else if byte == b'(' {
            // Open the line the group belongs to before the group is filled.
            containers[innermost].line();
            let open = CstNode::token(CstKind::OpenParen, &document[position..end]);
            containers.push(Container::new(CstKind::Group, vec![open]));
        } else if byte == b')' {
            if containers.len() == 1 {
                return Err(ParseError::InternalError(format!(
                    "Unbalanced \")\" at offset {position}"
                )));
            }
            let mut group = containers.pop().expect("a group is open");
            group.close_line();
            group.children.push(CstNode::token(
                CstKind::CloseParen,
                &document[position..end],
            ));
            let group = CstNode::node(CstKind::Group, group.children);
            containers
                .last_mut()
                .expect("the document is open")
                .line()
                .push(group);
        } else if byte == b':' {
            let token = CstNode::token(CstKind::Colon, &document[position..end]);
            containers[innermost].line().push(token);
        } else {
            let (reference_end, value, quote) =
                read_reference(document, prepared, position, &references);
            end = reference_end;
            let mut token = CstNode::token(CstKind::Reference, &document[position..end]);
            token.value = Some(value);
            token.quote = quote;
            containers[innermost].line().push(token);
        }
        position = end;
    }

    if containers.len() != 1 {
        return Err(ParseError::InternalError(
            "Unbalanced \"(\" at the end of the document".to_string(),
        ));
    }
    Ok(containers.pop().expect("the document is open").finish())
}

/// The reference that starts at `start`, read as the parser reads it: where it
/// ends, what it means, and the delimiter it was written between.
fn read_reference(
    document: &str,
    prepared: &str,
    start: usize,
    references: &DelimitedReferences,
) -> (usize, String, Option<char>) {
    let blanked = prepared.as_bytes();
    if let Some(end) = reference_literal_end(document, start) {
        let text = &document[start..end];
        let value = decode_reference_literal(text).unwrap_or_else(|_| text.to_owned());
        return (end, value, None);
    }
    let first = blanked[start];
    if QUOTES.contains(&first) {
        if let Some(reading) = references.read(&document[start..]) {
            return (start + reading.length, reading.value, Some(first as char));
        }
    }
    let mut end = start + 1;
    while end < blanked.len() && !BARE_REFERENCE_END.contains(&blanked[end]) {
        end += 1;
    }
    (end, document[start..end].to_owned(), None)
}
