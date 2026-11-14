"""
Comments, and the rule that decides where one starts.

``#`` starts a comment when it opens a token: at the start of the document or
after a space, a tab or a line break. A ``#`` written inside a token
(``issue#1047``) or inside a delimited reference (``"# not a comment"``) is an
ordinary character.

:func:`strip_comments` replaces every character of every comment with a space
rather than removing it, so every later character keeps the position it had in
the document the caller wrote, and anything the parser reports about a position
still points at what the reader can see.
"""

from typing import Optional, Tuple

from .quotes import QUOTE_CHARS, _parse_quoted_string_at
from .reference_literal import reference_literal_end

#: The character that starts a comment.
COMMENT = "#"

#: What ends a token, so that what follows it starts a new one. A delimited
#: reference or a literal may start at the start of any token, and also right
#: after a delimited reference or a literal, as the parser reads them.
SEPARATORS = (" ", "\t", "\n", "\r", "(", ":", ")")

#: What a comment may start after.
BEFORE_COMMENT = (" ", "\t", "\n", "\r")


def strip_comments(document: str) -> str:
    """
    Return ``document`` with every comment blanked out.

    The result has the same length as the document it was given. Tokens are
    read as the parser reads them, so a ``#`` inside a delimited reference that
    follows a group, another reference or a literal stays content (issue #377).

    >>> strip_comments("a: b # why\\n")
    'a: b      \\n'
    >>> strip_comments('"# kept"\\n')
    '"# kept"\\n'
    >>> strip_comments("issue#1047\\n")
    'issue#1047\\n'
    >>> strip_comments('(a)" #b"\\n')
    '(a)" #b"\\n'
    """
    blanked = None
    position = 0
    token_start = True

    while position < len(document):
        char = document[position]

        if char == COMMENT and _follows(document, position, BEFORE_COMMENT):
            if blanked is None:
                blanked = list(document)
            while position < len(document) and document[position] not in ("\n", "\r"):
                blanked[position] = " "
                position += 1
            continue

        if char in SEPARATORS:
            token_start = True
            position += 1
            continue

        if token_start:
            end = delimited_token_end(document, position)
            if end is not None:
                position = end
                continue

        token_start = False
        position += 1

    return document if blanked is None else "".join(blanked)


def delimited_token_end(document: str, start: int) -> Optional[int]:
    """
    Where the versioned literal or delimited reference that starts at ``start``
    ends, or None when neither can be read there. What follows one starts a new
    token.
    """
    literal = reference_literal_end(document, start)
    if literal != -1:
        return literal
    if document[start] in QUOTE_CHARS:
        parsed = _parse_quoted_string_at(document, start)
        if parsed is not None:
            return parsed[1]
    return None


def _follows(document: str, position: int, allowed: Tuple[str, ...]) -> bool:
    """
    Report whether the character before ``position`` is one of ``allowed``, the
    start of the document counting as allowed.
    """
    return position == 0 or document[position - 1] in allowed
