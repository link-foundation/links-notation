"""
Parser for Lino notation.

This module provides parsing functionality for Links Notation (Lino),
converting text into structured Link objects.
"""

from typing import Any, Dict, List, Optional

from .comments import strip_comments
from .link import Link
from .quotes import _parse_quoted_string_at


class ParseError(Exception):
    """Exception raised when parsing fails."""


class Parser:
    """
    Parser for Lino notation.

    Handles both inline and indented syntax for defining links.
    """

    def __init__(
        self,
        max_input_size: int = 10 * 1024 * 1024,
        max_depth: int = 1000,
        comments: bool = True,
    ):
        """
        Initialize the parser.

        Args:
            max_input_size: Maximum input size in bytes (default: 10MB)
            max_depth: Maximum nesting depth (default: 1000)
            comments: Whether ``#`` starts a comment that runs to the end of
                its line; when False it is an ordinary character (default: True)
        """
        self.indentation_stack = [0]
        self.pos = 0
        self.text = ""
        self.lines = []
        self.base_indentation = None
        self.max_input_size = max_input_size
        self.max_depth = max_depth
        self.comments = comments

    def parse(self, input_text: str) -> List[Link]:
        """
        Parse Lino notation text into a list of Link objects.

        Args:
            input_text: Text in Lino notation

        Returns:
            List of parsed Link objects

        Raises:
            ParseError: If parsing fails
            TypeError: If input is not a string
            ValueError: If input exceeds maximum size
        """
        # Validate input type
        if not isinstance(input_text, str):
            raise TypeError("Input must be a string")

        # Validate input size
        if len(input_text) > self.max_input_size:
            raise ValueError(f"Input size exceeds maximum allowed size of {self.max_input_size} bytes")

        try:
            if not input_text or not input_text.strip():
                return []

            # Comments are blanked rather than removed, so every character
            # keeps the position it was written at.
            prepared = strip_comments(input_text) if self.comments else input_text

            self.text = prepared
            # Use smart line splitting that respects quoted strings
            self.lines = self._split_lines_respecting_quotes(prepared)
            self.pos = 0
            self.indentation_stack = [0]
            self.base_indentation = None

            raw_result = self._parse_document()
            return self._transform_result(raw_result)
        except (TypeError, ValueError):
            # Re-raise validation errors without wrapping
            raise
        except ParseError:
            # Re-raise ParseError without wrapping
            raise
        except (KeyError, IndexError, AttributeError) as e:
            # Catch specific parsing-related exceptions
            raise ParseError(f"Parse error: {str(e)}") from e

    def _skip_quoted_string(self, text: str, start: int) -> int:
        """
        Skip over the quoted string starting at start.

        Returns the position right after the closing quotes, or -1 when text
        does not start a terminated quoted string.
        """
        parsed = _parse_quoted_string_at(text, start)
        return -1 if parsed is None else parsed[1]

    def _split_lines_respecting_quotes(self, text: str) -> List[str]:
        """
        Split text into lines, but preserve newlines inside quoted strings
        and handle multiline parenthesized expressions.

        Quoted strings can span multiple lines, and newlines within them
        should be preserved as part of the string value. Also, parenthesized
        expressions that span multiple lines are kept together.
        """
        lines = []
        current_line = ""
        paren_depth = 0
        i = 0

        while i < len(text):
            char = text[i]

            if char in ('"', "'", "`"):
                end = self._skip_quoted_string(text, i)
                if end > i:
                    # A quoted string is opaque: newlines inside it are content
                    current_line += text[i:end]
                    i = end
                    continue
                current_line += char
            elif char == "(":
                paren_depth += 1
                current_line += char
            elif char == ")":
                paren_depth -= 1
                current_line += char
            elif char == "\n":
                if paren_depth > 0:
                    # Inside unclosed parens: preserve the newline
                    current_line += char
                else:
                    # Parentheses balanced: this is a line break
                    lines.append(current_line)
                    current_line = ""
            else:
                current_line += char

            i += 1

        # Add the last line if non-empty
        if current_line:
            lines.append(current_line)

        return lines

    def _parse_document(self) -> List[Dict]:
        """Parse the entire document."""
        self.pos = 0
        links = []

        while self.pos < len(self.lines):
            line = self.lines[self.pos]
            if line.strip():  # Skip empty lines
                element = self._parse_element(0)
                if element:
                    links.append(element)
            else:
                self.pos += 1

        return links

    def _parse_element(self, current_indent: int) -> Optional[Dict]:
        """Parse a single element (link or reference) at given indentation."""
        if self.pos >= len(self.lines):
            return None

        line = self.lines[self.pos]
        raw_indent = len(line) - len(line.lstrip(" "))

        # Set base indentation from first content line
        if self.base_indentation is None and line.strip():
            self.base_indentation = raw_indent

        # Normalize indentation relative to base
        indent = max(0, raw_indent - (self.base_indentation or 0))

        if indent < current_indent:
            return None

        content = line.strip()
        if not content:
            self.pos += 1
            return None

        self.pos += 1

        # Try to parse the line
        element = self._parse_line_content(content)

        # Check for children (indented lines that follow)
        children = []
        child_indent = indent + 2  # Expect at least 2 spaces for child

        while self.pos < len(self.lines):
            # A line holding nothing does not close a block: the block goes on
            # at the next line that holds something. Blanking a comment leaves
            # such a line behind, so this is also what keeps a block together
            # around a comment written inside it.
            following = self.pos
            while following < len(self.lines) and not self.lines[following].strip():
                following += 1
            if following >= len(self.lines):
                break

            next_line = self.lines[following]
            raw_next_indent = len(next_line) - len(next_line.lstrip(" "))
            # Normalize next line's indentation
            next_indent = max(0, raw_next_indent - (self.base_indentation or 0))

            if next_indent <= indent:
                break

            # This is a child
            self.pos = following
            child = self._parse_element(child_indent if not children else indent + 2)
            if child:
                children.append(child)

        if children:
            element["children"] = children

        return element

    def _parse_line_content(self, content: str) -> Dict:
        """Parse the content of a single line."""
        # A whole parenthesized group: (id: values), (values) or a nested document
        if content.startswith("(") and self._find_matching_paren(content, 0) == len(content) - 1:
            return self._parse_parenthesized(content[1:-1])

        # Try indented ID syntax: id:
        if content.endswith(":"):
            id_part = content[:-1].strip()
            ref = self._extract_reference(id_part)
            return {"id": ref, "values": [], "is_indented_id": True}

        # Try single-line link: id: values
        colon_pos = self._find_colon_outside_quotes(content)
        if colon_pos >= 0:
            id_part = content[:colon_pos].strip()
            values_part = content[colon_pos + 1 :].strip()
            ref = self._extract_reference(id_part)
            values = self._parse_values(values_part)
            return {"id": ref, "values": values}

        # Simple value list
        values = self._parse_values(content)
        return {"values": values}

    def _parse_parenthesized(self, inner: str) -> Dict:
        """
        Parse the content of a parenthesized group.

        The group opens a nested context that starts fresh at indentation level
        zero and follows exactly the rules used at the root of the document, so
        line breaks separate links and indentation nests them.
        """
        return {"nested": self._parse_nested_document(inner)}

    def _parse_nested_document(self, inner: str) -> List[Dict]:
        """Parse the text of a parenthesized group as a document of its own."""
        saved_lines = self.lines
        saved_pos = self.pos
        saved_base_indentation = self.base_indentation
        saved_indentation_stack = self.indentation_stack
        try:
            self.lines = self._split_lines_respecting_quotes(inner)
            self.pos = 0
            self.base_indentation = None
            self.indentation_stack = [0]
            return self._parse_document()
        finally:
            self.lines = saved_lines
            self.pos = saved_pos
            self.base_indentation = saved_base_indentation
            self.indentation_stack = saved_indentation_stack

    def _find_matching_paren(self, text: str, start: int) -> int:
        """
        Find the position of the parenthesis closing the one at start.

        Quoted strings are skipped, so parentheses inside them are ignored.
        Returns -1 when the group is not closed.
        """
        depth = 0
        i = start

        while i < len(text):
            char = text[i]
            if char in ('"', "'", "`"):
                end = self._skip_quoted_string(text, i)
                if end > i:
                    i = end
                    continue
            elif char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
                if depth == 0:
                    return i
            i += 1

        return -1

    def _find_colon_outside_quotes(self, text: str) -> int:
        """
        Find the position of a colon that's not inside quotes or parentheses.

        This is crucial for correctly parsing nested self-referenced objects.
        For example, in: ((str key) (obj_1: dict ...))
        The colon after obj_1 should NOT be found as a top-level colon
        because it's inside the second parenthesized expression.
        """
        paren_depth = 0
        i = 0

        while i < len(text):
            char = text[i]
            if char in ('"', "'", "`"):
                end = self._skip_quoted_string(text, i)
                if end > i:
                    i = end
                    continue
            elif char == "(":
                paren_depth += 1
            elif char == ")":
                paren_depth -= 1
            elif char == ":" and paren_depth == 0:
                # Only return colon if it's outside quotes AND at parenthesis depth 0
                return i
            i += 1

        return -1

    def _parse_values(self, text: str) -> List[Dict]:
        """Parse a space-separated list of values."""
        if not text:
            return []

        values = []
        i = 0

        while i < len(text):
            # Skip all whitespace (space, tab, newline, carriage return)
            while i < len(text) and text[i] in " \t\n\r":
                i += 1
            if i >= len(text):
                break

            # Try to extract the next value
            value_end, value_text = self._extract_next_value(text, i)
            if value_text and value_text.strip():
                values.append(self._parse_value(value_text))
            if value_end == i:
                # No progress made - skip this character to avoid infinite loop
                i += 1
            else:
                i = value_end

        return values

    def _extract_next_value(self, text: str, start: int) -> tuple:
        """
        Extract the next value from text starting at start position.
        Returns (end_position, value_text).
        """
        if start >= len(text):
            return (start, "")

        # Check if this starts with a delimited reference (any N quotes, or a
        # bare delimiter pair standing for the empty reference)
        quoted = _parse_quoted_string_at(text, start)
        if quoted is not None:
            _, end = quoted
            return (end, text[start:end])

        # Check if this starts with a parenthesized expression
        if text[start] == "(":
            end = self._find_matching_paren(text, start)
            if end >= 0:
                return (end + 1, text[start : end + 1])
            return (len(text), text[start:])

        # Regular value - read until space or end
        in_single = False
        in_double = False
        in_backtick = False
        i = start

        while i < len(text):
            char = text[i]
            if char == "'" and not in_double and not in_backtick:
                in_single = not in_single
            elif char == '"' and not in_single and not in_backtick:
                in_double = not in_double
            elif char == "`" and not in_single and not in_double:
                in_backtick = not in_backtick
            elif char == " " and not in_single and not in_double and not in_backtick:
                break
            i += 1

        return (i, text[start:i])

    def _parse_value(self, value: str) -> Dict:
        """Parse a single value (could be a reference or nested link)."""
        # Nested link in parentheses
        if value.startswith("(") and self._find_matching_paren(value, 0) == len(value) - 1:
            return self._parse_parenthesized(value[1:-1])

        # Simple reference
        ref = self._extract_reference(value)
        return {"id": ref}

    def _extract_reference(self, text: str) -> str:
        """Extract reference, handling quoted strings with escaping support."""
        text = text.strip()

        # Try delimited references (any N quotes, or a bare delimiter pair)
        quoted = _parse_quoted_string_at(text, 0)
        if quoted is not None:
            return quoted[0]

        # Unquoted
        return text

    def _transform_result(self, raw_result: List[Dict]) -> List[Link]:
        """Transform raw parse result into Link objects."""
        links = []

        for item in raw_result:
            # Use explicit None check
            if item is not None:
                self._collect_links(item, [], links)

        return links

    def _collect_links(self, item: Dict, parent_path: List[Link], result: List[Link]) -> None:
        """
        Recursively collect links from parse tree.

        Handles both inline and indented syntax, flattening the hierarchy
        appropriately.
        """
        # Use explicit None check
        if item is None:
            return

        children = item.get("children", [])

        # Special case: indented ID syntax (id: followed by children)
        if item.get("is_indented_id") and item.get("id") and not item.get("values") and children:
            child_values = []
            for child in children:
                # Extract the reference from child's values
                if child.get("values") and len(child["values"]) == 1:
                    child_values.append(self._transform_link(child["values"][0]))
                else:
                    child_values.append(self._transform_link(child))

            link_with_children = {"id": item["id"], "values": child_values}
            current_link = self._transform_link(link_with_children)

            if not parent_path:
                result.append(current_link)
            else:
                result.append(self._combine_path_elements(parent_path, current_link))

        # Regular indented structure
        elif children:
            current_link = self._transform_link(item)

            # Add the link combined with parent path
            if not parent_path:
                result.append(current_link)
            else:
                result.append(self._combine_path_elements(parent_path, current_link))

            # Process each child with this item in the path
            new_path = parent_path + [current_link]

            for child in children:
                self._collect_links(child, new_path, result)

        # Leaf item or item with inline values
        else:
            current_link = self._transform_link(item)

            if not parent_path:
                result.append(current_link)
            else:
                result.append(self._combine_path_elements(parent_path, current_link))

    def _combine_path_elements(self, path_elements: List[Link], current: Link) -> Link:
        """Combine path elements into a single link."""
        if not path_elements:
            return current

        if len(path_elements) == 1:
            combined = Link(None, [path_elements[0], current])
            combined._is_from_path_combination = True
            return combined

        # For multiple path elements, build proper nesting
        parent_path = path_elements[:-1]
        last_element = path_elements[-1]

        # Build the parent structure
        parent = self._combine_path_elements(parent_path, last_element)

        # Add current element to the built structure
        combined = Link(None, [parent, current])
        combined._is_from_path_combination = True
        return combined

    def _transform_link(self, item: Any) -> Link:
        """Transform a parsed item into a Link object."""
        if isinstance(item, Link):
            return item

        if not isinstance(item, dict):
            return Link(str(item))

        # Parenthesized group parsed as a nested context
        if "nested" in item:
            return self._transform_nested(item["nested"])

        # Simple reference
        if "id" in item and "values" not in item:
            return Link(item["id"])

        # Link with values
        if "values" in item:
            link_id = item.get("id")
            values = [self._transform_link(v) for v in item["values"]]
            return Link(link_id, values)

        # Default
        return Link(item.get("id"))

    def _transform_nested(self, nested: List[Dict]) -> Link:
        """
        Transform the links of a nested (parenthesized) context into one Link.

        The nested context is parsed with the same rules as the root, so it
        yields a list of links; a single link is used as is, several links
        become the values of one anonymous link. An already parenthesized single
        link keeps its own group, so ``((a b))`` stays distinct from ``(a b)``.
        """
        nested_links: List[Link] = []
        for item in nested:
            if item is not None:
                self._collect_links(item, [], nested_links)

        wraps_single_group = len(nested) == 1 and isinstance(nested[0], dict) and "nested" in nested[0]
        if len(nested_links) == 1 and not wraps_single_group:
            return nested_links[0]

        return Link(None, nested_links)
