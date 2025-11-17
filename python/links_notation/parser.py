"""
Parser for Lino notation.

This module provides parsing functionality for Links Notation (Lino),
converting text into structured Link objects.
"""

from typing import List, Optional, Dict, Any
from .link import Link


class ParseError(Exception):
    """Exception raised when parsing fails."""


class Parser:
    """
    Parser for Lino notation.

    Handles both inline and indented syntax for defining links.
    """

    def __init__(self, max_input_size: int = 10 * 1024 * 1024, max_depth: int = 1000):
        """
        Initialize the parser.

        Args:
            max_input_size: Maximum input size in bytes (default: 10MB)
            max_depth: Maximum nesting depth (default: 1000)
        """
        self.indentation_stack = [0]
        self.pos = 0
        self.text = ""
        self.lines = []
        self.base_indentation = None
        self.max_input_size = max_input_size
        self.max_depth = max_depth

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

            self.text = input_text
            # Use smart line splitting that respects quoted strings
            self.lines = self._split_lines_respecting_quotes(input_text)
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
        in_single = False
        in_double = False
        paren_depth = 0
        i = 0

        while i < len(text):
            char = text[i]

            # Handle quote toggling
            if char == '"' and not in_single:
                in_double = not in_double
                current_line += char
            elif char == "'" and not in_double:
                in_single = not in_single
                current_line += char
            elif char == '(' and not in_single and not in_double:
                paren_depth += 1
                current_line += char
            elif char == ')' and not in_single and not in_double:
                paren_depth -= 1
                current_line += char
            elif char == '\n':
                if in_single or in_double or paren_depth > 0:
                    # Inside quotes or unclosed parens: preserve the newline
                    current_line += char
                else:
                    # Outside quotes and parens balanced: this is a line break
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
        raw_indent = len(line) - len(line.lstrip(' '))

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
            next_line = self.lines[self.pos]
            raw_next_indent = len(next_line) - len(next_line.lstrip(' '))
            # Normalize next line's indentation
            next_indent = max(0, raw_next_indent - (self.base_indentation or 0))

            if next_line.strip() and next_indent > indent:
                # This is a child
                child = self._parse_element(child_indent if not children else indent + 2)
                if child:
                    children.append(child)
            else:
                break

        if children:
            element['children'] = children

        return element

    def _parse_line_content(self, content: str) -> Dict:
        """Parse the content of a single line."""
        # Try multiline link format: (id: values) or (values)
        if content.startswith('(') and content.endswith(')'):
            inner = content[1:-1].strip()
            return self._parse_parenthesized(inner)

        # Try indented ID syntax: id:
        if content.endswith(':'):
            id_part = content[:-1].strip()
            ref = self._extract_reference(id_part)
            return {'id': ref, 'values': [], 'is_indented_id': True}

        # Try single-line link: id: values
        if ':' in content and not (content.startswith('"') or content.startswith("'")):
            parts = content.split(':', 1)
            if len(parts) == 2:
                id_part = parts[0].strip()
                values_part = parts[1].strip()
                ref = self._extract_reference(id_part)
                values = self._parse_values(values_part)
                return {'id': ref, 'values': values}

        # Simple value list
        values = self._parse_values(content)
        return {'values': values}

    def _parse_parenthesized(self, inner: str) -> Dict:
        """Parse content within parentheses."""
        # Check for id: values format
        colon_pos = self._find_colon_outside_quotes(inner)
        if colon_pos >= 0:
            id_part = inner[:colon_pos].strip()
            values_part = inner[colon_pos + 1:].strip()
            ref = self._extract_reference(id_part)
            values = self._parse_values(values_part)
            return {'id': ref, 'values': values}

        # Just values
        values = self._parse_values(inner)
        return {'values': values}

    def _find_colon_outside_quotes(self, text: str) -> int:
        """
        Find the position of a colon that's not inside quotes or parentheses.

        This is crucial for correctly parsing nested self-referenced objects.
        For example, in: ((str key) (obj_1: dict ...))
        The colon after obj_1 should NOT be found as a top-level colon
        because it's inside the second parenthesized expression.
        """
        in_single = False
        in_double = False
        paren_depth = 0

        for i, char in enumerate(text):
            if char == "'" and not in_double:
                in_single = not in_single
            elif char == '"' and not in_single:
                in_double = not in_double
            elif char == '(' and not in_single and not in_double:
                paren_depth += 1
            elif char == ')' and not in_single and not in_double:
                paren_depth -= 1
            elif char == ':' and not in_single and not in_double and paren_depth == 0:
                # Only return colon if it's outside quotes AND at parenthesis depth 0
                return i

        return -1

    def _parse_values(self, text: str) -> List[Dict]:
        """Parse a space-separated list of values."""
        if not text:
            return []

        values = []
        current = ""
        in_single = False
        in_double = False
        paren_depth = 0

        i = 0
        while i < len(text):
            char = text[i]

            if char == "'" and not in_double:
                in_single = not in_single
                current += char
            elif char == '"' and not in_single:
                in_double = not in_double
                current += char
            elif char == '(' and not in_single and not in_double:
                paren_depth += 1
                current += char
            elif char == ')' and not in_single and not in_double:
                paren_depth -= 1
                current += char
            elif char == ' ' and not in_single and not in_double and paren_depth == 0:
                # End of current value
                if current.strip():
                    values.append(self._parse_value(current.strip()))
                current = ""
            else:
                current += char

            i += 1

        # Add last value
        if current.strip():
            values.append(self._parse_value(current.strip()))

        return values

    def _parse_value(self, value: str) -> Dict:
        """Parse a single value (could be a reference or nested link)."""
        # Nested link in parentheses
        if value.startswith('(') and value.endswith(')'):
            inner = value[1:-1].strip()
            return self._parse_parenthesized(inner)

        # Simple reference
        ref = self._extract_reference(value)
        return {'id': ref}

    def _extract_reference(self, text: str) -> str:
        """Extract reference, handling quoted strings."""
        text = text.strip()

        # Double quoted
        if text.startswith('"') and text.endswith('"'):
            return text[1:-1]

        # Single quoted
        if text.startswith("'") and text.endswith("'"):
            return text[1:-1]

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

        children = item.get('children', [])

        # Special case: indented ID syntax (id: followed by children)
        if item.get('is_indented_id') and item.get('id') and not item.get('values') and children:
            child_values = []
            for child in children:
                # Extract the reference from child's values
                if child.get('values') and len(child['values']) == 1:
                    child_values.append(self._transform_link(child['values'][0]))
                else:
                    child_values.append(self._transform_link(child))

            link_with_children = {
                'id': item['id'],
                'values': child_values
            }
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

        # Simple reference
        if 'id' in item and 'values' not in item:
            return Link(item['id'])

        # Link with values
        if 'values' in item:
            link_id = item.get('id')
            values = [self._transform_link(v) for v in item['values']]
            return Link(link_id, values)

        # Default
        return Link(item.get('id'))
