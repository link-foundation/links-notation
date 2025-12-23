pub mod format_config;
pub mod parser;

use format_config::FormatConfig;
use std::error::Error as StdError;
use std::fmt;

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

/// Error type for accessing `id` on a multi-reference Link.
#[derive(Debug, Clone, PartialEq)]
pub struct MultiRefError {
    pub count: usize,
}

impl fmt::Display for MultiRefError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "This link has a multi-reference id with {} parts. Use 'ids()' instead of 'id()'.",
            self.count
        )
    }
}

impl StdError for MultiRefError {}

#[derive(Debug, Clone, PartialEq)]
pub enum LiNo<T> {
    /// A link with optional multi-reference ids and values.
    /// The `ids` field stores references as a vector (like JS/Python).
    Link { ids: Option<Vec<T>>, values: Vec<Self> },
    /// A simple reference value.
    Ref(T),
}

impl<T> LiNo<T> {
    pub fn is_ref(&self) -> bool {
        matches!(self, LiNo::Ref(_))
    }

    pub fn is_link(&self) -> bool {
        matches!(self, LiNo::Link { .. })
    }

    /// Get the ids array (primary storage for reference identifiers).
    /// Returns None if this is a Ref variant or if ids is None.
    pub fn ids(&self) -> Option<&Vec<T>> {
        match self {
            LiNo::Link { ids, .. } => ids.as_ref(),
            LiNo::Ref(_) => None,
        }
    }

    /// Get the id as a single reference (backward compatibility).
    /// Returns an error if ids has more than one element.
    /// Use `ids()` for multi-reference access.
    pub fn id(&self) -> Result<Option<&T>, MultiRefError> {
        match self {
            LiNo::Link { ids, .. } => match ids {
                None => Ok(None),
                Some(v) if v.len() > 1 => Err(MultiRefError { count: v.len() }),
                Some(v) => Ok(v.first()),
            },
            LiNo::Ref(_) => Ok(None),
        }
    }
}

impl<T: ToString + Clone> LiNo<T> {
    /// Helper to get the id as a joined string (for formatting purposes).
    fn ids_to_string(ids: &Option<Vec<T>>) -> Option<String> {
        ids.as_ref().map(|v| {
            v.iter()
                .map(|t| t.to_string())
                .collect::<Vec<_>>()
                .join(" ")
        })
    }

    /// Format the link using FormatConfig configuration.
    ///
    /// # Arguments
    /// * `config` - The FormatConfig to use for formatting
    ///
    /// # Returns
    /// Formatted string representation
    pub fn format_with_config(&self, config: &FormatConfig) -> String {
        match self {
            LiNo::Ref(value) => {
                let escaped = escape_reference(&value.to_string());
                if config.less_parentheses {
                    escaped
                } else {
                    format!("({})", escaped)
                }
            }
            LiNo::Link { ids, values } => {
                // Empty link
                if ids.is_none() && values.is_empty() {
                    return if config.less_parentheses {
                        String::new()
                    } else {
                        "()".to_string()
                    };
                }

                // Link with only ID, no values
                if values.is_empty() {
                    if let Some(id_str) = Self::ids_to_string(ids) {
                        let escaped_id = escape_reference(&id_str);
                        return if config.less_parentheses && !needs_parentheses(&id_str)
                        {
                            escaped_id
                        } else {
                            format!("({})", escaped_id)
                        };
                    }
                    return if config.less_parentheses {
                        String::new()
                    } else {
                        "()".to_string()
                    };
                }

                // Check if we should use indented format
                let mut should_indent = false;
                if config.should_indent_by_ref_count(values.len()) {
                    should_indent = true;
                } else {
                    // Try inline format first to check line length
                    let values_str = values
                        .iter()
                        .map(|v| format_value(v))
                        .collect::<Vec<_>>()
                        .join(" ");

                    let test_line = if let Some(id_str) = Self::ids_to_string(ids) {
                        let escaped_id = escape_reference(&id_str);
                        if config.less_parentheses {
                            format!("{}: {}", escaped_id, values_str)
                        } else {
                            format!("({}: {})", escaped_id, values_str)
                        }
                    } else if config.less_parentheses {
                        values_str.clone()
                    } else {
                        format!("({})", values_str)
                    };

                    if config.should_indent_by_length(&test_line) {
                        should_indent = true;
                    }
                }

                // Format with indentation if needed
                if should_indent && !config.prefer_inline {
                    return self.format_indented(config);
                }

                // Standard inline formatting
                let values_str = values
                    .iter()
                    .map(|v| format_value(v))
                    .collect::<Vec<_>>()
                    .join(" ");

                // Link with values only (null id)
                if ids.is_none() {
                    if config.less_parentheses {
                        // Check if all values are simple (no nested values)
                        let all_simple = values.iter().all(|v| matches!(v, LiNo::Ref(_)));
                        if all_simple {
                            return values
                                .iter()
                                .map(|v| match v {
                                    LiNo::Ref(r) => escape_reference(&r.to_string()),
                                    _ => format_value(v),
                                })
                                .collect::<Vec<_>>()
                                .join(" ");
                        }
                        return values_str;
                    }
                    return format!("({})", values_str);
                }

                // Link with ID and values
                let id_str = Self::ids_to_string(ids).unwrap();
                let escaped_id = escape_reference(&id_str);
                let with_colon = format!("{}: {}", escaped_id, values_str);
                if config.less_parentheses && !needs_parentheses(&id_str)
                {
                    with_colon
                } else {
                    format!("({})", with_colon)
                }
            }
        }
    }

