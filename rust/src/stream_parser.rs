use crate::parser::{parse_document, Link};
use crate::{LiNo, ParseError};
use std::fmt;

/// Location information for parse errors
#[derive(Debug, Clone, PartialEq)]
pub struct ErrorLocation {
    pub line: usize,
    pub column: usize,
    pub offset: usize,
}

impl fmt::Display for ErrorLocation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "line {}, column {} (offset {})",
            self.line, self.column, self.offset
        )
    }
}

/// Error type for streaming parser with location information
#[derive(Debug)]
pub struct StreamParseError {
    pub message: String,
    pub location: Option<ErrorLocation>,
}

impl fmt::Display for StreamParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if let Some(ref loc) = self.location {
            write!(f, "Parse error at {}: {}", loc, self.message)
        } else {
            write!(f, "Parse error: {}", self.message)
        }
    }
}

impl std::error::Error for StreamParseError {}

impl From<ParseError> for StreamParseError {
    fn from(err: ParseError) -> Self {
        StreamParseError {
            message: err.to_string(),
            location: None,
        }
    }
}

/// Callback type for link events
pub type LinkCallback = Box<dyn FnMut(&LiNo<String>) + Send>;

/// Callback type for error events
pub type ErrorCallback = Box<dyn FnMut(&StreamParseError) + Send>;

/// Streaming parser that processes Links Notation incrementally
///
/// This parser allows you to feed data in chunks and receive callbacks
/// as links are parsed, enabling memory-efficient processing of large
/// messages.
///
/// # Example
///
/// ```rust
/// use links_notation::StreamParser;
///
/// let mut parser = StreamParser::new();
///
/// // Set up link callback
/// parser.on_link(|link| {
///     println!("Parsed link: {:?}", link);
/// });
///
/// // Set up error callback
/// parser.on_error(|error| {
///     eprintln!("Parse error: {}", error);
/// });
///
/// // Feed data incrementally
/// parser.write("papa (lovesMama: ").unwrap();
/// parser.write("loves mama)\n").unwrap();
/// parser.write("son lovesMama\n").unwrap();
///
/// // Finish parsing
/// let links = parser.finish().unwrap();
/// ```
pub struct StreamParser {
    buffer: String,
    link_callback: Option<LinkCallback>,
    error_callback: Option<ErrorCallback>,
    line_offset: usize,
    char_offset: usize,
    pending_links: Vec<LiNo<String>>,
}

impl Default for StreamParser {
    fn default() -> Self {
        Self::new()
    }
}

impl StreamParser {
    /// Create a new streaming parser
    pub fn new() -> Self {
        StreamParser {
            buffer: String::new(),
            link_callback: None,
            error_callback: None,
            line_offset: 1,
            char_offset: 0,
            pending_links: Vec::new(),
        }
    }

    /// Set callback for parsed links
    ///
    /// The callback will be invoked each time a complete link is parsed.
    pub fn on_link<F>(&mut self, callback: F)
    where
        F: FnMut(&LiNo<String>) + Send + 'static,
    {
        self.link_callback = Some(Box::new(callback));
    }

    /// Set callback for parse errors
    ///
    /// The callback will be invoked when a parse error occurs,
    /// with location information when available.
    pub fn on_error<F>(&mut self, callback: F)
    where
        F: FnMut(&StreamParseError) + Send + 'static,
    {
        self.error_callback = Some(Box::new(callback));
    }

    /// Write a chunk of data to the parser
    ///
    /// This method attempts to parse complete links from the buffer.
    /// Links are parsed incrementally line-by-line when possible.
    ///
    /// # Errors
    ///
    /// Returns an error if parsing fails. The error will include
    /// location information when available.
    pub fn write(&mut self, chunk: &str) -> Result<(), StreamParseError> {
        self.buffer.push_str(chunk);
        self.try_parse_incremental()?;
        Ok(())
    }

    /// Try to parse complete links from the buffer incrementally
    fn try_parse_incremental(&mut self) -> Result<(), StreamParseError> {
        // Try to parse line by line for simple cases
        // We look for complete lines (ending with \n)
        while let Some(newline_pos) = self.buffer.find('\n') {
            let line_with_newline = &self.buffer[..=newline_pos];

            // Check if this line looks complete (not part of a multi-line structure)
            // We do a simple heuristic: count open/close parens
            let open_parens = line_with_newline.matches('(').count();
            let close_parens = line_with_newline.matches(')').count();

            // If parens are balanced and we have a complete line, try to parse it
            if open_parens == close_parens {
                let line_to_parse = line_with_newline.to_string();

                // Try to parse this line
                match parse_document(&line_to_parse) {
                    Ok((remaining, links)) => {
                        if remaining.is_empty() {
                            // Successfully parsed the line
                            for internal_link in links {
                                let lino = Self::convert_link_to_lino(&internal_link);
                                self.pending_links.push(lino.clone());

                                // Call the callback if set
                                if let Some(ref mut callback) = self.link_callback {
                                    callback(&lino);
                                }
                            }

                            // Remove the parsed line from buffer
                            self.buffer.drain(..=newline_pos);
                            self.line_offset += 1;
                            self.char_offset = 0;
                            continue;
                        }
                    }
                    Err(_) => {
                        // If parsing fails, it might be part of a larger structure
                        // Break and wait for more data
                        break;
                    }
                }
            }

            // If we can't parse this line yet, break and wait for more data
            break;
        }

        Ok(())
    }

