use crate::parser::DEFAULT_MAX_DEPTH;

/// ParserConfig for reading Links Notation documents.
///
/// Provides configuration options for controlling how a document is read.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParserConfig {
    /// If true, a `#` written where a line or a token starts opens a comment
    /// that runs to the end of the line (default: true)
    pub comments: bool,
    /// How deep links may nest: every parenthesized group and every indentation
    /// level is one level. A document nested deeper is refused with
    /// [`ParseError::NestingTooDeep`](crate::ParseError::NestingTooDeep) rather
    /// than recursed into until the stack overflows
    /// (default: [`DEFAULT_MAX_DEPTH`](crate::parser::DEFAULT_MAX_DEPTH))
    pub max_depth: usize,
}

impl Default for ParserConfig {
    fn default() -> Self {
        Self {
            comments: true,
            max_depth: DEFAULT_MAX_DEPTH,
        }
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
        Self::with_comments(false)
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
        Self {
            comments,
            ..Self::default()
        }
    }

    /// The same configuration, refusing links nested deeper than `max_depth`.
    ///
    /// Every level of nesting is a level of recursion in the parser, so raising
    /// the limit far past the default is only safe on a larger stack.
    ///
    /// # Examples
    /// ```
    /// use links_notation::{parse_lino_to_links_with_config, ParseError, ParserConfig};
    ///
    /// let config = ParserConfig::new().with_max_depth(2);
    /// assert!(parse_lino_to_links_with_config("((a))", &config).is_ok());
    /// assert!(matches!(
    ///     parse_lino_to_links_with_config("(((a)))", &config),
    ///     Err(ParseError::NestingTooDeep(_))
    /// ));
    /// ```
    pub fn with_max_depth(mut self, max_depth: usize) -> Self {
        self.max_depth = max_depth;
        self
    }
}
