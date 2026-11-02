//! Comments, and the rule that decides where one starts.
//!
//! A comment starts at a `#` written where a line or a token starts and runs to
//! the end of the line. The parser never sees it: [`strip_comments`] replaces
//! every byte of every comment with a space before the document is parsed, so
//! the notation itself stays exactly as it was and a position reported by the
//! parser still points at the same character of the document the caller wrote.

use crate::quotes::{DelimitedReferences, QUOTES};
use crate::reference_literal::reference_literal_end;

/// The character that opens a comment.
pub const COMMENT: char = '#';

/// What ends a bare reference. A token starts after one of these, at the start
/// of the document, and right after a delimited reference or a versioned
/// literal: the places the parser reads a reference from.
const SEPARATORS: [u8; 7] = *b" \t\n\r(:)";

/// What can stand before a comment: the comment is the first thing on a line,
/// or it follows whitespace. A `#` inside a word is part of that word, so
/// `issue#1047` is a reference and not the start of a comment.
const BEFORE_COMMENT: [u8; 4] = *b" \t\n\r";

/// Blanks out every comment in `document`, keeping every other byte where it
/// was.
///
/// Comments are replaced rather than removed so that a byte offset in the
/// result is the same byte offset in `document`: the line and column a parse
/// error reports are the line and column the writer sees in their file.
///
/// A `#` inside a delimited reference is content, so `"# not a comment"` is
/// still one reference. The document is read token by token, the way the
/// parser reads it, so this holds as well for a reference that starts right
/// after a group, another reference or a literal, and references are read in
/// the document as written, as the parser reads them (issue #377).
///
/// # Examples
/// ```
/// use links_notation::comments::strip_comments;
///
/// assert_eq!(strip_comments("a: b # why\n"), "a: b      \n");
/// assert_eq!(strip_comments("\"# kept\"\n"), "\"# kept\"\n");
/// assert_eq!(strip_comments("issue#1047\n"), "issue#1047\n");
/// assert_eq!(strip_comments("(a)\" #kept\"\n"), "(a)\" #kept\"\n");
/// ```
pub fn strip_comments(document: &str) -> String {
    let mut bytes = document.as_bytes().to_vec();
    let references = DelimitedReferences::new(document);
    let mut position = 0;
    // Whether a token may start at `position`.
    let mut token_start = true;

    while position < bytes.len() {
        let byte = bytes[position];

        if byte == COMMENT as u8 && follows(&bytes, position, &BEFORE_COMMENT) {
            while position < bytes.len() && bytes[position] != b'\n' && bytes[position] != b'\r' {
                bytes[position] = b' ';
                position += 1;
            }
            continue;
        }

        if SEPARATORS.contains(&byte) {
            token_start = true;
            position += 1;
            continue;
        }

        if token_start {
            if let Some(end) = delimited_token_end(document, position, &references) {
                position = end;
                continue;
            }
        }

        // Anything else is part of a bare reference, which runs to a separator.
        token_start = false;
        position += 1;
    }

    // Only whole comments were replaced, and only by spaces, so what is left is
    // the document it was read from with some of its bytes blanked.
    String::from_utf8(bytes).expect("blanking comment bytes keeps the document valid UTF-8")
}

/// The offset just past the versioned literal or delimited reference that
/// starts the token at `start`, or `None` when the token there is a bare
/// reference: a delimiter run that never closes is read as one, as the parser
/// reads it.
fn delimited_token_end(
    document: &str,
    start: usize,
    references: &DelimitedReferences,
) -> Option<usize> {
    if let Some(end) = reference_literal_end(document, start) {
        return Some(end);
    }
    if QUOTES.contains(&document.as_bytes()[start]) {
        return references.end_at(document, start);
    }
    None
}

/// Reports whether the byte before `position` is one of `allowed`, treating the
/// start of the document as one of them.
fn follows(bytes: &[u8], position: usize, allowed: &[u8]) -> bool {
    match position {
        0 => true,
        _ => allowed.contains(&bytes[position - 1]),
    }
}
