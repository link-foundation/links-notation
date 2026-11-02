"""
The concrete syntax tree of a Links Notation document.

Every character of a document belongs to exactly one token, so the text of the
tree is the document itself, comments, blank lines, indentation, quotes and
line endings included. A document is a list of ``line`` nodes; a line holds the
tokens up to and including its line ending, and a parenthesized ``group`` node
holds its own parentheses and the lines written between them. A group is part
of the line it opens on, however many lines it spans.

The tree records how a document was written; :meth:`Parser.parse` reads what it
means. They agree because a document is parsed before its tree is built (see
:meth:`Parser.parse_cst`), and the tokens are read with the same rules the
parser uses: comments are found by :func:`strip_comments`, delimited references
by the same reader, and versioned literals by the same pattern.
"""

import re
from typing import List, Optional, Tuple

from .comments import strip_comments
from .parser import ParseError
from .quotes import QUOTE_CHARS, _parse_quoted_string_at
from .reference_literal import decode_reference_literal, reference_literal_end


class CstKind:
    """The kinds of nodes and tokens of a concrete syntax tree."""

    #: The whole document: its lines.
    DOCUMENT = "document"
    #: One line: its tokens and groups, up to and including its line ending.
    LINE = "line"
    #: A parenthesized group: ``(``, the lines inside it, and ``)``.
    GROUP = "group"
    #: A run of spaces and tabs.
    WHITESPACE = "whitespace"
    #: One line ending: LF, CRLF or CR.
    NEWLINE = "newline"
    #: A comment, from ``#`` up to the line ending.
    COMMENT = "comment"
    #: ``(``
    OPEN_PAREN = "open_paren"
    #: ``)``
    CLOSE_PAREN = "close_paren"
    #: ``:``
    COLON = "colon"
    #: A bare, quoted or versioned literal reference.
    REFERENCE = "reference"


_NODE_KINDS = frozenset((CstKind.DOCUMENT, CstKind.LINE, CstKind.GROUP))

#: How a token's text is escaped in an S-expression.
_ESCAPES = {"\\": "\\\\", '"': '\\"', "\n": "\\n", "\r": "\\r", "\t": "\\t"}
_ESCAPED = re.compile(r'[\\"\n\r\t]')

#: What ends a bare reference.
_BARE_REFERENCE_END = frozenset(" \t\r\n(:)")


class CstNode:
    """One node or token of a concrete syntax tree."""

    def __init__(
        self,
        kind: str,
        text: str = "",
        children: Optional[List["CstNode"]] = None,
        value: Optional[str] = None,
        quote: Optional[str] = None,
    ):
        """
        Initialize a node or token.

        Args:
            kind: One of the :class:`CstKind` values
            text: A token's text exactly as written
            children: A node's children, in document order
            value: What a reference token means
            quote: The delimiter of a quoted reference token
        """
        #: One of the :class:`CstKind` values.
        self.kind = kind
        #: The children of a node, in document order; empty for a token.
        self.children: List["CstNode"] = children if children is not None else []
        #: What a reference token means, its delimiters and escapes resolved
        #: (the ID a parsed link has); None for every other node and token.
        self.value = value
        #: The delimiter a quoted reference token was written between (``'``,
        #: ``"`` or a backtick); None for a bare or literal reference and every
        #: other kind.
        self.quote = quote
        self._text = text

    @property
    def is_token(self) -> bool:
        """Whether this is a token rather than a node with children."""
        return self.kind not in _NODE_KINDS

    @property
    def text(self) -> str:
        """The exact text this node or token was read from."""
        if self.is_token:
            return self._text
        return "".join(child.text for child in self.children)

    def __str__(self) -> str:
        """The exact text this node or token was read from."""
        return self.text

    def __repr__(self) -> str:
        """Developer-friendly representation."""
        return f"CstNode({self.to_s_expression()})"

    def tokens(self) -> List["CstNode"]:
        """Every token of this subtree, in document order."""
        if self.is_token:
            return [self]
        return [token for child in self.children for token in child.tokens()]

    def to_s_expression(self) -> str:
        """
        The tree as an S-expression.

        A node is written ``(kind child ...)`` and a token ``kind:"text"``, the
        text escaped as a JSON string would escape ``\\``, ``"``, line feeds,
        carriage returns and tabs. Two trees are the same exactly when their
        S-expressions are.

        >>> from links_notation import Parser
        >>> Parser().parse_cst("a '1'").to_s_expression()
        '(document (line reference:"a" whitespace:" " reference:"\\'1\\'"))'
        """
        if self.is_token:
            return f"{self.kind}:{_quote_text(self._text)}"
        return "(" + " ".join([self.kind] + [child.to_s_expression() for child in self.children]) + ")"


