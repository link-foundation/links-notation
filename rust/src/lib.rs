pub mod parser;
pub mod format_config;
pub mod tokenizer;

use std::fmt;
use std::error::Error as StdError;
pub use tokenizer::{Tokenizer, DEFAULT_PUNCTUATION_SYMBOLS, DEFAULT_MATH_SYMBOLS};

/// Error type for Lino parsing
#[derive(Debug)]
pub enum ParseError {
    /// Input string is empty or contains only whitespace
    EmptyInput,
    /// Syntax error during parsing
    SyntaxError(String),
    /// Internal parser error
    InternalError(String),
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ParseError::EmptyInput => write!(f, "Empty input"),
            ParseError::SyntaxError(msg) => write!(f, "Syntax error: {}", msg),
            ParseError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl StdError for ParseError {}

#[derive(Debug, Clone, PartialEq)]
pub enum LiNo<T> {
    Link { id: Option<T>, values: Vec<Self> },
    Ref(T),
}

impl<T> LiNo<T> {
    pub fn is_ref(&self) -> bool {
        matches!(self, LiNo::Ref(_))
    }

    pub fn is_link(&self) -> bool {
        matches!(self, LiNo::Link { .. })
    }
}

impl<T: ToString> fmt::Display for LiNo<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LiNo::Ref(value) => write!(f, "{}", value.to_string()),
            LiNo::Link { id, values } => {
                let id_str = id
                    .as_ref()
                    .map(|id| format!("{}: ", id.to_string()))
                    .unwrap_or_default();

                if f.alternate() {
                    // Format top-level as lines
                    let lines = values
                        .iter()
                        .map(|value| {
                            // For alternate formatting, ensure standalone references are wrapped in parentheses
                            // so that flattened structures like indented blocks render as "(ref)" lines
                            match value {
                                LiNo::Ref(_) => format!("{}({})", id_str, value),
                                _ => format!("{}{}", id_str, value),
                            }
                        })
                        .collect::<Vec<_>>()
                        .join("\n");
                    write!(f, "{}", lines)
                } else {
                    let values_str = values
                        .iter()
                        .map(|value| value.to_string())
                        .collect::<Vec<_>>()
                        .join(" ");
                    write!(f, "({}{})", id_str, values_str)
                }
            }
        }
    }
}

// Convert from parser::Link to LiNo (without flattening)
impl From<parser::Link> for LiNo<String> {
    fn from(link: parser::Link) -> Self {
        if link.values.is_empty() && link.children.is_empty() {
            if let Some(id) = link.id {
                LiNo::Ref(id)
            } else {
                LiNo::Link { id: None, values: vec![] }
            }
        } else {
            let values: Vec<LiNo<String>> = link.values.into_iter().map(|v| v.into()).collect();
            LiNo::Link { id: link.id, values }
        }
    }
}

// Helper function to flatten indented structures according to Lino spec
fn flatten_links(links: Vec<parser::Link>) -> Vec<LiNo<String>> {
    let mut result = vec![];
    
    for link in links {
        flatten_link_recursive(&link, None, &mut result);
    }
    
    result
}

fn flatten_link_recursive(link: &parser::Link, parent: Option<&LiNo<String>>, result: &mut Vec<LiNo<String>>) {
    // Special case: If this is an indented ID (with colon) with children,
    // the children should become the values of the link (indented ID syntax)
    if link.is_indented_id && link.id.is_some() && link.values.is_empty() && !link.children.is_empty() {
        let child_values: Vec<LiNo<String>> = link.children.iter().map(|child| {
            // For indented children, if they have single values, extract them
            if child.values.len() == 1 && child.values[0].values.is_empty() && child.values[0].children.is_empty() {
                // Use if let to safely extract the ID instead of unwrap()
                if let Some(ref id) = child.values[0].id {
                    LiNo::Ref(id.clone())
                } else {
                    // If no ID, create an empty link
                    parser::Link {
                        id: child.id.clone(),
                        values: child.values.clone(),
                        children: vec![],
                        is_indented_id: false,
                    }.into()
                }
            } else {
                parser::Link {
                    id: child.id.clone(),
                    values: child.values.clone(),
                    children: vec![],
                    is_indented_id: false,
                }.into()
            }
        }).collect();
        
        let current = LiNo::Link {
            id: link.id.clone(),
            values: child_values
        };

        let combined = if let Some(parent) = parent {
            // Wrap parent in parentheses if it's a reference
            let wrapped_parent = match parent {
                LiNo::Ref(ref_id) => LiNo::Link { id: None, values: vec![LiNo::Ref(ref_id.clone())] },
                link => link.clone()
            };

            LiNo::Link {
                id: None,
                values: vec![wrapped_parent, current]
            }
        } else {
            current
        };

        result.push(combined);
        return; // Don't process children again
    }
    
    // Create the current link without children
    let current = if link.values.is_empty() {
        if let Some(id) = &link.id {
            LiNo::Ref(id.clone())
        } else {
            LiNo::Link { id: None, values: vec![] }
        }
    } else {
        let values: Vec<LiNo<String>> = link.values.iter().map(|v| {
            parser::Link {
                id: v.id.clone(),
                values: v.values.clone(),
                children: vec![],
                is_indented_id: false,
            }.into()
        }).collect();
        LiNo::Link { id: link.id.clone(), values }
    };
    
    // Create the combined link (parent + current) with proper wrapping
    let combined = if let Some(parent) = parent {
        // Wrap parent in parentheses if it's a reference
        let wrapped_parent = match parent {
            LiNo::Ref(ref_id) => LiNo::Link { id: None, values: vec![LiNo::Ref(ref_id.clone())] },
            link => link.clone()
        };

        // Wrap current in parentheses if it's a reference
        let wrapped_current = match &current {
            LiNo::Ref(ref_id) => LiNo::Link { id: None, values: vec![LiNo::Ref(ref_id.clone())] },
            link => link.clone()
        };

        LiNo::Link {
            id: None,
            values: vec![wrapped_parent, wrapped_current]
        }
    } else {
        current.clone()
    };

    result.push(combined.clone());

    // Process children
    for child in &link.children {
        flatten_link_recursive(child, Some(&combined), result);
    }
}

