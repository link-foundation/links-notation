//! Tokenizer module for separating punctuation and math symbols from adjacent characters.
//!
//! This module provides functionality to tokenize input text by inserting spaces
//! around punctuation and math symbols, making them separate references in Links Notation.

/// Default punctuation symbols that should be tokenized as separate references.
pub const DEFAULT_PUNCTUATION_SYMBOLS: &[char] = &[',', '.', ';', '!', '?'];

/// Default math symbols that should be tokenized as separate references.
/// Note: These are only tokenized when between digits, not when between letters
/// (to preserve hyphenated words like "Jean-Luc" or "conan-center-index").
pub const DEFAULT_MATH_SYMBOLS: &[char] = &['+', '-', '*', '/', '=', '<', '>', '%', '^'];

/// Tokenizer for separating punctuation and math symbols from adjacent characters.
#[derive(Debug, Clone)]
pub struct Tokenizer {
    /// Punctuation symbols to tokenize
    pub punctuation_symbols: Vec<char>,
    /// Math symbols to tokenize (only when between digits)
    pub math_symbols: Vec<char>,
    /// Whether tokenization is enabled
    pub enabled: bool,
}

impl Default for Tokenizer {
    fn default() -> Self {
        Self {
            punctuation_symbols: DEFAULT_PUNCTUATION_SYMBOLS.to_vec(),
            math_symbols: DEFAULT_MATH_SYMBOLS.to_vec(),
            enabled: true,
        }
    }
}

impl Tokenizer {
    /// Create a new Tokenizer with default settings
    pub fn new() -> Self {
        Self::default()
    }

    /// Create a new Tokenizer with custom symbols
    pub fn with_symbols(punctuation: Vec<char>, math: Vec<char>) -> Self {
        Self {
            punctuation_symbols: punctuation,
            math_symbols: math,
            enabled: true,
        }
    }

    /// Create a disabled tokenizer (pass-through)
    pub fn disabled() -> Self {
        Self {
            punctuation_symbols: vec![],
            math_symbols: vec![],
            enabled: false,
        }
    }

    /// Check if a character is a digit
    fn is_digit(c: char) -> bool {
        c.is_ascii_digit()
    }

    /// Check if a character is alphanumeric
    fn is_alphanumeric(c: char) -> bool {
        c.is_ascii_alphanumeric()
    }

    /// Tokenize input by separating punctuation and math symbols from adjacent characters.
    /// Quoted strings are preserved as-is.
    /// Math symbols are only tokenized when between digits (to preserve hyphenated words).
    /// Punctuation is only tokenized when following an alphanumeric character.
    pub fn tokenize(&self, input: &str) -> String {
        if !self.enabled {
            return input.to_string();
        }

        let chars: Vec<char> = input.chars().collect();
        let mut result = String::with_capacity(input.len() * 2);
        let mut in_single_quote = false;
        let mut in_double_quote = false;

        for i in 0..chars.len() {
            let c = chars[i];
            let prev_char = if i > 0 { Some(chars[i - 1]) } else { None };
            let next_char = if i + 1 < chars.len() { Some(chars[i + 1]) } else { None };

            // Handle quote toggling
            if c == '"' && !in_single_quote {
                in_double_quote = !in_double_quote;
                result.push(c);
                continue;
            }
            if c == '\'' && !in_double_quote {
                in_single_quote = !in_single_quote;
                result.push(c);
                continue;
            }

            // If inside quotes, preserve as-is
            if in_single_quote || in_double_quote {
                result.push(c);
                continue;
            }

            // Check if current char is a punctuation symbol
            if self.punctuation_symbols.contains(&c) {
                // Only tokenize punctuation when it follows an alphanumeric character
                if let Some(prev) = prev_char {
                    if Self::is_alphanumeric(prev) {
                        // Add space before if not already present
                        if !result.ends_with(' ') && !result.ends_with('\t') && !result.ends_with('\n') {
                            result.push(' ');
                        }
                        result.push(c);
                        // Add space after if next char is alphanumeric
                        if let Some(next) = next_char {
                            if Self::is_alphanumeric(next) {
                                result.push(' ');
                            }
                        }
                        continue;
                    }
                }
                result.push(c);
                continue;
            }

            // Check if current char is a math symbol
            if self.math_symbols.contains(&c) {
                // Only tokenize math symbols when BOTH sides are digits
                let prev_is_digit = prev_char.map(Self::is_digit).unwrap_or(false);
                let next_is_digit = next_char.map(Self::is_digit).unwrap_or(false);

                if prev_is_digit && next_is_digit {
                    // Tokenize: both sides are digits
                    if !result.ends_with(' ') && !result.ends_with('\t') && !result.ends_with('\n') {
                        result.push(' ');
                    }
                    result.push(c);
                    result.push(' ');
                } else {
                    // Don't tokenize: preserve as part of identifier
                    result.push(c);
                }
                continue;
            }

            result.push(c);
        }

        result
    }

