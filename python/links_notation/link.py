"""
Link class representing a Lino link with optional ID and values.
"""

from typing import TYPE_CHECKING, List, Optional, Union

from .quotes import reference_quote
from .reference_literal import format_reference

if TYPE_CHECKING:
    from .format_config import FormatConfig


class Link:
    """
    Represents a link in Lino notation.

    A link can be:
    - A simple reference (id only, no values)
    - A link with id and values
    - A link with only values (no id)
    """

    def __init__(self, link_id: Optional[str] = None, values: Optional[List["Link"]] = None):
        """
        Initialize a Link.

        Args:
            link_id: Optional identifier for the link
            values: Optional list of child links
        """
        self.id = link_id
        self.values = values if values is not None else []
        self._is_from_path_combination = False
        self._raw_id: Optional[str] = None

    @property
    def raw_id(self) -> Optional[str]:
        """
        The ID exactly as the parsed document wrote it: ``'1'`` for a quoted
        ``1``, ``1`` for a bare one, ``~1{31}`` for a versioned literal.

        None for a link without an ID, a link built in code, a link made by
        combining the lines of an indented document, and every link read by a
        parser created with ``syntax=False``. It takes no part in equality,
        ``str()``, ``repr()`` or ``format()``.
        """
        return self._raw_id

    @raw_id.setter
    def raw_id(self, raw: Optional[str]) -> None:
        if raw is not None and not isinstance(raw, str):
            raise TypeError("raw_id must be a string or None")
        self._raw_id = raw

    @property
    def quote(self) -> Optional[str]:
        """
        The delimiter the ID was written between: ``'``, ``"`` or a backtick
        when it was quoted, and None when it was bare, a versioned literal, or
        not read from a document (see :attr:`raw_id`). ``1`` and ``'1'`` stay
        equal links; this only says how each was written.
        """
        return reference_quote(self._raw_id)

    def __str__(self) -> str:
        """String representation using standard formatting."""
        return self.format(False)

    def __repr__(self) -> str:
        """Developer-friendly representation."""
        return f"Link(id={self.id!r}, values={self.values!r})"

    def __eq__(self, other) -> bool:
        """Check equality with another Link."""
        if not isinstance(other, Link):
            return False
        if self.id != other.id:
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
            return Link(self.id, new_values)

    def combine(self, other: "Link") -> "Link":
        """Combine this link with another to create a compound link."""
        return Link(None, [self, other])

    @staticmethod
    def get_value_string(value: "Link") -> str:
        """Get string representation of a value."""
        return value.to_link_or_id_string()

    @staticmethod
    def escape_reference(reference: Optional[str]) -> str:
        """
        Escape a reference string if it contains special characters.

        Args:
            reference: The reference string to escape

        Returns:
            Escaped reference with quotes if needed
        """
        if reference is None:
            return ""

        return format_reference(reference)

    def to_link_or_id_string(self) -> str:
        """Convert to string, using just ID if no values, otherwise full format."""
        if not self.values:
            return Link.escape_reference(self.id) if self.id is not None else ""
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
        if self.id is None and not self.values:
            return "()"

        # Link with only ID, no values
        if not self.values:
            escaped_id = Link.escape_reference(self.id)
            # When used as a value in a compound link, wrap in parentheses
            if is_compound_value:
                return f"({escaped_id})"
            return escaped_id if (less_parentheses and not self.needs_parentheses(self.id)) else f"({escaped_id})"

        # Format values recursively
        values_str = " ".join(self.format_value(v) for v in self.values)

        # Link with values only (null id)
        if self.id is None:
            if less_parentheses and not self._has_lone_nested_value():
                # Check if all values are simple (no nested values)
                all_simple = all(not v.values for v in self.values)
                if all_simple:
                    # Format each value without extra wrapping
                    return " ".join(Link.escape_reference(v.id) for v in self.values)
                # For mixed or complex values, return without outer wrapper
                return values_str
            # For normal mode, wrap in parentheses
            return f"({values_str})"

        # Link with ID and values
        id_str = Link.escape_reference(self.id)
        with_colon = f"{id_str}: {values_str}"
        return with_colon if (less_parentheses and not self.needs_parentheses(self.id)) else f"({with_colon})"

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
            return Link.escape_reference(value.id)

        # Complex value with its own structure - format it normally with parentheses
        return value.format(False, False)

    def needs_parentheses(self, s: Optional[str]) -> bool:
        """Check if a string needs to be wrapped in parentheses."""
        return s and any(c in s for c in [" ", ":", "(", ")"])

    def _has_lone_nested_value(self) -> bool:
        """
        Check whether this link holds exactly one link that has values.

        The parentheses of an anonymous link are what nest such a value:
        ``((b c))`` without them is ``(b c)``, a different link, so
        less_parentheses has to keep them.
        """
        return len(self.values) == 1 and bool(self.values[0].values)

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
        if self.id is None and not self.values:
            return "()"

        # Link with only ID, no values
        if not self.values:
            escaped_id = Link.escape_reference(self.id)
            if is_compound_value:
                return f"({escaped_id})"
            return (
                escaped_id if (config.less_parentheses and not self.needs_parentheses(self.id)) else f"({escaped_id})"
            )

        # Check if we should use indented format
        should_indent = False
        if config.should_indent_by_ref_count(len(self.values)):
            should_indent = True
        else:
            # Try inline format first
            values_str = " ".join(self.format_value(v) for v in self.values)
            if self.id is not None:
                id_str = Link.escape_reference(self.id)
                test_line = f"{id_str}: {values_str}" if config.less_parentheses else f"({id_str}: {values_str})"
            else:
                keeps_parentheses = not config.less_parentheses or self._has_lone_nested_value()
                test_line = f"({values_str})" if keeps_parentheses else values_str

            if config.should_indent_by_length(test_line):
                should_indent = True

        # Format with indentation if needed
        if should_indent and config.prefer_inline is False:
            return self._format_indented(config)

        # Standard inline formatting
        values_str = " ".join(self.format_value(v) for v in self.values)

        # Link with values only (null id)
        if self.id is None:
            if config.less_parentheses and not self._has_lone_nested_value():
                all_simple = all(not v.values for v in self.values)
                if all_simple:
                    return " ".join(Link.escape_reference(v.id) for v in self.values)
                return values_str
            return f"({values_str})"

        # Link with ID and values
        id_str = Link.escape_reference(self.id)
        with_colon = f"{id_str}: {values_str}"
        return with_colon if (config.less_parentheses and not self.needs_parentheses(self.id)) else f"({with_colon})"

    def _format_indented(self, config: "FormatConfig") -> str:
        """
        Format the link with indentation.

        Args:
            config: FormatConfig object with formatting options

        Returns:
            Indented formatted string
        """
        if self.id is None:
            # Values only - format each on separate line
            lines = [self.format_value(v) for v in self.values]
            return "\n".join(config.indent_string + line for line in lines)

        # Link with ID - format as id:\n  value1\n  value2
        id_str = Link.escape_reference(self.id)
        lines = [f"{id_str}:"]
        for v in self.values:
            lines.append(config.indent_string + self.format_value(v))
        return "\n".join(lines)
