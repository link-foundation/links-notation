"""
Tokenizer module for separating punctuation and math symbols from adjacent characters.

This module provides functionality to tokenize input text by inserting spaces
around punctuation and math symbols, making them separate references in Links Notation.
"""

from typing import List, Optional

# Default punctuation symbols that should be tokenized as separate references
DEFAULT_PUNCTUATION_SYMBOLS: List[str] = [',', '.', ';', '!', '?']

# Default math symbols that should be tokenized as separate references
# Note: These are only tokenized when between digits, not when between letters
# (to preserve hyphenated words like "Jean-Luc" or "conan-center-index")
DEFAULT_MATH_SYMBOLS: List[str] = ['+', '-', '*', '/', '=', '<', '>', '%', '^']


class Tokenizer:
    """Tokenizer for separating punctuation and math symbols from adjacent characters."""

    def __init__(
        self,
        punctuation_symbols: Optional[List[str]] = None,
        math_symbols: Optional[List[str]] = None,
        enabled: bool = True
    ):
        """
        Initialize the tokenizer.

        Args:
            punctuation_symbols: Custom punctuation symbols to tokenize (default: DEFAULT_PUNCTUATION_SYMBOLS)
            math_symbols: Custom math symbols to tokenize (default: DEFAULT_MATH_SYMBOLS)
            enabled: Whether tokenization is enabled (default: True)
        """
        self.punctuation_symbols = punctuation_symbols or DEFAULT_PUNCTUATION_SYMBOLS.copy()
        self.math_symbols = math_symbols or DEFAULT_MATH_SYMBOLS.copy()
        self.enabled = enabled

    @staticmethod
    def _is_digit(char: str) -> bool:
        """Check if a character is a digit."""
        return char.isdigit() if char else False

    @staticmethod
    def _is_alphanumeric(char: str) -> bool:
        """Check if a character is alphanumeric."""
        return char.isalnum() if char else False

    def tokenize(self, input_text: str) -> str:
        """
        Tokenize input by separating punctuation and math symbols from adjacent characters.
        Quoted strings are preserved as-is.
        Math symbols are only tokenized when between digits (to preserve hyphenated words).
        Punctuation is only tokenized when following an alphanumeric character.

        Args:
            input_text: The input text to tokenize

        Returns:
            Tokenized input with symbols separated by spaces
        """
        if not self.enabled:
            return input_text

        result = []
        in_single_quote = False
        in_double_quote = False
        chars = list(input_text)

        for i, char in enumerate(chars):
            prev_char = chars[i - 1] if i > 0 else ''
            next_char = chars[i + 1] if i + 1 < len(chars) else ''

            # Handle quote toggling
            if char == '"' and not in_single_quote:
                in_double_quote = not in_double_quote
                result.append(char)
                continue
            if char == "'" and not in_double_quote:
                in_single_quote = not in_single_quote
                result.append(char)
                continue

            # If inside quotes, preserve as-is
            if in_single_quote or in_double_quote:
                result.append(char)
                continue

            # Check if current char is a punctuation symbol
            if char in self.punctuation_symbols:
                # Only tokenize punctuation when it follows an alphanumeric character
                if self._is_alphanumeric(prev_char):
                    # Add space before if not already present
                    if result and not result[-1] in ' \t\n':
                        result.append(' ')
                    result.append(char)
                    # Add space after if next char is alphanumeric
                    if self._is_alphanumeric(next_char):
                        result.append(' ')
                else:
                    result.append(char)
                continue

            # Check if current char is a math symbol
            if char in self.math_symbols:
                # Only tokenize math symbols when BOTH sides are digits
                prev_is_digit = self._is_digit(prev_char)
                next_is_digit = self._is_digit(next_char)

                if prev_is_digit and next_is_digit:
                    # Tokenize: both sides are digits
                    if result and not result[-1] in ' \t\n':
                        result.append(' ')
                    result.append(char)
                    result.append(' ')
                else:
                    # Don't tokenize: preserve as part of identifier
                    result.append(char)
                continue

            result.append(char)

        return ''.join(result)

    def compact(self, output: str) -> str:
        """
        Compact output by removing spaces around symbols (inverse of tokenize).
        This is used for formatting output in a more human-readable way.

        Args:
            output: The formatted output string

        Returns:
            Output with spaces around symbols removed
        """
        if not self.enabled:
            return output

        all_symbols = set(self.punctuation_symbols + self.math_symbols)
        result = []
        in_single_quote = False
        in_double_quote = False
        chars = list(output)

        for i, char in enumerate(chars):
            # Handle quote toggling
            if char == '"' and not in_single_quote:
                in_double_quote = not in_double_quote
                result.append(char)
                continue
            if char == "'" and not in_double_quote:
                in_single_quote = not in_single_quote
                result.append(char)
                continue

            # If inside quotes, preserve as-is
            if in_single_quote or in_double_quote:
                result.append(char)
                continue

            # Check if this is a space that should be removed
            if char == ' ':
                prev_char = result[-1] if result else ''
                next_char = chars[i + 1] if i + 1 < len(chars) else ''

                # Skip space if it's between a word and a symbol, or between symbols
                if prev_char in all_symbols or next_char in all_symbols:
                    continue

            result.append(char)

        return ''.join(result)