    /// Format the link with indentation.
    fn format_indented(&self, config: &FormatConfig) -> String {
        match self {
            LiNo::Ref(value) => {
                let escaped = escape_reference(&value.to_string());
                format!("({})", escaped)
            }
            LiNo::Link { ids, values } => {
                if ids.is_none() {
                    // Values only - format each on separate line
                    values
                        .iter()
                        .map(|v| format!("{}{}", config.indent_string, format_value(v)))
                        .collect::<Vec<_>>()
                        .join("\n")
                } else {
                    // Link with ID - format as id:\n  value1\n  value2
                    let id_str = escape_reference(&Self::ids_to_string(ids).unwrap());
                    let mut lines = vec![format!("{}:", id_str)];
                    for v in values {
                        lines.push(format!("{}{}", config.indent_string, format_value(v)));
                    }
                    lines.join("\n")
                }
            }
        }
    }
}

impl<T: ToString> fmt::Display for LiNo<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LiNo::Ref(value) => write!(f, "{}", value.to_string()),
            LiNo::Link { ids, values } => {
                let id_str = ids
                    .as_ref()
                    .map(|v| {
                        let joined = v.iter().map(|t| t.to_string()).collect::<Vec<_>>().join(" ");
                        format!("{}: ", joined)
                    })
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
                LiNo::Ref(id.to_single_string())
            } else {
                LiNo::Link {
                    ids: None,
                    values: vec![],
                }
            }
        } else {
            let values: Vec<LiNo<String>> = link.values.into_iter().map(|v| v.into()).collect();
            LiNo::Link {
                ids: link.id.map(|id| id.parts()),
                values,
            }
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

fn flatten_link_recursive(
    link: &parser::Link,
    parent: Option<&LiNo<String>>,
    result: &mut Vec<LiNo<String>>,
) {
    // Special case: If this is an indented ID (with colon) with children,
    // the children should become the values of the link (indented ID syntax)
    if link.is_indented_id
        && link.id.is_some()
        && link.values.is_empty()
        && !link.children.is_empty()
    {
        let child_values: Vec<LiNo<String>> = link
            .children
            .iter()
            .map(|child| {
                // For indented children, if they have single values, extract them
                if child.values.len() == 1
                    && child.values[0].values.is_empty()
                    && child.values[0].children.is_empty()
                {
                    // Use if let to safely extract the ID instead of unwrap()
                    if let Some(ref id) = child.values[0].id {
                        LiNo::Ref(id.to_single_string())
                    } else {
                        // If no ID, create an empty link
                        parser::Link {
                            id: child.id.clone(),
                            values: child.values.clone(),
                            children: vec![],
                            is_indented_id: false,
                            is_multi_ref: false,
                        }
                        .into()
                    }
                } else {
                    parser::Link {
                        id: child.id.clone(),
                        values: child.values.clone(),
                        children: vec![],
                        is_indented_id: false,
                        is_multi_ref: false,
                    }
                    .into()
                }
            })
            .collect();

        let current = LiNo::Link {
            ids: link.id.as_ref().map(|id| id.parts()),
            values: child_values,
        };

        let combined = if let Some(parent) = parent {
            // Wrap parent in parentheses if it's a reference
            let wrapped_parent = match parent {
                LiNo::Ref(ref_id) => LiNo::Link {
                    ids: None,
                    values: vec![LiNo::Ref(ref_id.clone())],
                },
                link => link.clone(),
            };

            LiNo::Link {
                ids: None,
                values: vec![wrapped_parent, current],
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
            LiNo::Ref(id.to_single_string())
        } else {
            LiNo::Link {
                ids: None,
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
                    is_multi_ref: false,
                }
                .into()
            })
            .collect();
        LiNo::Link {
            ids: link.id.as_ref().map(|id| id.parts()),
            values,
        }
    };

    // Create the combined link (parent + current) with proper wrapping
    let combined = if let Some(parent) = parent {
        // Wrap parent in parentheses if it's a reference
        let wrapped_parent = match parent {
            LiNo::Ref(ref_id) => LiNo::Link {
                ids: None,
                values: vec![LiNo::Ref(ref_id.clone())],
            },
            link => link.clone(),
        };

        // Wrap current in parentheses if it's a reference
        let wrapped_current = match &current {
            LiNo::Ref(ref_id) => LiNo::Link {
                ids: None,
                values: vec![LiNo::Ref(ref_id.clone())],
            },
            link => link.clone(),
        };

        LiNo::Link {
            ids: None,
            values: vec![wrapped_parent, wrapped_current],
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

pub fn parse_lino(document: &str) -> Result<LiNo<String>, ParseError> {
    // Handle empty or whitespace-only input by returning empty result
    if document.trim().is_empty() {
        return Ok(LiNo::Link {
            ids: None,
            values: vec![],
        });
    }

    match parser::parse_document(document) {
        Ok((_, links)) => {
            if links.is_empty() {
                Ok(LiNo::Link {
                    ids: None,
                    values: vec![],
                })
            } else {
                // Flatten the indented structure according to Lino spec
                let flattened = flatten_links(links);
                Ok(LiNo::Link {
                    ids: None,
                    values: flattened,
                })
            }
        }
        Err(e) => Err(ParseError::SyntaxError(format!("{:?}", e))),
    }
}

// New function that matches C# and JS API - returns collection of links
pub fn parse_lino_to_links(document: &str) -> Result<Vec<LiNo<String>>, ParseError> {
    // Handle empty or whitespace-only input by returning empty collection
    if document.trim().is_empty() {
        return Ok(vec![]);
    }

    match parser::parse_document(document) {
        Ok((_, links)) => {
            if links.is_empty() {
                Ok(vec![])
            } else {
                // Flatten the indented structure according to Lino spec
                let flattened = flatten_links(links);
                Ok(flattened)
            }
        }
        Err(e) => Err(ParseError::SyntaxError(format!("{:?}", e))),
    }
}

/// Formats a collection of LiNo links as a multi-line string.
/// Each link is formatted on a separate line.
pub fn format_links(links: &[LiNo<String>]) -> String {
    links
        .iter()
        .map(|link| format!("{}", link))
        .collect::<Vec<_>>()
        .join("\n")
}

/// Formats a collection of LiNo links as a multi-line string using FormatConfig.
/// Supports all formatting options including consecutive link grouping.
///
/// # Arguments
/// * `links` - The collection of links to format
/// * `config` - The FormatConfig to use for formatting
///
/// # Returns
/// Formatted string in Lino notation
pub fn format_links_with_config(links: &[LiNo<String>], config: &FormatConfig) -> String {
    if links.is_empty() {
        return String::new();
    }

    // Apply consecutive link grouping if enabled
    let links_to_format = if config.group_consecutive {
        group_consecutive_links(links)
    } else {
        links.to_vec()
    };

    links_to_format
        .iter()
        .map(|link| link.format_with_config(config))
        .collect::<Vec<_>>()
        .join("\n")
}

/// Groups consecutive links with the same ID.
///
/// For example:
/// ```text
/// SetA a
/// SetA b
/// SetA c
/// ```
/// Becomes:
/// ```text
/// SetA
///   a
///   b
///   c
/// ```
fn group_consecutive_links(links: &[LiNo<String>]) -> Vec<LiNo<String>> {
    if links.is_empty() {
        return vec![];
    }

    let mut grouped = vec![];
    let mut i = 0;

    while i < links.len() {
        let current = &links[i];

        // Look ahead for consecutive links with same ID
        if let LiNo::Link {
            ids: Some(ref current_ids),
            values: ref current_values,
        } = current
        {
            if !current_values.is_empty() {
                // Collect all values with same ID
                let mut same_id_values = current_values.clone();
                let mut j = i + 1;

                while j < links.len() {
                    if let LiNo::Link {
                        ids: Some(ref next_ids),
                        values: ref next_values,
                    } = &links[j]
                    {
                        if next_ids == current_ids && !next_values.is_empty() {
                            same_id_values.extend(next_values.clone());
                            j += 1;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }

                // If we found consecutive links, create grouped link
                if j > i + 1 {
                    grouped.push(LiNo::Link {
                        ids: Some(current_ids.clone()),
                        values: same_id_values,
                    });
                    i = j;
                    continue;
                }
            }
        }

        grouped.push(current.clone());
        i += 1;
    }

    grouped
}

/// Escape a reference string by adding quotes if necessary.
fn escape_reference(reference: &str) -> String {
    if reference.is_empty() || reference.trim().is_empty() {
        return String::new();
    }

    let has_single_quote = reference.contains('\'');
    let has_double_quote = reference.contains('"');

    let needs_quoting = reference.contains(':')
        || reference.contains('(')
        || reference.contains(')')
        || reference.contains(' ')
        || reference.contains('\t')
        || reference.contains('\n')
        || reference.contains('\r')
        || has_double_quote
        || has_single_quote;

    // Handle edge case: reference contains both single and double quotes
    if has_single_quote && has_double_quote {
        // Escape single quotes and wrap in single quotes
        return format!("'{}'", reference.replace('\'', "\\'"));
    }

    // Prefer single quotes if double quotes are present
    if has_double_quote {
        return format!("'{}'", reference);
    }

    // Use double quotes if single quotes are present
    if has_single_quote {
        return format!("\"{}\"", reference);
    }

    // Use single quotes for special characters
    if needs_quoting {
        return format!("'{}'", reference);
    }

    // No quoting needed
    reference.to_string()
}

/// Check if a string needs to be wrapped in parentheses.
fn needs_parentheses(s: &str) -> bool {
    s.contains(' ') || s.contains(':') || s.contains('(') || s.contains(')')
}

/// Format a value within a link.
fn format_value<T: ToString>(value: &LiNo<T>) -> String {
    match value {
        LiNo::Ref(r) => escape_reference(&r.to_string()),
        LiNo::Link { ids, values } => {
            // Simple link with just an ID - don't wrap in extra parentheses
            if values.is_empty() {
                if let Some(ref ids_vec) = ids {
                    let joined = ids_vec
                        .iter()
                        .map(|t| t.to_string())
                        .collect::<Vec<_>>()
                        .join(" ");
                    return escape_reference(&joined);
                }
                return String::new();
            }
            // Complex value - format with parentheses
            format!("{}", value)
        }
    }
}
