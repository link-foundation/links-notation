"""
Link class representing a Lino link with optional ID and values.
"""

from typing import TYPE_CHECKING, List, Optional, Union

if TYPE_CHECKING:
    from .format_config import FormatConfig


class Link:
    """
    Represents a link in Lino notation.

    A link can be:
    - A simple reference (id only, no values)
    - A link with id and values
    - A link with only values (no id)

    For multi-reference IDs (e.g., "some example" before colon), use the `ids` property.
    The `id` property will throw an error for multi-reference IDs.
    """

    def __init__(self, link_id: Optional[Union[str, List[str]]] = None, values: Optional[List["Link"]] = None):
        """
        Initialize a Link.

        Args:
            link_id: Optional identifier for the link (string or list of strings for multi-reference)
            values: Optional list of child links
        """
        # Store ids as a list internally (primary storage)
        if link_id is None:
            self._ids: Optional[List[str]] = None
        elif isinstance(link_id, list):
            self._ids = link_id
        else:
            self._ids = [link_id]

        self.values = values if values is not None else []
        self._is_from_path_combination = False

    @property
    def ids(self) -> Optional[List[str]]:
        """Get the ids list (primary storage for reference identifiers)."""
        return self._ids

    @ids.setter
    def ids(self, value: Optional[List[str]]) -> None:
        """Set the ids list."""
        self._ids = value

    @property
    def id(self) -> Optional[str]:
        """
        Get the id as a single string (backward compatibility).

        Raises:
            ValueError: If ids has more than one element (use ids property instead)

        Returns:
            Single reference string, or None if no id
        """
        if self._ids is None:
            return None
        if len(self._ids) > 1:
            raise ValueError(
                f"This link has a multi-reference id with {len(self._ids)} parts. "
                "Use the 'ids' property instead of 'id'."
            )
        return self._ids[0]

    @id.setter
    def id(self, value: Optional[Union[str, List[str]]]) -> None:
        """Set the id (backward compatibility)."""
        if value is None:
            self._ids = None
        elif isinstance(value, list):
            self._ids = value
        else:
            self._ids = [value]

    def __str__(self) -> str:
        """String representation using standard formatting."""
        return self.format(False)

    def __repr__(self) -> str:
        """Developer-friendly representation."""
        return f"Link(ids={self._ids!r}, values={self.values!r})"

    def __eq__(self, other) -> bool:
        """Check equality with another Link."""
        if not isinstance(other, Link):
            return False
        # Compare ids lists
        if self._ids is None and other._ids is not None:
            return False
        if self._ids is not None and other._ids is None:
            return False
        if self._ids is not None and other._ids is not None:
            if len(self._ids) != len(other._ids):
                return False
            if not all(a == b for a, b in zip(self._ids, other._ids)):
                return False
        if len(self.values) != len(other.values):
            return False
        return all(v1 == v2 for v1, v2 in zip(self.values, other.values))

    def get_values_string(self) -> str:
        """Get formatted string of all values."""
        if not self.values:
            return ""
        return " ".join(Link.get_value_string(v) for v in self.values)

    def simplify(self) -> "Link":
        """
        Simplify the link structure.
        - If no values, return self
        - If single value, return that value
        - Otherwise return new Link with simplified values
        """
        if not self.values:
            return self
        elif len(self.values) == 1:
            return self.values[0]
        else:
            new_values = [v.simplify() for v in self.values]
            return Link(self._ids, new_values)

    def combine(self, other: "Link") -> "Link":
        """Combine this link with another to create a compound link."""
        return Link(None, [self, other])

    @staticmethod
    def get_value_string(value: "Link") -> str:
        """Get string representation of a value."""
        return value.to_link_or_id_string()

    @staticmethod
    def escape_reference(reference: Optional[Union[str, List[str]]]) -> str:
        """
        Escape a reference string or multi-reference list if it contains special characters.

        Args:
            reference: The reference string or list of strings (multi-reference) to escape

        Returns:
            Escaped reference with quotes if needed
        """
        # Handle multi-reference (list of strings)
        if isinstance(reference, list):
            # Multi-reference: join with space, each part should be a simple reference
            return " ".join(Link.escape_reference(r) for r in reference)

        if not reference or (isinstance(reference, str) and not reference.strip()):
            return ""

        # Ensure reference is a string
        ref_str = str(reference)

        # Check if single quotes are needed
        needs_single_quotes = any(c in ref_str for c in [":", "(", ")", " ", "\t", "\n", "\r", '"'])

        if needs_single_quotes:
            return f"'{ref_str}'"
        elif "'" in ref_str:
            return f'"{ref_str}"'
        else:
            return ref_str

    def to_link_or_id_string(self) -> str:
        """Convert to string, using just ID if no values, otherwise full format."""
        if not self.values:
            return Link.escape_reference(self._ids) if self._ids is not None else ""
        return str(self)

    def format(self, less_parentheses: Union[bool, "FormatConfig"] = False, is_compound_value: bool = False) -> str:
        """
        Format the link as a string.

        Args:
            less_parentheses: If True, omit parentheses when safe; or a FormatConfig object
            is_compound_value: If True, this is a value in a compound link

        Returns:
            Formatted string representation
        """
        # Support FormatConfig as first parameter
        from .format_config import FormatConfig

        if isinstance(less_parentheses, FormatConfig):
            return self._format_with_config(less_parentheses, is_compound_value)

        # Original implementation for backward compatibility
        # Empty link
        if self._ids is None and not self.values:
            return "" if less_parentheses else "()"

        # Link with only ID, no values
        if not self.values:
            escaped_id = Link.escape_reference(self._ids)
            # When used as a value in a compound link, wrap in parentheses
            if is_compound_value:
                return f"({escaped_id})"
            return escaped_id if (less_parentheses and not self.needs_parentheses(self._ids)) else f"({escaped_id})"

        # Format values recursively
        values_str = " ".join(self.format_value(v) for v in self.values)

        # Link with values only (null id)
        if self._ids is None:
            if less_parentheses:
                # Check if all values are simple (no nested values)
                all_simple = all(not v.values for v in self.values)
                if all_simple:
                    # Format each value without extra wrapping
                    return " ".join(Link.escape_reference(v._ids) for v in self.values)
                # For mixed or complex values, return without outer wrapper
                return values_str
            # For normal mode, wrap in parentheses
            return f"({values_str})"

        # Link with ID and values
        id_str = Link.escape_reference(self._ids)
        with_colon = f"{id_str}: {values_str}"
        return with_colon if (less_parentheses and not self.needs_parentheses(self._ids)) else f"({with_colon})"

    def format_value(self, value: "Link") -> str:
        """
        Format a single value within this link.

        Args:
            value: The value link to format

        Returns:
            Formatted string for the value
        """
        # Check if we're in a compound link from path combinations
        is_compound_from_paths = self._is_from_path_combination

        # For compound links from paths, format values with parentheses
        if is_compound_from_paths:
            return value.format(False, True)

        # Simple link with just an ID - don't wrap in parentheses when used as a value
        if not value.values:
            return Link.escape_reference(value._ids)

        # Complex value with its own structure - format it normally with parentheses
        return value.format(False, False)

    def needs_parentheses(self, s: Optional[Union[str, List[str]]]) -> bool:
        """Check if a string or array needs to be wrapped in parentheses."""
        # Multi-reference arrays always need parentheses when formatted inline
        if isinstance(s, list):
            return len(s) > 1
        return s and any(c in s for c in [" ", ":", "(", ")"])

    def _format_with_config(self, config: "FormatConfig", is_compound_value: bool = False) -> str:
        """
        Format the link using a FormatConfig object.

        Args:
            config: FormatConfig object with formatting options
            is_compound_value: If True, this is a value in a compound link

        Returns:
            Formatted string representation
        """
        # Note: FormatConfig import is needed for type checking but the parameter
        # is already validated by the caller, so we use a noqa comment here
        from .format_config import FormatConfig  # noqa: F401

        # Empty link
        if self._ids is None and not self.values:
            return "" if config.less_parentheses else "()"

        # Link with only ID, no values
        if not self.values:
            escaped_id = Link.escape_reference(self._ids)
            if is_compound_value:
                return f"({escaped_id})"
            return (
                escaped_id if (config.less_parentheses and not self.needs_parentheses(self._ids)) else f"({escaped_id})"
            )

        # Check if we should use indented format
        should_indent = False
        if config.should_indent_by_ref_count(len(self.values)):
            should_indent = True
        else:
            # Try inline format first
            values_str = " ".join(self.format_value(v) for v in self.values)
            if self._ids is not None:
                id_str = Link.escape_reference(self._ids)
                test_line = f"{id_str}: {values_str}" if config.less_parentheses else f"({id_str}: {values_str})"
            else:
                test_line = values_str if config.less_parentheses else f"({values_str})"

            if config.should_indent_by_length(test_line):
                should_indent = True

        # Format with indentation if needed
        if should_indent and config.prefer_inline is False:
            return self._format_indented(config)

        # Standard inline formatting
        values_str = " ".join(self.format_value(v) for v in self.values)

        # Link with values only (null id)
        if self._ids is None:
            if config.less_parentheses:
                all_simple = all(not v.values for v in self.values)
                if all_simple:
                    return " ".join(Link.escape_reference(v._ids) for v in self.values)
                return values_str
            return f"({values_str})"

        # Link with ID and values
        id_str = Link.escape_reference(self._ids)
        with_colon = f"{id_str}: {values_str}"
        return with_colon if (config.less_parentheses and not self.needs_parentheses(self._ids)) else f"({with_colon})"

    def _format_indented(self, config: "FormatConfig") -> str:
        """
        Format the link with indentation.

        Args:
            config: FormatConfig object with formatting options

        Returns:
            Indented formatted string
        """
        if self._ids is None:
            # Values only - format each on separate line
            lines = [self.format_value(v) for v in self.values]
            return "\n".join(config.indent_string + line for line in lines)

        # Link with ID - format as id:\n  value1\n  value2
        id_str = Link.escape_reference(self._ids)
        lines = [f"{id_str}:"]
        for v in self.values:
            lines.append(config.indent_string + self.format_value(v))
        return "\n".join(lines)
