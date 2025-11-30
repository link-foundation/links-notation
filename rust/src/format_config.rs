/// FormatConfig for Lino notation formatting.
///
/// Provides configuration options for controlling how Link objects are formatted.
#[derive(Debug, Clone)]
pub struct FormatConfig {
    /// If true, omit parentheses where safe (default: false)
    pub less_parentheses: bool,

    /// Maximum line length before auto-indenting (default: 80)
    pub max_line_length: usize,

    /// If true, indent lines exceeding max_line_length (default: false)
    pub indent_long_lines: bool,

    /// Maximum number of references before auto-indenting (default: None = unlimited)
    pub max_inline_refs: Option<usize>,

    /// If true, group consecutive links with same ID (default: false)
    pub group_consecutive: bool,

    /// String to use for indentation (default: "  " = two spaces)
    pub indent_string: String,

    /// If true, prefer inline format when under thresholds (default: true)
    pub prefer_inline: bool,
}

impl Default for FormatConfig {
    fn default() -> Self {
        Self {
            less_parentheses: false,
            max_line_length: 80,
            indent_long_lines: false,
            max_inline_refs: None,
            group_consecutive: false,
            indent_string: "  ".to_string(),
            prefer_inline: true,
        }
    }
}

impl FormatConfig {
    /// Create a new FormatConfig with default values
    pub fn new() -> Self {
        Self::default()
    }

    /// Create a new FormatConfig with custom values using builder pattern
    pub fn builder() -> FormatConfigBuilder {
        FormatConfigBuilder::new()
    }

    /// Check if line should be indented based on length.
    ///
    /// # Arguments
    /// * `line` - The line to check
    ///
    /// # Returns
    /// True if line should be indented based on length threshold
    pub fn should_indent_by_length(&self, line: &str) -> bool {
        if !self.indent_long_lines {
            return false;
        }
        // Count characters
        line.chars().count() > self.max_line_length
    }

    /// Check if link should be indented based on reference count.
    ///
    /// # Arguments
    /// * `ref_count` - Number of references in the link
    ///
    /// # Returns
    /// True if link should be indented based on reference count threshold
    pub fn should_indent_by_ref_count(&self, ref_count: usize) -> bool {
        match self.max_inline_refs {
            None => false,
            Some(max) => ref_count > max,
        }
    }
}

/// Builder for FormatConfig
pub struct FormatConfigBuilder {
    config: FormatConfig,
}

impl FormatConfigBuilder {
    pub fn new() -> Self {
        Self {
            config: FormatConfig::default(),
        }
    }

    pub fn less_parentheses(mut self, value: bool) -> Self {
        self.config.less_parentheses = value;
        self
    }

    pub fn max_line_length(mut self, value: usize) -> Self {
        self.config.max_line_length = value;
        self
    }

    pub fn indent_long_lines(mut self, value: bool) -> Self {
        self.config.indent_long_lines = value;
        self
    }

    pub fn max_inline_refs(mut self, value: Option<usize>) -> Self {
        self.config.max_inline_refs = value;
        self
    }

    pub fn group_consecutive(mut self, value: bool) -> Self {
        self.config.group_consecutive = value;
        self
    }

    pub fn indent_string(mut self, value: String) -> Self {
        self.config.indent_string = value;
        self
    }

    pub fn prefer_inline(mut self, value: bool) -> Self {
        self.config.prefer_inline = value;
        self
    }

    pub fn build(self) -> FormatConfig {
        self.config
    }
}

impl Default for FormatConfigBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_values() {
        let config = FormatConfig::default();
        assert_eq!(config.less_parentheses, false);
        assert_eq!(config.max_line_length, 80);
        assert_eq!(config.indent_long_lines, false);
    }

    #[test]
    fn test_builder() {
        let config = FormatConfig::builder()
            .less_parentheses(true)
            .max_line_length(100)
            .build();

        assert_eq!(config.less_parentheses, true);
        assert_eq!(config.max_line_length, 100);
    }

    #[test]
    fn test_should_indent_by_length() {
        let config = FormatConfig::builder()
            .indent_long_lines(true)
            .max_line_length(80)
            .build();

        assert_eq!(config.should_indent_by_length("short"), false);
        assert_eq!(config.should_indent_by_length(&"a".repeat(100)), true);
    }

    #[test]
    fn test_should_indent_by_ref_count() {
        let config = FormatConfig::builder().max_inline_refs(Some(3)).build();

        assert_eq!(config.should_indent_by_ref_count(2), false);
        assert_eq!(config.should_indent_by_ref_count(3), false);
        assert_eq!(config.should_indent_by_ref_count(4), true);
    }
}
