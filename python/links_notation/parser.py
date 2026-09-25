"""
Parser for Lino notation.

This module provides parsing functionality for Links Notation (Lino),
converting text into structured Link objects.
"""

import re
from typing import Any, Dict, List, Optional, Tuple

from .comments import strip_comments
from .link import Link
from .quotes import _parse_quoted_string_at


#: How deep links may nest unless a parser is told otherwise: every
#: parenthesized group and every indentation level is one level, and the lines
#: of a document are at level 0. Every implementation shares this default.
DEFAULT_MAX_DEPTH = 64

#: The number of characters a quoted line is cut down to.
_QUOTED_LINE_WIDTH = 80

#: What a message writes in place of the part of a long line it left out.
_ELLIPSIS = "..."


#: The characters that can end a line or open a quoted string.
_LINE_BREAK_OR_QUOTE = re.compile("[\n\"'`]")

#: The characters that can separate an id from its values or open a quoted string.
_COLON_OR_QUOTE = re.compile("[:\"'`]")

#: A run of opening parentheses, a run of closing ones, or a character that can
#: open a quoted string.
_PAREN_RUN_OR_QUOTE = re.compile("\\(+|\\)+|[\"'`]")


class ParseError(Exception):
    """
    Exception raised when parsing fails.

    An error that points at a place in the document carries that place:
    ``offset`` (characters from the start of the document), ``line`` and
    ``column`` (both counted from 1), and ``line_text`` (the offending line as
    written, without its line ending); for any other error they are None.

    A document nested deeper than the parser's ``max_depth`` is refused with
    this error too; then ``max_depth`` says how deep the nesting may go. It is
    None for any other error.
    """

    def __init__(
        self,
        message: str = "",
        *,
        offset: Optional[int] = None,
        line: Optional[int] = None,
        column: Optional[int] = None,
        line_text: Optional[str] = None,
        max_depth: Optional[int] = None,
    ):
        super().__init__(message)
        self.offset = offset
        self.line = line
        self.column = column
        self.line_text = line_text
        self.max_depth = max_depth

    @classmethod
    def nesting_too_deep(cls, document: str, offset: int, max_depth: int) -> "ParseError":
        """The error for a document nested deeper than ``max_depth`` at ``offset``."""
        line, column, line_text = _locate(document, offset)
        summary = f"line {line}, column {column}: nesting depth exceeds the maximum of {max_depth}"
        return cls(
            f"Nesting too deep at {summary}\n{_quote(line, line_text, column)}",
            offset=offset,
            line=line,
            column=column,
            line_text=line_text,
            max_depth=max_depth,
        )


def _locate(document: str, offset: int) -> Tuple[int, int, str]:
    """
    The line and column ``offset`` falls on, both counted from 1, and that line
    without its line ending. CR, LF and CRLF all end a line.
    """
    offset = max(0, min(offset, len(document)))
    line = 1
    line_start = 0
    cursor = 0
    while cursor < offset:
        character = document[cursor]
        cursor += 1
        if character == "\r":
            line += 1
            if cursor < offset and document[cursor] == "\n":
                cursor += 1
            line_start = cursor
        elif character == "\n":
            line += 1
            line_start = cursor
    line_end = len(document)
    for ending in ("\r", "\n"):
        found = document.find(ending, line_start)
        if 0 <= found < line_end:
            line_end = found
    return line, offset - line_start + 1, document[line_start:line_end]


def _quote(number: int, line_text: str, column: int) -> str:
    """
    The offending line with a caret under the offending column, quoted the way
    a compiler quotes source. A long line is shown as a window around the caret.
    """
    quoted, column = _window_around(line_text, column)
    gutter = " " * len(str(number))
    return f"{number} | {quoted}\n{gutter} | {' ' * (column - 1)}^"