def _quote_text(text: str) -> str:
    """Write ``text`` between double quotes, escaped."""
    return '"' + _ESCAPED.sub(lambda match: _ESCAPES[match.group()], text) + '"'


class _Container:
    """An open document or group, with the line being filled in it."""

    def __init__(self, node: CstNode):
        self.node = node
        self.line: Optional[CstNode] = None


def build_cst(input_text: str, comments: bool = True) -> CstNode:
    """
    The concrete syntax tree of a document.

    The document is not validated here; :meth:`Parser.parse_cst` parses it
    first, so use that unless the document is already known to parse.

    Args:
        input_text: The document as written
        comments: Whether ``#`` starts a comment (default: True)

    Returns:
        The ``document`` node

    Raises:
        ParseError: If the parentheses are unbalanced
    """
    # Bare references end where they end in the document the parser reads: the
    # one with its comments blanked, which keeps every position of the one
    # written. Delimited references and literals are read, as the parser reads
    # them, in the document as written, so a comment never changes what a
    # reference holds (issue #377).
    prepared = strip_comments(input_text) if comments else input_text
    document = CstNode(CstKind.DOCUMENT)
    # The open containers, innermost last.
    containers = [_Container(document)]

    def add(node: CstNode) -> None:
        container = containers[-1]
        if container.line is None:
            container.line = CstNode(CstKind.LINE)
            container.node.children.append(container.line)
        container.line.children.append(node)

    def token(kind: str, start: int, end: int) -> CstNode:
        return CstNode(kind, text=input_text[start:end])

    length = len(input_text)
    position = 0
    while position < length:
        character = input_text[position]
        end = position + 1

        if comments and character == "#" and prepared[position] != "#":
            # A blanked "#" opens a comment, which runs to the line ending.
            while end < length and input_text[end] not in ("\n", "\r"):
                end += 1
            add(token(CstKind.COMMENT, position, end))
        elif character in ("\r", "\n"):
            if character == "\r" and end < length and input_text[end] == "\n":
                end += 1
            add(token(CstKind.NEWLINE, position, end))
            containers[-1].line = None
        elif character in (" ", "\t"):
            while end < length and input_text[end] in (" ", "\t"):
                end += 1
            add(token(CstKind.WHITESPACE, position, end))
        elif character == "(":
            group = CstNode(CstKind.GROUP, children=[token(CstKind.OPEN_PAREN, position, end)])
            add(group)
            containers.append(_Container(group))
        elif character == ")":
            if len(containers) == 1:
                raise ParseError(f'Unbalanced ")" at offset {position}', offset=position)
            containers.pop().node.children.append(token(CstKind.CLOSE_PAREN, position, end))
        elif character == ":":
            add(token(CstKind.COLON, position, end))
        else:
            reference, end = _reference(input_text, prepared, position)
            add(reference)
        position = end

    if len(containers) != 1:
        raise ParseError('Unbalanced "(" at the end of the document')
    return document


def _reference(input_text: str, prepared: str, start: int) -> Tuple[CstNode, int]:
    """
    The reference token that starts at ``start``, read as the parser reads it,
    and where it ends.
    """
    end = reference_literal_end(input_text, start)
    if end != -1:
        text = input_text[start:end]
        return CstNode(CstKind.REFERENCE, text=text, value=decode_reference_literal(text)), end
    if input_text[start] in QUOTE_CHARS:
        quoted = _parse_quoted_string_at(input_text, start)
        if quoted is not None:
            value, end = quoted
            reference = CstNode(CstKind.REFERENCE, text=input_text[start:end], value=value, quote=input_text[start])
            return reference, end
    end = start + 1
    while end < len(prepared) and prepared[end] not in _BARE_REFERENCE_END:
        end += 1
    text = input_text[start:end]
    return CstNode(CstKind.REFERENCE, text=text, value=text), end
