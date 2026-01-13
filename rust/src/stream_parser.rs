//! Streaming parser for Links Notation (Lino)
//!
//! This module provides a streaming parser that allows processing data incrementally
//! and emitting parsed links as they become available, without loading the entire
//! input into memory.
//!
//! # Example
//!
//! ```
//! use links_notation::stream_parser::StreamParser;
//!
//! let mut parser = StreamParser::new();
//!
//! parser.on_link(|link| {
//!     println!("{:?}", link);
//! });
//!
//! parser.write("papa lovesMama\n")?;
//! parser.write("son follows\n")?;
//! let links = parser.finish()?;
//! # Ok::<(), links_notation::stream_parser::StreamParseError>(())
//! ```

use crate::parser;
use crate::LiNo;
use std::error::Error as StdError;
use std::fmt;

/// Error type for streaming parser
#[derive(Debug, Clone)]
pub struct StreamParseError {
    /// Error message
    pub message: String,
    /// Line number (1-based)
    pub line: Option<usize>,
    /// Column number (1-based)
    pub column: Option<usize>,
    /// Byte offset in the input
    pub offset: Option<usize>,
}

impl StreamParseError {
    /// Create a new error without location info
    pub fn new(message: impl Into<String>) -> Self {
        StreamParseError {
            message: message.into(),
            line: None,
            column: None,
            offset: None,
        }
    }

    /// Create a new error with location info
    pub fn with_location(
        message: impl Into<String>,
        line: usize,
        column: usize,
        offset: Option<usize>,
    ) -> Self {
        StreamParseError {
            message: message.into(),
            line: Some(line),
            column: Some(column),
            offset,
        }
    }
}

impl fmt::Display for StreamParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match (self.line, self.column) {
            (Some(line), Some(column)) => {
                write!(
                    f,
                    "ParseError at line {}, column {}: {}",
                    line, column, self.message
                )
            }
            _ => write!(f, "ParseError: {}", self.message),
        }
    }
}

impl StdError for StreamParseError {}

/// Position in the input stream
#[derive(Debug, Clone, Copy, Default)]
pub struct Position {
    /// Line number (1-based)
    pub line: usize,
    /// Column number (1-based)
    pub column: usize,
    /// Byte offset
    pub offset: usize,
}

impl Position {
    /// Create a new position at the start of the input
    pub fn new() -> Self {
        Position {
            line: 1,
            column: 1,
            offset: 0,
        }
    }
}

// Type aliases for callback functions to avoid clippy type_complexity warnings
type LinkCallback = Box<dyn FnMut(&LiNo<String>)>;
type ErrorCallback = Box<dyn FnMut(&StreamParseError)>;

/// Streaming parser for Links Notation
///
/// Allows processing data incrementally and emitting parsed links
/// as they become available.
pub struct StreamParser {
    /// Buffer for incomplete input
    buffer: String,
    /// Total bytes received
    total_bytes: usize,
    /// Current line number
    current_line: usize,
    /// Current column number
    current_column: usize,
    /// Line offsets for position calculation
    line_offsets: Vec<usize>,
    /// Maximum input size in bytes
    max_input_size: usize,
    /// Parsed links
    links: Vec<LiNo<String>>,
    /// Whether the parser has ended
    ended: bool,
    /// Link callback
    on_link_callback: Option<LinkCallback>,
    /// Error callback
    on_error_callback: Option<ErrorCallback>,
}

impl Default for StreamParser {
    fn default() -> Self {
        Self::new()
    }
}

impl StreamParser {
    /// Create a new StreamParser with default options
    pub fn new() -> Self {
        StreamParser {
            buffer: String::new(),
            total_bytes: 0,
            current_line: 1,
            current_column: 1,
            line_offsets: vec![0],
            max_input_size: 10 * 1024 * 1024, // 10MB default
            links: Vec::new(),
            ended: false,
            on_link_callback: None,
            on_error_callback: None,
        }
    }

    /// Create a new StreamParser with custom max input size
    pub fn with_max_size(max_input_size: usize) -> Self {
        let mut parser = Self::new();
        parser.max_input_size = max_input_size;
        parser
    }