/// Parse a Lino document with default tokenization enabled.
/// This tokenizes punctuation and math symbols as separate references.
pub fn parse_lino(document: &str) -> Result<LiNo<String>, ParseError> {
    parse_lino_with_tokenizer(document, &Tokenizer::new())
}

/// Parse a Lino document with a custom tokenizer.
pub fn parse_lino_with_tokenizer(document: &str, tokenizer: &Tokenizer) -> Result<LiNo<String>, ParseError> {
    // Handle empty or whitespace-only input by returning empty result
    if document.trim().is_empty() {
        return Ok(LiNo::Link { id: None, values: vec![] });
    }

    // Apply tokenization
    let tokenized = tokenizer.tokenize(document);

    match parser::parse_document(&tokenized) {
        Ok((_, links)) => {
            if links.is_empty() {
                Ok(LiNo::Link { id: None, values: vec![] })
            } else {
                // Flatten the indented structure according to Lino spec
                let flattened = flatten_links(links);
                Ok(LiNo::Link { id: None, values: flattened })
            }
        }
        Err(e) => Err(ParseError::SyntaxError(format!("{:?}", e)))
    }
}

/// Parse a Lino document without tokenization (backward compatible).
pub fn parse_lino_raw(document: &str) -> Result<LiNo<String>, ParseError> {
    parse_lino_with_tokenizer(document, &Tokenizer::disabled())
}

/// Parse Lino notation to a collection of links (matches C# and JS API).
/// This uses default tokenization.
pub fn parse_lino_to_links(document: &str) -> Result<Vec<LiNo<String>>, ParseError> {
    parse_lino_to_links_with_tokenizer(document, &Tokenizer::new())
}

/// Parse Lino notation to a collection of links with a custom tokenizer.
pub fn parse_lino_to_links_with_tokenizer(document: &str, tokenizer: &Tokenizer) -> Result<Vec<LiNo<String>>, ParseError> {
    // Handle empty or whitespace-only input by returning empty collection
    if document.trim().is_empty() {
        return Ok(vec![]);
    }

    // Apply tokenization
    let tokenized = tokenizer.tokenize(document);

    match parser::parse_document(&tokenized) {
        Ok((_, links)) => {
            if links.is_empty() {
                Ok(vec![])
            } else {
                // Flatten the indented structure according to Lino spec
                let flattened = flatten_links(links);
                Ok(flattened)
            }
        }
        Err(e) => Err(ParseError::SyntaxError(format!("{:?}", e)))
    }
}

/// Parse Lino notation to a collection of links without tokenization (backward compatible).
pub fn parse_lino_to_links_raw(document: &str) -> Result<Vec<LiNo<String>>, ParseError> {
    parse_lino_to_links_with_tokenizer(document, &Tokenizer::disabled())
}

/// Formats a collection of LiNo links as a multi-line string.
/// Each link is formatted on a separate line.
pub fn format_links(links: &[LiNo<String>]) -> String {
    links.iter()
        .map(|link| format!("{}", link))
        .collect::<Vec<_>>()
        .join("\n")
}

/// Formats a collection of LiNo links with compact symbols (no spaces around punctuation/math).
/// This is useful for making output more human-readable.
pub fn format_links_compact(links: &[LiNo<String>]) -> String {
    let tokenizer = Tokenizer::new();
    let formatted = format_links(links);
    tokenizer.compact(&formatted)
}

