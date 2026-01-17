pub mod format_config;
pub mod parser;

use format_config::FormatConfig;

// Re-export the lino! macro when the macro feature is enabled
#[cfg(feature = "macro")]
pub use links_notation_macro::lino;
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

    /// Creates a new link with the given ID and values.
    ///
    /// This method allows creating links with any number of values,
    /// providing an alternative to tuple conversion for cases where
    /// more than 12 values are needed.
    ///
    /// # Examples
    /// ```
    /// use links_notation::LiNo;
    ///
    /// // Create a link with many values
    /// let values: Vec<LiNo<String>> = (1..=20)
    ///     .map(|i| LiNo::Ref(format!("v{}", i)))
    ///     .collect();
    /// let link = LiNo::new(Some("id".to_string()), values);
    /// ```
    pub fn new(id: Option<T>, values: Vec<Self>) -> Self {
        LiNo::Link { id, values }
    }

    /// Creates a new anonymous link (no ID) with the given values.
    ///
    /// # Examples
    /// ```
    /// use links_notation::LiNo;
    ///
    /// let values = vec![LiNo::Ref("a".to_string()), LiNo::Ref("b".to_string())];
    /// let link = LiNo::anonymous(values);
    /// assert_eq!(format!("{}", link), "(a b)");
    /// ```
    pub fn anonymous(values: Vec<Self>) -> Self {
        LiNo::Link { id: None, values }
    }

    /// Creates a new reference.
    ///
    /// # Examples
    /// ```
    /// use links_notation::LiNo;
    ///
    /// let r: LiNo<String> = LiNo::reference("hello".to_string());
    /// assert_eq!(format!("{}", r), "hello");
    /// ```
    pub fn reference(value: T) -> Self {
        LiNo::Ref(value)
    }
}

/// Builder for creating LiNo links with arbitrary number of values.
///
/// This builder provides a fluent API for constructing links when the tuple
/// conversion (limited to 12 elements) is insufficient.
///
/// # Examples
/// ```
/// use links_notation::{LiNo, LinkBuilder};
///
/// // Build a link with many string values
/// let link: LiNo<String> = LinkBuilder::new()
///     .id("myLink")
///     .value("v1")
///     .value("v2")
///     .value("v3")
///     .build();
/// assert_eq!(format!("{}", link), "(myLink: v1 v2 v3)");
///
/// // Build a link with LiNo values
/// let nested: LiNo<String> = ("inner", "a", "b").into();
/// let link: LiNo<String> = LinkBuilder::new()
///     .id("outer")
///     .lino(nested)
///     .value("c")
///     .build();
/// assert_eq!(format!("{}", link), "(outer: (inner: a b) c)");
///
/// // Build anonymous link
/// let link: LiNo<String> = LinkBuilder::new()
///     .value("a")
///     .value("b")
///     .build();
/// assert_eq!(format!("{}", link), "(a b)");
/// ```
#[derive(Debug, Clone, Default)]
pub struct LinkBuilder {
    id: Option<String>,
    values: Vec<LiNo<String>>,
}

impl LinkBuilder {
    /// Creates a new empty LinkBuilder.
    pub fn new() -> Self {
        Self::default()
    }

    /// Sets the ID of the link.
    ///
    /// If called multiple times, the last value wins.
    pub fn id(mut self, id: &str) -> Self {
        self.id = Some(id.to_string());
        self
    }

    /// Adds a string value to the link (converted to a Ref).
    pub fn value(mut self, value: &str) -> Self {
        self.values.push(LiNo::Ref(value.to_string()));
        self
    }

    /// Adds a LiNo value to the link.
    pub fn lino(mut self, value: LiNo<String>) -> Self {
        self.values.push(value);
        self
    }

    /// Adds multiple string values to the link.
    pub fn values<I, S>(mut self, values: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        for v in values {
            self.values.push(LiNo::Ref(v.as_ref().to_string()));
        }
        self
    }

    /// Adds multiple LiNo values to the link.
    pub fn linos<I>(mut self, values: I) -> Self
    where
        I: IntoIterator<Item = LiNo<String>>,
    {
        self.values.extend(values);
        self
    }

    /// Builds the final LiNo link.
    pub fn build(self) -> LiNo<String> {
        LiNo::Link {
            id: self.id,
            values: self.values,
        }
    }
}

