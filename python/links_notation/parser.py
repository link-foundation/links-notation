"""
Parser for Lino notation.

This module provides parsing functionality for Links Notation (Lino),
converting text into structured Link objects.
"""

from typing import Any, Dict, List, Optional

from .link import Link


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
        enable_multi_ref_context: bool = True,
    ):
        """
        Initialize the parser.

        Args:
            max_input_size: Maximum input size in bytes (default: 10MB)
            max_depth: Maximum nesting depth (default: 1000)
            enable_multi_ref_context: Enable context-aware multi-reference recognition (default: True)
        """
        self.indentation_stack = [0]
        self.pos = 0
        self.text = ""
        self.lines = []
        self.base_indentation = None
        self.max_input_size = max_input_size
        self.max_depth = max_depth
        self.enable_multi_ref_context = enable_multi_ref_context
        # Storage for defined multi-references (keys are tuple of parts for lookup)
        self.multi_ref_definitions: Dict[str, List[str]] = {}

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

        # Clear previous multi-ref definitions for each parse
        self.multi_ref_definitions.clear()

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
        in_backtick = False
        paren_depth = 0
        i = 0

        while i < len(text):
            char = text[i]

            # Handle quote toggling
            if char == '"' and not in_single and not in_backtick:
                in_double = not in_double
                current_line += char
            elif char == "'" and not in_double and not in_backtick:
                in_single = not in_single
                current_line += char
            elif char == "`" and not in_single and not in_double:
                in_backtick = not in_backtick
                current_line += char
            elif char == "(" and not in_single and not in_double and not in_backtick:
                paren_depth += 1
                current_line += char
            elif char == ")" and not in_single and not in_double and not in_backtick:
                paren_depth -= 1
                current_line += char
            elif char == "\n":
                if in_single or in_double or in_backtick or paren_depth > 0:
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
            next_line = self.lines[self.pos]
            raw_next_indent = len(next_line) - len(next_line.lstrip(" "))
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
            element["children"] = children

        return element

    def _parse_line_content(self, content: str) -> Dict:
        """Parse the content of a single line."""
        # Try multiline link format: (id: values) or (values)
        if content.startswith("(") and content.endswith(")"):
            inner = content[1:-1].strip()
            return self._parse_parenthesized(inner)

        # Try indented ID syntax: id: (or multi-word: some example:)
        if content.endswith(":"):
            id_part = content[:-1].strip()
            multi_ref = self._extract_multi_reference_id(id_part)
            return {"id": multi_ref, "values": [], "is_indented_id": True, "is_multi_ref": isinstance(multi_ref, list) and len(multi_ref) > 1}

        # Try single-line link: id: values (or multi-word: some example: values)
        if ":" in content and not (content.startswith('"') or content.startswith("'")):
            colon_pos = self._find_colon_outside_quotes(content)
            if colon_pos >= 0:
                id_part = content[:colon_pos].strip()
                values_part = content[colon_pos + 1 :].strip()
                multi_ref = self._extract_multi_reference_id(id_part)
                values = self._parse_values(values_part)
                return {"id": multi_ref, "values": values, "is_multi_ref": isinstance(multi_ref, list) and len(multi_ref) > 1}

        # Simple value list
        values = self._parse_values(content)
        return {"values": values}

    def _parse_parenthesized(self, inner: str) -> Dict:
        """Parse content within parentheses."""
        # Check for id: values format
        colon_pos = self._find_colon_outside_quotes(inner)
        if colon_pos >= 0:
            id_part = inner[:colon_pos].strip()
            values_part = inner[colon_pos + 1 :].strip()
            # Try to extract multi-reference ID (multiple space-separated words)
            multi_ref = self._extract_multi_reference_id(id_part)
            values = self._parse_values(values_part)
            return {"id": multi_ref, "values": values, "is_multi_ref": isinstance(multi_ref, list) and len(multi_ref) > 1}

        # Just values
        values = self._parse_values(inner)
        return {"values": values}

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
        in_backtick = False
        paren_depth = 0

        for i, char in enumerate(text):
            if char == "'" and not in_double and not in_backtick:
                in_single = not in_single
            elif char == '"' and not in_single and not in_backtick:
                in_double = not in_double
            elif char == "`" and not in_single and not in_double:
                in_backtick = not in_backtick
            elif char == "(" and not in_single and not in_double and not in_backtick:
                paren_depth += 1
            elif char == ")" and not in_single and not in_double and not in_backtick:
                paren_depth -= 1
            elif char == ":" and not in_single and not in_double and not in_backtick and paren_depth == 0:
                # Only return colon if it's outside quotes AND at parenthesis depth 0
                return i

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

        # Check if this starts with a multi-quote string (supports any N quotes)
        for quote_char in ['"', "'", "`"]:
            if text[start:].startswith(quote_char):
                # Count opening quotes dynamically
                quote_count = 0
                pos = start
                while pos < len(text) and text[pos] == quote_char:
                    quote_count += 1
                    pos += 1

                if quote_count >= 1:
                    # Parse this multi-quote string
                    remaining = text[start:]
                    open_close = quote_char * quote_count
                    escape_seq = quote_char * (quote_count * 2)

                    inner_pos = len(open_close)
                    while inner_pos < len(remaining):
                        # Check for escape sequence (2*N quotes)
                        if remaining[inner_pos:].startswith(escape_seq):
                            inner_pos += len(escape_seq)
                            continue
                        # Check for closing quotes
                        if remaining[inner_pos:].startswith(open_close):
                            after_close_pos = inner_pos + len(open_close)
                            # Make sure this is exactly N quotes (not more)
                            if after_close_pos >= len(remaining) or remaining[after_close_pos] != quote_char:
                                # Found the end
                                return (start + after_close_pos, remaining[:after_close_pos])
                        inner_pos += 1

                    # No closing found, treat as regular text
                    break

        # Check if this starts with a parenthesized expression
        if text[start] == "(":
            paren_depth = 1
            in_single = False
            in_double = False
            in_backtick = False
            i = start + 1

            while i < len(text) and paren_depth > 0:
                char = text[i]
                if char == "'" and not in_double and not in_backtick:
                    in_single = not in_single
                elif char == '"' and not in_single and not in_backtick:
                    in_double = not in_double
                elif char == "`" and not in_single and not in_double:
                    in_backtick = not in_backtick
                elif char == "(" and not in_single and not in_double and not in_backtick:
                    paren_depth += 1
                elif char == ")" and not in_single and not in_double and not in_backtick:
                    paren_depth -= 1
                i += 1

            return (i, text[start:i])

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
        if value.startswith("(") and value.endswith(")"):
            inner = value[1:-1].strip()
            return self._parse_parenthesized(inner)

        # Simple reference
        ref = self._extract_reference(value)
        return {"id": ref}

    def _extract_reference(self, text: str) -> str:
        """Extract reference, handling quoted strings with escaping support."""
        text = text.strip()

        # Try multi-quote strings (supports any N quotes)
        for quote_char in ['"', "'", "`"]:
            if text.startswith(quote_char):
                # Count opening quotes dynamically
                quote_count = 0
                while quote_count < len(text) and text[quote_count] == quote_char:
                    quote_count += 1

                if quote_count >= 1 and len(text) > quote_count:
                    # Try to parse this multi-quote string
                    result = self._parse_multi_quote_string(text, quote_char, quote_count)
                    if result is not None:
                        return result

        # Unquoted
        return text

    def _extract_multi_reference_id(self, text: str) -> Any:
        """
        Extract a multi-reference ID from text.

        Multi-reference IDs are multiple space-separated words before a colon.
        For example: "some example" -> ["some", "example"]

        If the ID is a single word or a quoted string, returns the string directly
        for backward compatibility.

        Args:
            text: The ID portion (before the colon)

        Returns:
            Either a string (single reference) or list of strings (multi-reference)
        """
        text = text.strip()

        # If quoted, treat as single reference (existing behavior)
        for quote_char in ['"', "'", "`"]:
            if text.startswith(quote_char):
                return self._extract_reference(text)

        # Split by whitespace to check for multi-word
        parts = text.split()

        if len(parts) == 1:
            # Single word - return as string for backward compatibility
            return parts[0]
        else:
            # Multiple words - return as list (multi-reference)
            return parts

    def _parse_multi_quote_string(self, text: str, quote_char: str, quote_count: int) -> Optional[str]:
        """
        Parse a multi-quote string.

        For N quotes: opening = N quotes, closing = N quotes, escape = 2*N quotes -> N quotes
        """
        open_close = quote_char * quote_count
        escape_seq = quote_char * (quote_count * 2)
        escape_val = quote_char * quote_count

        # Check for opening quotes
        if not text.startswith(open_close):
            return None

        remaining = text[len(open_close) :]
        content = ""

        while remaining:
            # Check for escape sequence (2*N quotes)
            if remaining.startswith(escape_seq):
                content += escape_val
                remaining = remaining[len(escape_seq) :]
                continue

            # Check for closing quotes (N quotes not followed by more quotes)
            if remaining.startswith(open_close):
                after_close = remaining[len(open_close) :]
                # Make sure this is exactly N quotes (not more)
                if not after_close or not after_close.startswith(quote_char):
                    # Closing found - but only if we consumed the entire text
                    if not after_close.strip():
                        return content
                    else:
                        # There's more text after closing, may not be valid
                        return content

            # Take the next character
            content += remaining[0]
            remaining = remaining[1:]

        # No closing quotes found
        return None

    def _transform_result(self, raw_result: List[Dict]) -> List[Link]:
        """Transform raw parse result into Link objects."""
        # First pass: collect all multi-reference definitions
        if self.enable_multi_ref_context:
            self._collect_multi_ref_definitions(raw_result)

        links = []

        # Second pass: transform with multi-reference recognition
        for item in raw_result:
            # Use explicit None check
            if item is not None:
                self._collect_links(item, [], links)

        return links

    def _collect_multi_ref_definitions(self, items: List[Dict]) -> None:
        """
        Collect multi-reference definitions from parsed items.

        Args:
            items: List of parsed items
        """
        for item in items:
            if item is None:
                continue

            # Check if this item has a multi-reference ID (list)
            item_id = item.get("id")
            if isinstance(item_id, list) and len(item_id) > 1:
                # Store the multi-reference definition
                key = " ".join(item_id)
                self.multi_ref_definitions[key] = item_id

            # Recursively check children
            children = item.get("children", [])
            if children:
                self._collect_multi_ref_definitions(children)

            # Recursively check values (they might contain nested links with multi-ref IDs)
            values = item.get("values", [])
            if values:
                self._collect_multi_ref_definitions(values)

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

        # Simple reference
        if "id" in item and "values" not in item:
            return Link(item["id"])

        # Link with values
        if "values" in item:
            link_id = item.get("id")

            # Apply multi-reference context recognition to values
            if self.enable_multi_ref_context and self.multi_ref_definitions:
                values = self._transform_values_with_multi_ref_context(item["values"])
            else:
                values = [self._transform_link(v) for v in item["values"]]

            return Link(link_id, values)

        # Default
        return Link(item.get("id"))

    def _transform_values_with_multi_ref_context(self, values: List[Dict]) -> List[Link]:
        """
        Transform values with multi-reference context recognition.

        Consecutive simple references that form a known multi-reference are combined.

        Args:
            values: List of parsed value dicts

        Returns:
            List of transformed Link objects
        """
        result = []
        i = 0

        while i < len(values):
            current = values[i]

            # Check if this could be the start of a multi-reference
            if self._is_simple_reference(current):
                # Try to match against known multi-references
                match_result = self._try_match_multi_ref(values, i)

                if match_result:
                    # Found a multi-reference match
                    result.append(Link(match_result["multi_ref"]))
                    i += match_result["consumed"]
                    continue

            # No multi-reference match, transform normally
            result.append(self._transform_link(current))
            i += 1

        return result

    def _is_simple_reference(self, item: Dict) -> bool:
        """
        Check if a parsed item is a simple reference (just an ID, no nested values).

        Args:
            item: The item to check

        Returns:
            True if it's a simple reference
        """
        if not isinstance(item, dict):
            return False

        item_id = item.get("id")
        item_values = item.get("values", [])
        item_children = item.get("children", [])

        return (
            item_id is not None
            and isinstance(item_id, str)
            and not item_values
            and not item_children
        )

    def _try_match_multi_ref(self, values: List[Dict], start_index: int) -> Optional[Dict]:
        """
        Try to match a sequence of references against known multi-references.

        Args:
            values: List of values to check
            start_index: Starting index

        Returns:
            Match result with multi_ref list and consumed count, or None
        """
        # Sort multi-refs by length (longest first) to match greedily
        sorted_multi_refs = sorted(
            self.multi_ref_definitions.items(),
            key=lambda x: len(x[1]),
            reverse=True,
        )

        for _, multi_ref_parts in sorted_multi_refs:
            # Check if we have enough values left to match
            if start_index + len(multi_ref_parts) > len(values):
                continue

            # Check if all parts match
            matches = True
            for j, part in enumerate(multi_ref_parts):
                value = values[start_index + j]
                if not self._is_simple_reference(value) or value.get("id") != part:
                    matches = False
                    break

            if matches:
                return {
                    "multi_ref": list(multi_ref_parts),
                    "consumed": len(multi_ref_parts),
                }

        return None
