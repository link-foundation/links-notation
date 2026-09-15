//! Incremental parsing for long-lived Links Notation streams.

use crate::parser::quoted_reference_end;
use crate::{parse_lino_to_links_with_config, LiNo, ParseError, ParserConfig};
use std::collections::VecDeque;
use std::fmt;

const DEFAULT_MAX_BUFFER_SIZE: usize = 10 * 1024 * 1024;
const BEFORE_REFERENCE: &[u8] = b" \t\n\r(:";
const BEFORE_COMMENT: &[u8] = b" \t\n\r";

/// The point immediately after the last character written to a stream parser.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StreamPosition {
    /// One-based line number.
    pub line: usize,
    /// One-based character column.
    pub column: usize,
    /// Absolute byte offset from the start of the stream.
    pub offset: usize,
    /// Bytes held for the one unresolved top-level record.
    pub buffered: usize,
}

/// Backward-compatible name for stream position information.
pub type ErrorLocation = StreamPosition;

impl fmt::Display for StreamPosition {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "line {}, column {} (offset {})",
            self.line, self.column, self.offset
        )
    }
}

/// A canonical parser or stream-limit error with absolute stream coordinates.
#[derive(Debug)]
pub struct StreamParseError {
    /// Human-readable description of the error.
    pub message: String,
    /// Position in the complete stream, when available.
    pub location: Option<StreamPosition>,
    /// The canonical parser error, when parsing a completed record failed.
    pub parse_error: Option<Box<ParseError>>,
}

impl fmt::Display for StreamParseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.location {
            Some(location) => write!(
                formatter,
                "stream parse error at {location}: {}",
                self.message
            ),
            None => write!(formatter, "stream parse error: {}", self.message),
        }
    }
}

impl std::error::Error for StreamParseError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        self.parse_error
            .as_deref()
            .map(|error| error as &(dyn std::error::Error + 'static))
    }
}

impl From<ParseError> for StreamParseError {
    fn from(error: ParseError) -> Self {
        Self {
            message: error.to_string(),
            location: None,
            parse_error: Some(Box::new(error)),
        }
    }
}

/// Callback invoked for every completed link.
pub type LinkCallback = Box<dyn FnMut(&LiNo<String>) + Send>;

/// Callback invoked when a write or finish operation fails.
pub type ErrorCallback = Box<dyn FnMut(&StreamParseError) + Send>;

/// Incrementally emits complete top-level Links Notation records.
///
/// A record can acquire indented children, so a terminating newline is not by
/// itself a safe boundary. A record is committed when the next non-indented
/// content line begins, and the canonical parser validates every committed
/// segment. Set collection off for bounded-memory callback or iterator use.
pub struct StreamParser {
    config: ParserConfig,
    buffer: String,
    current_line: String,
    base_indentation: Option<usize>,
    line_classified: bool,
    link_callback: Option<LinkCallback>,
    error_callback: Option<ErrorCallback>,
    collect: bool,
    max_buffer_size: usize,
    links: Vec<LiNo<String>>,
    offset: usize,
    line: usize,
    column: usize,
    segment_offset: usize,
    segment_line: usize,
    ended: bool,
}

impl Default for StreamParser {
    fn default() -> Self {
        Self::new()
    }
}

impl StreamParser {
    /// Create a parser with the canonical default options.
    pub fn new() -> Self {
        Self::with_config(ParserConfig::default())
    }

    /// Create a parser with explicit canonical parser options.
    pub fn with_config(config: ParserConfig) -> Self {
        Self {
            config,
            buffer: String::new(),
            current_line: String::new(),
            base_indentation: None,
            line_classified: false,
            link_callback: None,
            error_callback: None,
            collect: true,
            max_buffer_size: DEFAULT_MAX_BUFFER_SIZE,
            links: Vec::new(),
            offset: 0,
            line: 1,
            column: 1,
            segment_offset: 0,
            segment_line: 1,
            ended: false,
        }
    }

    /// Register a callback invoked once for every completed link.
    pub fn on_link<F>(&mut self, callback: F) -> &mut Self
    where
        F: FnMut(&LiNo<String>) + Send + 'static,
    {
        self.link_callback = Some(Box::new(callback));
        self
    }

