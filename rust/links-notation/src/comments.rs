//! Comments, and the rule that decides where one starts.
//!
//! A comment starts at a `#` written where a line or a token starts and runs to
//! the end of the line. The parser never sees it: [`strip_comments`] replaces
//! every byte of every comment with a space before the document is parsed, so
//! the notation itself stays exactly as it was and a position reported by the
//! parser still points at the same character of the document the caller wrote.

use crate::parser::quoted_reference_end;

/// The character that opens a comment.
pub const COMMENT: char = '#';

/// The characters a delimited reference can be written between.
const QUOTES: [u8; 3] = [b'"', b'\'', b'`'];

/// What can stand before a delimited reference: the reference is the first
/// thing on a line, follows a space, opens a group or follows a colon.
const BEFORE_REFERENCE: [u8; 6] = [b' ', b'\t', b'\n', b'\r', b'(', b':'];

/// What can stand before a comment: the comment is the first thing on a line,
/// or it follows whitespace. A `#` inside a word is part of that word, so
/// `issue#1047` is a reference and not the start of a comment.
const BEFORE_COMMENT: [u8; 4] = [b' ', b'\t', b'\n', b'\r'];

/// Blanks out every comment in `document`, keeping every other byte where it
/// was.
///
/// Comments are replaced rather than removed so that a byte offset in the
/// result is the same byte offset in `document`: the line and column a parse
/// error reports are the line and column the writer sees in their file.
///
/// A `#` inside a delimited reference is content, so `"# not a comment"` is
/// still one reference.
///
/// # Examples
/// ```
/// use links_notation::comments::strip_comments;
///
/// assert_eq!(strip_comments("a: b # why\n"), "a: b      \n");
/// assert_eq!(strip_comments("\"# kept\"\n"), "\"# kept\"\n");
/// assert_eq!(strip_comments("issue#1047\n"), "issue#1047\n");
/// ```
pub fn strip_comments(document: &str) -> String {
    let mut bytes = document.as_bytes().to_vec();
    let mut position = 0;

    while position < bytes.len() {
        let byte = bytes[position];

        if QUOTES.contains(&byte) && follows(&bytes, position, &BEFORE_REFERENCE) {
            match quoted_reference_end(document, position) {
                Some(end) => position = end,
                None => position += 1,
            }
            continue;
        }

        if byte == COMMENT as u8 && follows(&bytes, position, &BEFORE_COMMENT) {
            while position < bytes.len() && bytes[position] != b'\n' && bytes[position] != b'\r' {
                bytes[position] = b' ';
                position += 1;
            }
            continue;
        }

        position += 1;
    }

    // Only whole comments were replaced, and only by spaces, so what is left is
    // the document it was read from with some of its bytes blanked.
    String::from_utf8(bytes).expect("blanking comment bytes keeps the document valid UTF-8")
}

/// Reports whether the byte before `position` is one of `allowed`, treating the
/// start of the document as one of them.
fn follows(bytes: &[u8], position: usize, allowed: &[u8]) -> bool {
    match position {
        0 => true,
        _ => allowed.contains(&bytes[position - 1]),
    }
}