    /// Finish parsing and return all parsed links
    ///
    /// This method should be called after all data has been written.
    /// It attempts to parse any remaining data in the buffer.
    ///
    /// # Errors
    ///
    /// Returns an error if there is unparsed data in the buffer
    /// or if the final parse fails.
    pub fn finish(mut self) -> Result<Vec<LiNo<String>>, StreamParseError> {
        // If there's any remaining data in the buffer, try to parse it
        if !self.buffer.is_empty() {
            let remaining = self.buffer.trim();
            if !remaining.is_empty() {
                match parse_document(remaining) {
                    Ok((leftover, links)) => {
                        if !leftover.is_empty() {
                            let error = StreamParseError {
                                message: format!("Unexpected content: {}", leftover),
                                location: Some(ErrorLocation {
                                    line: self.line_offset,
                                    column: self.char_offset,
                                    offset: self.buffer.len() - leftover.len(),
                                }),
                            };
                            if let Some(ref mut callback) = self.error_callback {
                                callback(&error);
                            }
                            return Err(error);
                        }

                        for internal_link in links {
                            let lino = Self::convert_link_to_lino(&internal_link);
                            self.pending_links.push(lino.clone());

                            if let Some(ref mut callback) = self.link_callback {
                                callback(&lino);
                            }
                        }
                    }
                    Err(e) => {
                        let error = StreamParseError {
                            message: format!("Failed to parse remaining data: {}", e),
                            location: Some(ErrorLocation {
                                line: self.line_offset,
                                column: self.char_offset,
                                offset: 0,
                            }),
                        };
                        if let Some(ref mut callback) = self.error_callback {
                            callback(&error);
                        }
                        return Err(error);
                    }
                }
            }
        }

        Ok(self.pending_links)
    }

    /// Convert internal Link representation to public LiNo type
    fn convert_link_to_lino(link: &Link) -> LiNo<String> {
        if link.values.is_empty() && link.children.is_empty() {
            // Simple reference
            if let Some(ref id) = link.id {
                LiNo::Ref(id.clone())
            } else {
                LiNo::Link {
                    id: None,
                    values: vec![],
                }
            }
        } else {
            // Link with values
            let mut all_values = Vec::new();

            // Add regular values
            for value in &link.values {
                all_values.push(Self::convert_link_to_lino(value));
            }

            // Add children as values (for indented syntax)
            for child in &link.children {
                all_values.push(Self::convert_link_to_lino(child));
            }

            LiNo::Link {
                id: link.id.clone(),
                values: all_values,
            }
        }
    }

    /// Get the current parsing position for error reporting
    pub fn position(&self) -> ErrorLocation {
        ErrorLocation {
            line: self.line_offset,
            column: self.char_offset,
            offset: self.buffer.len(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[test]
    fn test_stream_parser_simple() {
        let mut parser = StreamParser::new();
        let links_received = Arc::new(Mutex::new(Vec::new()));
        let links_clone = Arc::clone(&links_received);

        parser.on_link(move |link| {
            links_clone.lock().unwrap().push(format!("{:?}", link));
        });

        parser.write("papa loves mama\n").unwrap();
        parser.write("son loves papa\n").unwrap();

        let result = parser.finish().unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(links_received.lock().unwrap().len(), 2);
    }

    #[test]
    fn test_stream_parser_incremental() {
        let mut parser = StreamParser::new();
        let count = Arc::new(Mutex::new(0));
        let count_clone = Arc::clone(&count);

        parser.on_link(move |_link| {
            *count_clone.lock().unwrap() += 1;
        });

        // Feed data in small chunks
        parser.write("papa ").unwrap();
        parser.write("(loves").unwrap();
        parser.write("Mama: ").unwrap();
        parser.write("loves ").unwrap();
        parser.write("mama)\n").unwrap();

        let result = parser.finish().unwrap();
        assert!(result.len() >= 1);
        assert!(*count.lock().unwrap() >= 1);
    }

    #[test]
    fn test_stream_parser_error_callback() {
        let mut parser = StreamParser::new();
        let error_received = Arc::new(Mutex::new(false));
        let error_clone = Arc::clone(&error_received);

        parser.on_error(move |_error| {
            *error_clone.lock().unwrap() = true;
        });

        parser.write("papa (loves mama\n").unwrap(); // Missing closing paren

        let result = parser.finish();
        // Should have error due to unbalanced parentheses
        assert!(result.is_err() || *error_received.lock().unwrap());
    }

    #[test]
    fn test_stream_parser_multiline() {
        let mut parser = StreamParser::new();

        parser.write("3:\n").unwrap();
        parser.write("  papa\n").unwrap();
        parser.write("  loves\n").unwrap();
        parser.write("  mama\n").unwrap();

        let result = parser.finish().unwrap();
        assert!(result.len() >= 1);
    }

    #[test]
    fn test_stream_parser_without_callbacks() {
        let mut parser = StreamParser::new();

        parser.write("papa loves mama\n").unwrap();
        parser.write("son loves papa\n").unwrap();

        let result = parser.finish().unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_stream_parser_position_tracking() {
        let parser = StreamParser::new();
        let pos = parser.position();
        assert_eq!(pos.line, 1);
        assert_eq!(pos.column, 0);
    }
}