def _window_around(line_text: str, column: int) -> Tuple[str, int]:
    """
    Cut a line down to a window around ``column``, and say which column the
    offending character sits at in that window. Both columns count from 1.
    """
    if len(line_text) <= _QUOTED_LINE_WIDTH:
        return line_text, column

    target = column - 1
    last_start = len(line_text) - _QUOTED_LINE_WIDTH
    start = min(max(target - _QUOTED_LINE_WIDTH // 2, 0), last_start)
    end = start + _QUOTED_LINE_WIDTH
    quoted = (_ELLIPSIS if start > 0 else "") + line_text[start:end] + (_ELLIPSIS if end < len(line_text) else "")
    shift = len(_ELLIPSIS) if start > 0 else 0
    return quoted, target - start + shift + 1


class Parser:
    """
    Parser for Lino notation.

    Handles both inline and indented syntax for defining links.
    """

    def __init__(
        self,
        max_input_size: int = 10 * 1024 * 1024,
        max_depth: int = DEFAULT_MAX_DEPTH,
        comments: bool = True,
    ):
        """
        Initialize the parser.

        Args:
            max_input_size: Maximum input size in bytes (default: 10MB)
            max_depth: How deep links may nest (default: 64). Every
                parenthesized group and every indentation level is one level,
                and the lines of a document are at level 0; a document nested
                deeper is refused with a ParseError whose ``max_depth`` is set
            comments: Whether ``#`` starts a comment that runs to the end of
                its line; when False it is an ordinary character (default: True)
        """
        self.indentation_stack = [0]
        self.pos = 0
        self.text = ""
        self.lines = []
        self.line_offsets: List[int] = []
        self.base_indentation = None
        # The document as written, for quoting the offending line in an error
        self.source = ""
        # Depth of the lines at level 0 of the context being parsed: the number
        # of parenthesized groups around it
        self.context_depth = 0
        # Depth of the line being parsed
        self.depth = 0
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
            ParseError: If parsing fails, including when the document nests
                links deeper than ``max_depth``
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
            self.source = input_text
            # Use smart line splitting that respects quoted strings
            self.lines, self.line_offsets = self._split_lines_respecting_quotes(prepared, 0)
            self.pos = 0
            self.indentation_stack = [0]
            self.base_indentation = None
            self.context_depth = 0
            self.depth = 0

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
        except RecursionError:
            # Only reachable with a max_depth set higher than Python's recursion
            # limit allows; the default is far below it.
            raise ParseError(
                "Parse error: the document is nested too deeply for Python's recursion limit; "
                f"lower max_depth (currently {self.max_depth}) to refuse it with a located error"
            ) from None

    def _skip_quoted_string(self, text: str, start: int) -> int:
        """
        Skip over the quoted string starting at start.

        Returns the position right after the closing quotes, or -1 when text
        does not start a terminated quoted string.
        """
        parsed = _parse_quoted_string_at(text, start)
        return -1 if parsed is None else parsed[1]

    def _split_lines_respecting_quotes(self, text: str, base: int) -> Tuple[List[str], List[int]]:
        """
        Split text into lines, but preserve newlines inside quoted strings
        and handle multiline parenthesized expressions.

        Quoted strings can span multiple lines, and newlines within them
        should be preserved as part of the string value. Also, parenthesized
        expressions that span multiple lines are kept together.

        Returns the lines and where each of them starts in the document, given
        that text starts at ``base``.
        """
        lines = []
        offsets = []
        line_start = 0
        # Parentheses are counted in bulk between the characters that matter
        # here, so a long run of them costs one pass in C rather than a Python
        # step per character.
        paren_depth = 0
        counted = 0
        position = 0

        while True:
            found = _LINE_BREAK_OR_QUOTE.search(text, position)
            if found is None:
                break
            i = found.start()
            paren_depth += text.count("(", counted, i) - text.count(")", counted, i)

            if text[i] == "\n":
                # Inside unclosed parens the newline is preserved; with the
                # parentheses balanced it is a line break
                if paren_depth <= 0:
                    lines.append(text[line_start:i])
                    offsets.append(base + line_start)
                    line_start = i + 1
                position = i + 1
            else:
                # A quoted string is opaque: newlines inside it are content
                end = self._skip_quoted_string(text, i)
                position = end if end > i else i + 1
            counted = position

        # Add the last line if non-empty
        if line_start < len(text):
            lines.append(text[line_start:])
            offsets.append(base + line_start)

        return lines, offsets

    def _parse_document(self) -> List[Dict]:
        """Parse the entire document."""
        self.pos = 0
        links = []

        while self.pos < len(self.lines):
            line = self.lines[self.pos]
            if line.strip():  # Skip empty lines
                element = self._parse_element(0, 0)
                if element:
                    links.append(element)
            else:
                self.pos += 1

        return links

    def _parse_element(self, current_indent: int, level: int) -> Optional[Dict]:
        """
        Parse a single element (link or reference) at given indentation.

        ``level`` is the number of indentation levels the element sits at in
        the context being parsed.
        """
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

        content_offset = self.line_offsets[self.pos] + len(line) - len(line.lstrip())
        self.pos += 1

        # Try to parse the line
        line_depth = self.context_depth + level
        self.depth = line_depth
        element = self._parse_line_content(content, content_offset)
        # Only a line that parsed counts, as in the other implementations
        self._check_depth(line_depth, content_offset)

        # Check for children (indented lines that follow)
        children = []

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
            # A child only has to be indented deeper than its parent; asking
            # for more left a line indented by a single space unread forever.
            child = self._parse_element(indent + 1, level + 1)
            if child:
                children.append(child)

        if children:
            element["children"] = children

        return element

    def _check_depth(self, depth: int, offset: int) -> None:
        """
        Refuse, for good, links at ``depth`` when that is deeper than the
        parser allows. ``offset`` is where the level that is too deep opens.
        """
        if depth > self.max_depth:
            raise ParseError.nesting_too_deep(self.source, offset, self.max_depth)

    def _parse_line_content(self, content: str, offset: int) -> Dict:
        """Parse the content of a single line, which starts at ``offset``."""
        # A whole parenthesized group: (id: values), (values) or a nested document
        if content.startswith("(") and self._find_matching_paren(content, 0) == len(content) - 1:
            return self._parse_parenthesized(content[1:-1], offset)

        # Try indented ID syntax: id:
        if content.endswith(":"):
            id_part = content[:-1].strip()
            ref = self._extract_reference(id_part)
            return {"id": ref, "values": [], "is_indented_id": True}

        # Try single-line link: id: values
        colon_pos = self._find_colon_outside_quotes(content)
        if colon_pos >= 0:
            id_part = content[:colon_pos].strip()
            after_colon = content[colon_pos + 1 :]
            values_part = after_colon.strip()
            values_offset = offset + colon_pos + 1 + len(after_colon) - len(after_colon.lstrip())
            ref = self._extract_reference(id_part)
            values = self._parse_values(values_part, values_offset)
            return {"id": ref, "values": values}

        # Simple value list
        values = self._parse_values(content, offset)
        return {"values": values}

    def _parse_parenthesized(self, inner: str, offset: int) -> Dict:
        """
        Parse the content of a parenthesized group opened at ``offset``.

        The group opens a nested context that starts fresh at indentation level
        zero and follows exactly the rules used at the root of the document, so
        line breaks separate links and indentation nests them. The group is one
        level deeper than the line it is written on.
        """
        self._check_depth(self.depth + 1, offset)
        return {"nested": self._parse_nested_document(inner, offset + 1)}

    def _parse_nested_document(self, inner: str, offset: int) -> List[Dict]:
        """
        Parse the text of a parenthesized group, which starts at ``offset``,
        as a document of its own.
        """
        saved_lines = self.lines
        saved_line_offsets = self.line_offsets
        saved_pos = self.pos
        saved_base_indentation = self.base_indentation
        saved_indentation_stack = self.indentation_stack
        saved_context_depth = self.context_depth
        saved_depth = self.depth
        try:
            self.lines, self.line_offsets = self._split_lines_respecting_quotes(inner, offset)
            self.pos = 0
            self.base_indentation = None
            self.indentation_stack = [0]
            self.context_depth = self.depth + 1
            return self._parse_document()
        finally:
            self.lines = saved_lines
            self.line_offsets = saved_line_offsets
            self.pos = saved_pos
            self.base_indentation = saved_base_indentation
            self.indentation_stack = saved_indentation_stack
            self.context_depth = saved_context_depth
            self.depth = saved_depth

    def _find_matching_paren(self, text: str, start: int) -> int:
        """
        Find the position of the parenthesis closing the one at start.

        Quoted strings are skipped, so parentheses inside them are ignored.
        Returns -1 when the group is not closed, or when start is not at an
        opening parenthesis.

        A run of parentheses is taken in one step, so the parentheses deeply
        nested groups begin and end with cost a step per run rather than one
        per character: every group is scanned once for each group around it.
        """
        if not text.startswith("(", start):
            return -1

        depth = 0
        position = start

        while True:
            for found in _PAREN_RUN_OR_QUOTE.finditer(text, position):
                run_start, run_end = found.span()
                char = text[run_start]
                if char == "(":
                    depth += run_end - run_start
                elif char == ")":
                    if run_end - run_start >= depth:
                        return run_start + depth - 1
                    depth -= run_end - run_start
                else:
                    end = self._skip_quoted_string(text, run_start)
                    if end > run_start:
                        position = end
                        break
            else:
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
        counted = 0
        position = 0

        while True:
            found = _COLON_OR_QUOTE.search(text, position)
            if found is None:
                return -1
            i = found.start()
            paren_depth += text.count("(", counted, i) - text.count(")", counted, i)

            if text[i] == ":":
                if paren_depth == 0:
                    # Only return colon if it's outside quotes AND at parenthesis depth 0
                    return i
                position = i + 1
            else:
                end = self._skip_quoted_string(text, i)
                position = end if end > i else i + 1
            counted = position

    def _parse_values(self, text: str, offset: int) -> List[Dict]:
        """Parse a space-separated list of values, which starts at ``offset``."""
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
                values.append(self._parse_value(value_text, offset + i))
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

    def _parse_value(self, value: str, offset: int) -> Dict:
        """Parse a single value (could be a reference or nested link) starting at ``offset``."""
        # Nested link in parentheses
        if value.startswith("(") and self._find_matching_paren(value, 0) == len(value) - 1:
            return self._parse_parenthesized(value[1:-1], offset)

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
            child_values = [self._transform_indented_value(child) for child in children]

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

    def _transform_indented_value(self, item: Dict) -> Link:
        """Keep a child line's name and recursively attach its indented lines."""
        children = item.get("children", [])
        if children and item.get("id") is not None and not item.get("values"):
            return Link(item["id"], [self._transform_indented_value(child) for child in children])

        current = self._transform_link(item)
        if children:
            return Link(
                current.id,
                current.values + [self._transform_indented_value(child) for child in children],
            )
        if item.get("id") is None and "nested" not in item and len(current.values) == 1:
            return current.values[0]
        return current

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
