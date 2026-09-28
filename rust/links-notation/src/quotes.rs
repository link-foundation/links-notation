//! Delimited references, and how far each one reaches.
//!
//! A reference opened by a run of N delimiters (`"`, `'` or `` ` ``) closes at
//! the next run of exactly N, and a run of 2N inside it is that delimiter
//! escaped. An even run that encloses nothing substantive is the empty
//! reference: the shortest reading, a bare delimiter pair enclosing nothing,
//! wins over a longer n-quote delimiter.
//!
//! A run of R delimiters in a body is read as a whole: each 2N of it in turn are
//! an escaped N, and the R % 2N left over close the reference when there are at
//! least N of them - the last N close it, the ones before are content - and are
//! content otherwise. So a run closes the reference exactly when `R / N` is odd,
//! and a run shorter than N never does.
//!
//! [`DelimitedReferences`] lists the runs of every delimiter once per document
//! and links each run to the next longer one, so finding where a reference
//! closes skips every run too short to close it. Reading a reference takes time
//! linear in its body however wide its opening run is, and finding that a
//! reference never closes does not take a pass over the rest of the document
//! each time it is asked.

use crate::parser::is_whitespace_char;
use std::cell::RefCell;
use std::collections::HashMap;

/// The characters a reference can be written between.
pub(crate) const QUOTES: [u8; 3] = *b"\"'`";

/// What a delimited reference holds, and how many bytes of the document it
/// takes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct Reading {
    pub(crate) value: String,
    pub(crate) length: usize,
}

/// Every delimited reference of one document, read on demand.
///
/// The parser, comment stripping and the stream parser each keep one per
/// document they read, so a reference asked for twice is read once. It keeps
/// positions only: a reference is asked for with the part of the document it
/// opens, which is what the parser has at hand.
pub(crate) struct DelimitedReferences {
    length: usize,
    runs: [DelimiterRuns; 3],
    readings: RefCell<HashMap<usize, Option<Reading>>>,
}

impl DelimitedReferences {
    pub(crate) fn new(document: &str) -> Self {
        DelimitedReferences {
            length: document.len(),
            runs: QUOTES.map(|quote| DelimiterRuns::new(document, quote)),
            readings: RefCell::new(HashMap::new()),
        }
    }

    /// The reference opened where `rest` starts, where `rest` is the document
    /// these references were listed from, from that position on.
    pub(crate) fn read(&self, rest: &str) -> Option<Reading> {
        self.with_reading(rest, Reading::clone)
    }

    /// The offset just past the reference opened at `start` of `document`.
    pub(crate) fn end_at(&self, document: &str, start: usize) -> Option<usize> {
        self.with_reading(document.get(start..)?, |reading| start + reading.length)
    }

    fn with_reading<T>(&self, rest: &str, answer: impl FnOnce(&Reading) -> T) -> Option<T> {
        let Some(start) = self.length.checked_sub(rest.len()) else {
            // Not part of the document these references were listed from.
            return read_reference(rest).as_ref().map(answer);
        };
        let mut readings = self.readings.borrow_mut();
        readings
            .entry(start)
            .or_insert_with(|| self.read_at(rest, start))
            .as_ref()
            .map(answer)
    }

    fn read_at(&self, rest: &str, start: usize) -> Option<Reading> {
        let quote = *rest.as_bytes().first()?;
        let runs = &self.runs[QUOTES.iter().position(|&known| known == quote)?];
        let opening = runs.holding(start);
        let count = runs.end(opening) - start;

        // The first run after the opening one that closes the reference.
        let mut closing = opening + 1;
        while closing < runs.count() {
            let length = runs.lengths[closing];
            if length < count {
                closing = runs.next_longer[closing];
            } else if (length / count) % 2 == 1 {
                break;
            } else {
                closing += 1;
            }
        }
        let end = (closing < runs.count()).then(|| runs.end(closing) - start);
        reading(rest, quote, count, end)
    }
}

/// The reference opened where `rest` starts, read without a list of runs: for
/// a single reference that is as quick, since it is read once.
pub(crate) fn read_reference(rest: &str) -> Option<Reading> {
    let quote = *rest.as_bytes().first()?;
    if !QUOTES.contains(&quote) {
        return None;
    }
    let count = run_length(rest, 0, quote);

    let mut position = count;
    let mut end = None;
    while let Some(found) = rest[position..].find(quote as char) {
        let start = position + found;
        let length = run_length(rest, start, quote);
        position = start + length;
        if length >= count && (length / count) % 2 == 1 {
            end = Some(position);
            break;
        }
    }
    reading(rest, quote, count, end)
}

/// The reading of a reference opened by `count` delimiters at the start of
/// `rest`, closed by the run that ends at `end` when there is one.
fn reading(rest: &str, quote: u8, count: usize, end: Option<usize>) -> Option<Reading> {
    let empty_reference = count.is_multiple_of(2).then(|| Reading {
        value: String::new(),
        length: count,
    });
    let Some(end) = end else {
        return empty_reference;
    };

    let body = &rest[count..end];
    let mut value = String::with_capacity(body.len());
    let mut position = 0;
    while let Some(found) = body[position..].find(quote as char) {
        let start = position + found;
        let length = run_length(body, start, quote);
        let escaped = length / (2 * count) * count;
        // The closing run is the last one of the body.
        let closes = if start + length == body.len() {
            count
        } else {
            0
        };
        value.push_str(&body[position..start]);
        value.extend(std::iter::repeat_n(
            quote as char,
            length - escaped - closes,
        ));
        position = start + length;
    }

    if empty_reference.is_some() && !is_substantive_body(&value) {
        return empty_reference;
    }
    Some(Reading { value, length: end })
}

/// The number of `quote` delimiters in a row from `start` of `text`.
fn run_length(text: &str, start: usize, quote: u8) -> usize {
    text.as_bytes()[start..]
        .iter()
        .take_while(|&&byte| byte == quote)
        .count()
}

/// The maximal runs of one delimiter in a document, in order, each linked to the
/// next run that is longer than it.
struct DelimiterRuns {
    starts: Vec<usize>,
    lengths: Vec<usize>,
    next_longer: Vec<usize>,
}

impl DelimiterRuns {
    fn new(document: &str, quote: u8) -> Self {
        let mut starts = Vec::new();
        let mut lengths = Vec::new();
        let mut position = 0;
        while let Some(found) = document[position..].find(quote as char) {
            let start = position + found;
            let length = run_length(document, start, quote);
            starts.push(start);
            lengths.push(length);
            position = start + length;
        }

        // Every run between a run and the next longer one is at most as long as
        // it, which is what lets a search for a run of some length jump over them.
        let count = starts.len();
        let mut next_longer = vec![count; count];
        let mut longer: Vec<usize> = Vec::new();
        for run in (0..count).rev() {
            while longer
                .last()
                .is_some_and(|&next| lengths[next] <= lengths[run])
            {
                longer.pop();
            }
            if let Some(&next) = longer.last() {
                next_longer[run] = next;
            }
            longer.push(run);
        }

        DelimiterRuns {
            starts,
            lengths,
            next_longer,
        }
    }

    fn count(&self) -> usize {
        self.starts.len()
    }

    /// Offset just past the given run.
    fn end(&self, run: usize) -> usize {
        self.starts[run] + self.lengths[run]
    }

    /// The run that holds the given offset of a delimiter.
    fn holding(&self, position: usize) -> usize {
        self.starts
            .partition_point(|&start| start <= position)
            .saturating_sub(1)
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
        if !is_whitespace_char(c) {
            has_visible = true;
        }
    }

    has_visible && depth == 0
}