    /// Set the callback for when a link is parsed
    ///
    /// # Example
    ///
    /// ```
    /// use links_notation::stream_parser::StreamParser;
    ///
    /// let mut parser = StreamParser::new();
    /// parser.on_link(|link| {
    ///     println!("Parsed: {:?}", link);
    /// });
    /// ```
    pub fn on_link<F>(&mut self, callback: F)
    where
        F: FnMut(&LiNo<String>) + 'static,
    {
        self.on_link_callback = Some(Box::new(callback));
    }

    /// Set the callback for when an error occurs
    ///
    /// # Example
    ///
    /// ```
    /// use links_notation::stream_parser::StreamParser;
    ///
    /// let mut parser = StreamParser::new();
    /// parser.on_error(|error| {
    ///     eprintln!("Error at line {}: {}", error.line.unwrap_or(0), error.message);
    /// });
    /// ```
    pub fn on_error<F>(&mut self, callback: F)
    where
        F: FnMut(&StreamParseError) + 'static,
    {
        self.on_error_callback = Some(Box::new(callback));
    }

    /// Write a chunk of data to the parser
    ///
    /// # Arguments
    ///
    /// * `chunk` - The string chunk to process
    ///
    /// # Returns
    ///
    /// Ok(()) if successful, or an error if the parser has ended or input exceeds max size
    ///
    /// # Example
    ///
    /// ```
    /// use links_notation::stream_parser::StreamParser;
    ///
    /// let mut parser = StreamParser::new();
    /// parser.write("hello world\n")?;
    /// parser.write("another line\n")?;
    /// # Ok::<(), links_notation::stream_parser::StreamParseError>(())
    /// ```
    pub fn write(&mut self, chunk: &str) -> Result<(), StreamParseError> {
        if self.ended {
            return Err(StreamParseError::new(
                "Cannot write to a parser that has ended",
            ));
        }

        // Check total size
        if self.buffer.len() + chunk.len() > self.max_input_size {
            let error = StreamParseError::with_location(
                format!(
                    "Input size exceeds maximum allowed size of {} bytes",
                    self.max_input_size
                ),
                self.current_line,
                self.current_column,
                Some(self.total_bytes),
            );
            self.emit_error(&error);
            return Err(error);
        }

        self.buffer.push_str(chunk);

        // Try to parse complete elements
        self.process_buffer();

        Ok(())
    }

    /// Process buffered data and emit links for complete elements
    fn process_buffer(&mut self) {
        let safe_point = self.find_safe_parse_point();

        if safe_point > 0 {
            let to_parse = self.buffer[..safe_point].to_string();
            self.buffer = self.buffer[safe_point..].to_string();

            self.parse_and_emit(&to_parse);
        }
    }

    /// Find the last safe point to parse (end of a complete top-level element)
    fn find_safe_parse_point(&self) -> usize {
        let buffer = &self.buffer;

        if buffer.is_empty() {
            return 0;
        }

        let mut last_safe_point = 0;
        let mut i = 0;
        let mut in_parentheses = 0;
        let mut base_indentation: Option<usize> = None;
        let mut line_start = 0;
        let mut in_quote = false;
        let mut quote_char: Option<char> = None;
        let mut quote_count = 0;

        let chars: Vec<char> = buffer.chars().collect();

        while i < chars.len() {
            let char = chars[i];

            // Track quote state for proper parsing
            if !in_quote && (char == '"' || char == '\'' || char == '`') {
                // Count consecutive quotes
                quote_char = Some(char);
                quote_count = 0;
                let mut j = i;
                while j < chars.len() && chars[j] == char {
                    quote_count += 1;
                    j += 1;
                }
                if quote_count > 0 {
                    in_quote = true;
                    i = j;
                    continue;
                }
            } else if in_quote && quote_char == Some(char) {
                // Check for closing quotes
                let mut count = 0;
                let mut j = i;
                while j < chars.len() && chars[j] == char {
                    count += 1;
                    j += 1;
                }
                // Check if this is an escape (2*N) or close (N)
                if count == quote_count * 2 {
                    // Escape sequence - skip
                    i = j;
                    continue;
                } else if count >= quote_count {
                    // Closing quote
                    in_quote = false;
                    quote_char = None;
                    i += quote_count;
                    continue;
                }
            }

            if in_quote {
                i += 1;
                continue;
            }

            // Track parentheses
            if char == '(' {
                in_parentheses += 1;
            } else if char == ')' {
                in_parentheses -= 1;
            }

            // Track line boundaries and indentation
            if char == '\n' {
                // Check if this ends a complete top-level element
                if in_parentheses == 0 {
                    // Check indentation of next line
                    let mut next_indent: usize = 0;
                    let mut j = i + 1;
                    while j < chars.len() && chars[j] == ' ' {
                        next_indent += 1;
                        j += 1;
                    }

                    // Check if we have content on next line
                    if j < chars.len() && chars[j] != '\n' && chars[j] != '\r' {
                        // First non-empty line sets base indentation
                        if base_indentation.is_none() && line_start == 0 {
                            let mut first_content_indent = 0;
                            let mut k = 0;
                            while k < chars.len() && chars[k] == ' ' {
                                first_content_indent += 1;
                                k += 1;
                            }
                            base_indentation = Some(first_content_indent);
                        }

                        // If next line is at base indentation, this could be a new top-level element
                        let normalized_next = base_indentation
                            .map(|base| next_indent.saturating_sub(base))
                            .unwrap_or(next_indent);

                        if normalized_next == 0 {
                            // This line boundary is a safe parse point
                            last_safe_point = i + 1;
                        }
                    }
                }

                line_start = i + 1;
            }

            i += 1;
        }

        // If buffer ends with newline and no unclosed parens, it's safe
        if buffer.ends_with('\n') && in_parentheses == 0 && !in_quote {
            last_safe_point = buffer.len();
        }

        last_safe_point
    }