    /// Register a callback invoked when parsing fails.
    pub fn on_error<F>(&mut self, callback: F) -> &mut Self
    where
        F: FnMut(&StreamParseError) + Send + 'static,
    {
        self.error_callback = Some(Box::new(callback));
        self
    }

    /// Enable or disable retaining links for [`finish`](Self::finish) and [`drain`](Self::drain).
    pub fn set_collect(&mut self, collect: bool) -> &mut Self {
        self.collect = collect;
        self
    }

    /// Set the largest unresolved record accepted by the stream.
    pub fn set_max_buffer_size(
        &mut self,
        max_buffer_size: usize,
    ) -> Result<&mut Self, StreamParseError> {
        if max_buffer_size == 0 {
            return Err(StreamParseError {
                message: "maximum buffer size must be positive".to_string(),
                location: Some(self.position()),
                parse_error: None,
            });
        }
        self.max_buffer_size = max_buffer_size;
        Ok(self)
    }

    /// Consume a string chunk and return links made complete by it.
    pub fn write(&mut self, chunk: &str) -> Result<Vec<LiNo<String>>, StreamParseError> {
        if self.ended {
            return self.fail(StreamParseError {
                message: "cannot write after finish()".to_string(),
                location: Some(self.position()),
                parse_error: None,
            });
        }

        let mut emitted = Vec::new();
        for character in chunk.chars() {
            self.current_line.push(character);
            self.offset += character.len_utf8();

            if character == '\n' {
                self.buffer.push_str(&self.current_line);
                self.current_line.clear();
                self.line_classified = false;
                self.line += 1;
                self.column = 1;
            } else {
                if !self.line_classified && !matches!(character, ' ' | '\t' | '\r') {
                    self.line_classified = true;
                    if !(self.config.comments && character == '#') {
                        let indentation = leading_spaces(&self.current_line);
                        self.start_content_line(indentation, &mut emitted);
                    }
                }
                self.column += 1;
            }

            if self.buffer.len() + self.current_line.len() > self.max_buffer_size {
                return self.fail(StreamParseError {
                    message: format!(
                        "buffered record exceeds maximum size of {} bytes",
                        self.max_buffer_size
                    ),
                    location: Some(self.position()),
                    parse_error: None,
                });
            }
        }
        Ok(emitted)
    }

    /// Finish the stream and return all undrained or newly emitted links.
    pub fn finish(&mut self) -> Result<Vec<LiNo<String>>, StreamParseError> {
        if self.ended {
            return Ok(if self.collect {
                self.links.clone()
            } else {
                Vec::new()
            });
        }

        let mut emitted = Vec::new();
        let document = format!("{}{}", self.buffer, self.current_line);
        if !document.is_empty() {
            let parsed = match parse_lino_to_links_with_config(&document, &self.config) {
                Ok(links) => links,
                Err(error) => {
                    let stream_error = self.stream_error(error);
                    return self.fail(stream_error);
                }
            };
            self.publish(parsed, &mut emitted);
            self.advance_segment(&document);
        }

        self.buffer.clear();
        self.current_line.clear();
        self.base_indentation = None;
        self.ended = true;
        Ok(if self.collect {
            self.links.clone()
        } else {
            emitted
        })
    }

    /// Return and forget retained links.
    pub fn drain(&mut self) -> Vec<LiNo<String>> {
        std::mem::take(&mut self.links)
    }

    /// Reuse this parser while preserving its configuration and callbacks.
    pub fn reset(&mut self) -> &mut Self {
        self.buffer.clear();
        self.current_line.clear();
        self.base_indentation = None;
        self.line_classified = false;
        self.links.clear();
        self.offset = 0;
        self.line = 1;
        self.column = 1;
        self.segment_offset = 0;
        self.segment_line = 1;
        self.ended = false;
        self
    }

    /// Return the absolute stream position and unresolved buffer size.
    pub fn position(&self) -> StreamPosition {
        StreamPosition {
            line: self.line,
            column: self.column,
            offset: self.offset,
            buffered: self.buffer.len() + self.current_line.len(),
        }
    }

