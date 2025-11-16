"""
FormatConfig for Lino notation formatting.

Provides configuration options for controlling how Link objects are formatted.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FormatConfig:
    """Configuration options for formatting links.

    Attributes:
        less_parentheses: If True, omit parentheses where safe (default: False)
        max_line_length: Maximum line length before auto-indenting (default: 80)
        indent_long_lines: If True, indent lines exceeding max_line_length (default: False)
        max_inline_refs: Maximum number of references before auto-indenting (default: None = unlimited)
        group_consecutive: If True, group consecutive links with same ID (default: False)
        indent_string: String to use for indentation (default: "  " = two spaces)
        prefer_inline: If True, prefer inline format when under thresholds (default: True)
    """

    less_parentheses: bool = False
    max_line_length: int = 80
    indent_long_lines: bool = False
    max_inline_refs: Optional[int] = None
    group_consecutive: bool = False
    indent_string: str = "  "
    prefer_inline: bool = True

    def should_indent_by_length(self, line: str) -> bool:
        """Check if line should be indented based on length.

        Args:
            line: The line to check

        Returns:
            True if line should be indented based on length threshold
        """
        if not self.indent_long_lines:
            return False
        # Count printable unicode characters
        return len(line) > self.max_line_length

    def should_indent_by_ref_count(self, ref_count: int) -> bool:
        """Check if link should be indented based on reference count.

        Args:
            ref_count: Number of references in the link

        Returns:
            True if link should be indented based on reference count threshold
        """
        if self.max_inline_refs is None:
            return False
        return ref_count > self.max_inline_refs