impl<T: ToString + Clone> LiNo<T> {
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
            LiNo::Link { id, values } => {
                // Empty link
                if id.is_none() && values.is_empty() {
                    return if config.less_parentheses {
                        String::new()
                    } else {
                        "()".to_string()
                    };
                }

                // Link with only ID, no values
                if values.is_empty() {
                    if let Some(ref id_val) = id {
                        let escaped_id = escape_reference(&id_val.to_string());
                        return if config.less_parentheses && !needs_parentheses(&id_val.to_string())
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

                    let test_line = if let Some(ref id_val) = id {
                        let id_str = escape_reference(&id_val.to_string());
                        if config.less_parentheses {
                            format!("{}: {}", id_str, values_str)
                        } else {
                            format!("({}: {})", id_str, values_str)
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
                if id.is_none() {
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
                let id_str = escape_reference(&id.as_ref().unwrap().to_string());
                let with_colon = format!("{}: {}", id_str, values_str);
                if config.less_parentheses && !needs_parentheses(&id.as_ref().unwrap().to_string())
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
            LiNo::Link { id, values } => {
                if id.is_none() {
                    // Values only - format each on separate line
                    values
                        .iter()
                        .map(|v| format!("{}{}", config.indent_string, format_value(v)))
                        .collect::<Vec<_>>()
                        .join("\n")
                } else {
                    // Link with ID - format as id:\n  value1\n  value2
                    let id_str = escape_reference(&id.as_ref().unwrap().to_string());
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
                LiNo::Link {
                    id: None,
                    values: vec![],
                }
            }
        } else {
            let values: Vec<LiNo<String>> = link.values.into_iter().map(|v| v.into()).collect();
            LiNo::Link {
                id: link.id,
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
                        LiNo::Ref(id.clone())
                    } else {
                        // If no ID, create an empty link
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
            // Wrap parent in parentheses if it's a reference
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
        return; // Don't process children again
    }

    // Create the current link without children
    let current = if link.values.is_empty() {
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

    // Create the combined link (parent + current) with proper wrapping
    let combined = if let Some(parent) = parent {
        // Wrap parent in parentheses if it's a reference
        let wrapped_parent = match parent {
            LiNo::Ref(ref_id) => LiNo::Link {
                id: None,
                values: vec![LiNo::Ref(ref_id.clone())],
            },
            link => link.clone(),
        };

        // Wrap current in parentheses if it's a reference
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
        flatten_link_recursive(child, Some(&combined), result);
    }
}

pub fn parse_lino(document: &str) -> Result<LiNo<String>, ParseError> {
    // Handle empty or whitespace-only input by returning empty result
    if document.trim().is_empty() {
        return Ok(LiNo::Link {
            id: None,
            values: vec![],
        });
    }

    match parser::parse_document(document) {
        Ok((_, links)) => {
            if links.is_empty() {
                Ok(LiNo::Link {
                    id: None,
                    values: vec![],
                })
            } else {
                // Flatten the indented structure according to Lino spec
                let flattened = flatten_links(links);
                Ok(LiNo::Link {
                    id: None,
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
            id: Some(ref current_id),
            values: ref current_values,
        } = current
        {
            if !current_values.is_empty() {
                // Collect all values with same ID
                let mut same_id_values = current_values.clone();
                let mut j = i + 1;

                while j < links.len() {
                    if let LiNo::Link {
                        id: Some(ref next_id),
                        values: ref next_values,
                    } = &links[j]
                    {
                        if next_id == current_id && !next_values.is_empty() {
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
                        id: Some(current_id.clone()),
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
        LiNo::Link { id, values } => {
            // Simple link with just an ID - don't wrap in extra parentheses
            if values.is_empty() {
                if let Some(ref id_val) = id {
                    return escape_reference(&id_val.to_string());
                }
                return String::new();
            }
            // Complex value - format with parentheses
            format!("{}", value)
        }
    }
}

// Tuple conversion implementations for ergonomic link creation
// These implementations allow creating links using Rust tuple syntax
//
// The macro generates From implementations for tuples of sizes 2-12.
// For each size, it generates 4 types of conversions:
// 1. All &str - first element becomes ID, rest become values
// 2. All String - first element becomes ID, rest become values
// 3. &str ID with LiNo values - first element becomes ID, LiNo elements become values
// 4. All LiNo - creates anonymous link (no ID) with all elements as values

/// Macro to implement From trait for tuples converting to LiNo<String>.
///
/// This macro generates four From implementations for each tuple size:
/// - `(&str, &str, ...)` - First element becomes ID, rest become string values
/// - `(String, String, ...)` - First element becomes ID, rest become string values
/// - `(&str, LiNo<String>, ...)` - First element becomes ID, LiNo elements become values
/// - `(LiNo<String>, LiNo<String>, ...)` - Creates anonymous link with all elements as values
///
/// # Examples
/// ```
/// use links_notation::LiNo;
///
/// // 2-tuple: ("id", "value") -> (id: value)
/// let link: LiNo<String> = ("papa", "mama").into();
/// assert_eq!(format!("{}", link), "(papa: mama)");
///
/// // 3-tuple: ("id", "v1", "v2") -> (id: v1 v2)
/// let link: LiNo<String> = ("parent", "child1", "child2").into();
/// assert_eq!(format!("{}", link), "(parent: child1 child2)");
///
/// // Anonymous link from all LiNo elements
/// let a = LiNo::Ref("a".to_string());
/// let b = LiNo::Ref("b".to_string());
/// let link: LiNo<String> = (a, b).into();
/// assert_eq!(format!("{}", link), "(a b)");
/// ```
macro_rules! impl_tuple_from {
    // Implementation for 2-tuples
    (@str_tuple 2, $t0:tt, $t1:tt) => {
        impl From<(&str, &str)> for LiNo<String> {
            fn from(tuple: (&str, &str)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![LiNo::Ref(tuple.$t1.to_string())],
                }
            }
        }
    };
    (@string_tuple 2, $t0:tt, $t1:tt) => {
        impl From<(String, String)> for LiNo<String> {
            fn from(tuple: (String, String)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0),
                    values: vec![LiNo::Ref(tuple.$t1)],
                }
            }
        }
    };
    (@str_lino_tuple 2, $t0:tt, $t1:tt) => {
        impl From<(&str, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (&str, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![tuple.$t1],
                }
            }
        }
    };
    (@lino_tuple 2, $t0:tt, $t1:tt) => {
        impl From<(LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: None,
                    values: vec![tuple.$t0, tuple.$t1],
                }
            }
        }
    };

    // Implementation for 3-tuples
    (@str_tuple 3, $t0:tt, $t1:tt, $t2:tt) => {
        impl From<(&str, &str, &str)> for LiNo<String> {
            fn from(tuple: (&str, &str, &str)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![LiNo::Ref(tuple.$t1.to_string()), LiNo::Ref(tuple.$t2.to_string())],
                }
            }
        }
    };
    (@string_tuple 3, $t0:tt, $t1:tt, $t2:tt) => {
        impl From<(String, String, String)> for LiNo<String> {
            fn from(tuple: (String, String, String)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0),
                    values: vec![LiNo::Ref(tuple.$t1), LiNo::Ref(tuple.$t2)],
                }
            }
        }
    };
    (@str_lino_tuple 3, $t0:tt, $t1:tt, $t2:tt) => {
        impl From<(&str, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (&str, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![tuple.$t1, tuple.$t2],
                }
            }
        }
    };
    (@lino_tuple 3, $t0:tt, $t1:tt, $t2:tt) => {
        impl From<(LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: None,
                    values: vec![tuple.$t0, tuple.$t1, tuple.$t2],
                }
            }
        }
    };

    // Implementation for 4-tuples
    (@str_tuple 4, $t0:tt, $t1:tt, $t2:tt, $t3:tt) => {
        impl From<(&str, &str, &str, &str)> for LiNo<String> {
            fn from(tuple: (&str, &str, &str, &str)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![
                        LiNo::Ref(tuple.$t1.to_string()),
                        LiNo::Ref(tuple.$t2.to_string()),
                        LiNo::Ref(tuple.$t3.to_string()),
                    ],
                }
            }
        }
    };
    (@string_tuple 4, $t0:tt, $t1:tt, $t2:tt, $t3:tt) => {
        impl From<(String, String, String, String)> for LiNo<String> {
            fn from(tuple: (String, String, String, String)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0),
                    values: vec![LiNo::Ref(tuple.$t1), LiNo::Ref(tuple.$t2), LiNo::Ref(tuple.$t3)],
                }
            }
        }
    };
    (@str_lino_tuple 4, $t0:tt, $t1:tt, $t2:tt, $t3:tt) => {
        impl From<(&str, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (&str, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![tuple.$t1, tuple.$t2, tuple.$t3],
                }
            }
        }
    };
    (@lino_tuple 4, $t0:tt, $t1:tt, $t2:tt, $t3:tt) => {
        impl From<(LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: None,
                    values: vec![tuple.$t0, tuple.$t1, tuple.$t2, tuple.$t3],
                }
            }
        }
    };

    // Implementation for 5-tuples
    (@str_tuple 5, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt) => {
        impl From<(&str, &str, &str, &str, &str)> for LiNo<String> {
            fn from(tuple: (&str, &str, &str, &str, &str)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![
                        LiNo::Ref(tuple.$t1.to_string()),
                        LiNo::Ref(tuple.$t2.to_string()),
                        LiNo::Ref(tuple.$t3.to_string()),
                        LiNo::Ref(tuple.$t4.to_string()),
                    ],
                }
            }
        }
    };
    (@string_tuple 5, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt) => {
        impl From<(String, String, String, String, String)> for LiNo<String> {
            fn from(tuple: (String, String, String, String, String)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0),
                    values: vec![
                        LiNo::Ref(tuple.$t1),
                        LiNo::Ref(tuple.$t2),
                        LiNo::Ref(tuple.$t3),
                        LiNo::Ref(tuple.$t4),
                    ],
                }
            }
        }
    };
    (@str_lino_tuple 5, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt) => {
        impl From<(&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4],
                }
            }
        }
    };
    (@lino_tuple 5, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt) => {
        impl From<(LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: None,
                    values: vec![tuple.$t0, tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4],
                }
            }
        }
    };

    // Implementation for 6-tuples
    (@str_tuple 6, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt) => {
        impl From<(&str, &str, &str, &str, &str, &str)> for LiNo<String> {
            fn from(tuple: (&str, &str, &str, &str, &str, &str)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![
                        LiNo::Ref(tuple.$t1.to_string()),
                        LiNo::Ref(tuple.$t2.to_string()),
                        LiNo::Ref(tuple.$t3.to_string()),
                        LiNo::Ref(tuple.$t4.to_string()),
                        LiNo::Ref(tuple.$t5.to_string()),
                    ],
                }
            }
        }
    };
    (@string_tuple 6, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt) => {
        impl From<(String, String, String, String, String, String)> for LiNo<String> {
            fn from(tuple: (String, String, String, String, String, String)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0),
                    values: vec![
                        LiNo::Ref(tuple.$t1),
                        LiNo::Ref(tuple.$t2),
                        LiNo::Ref(tuple.$t3),
                        LiNo::Ref(tuple.$t4),
                        LiNo::Ref(tuple.$t5),
                    ],
                }
            }
        }
    };
    (@str_lino_tuple 6, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt) => {
        impl From<(&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5],
                }
            }
        }
    };
    (@lino_tuple 6, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt) => {
        impl From<(LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: None,
                    values: vec![tuple.$t0, tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5],
                }
            }
        }
    };

    // Implementation for 7-tuples
    (@str_tuple 7, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt) => {
        impl From<(&str, &str, &str, &str, &str, &str, &str)> for LiNo<String> {
            fn from(tuple: (&str, &str, &str, &str, &str, &str, &str)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![
                        LiNo::Ref(tuple.$t1.to_string()),
                        LiNo::Ref(tuple.$t2.to_string()),
                        LiNo::Ref(tuple.$t3.to_string()),
                        LiNo::Ref(tuple.$t4.to_string()),
                        LiNo::Ref(tuple.$t5.to_string()),
                        LiNo::Ref(tuple.$t6.to_string()),
                    ],
                }
            }
        }
    };
    (@string_tuple 7, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt) => {
        impl From<(String, String, String, String, String, String, String)> for LiNo<String> {
            fn from(tuple: (String, String, String, String, String, String, String)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0),
                    values: vec![
                        LiNo::Ref(tuple.$t1),
                        LiNo::Ref(tuple.$t2),
                        LiNo::Ref(tuple.$t3),
                        LiNo::Ref(tuple.$t4),
                        LiNo::Ref(tuple.$t5),
                        LiNo::Ref(tuple.$t6),
                    ],
                }
            }
        }
    };
    (@str_lino_tuple 7, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt) => {
        impl From<(&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6],
                }
            }
        }
    };
    (@lino_tuple 7, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt) => {
        impl From<(LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: None,
                    values: vec![tuple.$t0, tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6],
                }
            }
        }
    };

    // Implementation for 8-tuples
    (@str_tuple 8, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt) => {
        impl From<(&str, &str, &str, &str, &str, &str, &str, &str)> for LiNo<String> {
            fn from(tuple: (&str, &str, &str, &str, &str, &str, &str, &str)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![
                        LiNo::Ref(tuple.$t1.to_string()),
                        LiNo::Ref(tuple.$t2.to_string()),
                        LiNo::Ref(tuple.$t3.to_string()),
                        LiNo::Ref(tuple.$t4.to_string()),
                        LiNo::Ref(tuple.$t5.to_string()),
                        LiNo::Ref(tuple.$t6.to_string()),
                        LiNo::Ref(tuple.$t7.to_string()),
                    ],
                }
            }
        }
    };
    (@string_tuple 8, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt) => {
        impl From<(String, String, String, String, String, String, String, String)> for LiNo<String> {
            fn from(tuple: (String, String, String, String, String, String, String, String)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0),
                    values: vec![
                        LiNo::Ref(tuple.$t1),
                        LiNo::Ref(tuple.$t2),
                        LiNo::Ref(tuple.$t3),
                        LiNo::Ref(tuple.$t4),
                        LiNo::Ref(tuple.$t5),
                        LiNo::Ref(tuple.$t6),
                        LiNo::Ref(tuple.$t7),
                    ],
                }
            }
        }
    };
    (@str_lino_tuple 8, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt) => {
        impl From<(&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6, tuple.$t7],
                }
            }
        }
    };
    (@lino_tuple 8, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt) => {
        impl From<(LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: None,
                    values: vec![tuple.$t0, tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6, tuple.$t7],
                }
            }
        }
    };

    // Implementation for 9-tuples
    (@str_tuple 9, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt) => {
        impl From<(&str, &str, &str, &str, &str, &str, &str, &str, &str)> for LiNo<String> {
            fn from(tuple: (&str, &str, &str, &str, &str, &str, &str, &str, &str)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![
                        LiNo::Ref(tuple.$t1.to_string()),
                        LiNo::Ref(tuple.$t2.to_string()),
                        LiNo::Ref(tuple.$t3.to_string()),
                        LiNo::Ref(tuple.$t4.to_string()),
                        LiNo::Ref(tuple.$t5.to_string()),
                        LiNo::Ref(tuple.$t6.to_string()),
                        LiNo::Ref(tuple.$t7.to_string()),
                        LiNo::Ref(tuple.$t8.to_string()),
                    ],
                }
            }
        }
    };
    (@string_tuple 9, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt) => {
        impl From<(String, String, String, String, String, String, String, String, String)> for LiNo<String> {
            fn from(tuple: (String, String, String, String, String, String, String, String, String)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0),
                    values: vec![
                        LiNo::Ref(tuple.$t1),
                        LiNo::Ref(tuple.$t2),
                        LiNo::Ref(tuple.$t3),
                        LiNo::Ref(tuple.$t4),
                        LiNo::Ref(tuple.$t5),
                        LiNo::Ref(tuple.$t6),
                        LiNo::Ref(tuple.$t7),
                        LiNo::Ref(tuple.$t8),
                    ],
                }
            }
        }
    };
    (@str_lino_tuple 9, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt) => {
        impl From<(&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6, tuple.$t7, tuple.$t8],
                }
            }
        }
    };
    (@lino_tuple 9, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt) => {
        impl From<(LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: None,
                    values: vec![tuple.$t0, tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6, tuple.$t7, tuple.$t8],
                }
            }
        }
    };

    // Implementation for 10-tuples
    (@str_tuple 10, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt) => {
        impl From<(&str, &str, &str, &str, &str, &str, &str, &str, &str, &str)> for LiNo<String> {
            fn from(tuple: (&str, &str, &str, &str, &str, &str, &str, &str, &str, &str)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![
                        LiNo::Ref(tuple.$t1.to_string()),
                        LiNo::Ref(tuple.$t2.to_string()),
                        LiNo::Ref(tuple.$t3.to_string()),
                        LiNo::Ref(tuple.$t4.to_string()),
                        LiNo::Ref(tuple.$t5.to_string()),
                        LiNo::Ref(tuple.$t6.to_string()),
                        LiNo::Ref(tuple.$t7.to_string()),
                        LiNo::Ref(tuple.$t8.to_string()),
                        LiNo::Ref(tuple.$t9.to_string()),
                    ],
                }
            }
        }
    };
    (@string_tuple 10, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt) => {
        impl From<(String, String, String, String, String, String, String, String, String, String)> for LiNo<String> {
            fn from(tuple: (String, String, String, String, String, String, String, String, String, String)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0),
                    values: vec![
                        LiNo::Ref(tuple.$t1),
                        LiNo::Ref(tuple.$t2),
                        LiNo::Ref(tuple.$t3),
                        LiNo::Ref(tuple.$t4),
                        LiNo::Ref(tuple.$t5),
                        LiNo::Ref(tuple.$t6),
                        LiNo::Ref(tuple.$t7),
                        LiNo::Ref(tuple.$t8),
                        LiNo::Ref(tuple.$t9),
                    ],
                }
            }
        }
    };
    (@str_lino_tuple 10, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt) => {
        impl From<(&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6, tuple.$t7, tuple.$t8, tuple.$t9],
                }
            }
        }
    };
    (@lino_tuple 10, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt) => {
        impl From<(LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: None,
                    values: vec![tuple.$t0, tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6, tuple.$t7, tuple.$t8, tuple.$t9],
                }
            }
        }
    };

    // Implementation for 11-tuples
    (@str_tuple 11, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt, $t10:tt) => {
        impl From<(&str, &str, &str, &str, &str, &str, &str, &str, &str, &str, &str)> for LiNo<String> {
            fn from(tuple: (&str, &str, &str, &str, &str, &str, &str, &str, &str, &str, &str)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![
                        LiNo::Ref(tuple.$t1.to_string()),
                        LiNo::Ref(tuple.$t2.to_string()),
                        LiNo::Ref(tuple.$t3.to_string()),
                        LiNo::Ref(tuple.$t4.to_string()),
                        LiNo::Ref(tuple.$t5.to_string()),
                        LiNo::Ref(tuple.$t6.to_string()),
                        LiNo::Ref(tuple.$t7.to_string()),
                        LiNo::Ref(tuple.$t8.to_string()),
                        LiNo::Ref(tuple.$t9.to_string()),
                        LiNo::Ref(tuple.$t10.to_string()),
                    ],
                }
            }
        }
    };
    (@string_tuple 11, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt, $t10:tt) => {
        impl From<(String, String, String, String, String, String, String, String, String, String, String)> for LiNo<String> {
            fn from(tuple: (String, String, String, String, String, String, String, String, String, String, String)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0),
                    values: vec![
                        LiNo::Ref(tuple.$t1),
                        LiNo::Ref(tuple.$t2),
                        LiNo::Ref(tuple.$t3),
                        LiNo::Ref(tuple.$t4),
                        LiNo::Ref(tuple.$t5),
                        LiNo::Ref(tuple.$t6),
                        LiNo::Ref(tuple.$t7),
                        LiNo::Ref(tuple.$t8),
                        LiNo::Ref(tuple.$t9),
                        LiNo::Ref(tuple.$t10),
                    ],
                }
            }
        }
    };
    (@str_lino_tuple 11, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt, $t10:tt) => {
        impl From<(&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6, tuple.$t7, tuple.$t8, tuple.$t9, tuple.$t10],
                }
            }
        }
    };
    (@lino_tuple 11, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt, $t10:tt) => {
        impl From<(LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: None,
                    values: vec![tuple.$t0, tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6, tuple.$t7, tuple.$t8, tuple.$t9, tuple.$t10],
                }
            }
        }
    };

    // Implementation for 12-tuples
    (@str_tuple 12, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt, $t10:tt, $t11:tt) => {
        impl From<(&str, &str, &str, &str, &str, &str, &str, &str, &str, &str, &str, &str)> for LiNo<String> {
            fn from(tuple: (&str, &str, &str, &str, &str, &str, &str, &str, &str, &str, &str, &str)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![
                        LiNo::Ref(tuple.$t1.to_string()),
                        LiNo::Ref(tuple.$t2.to_string()),
                        LiNo::Ref(tuple.$t3.to_string()),
                        LiNo::Ref(tuple.$t4.to_string()),
                        LiNo::Ref(tuple.$t5.to_string()),
                        LiNo::Ref(tuple.$t6.to_string()),
                        LiNo::Ref(tuple.$t7.to_string()),
                        LiNo::Ref(tuple.$t8.to_string()),
                        LiNo::Ref(tuple.$t9.to_string()),
                        LiNo::Ref(tuple.$t10.to_string()),
                        LiNo::Ref(tuple.$t11.to_string()),
                    ],
                }
            }
        }
    };
    (@string_tuple 12, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt, $t10:tt, $t11:tt) => {
        impl From<(String, String, String, String, String, String, String, String, String, String, String, String)> for LiNo<String> {
            fn from(tuple: (String, String, String, String, String, String, String, String, String, String, String, String)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0),
                    values: vec![
                        LiNo::Ref(tuple.$t1),
                        LiNo::Ref(tuple.$t2),
                        LiNo::Ref(tuple.$t3),
                        LiNo::Ref(tuple.$t4),
                        LiNo::Ref(tuple.$t5),
                        LiNo::Ref(tuple.$t6),
                        LiNo::Ref(tuple.$t7),
                        LiNo::Ref(tuple.$t8),
                        LiNo::Ref(tuple.$t9),
                        LiNo::Ref(tuple.$t10),
                        LiNo::Ref(tuple.$t11),
                    ],
                }
            }
        }
    };
    (@str_lino_tuple 12, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt, $t10:tt, $t11:tt) => {
        impl From<(&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (&str, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: Some(tuple.$t0.to_string()),
                    values: vec![tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6, tuple.$t7, tuple.$t8, tuple.$t9, tuple.$t10, tuple.$t11],
                }
            }
        }
    };
    (@lino_tuple 12, $t0:tt, $t1:tt, $t2:tt, $t3:tt, $t4:tt, $t5:tt, $t6:tt, $t7:tt, $t8:tt, $t9:tt, $t10:tt, $t11:tt) => {
        impl From<(LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)> for LiNo<String> {
            fn from(tuple: (LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>, LiNo<String>)) -> Self {
                LiNo::Link {
                    id: None,
                    values: vec![tuple.$t0, tuple.$t1, tuple.$t2, tuple.$t3, tuple.$t4, tuple.$t5, tuple.$t6, tuple.$t7, tuple.$t8, tuple.$t9, tuple.$t10, tuple.$t11],
                }
            }
        }
    };

    // Entry point - generates all four types for a given tuple size
    (2) => {
        impl_tuple_from!(@str_tuple 2, 0, 1);
        impl_tuple_from!(@string_tuple 2, 0, 1);
        impl_tuple_from!(@str_lino_tuple 2, 0, 1);
        impl_tuple_from!(@lino_tuple 2, 0, 1);
    };
    (3) => {
        impl_tuple_from!(@str_tuple 3, 0, 1, 2);
        impl_tuple_from!(@string_tuple 3, 0, 1, 2);
        impl_tuple_from!(@str_lino_tuple 3, 0, 1, 2);
        impl_tuple_from!(@lino_tuple 3, 0, 1, 2);
    };
    (4) => {
        impl_tuple_from!(@str_tuple 4, 0, 1, 2, 3);
        impl_tuple_from!(@string_tuple 4, 0, 1, 2, 3);
        impl_tuple_from!(@str_lino_tuple 4, 0, 1, 2, 3);
        impl_tuple_from!(@lino_tuple 4, 0, 1, 2, 3);
    };
    (5) => {
        impl_tuple_from!(@str_tuple 5, 0, 1, 2, 3, 4);
        impl_tuple_from!(@string_tuple 5, 0, 1, 2, 3, 4);
        impl_tuple_from!(@str_lino_tuple 5, 0, 1, 2, 3, 4);
        impl_tuple_from!(@lino_tuple 5, 0, 1, 2, 3, 4);
    };
    (6) => {
        impl_tuple_from!(@str_tuple 6, 0, 1, 2, 3, 4, 5);
        impl_tuple_from!(@string_tuple 6, 0, 1, 2, 3, 4, 5);
        impl_tuple_from!(@str_lino_tuple 6, 0, 1, 2, 3, 4, 5);
        impl_tuple_from!(@lino_tuple 6, 0, 1, 2, 3, 4, 5);
    };
    (7) => {
        impl_tuple_from!(@str_tuple 7, 0, 1, 2, 3, 4, 5, 6);
        impl_tuple_from!(@string_tuple 7, 0, 1, 2, 3, 4, 5, 6);
        impl_tuple_from!(@str_lino_tuple 7, 0, 1, 2, 3, 4, 5, 6);
        impl_tuple_from!(@lino_tuple 7, 0, 1, 2, 3, 4, 5, 6);
    };
    (8) => {
        impl_tuple_from!(@str_tuple 8, 0, 1, 2, 3, 4, 5, 6, 7);
        impl_tuple_from!(@string_tuple 8, 0, 1, 2, 3, 4, 5, 6, 7);
        impl_tuple_from!(@str_lino_tuple 8, 0, 1, 2, 3, 4, 5, 6, 7);
        impl_tuple_from!(@lino_tuple 8, 0, 1, 2, 3, 4, 5, 6, 7);
    };
    (9) => {
        impl_tuple_from!(@str_tuple 9, 0, 1, 2, 3, 4, 5, 6, 7, 8);
        impl_tuple_from!(@string_tuple 9, 0, 1, 2, 3, 4, 5, 6, 7, 8);
        impl_tuple_from!(@str_lino_tuple 9, 0, 1, 2, 3, 4, 5, 6, 7, 8);
        impl_tuple_from!(@lino_tuple 9, 0, 1, 2, 3, 4, 5, 6, 7, 8);
    };
    (10) => {
        impl_tuple_from!(@str_tuple 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
        impl_tuple_from!(@string_tuple 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
        impl_tuple_from!(@str_lino_tuple 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
        impl_tuple_from!(@lino_tuple 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
    };
    (11) => {
        impl_tuple_from!(@str_tuple 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        impl_tuple_from!(@string_tuple 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        impl_tuple_from!(@str_lino_tuple 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        impl_tuple_from!(@lino_tuple 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    };
    (12) => {
        impl_tuple_from!(@str_tuple 12, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
        impl_tuple_from!(@string_tuple 12, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
        impl_tuple_from!(@str_lino_tuple 12, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
        impl_tuple_from!(@lino_tuple 12, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
    };
}

// Generate implementations for tuples of sizes 2 through 12
// This follows the Rust standard library convention of supporting up to 12-tuples
impl_tuple_from!(2);
impl_tuple_from!(3);
impl_tuple_from!(4);
impl_tuple_from!(5);
impl_tuple_from!(6);
impl_tuple_from!(7);
impl_tuple_from!(8);
impl_tuple_from!(9);
impl_tuple_from!(10);
impl_tuple_from!(11);
impl_tuple_from!(12);

// Vec-based conversions for arbitrary-length link creation
//
// These implementations provide an escape hatch for creating links with more
// than 12 values, or when the number of values is determined at runtime.
//
// Note: Rust does not support variadic generics (as of Rust 1.92), which means
// we cannot implement `From` for tuples of arbitrary length. This is a fundamental
// limitation of Rust's type system. The Rust standard library faces the same
// limitation, which is why traits like `Debug`, `Default`, `Hash`, etc. are only
// implemented for tuples up to 12 elements.
//
// For more information, see:
// - https://github.com/rust-lang/rfcs/issues/376 (Draft RFC: variadic generics)
// - https://github.com/rust-lang/rust/issues/10124 (RFC: variadic generics)
//
// Alternative approaches for arbitrary-length links:
// 1. Use the `LinkBuilder` API for fluent construction
// 2. Use `LiNo::new()` or `LiNo::anonymous()` with a `Vec`
// 3. Use the `From<Vec<_>>` implementations below

/// Convert a Vec of strings into an anonymous link.
///
/// # Examples
/// ```
/// use links_notation::LiNo;
///
/// // Create anonymous link from vector of any size
/// let values: Vec<&str> = (1..=20).map(|_| "val").collect();
/// let link: LiNo<String> = values.into();
/// ```
impl From<Vec<&str>> for LiNo<String> {
    fn from(values: Vec<&str>) -> Self {
        LiNo::Link {
            id: None,
            values: values
                .into_iter()
                .map(|s| LiNo::Ref(s.to_string()))
                .collect(),
        }
    }
}

/// Convert a Vec of Strings into an anonymous link.
impl From<Vec<String>> for LiNo<String> {
    fn from(values: Vec<String>) -> Self {
        LiNo::Link {
            id: None,
            values: values.into_iter().map(LiNo::Ref).collect(),
        }
    }
}

/// Convert a Vec of LiNo into an anonymous link.
impl From<Vec<LiNo<String>>> for LiNo<String> {
    fn from(values: Vec<LiNo<String>>) -> Self {
        LiNo::Link { id: None, values }
    }
}

/// Convert a tuple of (id, Vec<values>) into a named link.
///
/// # Examples
/// ```
/// use links_notation::LiNo;
///
/// // Create named link with arbitrary number of values
/// let values: Vec<&str> = vec!["v1", "v2", "v3", "v4", "v5"];
/// let link: LiNo<String> = ("myLink", values).into();
/// assert_eq!(format!("{}", link), "(myLink: v1 v2 v3 v4 v5)");
/// ```
impl From<(&str, Vec<&str>)> for LiNo<String> {
    fn from((id, values): (&str, Vec<&str>)) -> Self {
        LiNo::Link {
            id: Some(id.to_string()),
            values: values
                .into_iter()
                .map(|s| LiNo::Ref(s.to_string()))
                .collect(),
        }
    }
}

/// Convert a tuple of (id, Vec<String>) into a named link.
impl From<(String, Vec<String>)> for LiNo<String> {
    fn from((id, values): (String, Vec<String>)) -> Self {
        LiNo::Link {
            id: Some(id),
            values: values.into_iter().map(LiNo::Ref).collect(),
        }
    }
}

/// Convert a tuple of (id, Vec<LiNo>) into a named link.
impl From<(&str, Vec<LiNo<String>>)> for LiNo<String> {
    fn from((id, values): (&str, Vec<LiNo<String>>)) -> Self {
        LiNo::Link {
            id: Some(id.to_string()),
            values,
        }
    }
}

/// Convert a tuple of (String id, Vec<LiNo>) into a named link.
impl From<(String, Vec<LiNo<String>>)> for LiNo<String> {
    fn from((id, values): (String, Vec<LiNo<String>>)) -> Self {
        LiNo::Link {
            id: Some(id),
            values,
        }
    }
}