    /// Compact output by removing spaces around symbols (inverse of tokenize).
    /// This is used for formatting output in a more human-readable way.
    pub fn compact(&self, input: &str) -> String {
        if !self.enabled {
            return input.to_string();
        }

        let chars: Vec<char> = input.chars().collect();
        let mut result = String::with_capacity(input.len());
        let mut in_single_quote = false;
        let mut in_double_quote = false;

        let all_symbols: Vec<char> = self.punctuation_symbols.iter()
            .chain(self.math_symbols.iter())
            .copied()
            .collect();

        for i in 0..chars.len() {
            let c = chars[i];

            // Handle quote toggling
            if c == '"' && !in_single_quote {
                in_double_quote = !in_double_quote;
                result.push(c);
                continue;
            }
            if c == '\'' && !in_double_quote {
                in_single_quote = !in_single_quote;
                result.push(c);
                continue;
            }

            // If inside quotes, preserve as-is
            if in_single_quote || in_double_quote {
                result.push(c);
                continue;
            }

            // Check if this is a space that should be removed
            if c == ' ' {
                let prev_char = if !result.is_empty() {
                    result.chars().last()
                } else {
                    None
                };
                let next_char = if i + 1 < chars.len() { Some(chars[i + 1]) } else { None };

                // Skip space if it's between a word and a symbol, or between symbols
                if let Some(prev) = prev_char {
                    if all_symbols.contains(&prev) {
                        continue;
                    }
                }
                if let Some(next) = next_char {
                    if all_symbols.contains(&next) {
                        continue;
                    }
                }
            }

            result.push(c);
        }

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize_punctuation() {
        let tokenizer = Tokenizer::new();

        assert_eq!(tokenizer.tokenize("1,2,3"), "1 , 2 , 3");
        assert_eq!(tokenizer.tokenize("hello, world"), "hello , world");
        assert_eq!(tokenizer.tokenize("1. 2. 3."), "1 . 2 . 3 .");
    }

    #[test]
    fn test_tokenize_math_between_digits() {
        let tokenizer = Tokenizer::new();

        assert_eq!(tokenizer.tokenize("1+1"), "1 + 1");
        assert_eq!(tokenizer.tokenize("10-20"), "10 - 20");
        assert_eq!(tokenizer.tokenize("1+1,1/1,1*1"), "1 + 1 , 1 / 1 , 1 * 1");
    }

    #[test]
    fn test_preserve_hyphenated_words() {
        let tokenizer = Tokenizer::new();

        assert_eq!(tokenizer.tokenize("Jean-Luc"), "Jean-Luc");
        assert_eq!(tokenizer.tokenize("conan-center-index"), "conan-center-index");
        assert_eq!(tokenizer.tokenize("a-b"), "a-b");
        assert_eq!(tokenizer.tokenize("x+y=z"), "x+y=z");
    }

    #[test]
    fn test_preserve_quoted_strings() {
        let tokenizer = Tokenizer::new();

        assert_eq!(tokenizer.tokenize("\"1,2,3\""), "\"1,2,3\"");
        assert_eq!(tokenizer.tokenize("'hello, world'"), "'hello, world'");
    }

    #[test]
    fn test_compact_output() {
        let tokenizer = Tokenizer::new();

        assert_eq!(tokenizer.compact("1 , 2 , 3"), "1,2,3");
        assert_eq!(tokenizer.compact("1 + 1"), "1+1");
        assert_eq!(tokenizer.compact("hello , world"), "hello,world");
    }

    #[test]
    fn test_disabled_tokenizer() {
        let tokenizer = Tokenizer::disabled();

        assert_eq!(tokenizer.tokenize("1,2,3"), "1,2,3");
        assert_eq!(tokenizer.tokenize("1+1"), "1+1");
    }
}
