//! How the references of a parsed document were written.
//!
//! The links [`parse_lino_to_links`](crate::parse_lino_to_links) returns hold
//! what each reference means: `1` and `'1'` are both the reference `1`. The
//! links [`parse_lino_to_syntax_links`](crate::parse_lino_to_syntax_links)
//! returns hold a [`SyntaxReference`] instead, which keeps the meaning and also
//! the text the reference was written as, so a tool can tell the two apart
//! while comparing, hashing and formatting them exactly as before.

use crate::quotes::{QUOTES, read_reference};
use std::fmt;
use std::hash::{Hash, Hasher};

/// A reference read from a document, together with the text it was written as.
///
/// Equality, hashing, ordering and [`Display`](fmt::Display) use the
/// [`value`](Self::value) only, so `1` and `'1'` are equal references and a
/// `LiNo<SyntaxReference>` formats exactly like the `LiNo<String>` with the
/// same values. [`raw`](Self::raw) and [`quote`](Self::quote) say how the
/// reference was written.
///
/// # Examples
/// ```
/// use links_notation::{LiNo, SyntaxReference, parse_lino_to_syntax_links};
///
/// let links = parse_lino_to_syntax_links("(t 1 '1')").unwrap();
/// let LiNo::Link { values, .. } = &links[0] else { unreachable!() };
/// let (LiNo::Ref(bare), LiNo::Ref(quoted)) = (&values[1], &values[2]) else {
///     unreachable!()
/// };
/// assert_eq!(bare, quoted);
/// assert_eq!(bare.raw.as_deref(), Some("1"));
/// assert_eq!(quoted.raw.as_deref(), Some("'1'"));
/// assert_eq!((bare.quote(), quoted.quote()), (None, Some('\'')));
/// assert_eq!(quoted.to_string(), "1");
/// assert_eq!(SyntaxReference::from("x").raw, None);
/// ```
#[derive(Debug, Clone, Default)]
pub struct SyntaxReference {
    /// What the reference means: its delimiters and escapes resolved and a
    /// versioned literal decoded. This is the ID `parse_lino_to_links` reads.
    pub value: String,
    /// The reference exactly as the document wrote it: quotes, doubled quote
    /// runs and `~1{...}` literal syntax included, and the line breaks of a
    /// multi-line quoted reference. Taken from the document as the caller
    /// passed it, comments included. `None` for a reference built in code.
    pub raw: Option<String>,
}

impl SyntaxReference {
    /// A reference that was not read from a document, so it has no raw text.
    pub fn new(value: impl Into<String>) -> Self {
        Self {
            value: value.into(),
            raw: None,
        }
    }

    /// A reference with the text it was written as.
    pub fn with_raw(value: impl Into<String>, raw: impl Into<String>) -> Self {
        Self {
            value: value.into(),
            raw: Some(raw.into()),
        }
    }

    /// What the reference means, the same as [`value`](Self::value).
    pub fn as_str(&self) -> &str {
        &self.value
    }

    /// The delimiter the reference was written between: `'`, `"` or `` ` ``
    /// when it was quoted, and `None` when it was bare, a versioned literal, or
    /// not read from a document. See [`reference_quote`].
    pub fn quote(&self) -> Option<char> {
        self.raw.as_deref().and_then(reference_quote)
    }
}

impl PartialEq for SyntaxReference {
    fn eq(&self, other: &Self) -> bool {
        self.value == other.value
    }
}

impl Eq for SyntaxReference {}

impl Hash for SyntaxReference {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.value.hash(state);
    }
}

impl PartialOrd for SyntaxReference {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for SyntaxReference {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.value.cmp(&other.value)
    }
}

impl PartialEq<str> for SyntaxReference {
    fn eq(&self, other: &str) -> bool {
        self.value == other
    }
}

impl PartialEq<&str> for SyntaxReference {
    fn eq(&self, other: &&str) -> bool {
        self.value == *other
    }
}

impl PartialEq<String> for SyntaxReference {
    fn eq(&self, other: &String) -> bool {
        &self.value == other
    }
}

/// Writes the [`value`](SyntaxReference::value), unescaped, the way a `String`
/// ID is written: a `LiNo` quotes it where the notation needs quotes, so a
/// `LiNo<SyntaxReference>` prints exactly what the `LiNo<String>` prints.
impl fmt::Display for SyntaxReference {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.value)
    }
}

impl From<String> for SyntaxReference {
    fn from(value: String) -> Self {
        Self::new(value)
    }
}

impl From<&str> for SyntaxReference {
    fn from(value: &str) -> Self {
        Self::new(value)
    }
}

impl From<SyntaxReference> for String {
    fn from(reference: SyntaxReference) -> Self {
        reference.value
    }
}

/// The delimiter a reference was written between, read from the reference as
/// it was written: `'`, `"` or `` ` `` for one complete quoted reference
/// (however many delimiters open it), and `None` for a bare reference, a
/// versioned literal, or text that holds more than one reference.
///
/// # Examples
/// ```
/// use links_notation::reference_quote;
///
/// assert_eq!(reference_quote("'1'"), Some('\''));
/// assert_eq!(reference_quote("\"\"a b\"\""), Some('"'));
/// assert_eq!(reference_quote("`x`"), Some('`'));
/// assert_eq!(reference_quote("1"), None);
/// assert_eq!(reference_quote("~1{31}"), None);
/// // A bare reference that starts with a quote.
/// assert_eq!(reference_quote("'unclosed"), None);
/// assert_eq!(reference_quote("'a' b"), None);
/// assert_eq!(reference_quote(""), None);
/// ```
pub fn reference_quote(raw: &str) -> Option<char> {
    let first = *raw.as_bytes().first()?;
    if !QUOTES.contains(&first) {
        return None;
    }
    let reading = read_reference(raw)?;
    (reading.length == raw.len()).then_some(first as char)
}
