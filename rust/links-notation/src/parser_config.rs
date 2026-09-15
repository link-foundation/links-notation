/// ParserConfig for reading Links Notation documents.
///
/// Provides configuration options for controlling how a document is read.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParserConfig {
    /// If true, a `#` written where a line or a token starts opens a comment
    /// that runs to the end of the line (default: true)
    pub comments: bool,
}

impl Default for ParserConfig {
    fn default() -> Self {
        Self { comments: true }
    }
}

impl ParserConfig {
    /// Create a new ParserConfig with default values
    ///
    /// # Examples
    /// ```
    /// use links_notation::ParserConfig;
    ///
    /// assert!(ParserConfig::new().comments);
    /// ```
    pub fn new() -> Self {
        Self::default()
    }

    /// Create a ParserConfig that reads `#` as an ordinary reference character,
    /// the way documents written before comments existed were read.
    ///
    /// # Examples
    /// ```
    /// use links_notation::{parse_lino_with_config, ParserConfig};
    ///
    /// let parsed = parse_lino_with_config("# a b", &ParserConfig::without_comments()).unwrap();
    /// assert_eq!(format!("{}", parsed), "((# a b))");
    /// ```
    pub fn without_comments() -> Self {
        Self { comments: false }
    }

    /// Create a ParserConfig that turns comments on or off
    ///
    /// # Examples
    /// ```
    /// use links_notation::ParserConfig;
    ///
    /// assert_eq!(ParserConfig::with_comments(false), ParserConfig::without_comments());
    /// ```
    pub fn with_comments(comments: bool) -> Self {
        Self { comments }
    }
}