    /// Parse text and emit resulting links
    fn parse_and_emit(&mut self, text: &str) {
        if text.trim().is_empty() {
            self.update_position(text);
            return;
        }

        match parser::parse_document(text) {
            Ok((_, raw_links)) => {
                let links = self.flatten_links(raw_links);

                for link in links {
                    self.links.push(link.clone());
                    self.emit_link(&link);
                }
            }
            Err(e) => {
                let error = StreamParseError::with_location(
                    format!("{:?}", e),
                    self.current_line,
                    self.current_column,
                    Some(self.total_bytes),
                );
                self.emit_error(&error);
            }
        }

        self.update_position(text);
    }

    /// Update position tracking based on processed text
    fn update_position(&mut self, text: &str) {
        for char in text.chars() {
            if char == '\n' {
                self.current_line += 1;
                self.current_column = 1;
                self.line_offsets.push(self.total_bytes);
            } else {
                self.current_column += 1;
            }
            self.total_bytes += char.len_utf8();
        }
    }

    /// Emit a link to the callback
    fn emit_link(&mut self, link: &LiNo<String>) {
        if let Some(ref mut callback) = self.on_link_callback {
            callback(link);
        }
    }

    /// Emit an error to the callback
    fn emit_error(&mut self, error: &StreamParseError) {
        if let Some(ref mut callback) = self.on_error_callback {
            callback(error);
        }
    }

    /// Flatten parser::Link into LiNo<String>
    fn flatten_links(&self, links: Vec<parser::Link>) -> Vec<LiNo<String>> {
        let mut result = vec![];

        for link in links {
            self.flatten_link_recursive(&link, None, &mut result);
        }

        result
    }