    /// Lazily parse any iterator of string-like chunks.
    pub fn parse_chunks<I, S>(chunks: I) -> StreamIterator<I::IntoIter>
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        let mut parser = Self::new();
        parser.set_collect(false);
        StreamIterator {
            chunks: chunks.into_iter(),
            parser,
            ready: VecDeque::new(),
            finished: false,
        }
    }

    fn start_content_line(&mut self, indentation: usize, emitted: &mut Vec<LiNo<String>>) {
        if !self.buffer.is_empty()
            && self
                .base_indentation
                .is_some_and(|base| indentation <= base)
            && structurally_complete(&self.buffer, self.config.comments)
        {
            if let Ok(parsed) = parse_lino_to_links_with_config(&self.buffer, &self.config) {
                let document = std::mem::take(&mut self.buffer);
                self.publish(parsed, emitted);
                self.advance_segment(&document);
                self.base_indentation = None;
            }
        }
        self.base_indentation.get_or_insert(indentation);
    }

    fn publish(&mut self, parsed: Vec<LiNo<String>>, emitted: &mut Vec<LiNo<String>>) {
        for link in parsed {
            emitted.push(link.clone());
            if self.collect {
                self.links.push(link.clone());
            }
            if let Some(callback) = &mut self.link_callback {
                callback(&link);
            }
        }
    }

    fn advance_segment(&mut self, document: &str) {
        self.segment_offset += document.len();
        self.segment_line += document.matches('\n').count();
    }

    fn stream_error(&self, error: ParseError) -> StreamParseError {
        let location = match &error {
            ParseError::SyntaxError(syntax) => StreamPosition {
                line: self.segment_line + syntax.line - 1,
                column: syntax.column,
                offset: self.segment_offset + syntax.offset,
                buffered: self.buffer.len() + self.current_line.len(),
            },
            _ => StreamPosition {
                line: self.segment_line,
                column: 1,
                offset: self.segment_offset,
                buffered: self.buffer.len() + self.current_line.len(),
            },
        };
        StreamParseError {
            message: error.to_string(),
            location: Some(location),
            parse_error: Some(Box::new(error)),
        }
    }

    fn fail<T>(&mut self, error: StreamParseError) -> Result<T, StreamParseError> {
        if let Some(callback) = &mut self.error_callback {
            callback(&error);
        }
        Err(error)
    }
}

/// Lazy iterator returned by [`StreamParser::parse_chunks`].
pub struct StreamIterator<I> {
    chunks: I,
    parser: StreamParser,
    ready: VecDeque<LiNo<String>>,
    finished: bool,
}

impl<I, S> Iterator for StreamIterator<I>
where
    I: Iterator<Item = S>,
    S: AsRef<str>,
{
    type Item = Result<LiNo<String>, StreamParseError>;

    fn next(&mut self) -> Option<Self::Item> {
        loop {
            if let Some(link) = self.ready.pop_front() {
                return Some(Ok(link));
            }
            if self.finished {
                return None;
            }
            match self.chunks.next() {
                Some(chunk) => match self.parser.write(chunk.as_ref()) {
                    Ok(links) => self.ready.extend(links),
                    Err(error) => {
                        self.finished = true;
                        return Some(Err(error));
                    }
                },
                None => {
                    self.finished = true;
                    match self.parser.finish() {
                        Ok(links) => self.ready.extend(links),
                        Err(error) => return Some(Err(error)),
                    }
                }
            }
        }
    }
}

fn leading_spaces(line: &str) -> usize {
    line.bytes().take_while(|byte| *byte == b' ').count()
}

fn follows(document: &[u8], position: usize, allowed: &[u8]) -> bool {
    position == 0 || allowed.contains(&document[position - 1])
}

fn structurally_complete(document: &str, comments: bool) -> bool {
    let bytes = document.as_bytes();
    let mut position = 0;
    let mut depth = 0_isize;

    while position < bytes.len() {
        let character = document[position..]
            .chars()
            .next()
            .expect("position is a character boundary");
        if matches!(character, '"' | '\'' | '`') && follows(bytes, position, BEFORE_REFERENCE) {
            let Some(end) = quoted_reference_end(document, position) else {
                return false;
            };
            position = end;
            continue;
        }
        if comments && character == '#' && follows(bytes, position, BEFORE_COMMENT) {
            match document[position..].find('\n') {
                Some(newline) => position += newline + 1,
                None => break,
            }
            continue;
        }
        if character == '(' {
            depth += 1;
        } else if character == ')' {
            depth -= 1;
        }
        position += character.len_utf8();
    }
    depth == 0
}