    /// Recursive helper for flattening links
    fn flatten_link_recursive(
        &self,
        link: &parser::Link,
        parent: Option<&LiNo<String>>,
        result: &mut Vec<LiNo<String>>,
    ) {
        // Special case: If this is an indented ID with children
        if link.is_indented_id
            && link.id.is_some()
            && link.values.is_empty()
            && !link.children.is_empty()
        {
            let child_values: Vec<LiNo<String>> = link
                .children
                .iter()
                .map(|child| {
                    if child.values.len() == 1
                        && child.values[0].values.is_empty()
                        && child.values[0].children.is_empty()
                    {
                        if let Some(ref id) = child.values[0].id {
                            LiNo::Ref(id.clone())
                        } else {
                            parser::Link {
                                id: child.id.clone(),
                                values: child.values.clone(),
                                children: vec![],
                                is_indented_id: false,
                            }
                            .into()
                        }
                    } else {
                        parser::Link {
                            id: child.id.clone(),
                            values: child.values.clone(),
                            children: vec![],
                            is_indented_id: false,
                        }
                        .into()
                    }
                })
                .collect();

            let current = LiNo::Link {
                id: link.id.clone(),
                values: child_values,
            };

            let combined = if let Some(parent) = parent {
                let wrapped_parent = match parent {
                    LiNo::Ref(ref_id) => LiNo::Link {
                        id: None,
                        values: vec![LiNo::Ref(ref_id.clone())],
                    },
                    link => link.clone(),
                };

                LiNo::Link {
                    id: None,
                    values: vec![wrapped_parent, current],
                }
            } else {
                current
            };

            result.push(combined);
            return;
        }

        // Create the current link without children
        let current: LiNo<String> = if link.values.is_empty() {
            if let Some(id) = &link.id {
                LiNo::Ref(id.clone())
            } else {
                LiNo::Link {
                    id: None,
                    values: vec![],
                }
            }
        } else {
            let values: Vec<LiNo<String>> = link
                .values
                .iter()
                .map(|v| {
                    parser::Link {
                        id: v.id.clone(),
                        values: v.values.clone(),
                        children: vec![],
                        is_indented_id: false,
                    }
                    .into()
                })
                .collect();
            LiNo::Link {
                id: link.id.clone(),
                values,
            }
        };

        // Create the combined link with parent
        let combined = if let Some(parent) = parent {
            let wrapped_parent = match parent {
                LiNo::Ref(ref_id) => LiNo::Link {
                    id: None,
                    values: vec![LiNo::Ref(ref_id.clone())],
                },
                link => link.clone(),
            };

            let wrapped_current = match &current {
                LiNo::Ref(ref_id) => LiNo::Link {
                    id: None,
                    values: vec![LiNo::Ref(ref_id.clone())],
                },
                link => link.clone(),
            };

            LiNo::Link {
                id: None,
                values: vec![wrapped_parent, wrapped_current],
            }
        } else {
            current.clone()
        };

        result.push(combined.clone());

        // Process children
        for child in &link.children {
            self.flatten_link_recursive(child, Some(&combined), result);
        }
    }

    /// Signal end of input and finish parsing
    ///
    /// # Returns
    ///
    /// All parsed links
    ///
    /// # Example
    ///
    /// ```
    /// use links_notation::stream_parser::StreamParser;
    ///
    /// let mut parser = StreamParser::new();
    /// parser.write("hello world\n")?;
    /// let links = parser.finish()?;
    /// # Ok::<(), links_notation::stream_parser::StreamParseError>(())
    /// ```
    pub fn finish(&mut self) -> Result<Vec<LiNo<String>>, StreamParseError> {
        if self.ended {
            return Ok(self.links.clone());
        }

        self.ended = true;

        // Parse any remaining buffered content
        if !self.buffer.trim().is_empty() {
            let remaining = std::mem::take(&mut self.buffer);
            self.parse_and_emit(&remaining);
        }

        Ok(self.links.clone())
    }

    /// Reset the parser for reuse
    pub fn reset(&mut self) {
        self.buffer = String::new();
        self.total_bytes = 0;
        self.current_line = 1;
        self.current_column = 1;
        self.line_offsets = vec![0];
        self.links = Vec::new();
        self.ended = false;
    }

    /// Get all links parsed so far
    pub fn get_links(&self) -> &[LiNo<String>] {
        &self.links
    }

    /// Get current parser position
    pub fn get_position(&self) -> Position {
        Position {
            line: self.current_line,
            column: self.current_column,
            offset: self.total_bytes,
        }
    }

    /// Check if the parser has ended
    pub fn is_ended(&self) -> bool {
        self.ended
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::rc::Rc;

    #[test]
    fn test_basic_parsing() {
        let mut parser = StreamParser::new();
        parser.write("a b c\n").unwrap();
        let links = parser.finish().unwrap();

        assert_eq!(links.len(), 1);
    }

    #[test]
    fn test_multiline_incremental() {
        let mut parser = StreamParser::new();
        let count = Rc::new(RefCell::new(0));
        let count_clone = count.clone();

        parser.on_link(move |_| {
            *count_clone.borrow_mut() += 1;
        });

        parser.write("line1 value1\n").unwrap();
        parser.write("line2 value2\n").unwrap();
        parser.finish().unwrap();

        assert_eq!(*count.borrow(), 2);
    }

    #[test]
    fn test_parenthesized_link() {
        let mut parser = StreamParser::new();
        parser.write("(id: value1 value2)\n").unwrap();
        let links = parser.finish().unwrap();

        assert_eq!(links.len(), 1);
        if let LiNo::Link { id, values } = &links[0] {
            assert_eq!(id.as_ref().unwrap(), "id");
            assert_eq!(values.len(), 2);
        } else {
            panic!("Expected Link");
        }
    }

    #[test]
    fn test_empty_input() {
        let mut parser = StreamParser::new();
        let links = parser.finish().unwrap();

        assert_eq!(links.len(), 0);
    }

    #[test]
    fn test_buffering_incomplete() {
        let mut parser = StreamParser::new();

        // Write incomplete parenthesized expression
        parser.write("(id: val").unwrap();
        // Check internal links (not emitted yet)
        assert_eq!(parser.get_links().len(), 0);

        // Complete the expression
        parser.write("ue)\n").unwrap();
        let links = parser.finish().unwrap();

        assert_eq!(links.len(), 1);
    }

    #[test]
    fn test_write_after_end() {
        let mut parser = StreamParser::new();
        parser.finish().unwrap();

        let result = parser.write("more data");
        assert!(result.is_err());
    }

    #[test]
    fn test_max_size_exceeded() {
        let mut parser = StreamParser::with_max_size(100);

        let large_input = "x".repeat(200);
        let result = parser.write(&large_input);

        assert!(result.is_err());
    }

    #[test]
    fn test_reset() {
        let mut parser = StreamParser::new();
        parser.write("test\n").unwrap();
        parser.finish().unwrap();

        parser.reset();

        assert!(!parser.is_ended());
        assert_eq!(parser.get_links().len(), 0);

        parser.write("new\n").unwrap();
        let links = parser.finish().unwrap();
        assert_eq!(links.len(), 1);
    }

    #[test]
    fn test_position_tracking() {
        let mut parser = StreamParser::new();
        parser.write("first line\n").unwrap();

        let pos = parser.get_position();
        assert_eq!(pos.line, 2);

        parser.write("second line\n").unwrap();
        let pos = parser.get_position();
        assert_eq!(pos.line, 3);
    }

    #[test]
    fn test_error_callback() {
        let mut parser = StreamParser::new();
        let error_received = Rc::new(RefCell::new(false));
        let error_received_clone = error_received.clone();

        parser.on_error(move |_| {
            *error_received_clone.borrow_mut() = true;
        });

        // Unclosed parenthesis
        parser.write("(unclosed\n").unwrap();
        parser.finish().unwrap();

        assert!(*error_received.borrow());
    }

    #[test]
    fn test_indented_syntax() {
        let mut parser = StreamParser::new();
        parser.write("id:\n  value1\n  value2\n").unwrap();
        let links = parser.finish().unwrap();

        assert_eq!(links.len(), 1);
        if let LiNo::Link { id, values } = &links[0] {
            assert_eq!(id.as_ref().unwrap(), "id");
            assert_eq!(values.len(), 2);
        } else {
            panic!("Expected Link");
        }
    }

    #[test]
    fn test_quoted_strings() {
        let mut parser = StreamParser::new();
        parser.write("(\"quoted id\": value1 value2)\n").unwrap();
        let links = parser.finish().unwrap();

        assert_eq!(links.len(), 1);
        if let LiNo::Link { id, values } = &links[0] {
            assert_eq!(id.as_ref().unwrap(), "quoted id");
            assert_eq!(values.len(), 2);
        } else {
            panic!("Expected Link");
        }
    }

    #[test]
    fn test_use_case_from_issue() {
        let mut parser = StreamParser::new();
        let parsed_links = Rc::new(RefCell::new(Vec::new()));
        let parsed_links_clone = parsed_links.clone();

        parser.on_link(move |link| {
            parsed_links_clone.borrow_mut().push(link.clone());
        });

        // Feed data incrementally
        parser.write("papa (lovesMama: loves mama)\n").unwrap();
        parser.write("son lovesMama\n").unwrap();
        let final_links = parser.finish().unwrap();

        assert_eq!(parsed_links.borrow().len(), 2);
        assert_eq!(final_links.len(), 2);
    }
}
