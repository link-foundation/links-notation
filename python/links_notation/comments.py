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

from .quotes import QUOTE_CHARS, _parse_quoted_string_at

#: The character that starts a comment.
COMMENT = "#"

#: What a delimited reference may start after.
BEFORE_REFERENCE = (" ", "\t", "\n", "\r", "(", ":")

#: What a comment may start after.
BEFORE_COMMENT = (" ", "\t", "\n", "\r")


def strip_comments(document: str) -> str:
    """
    Return ``document`` with every comment blanked out.

    The result has the same length as the document it was given.

    >>> strip_comments("a: b # why\\n")
    'a: b      \\n'
    >>> strip_comments('"# kept"\\n')
    '"# kept"\\n'
    >>> strip_comments("issue#1047\\n")
    'issue#1047\\n'
    """
    blanked = None
    position = 0

    while position < len(document):
        char = document[position]

        if char in QUOTE_CHARS and _follows(document, position, BEFORE_REFERENCE):
            parsed = _parse_quoted_string_at(document, position)
            position = position + 1 if parsed is None else parsed[1]
            continue

        if char == COMMENT and _follows(document, position, BEFORE_COMMENT):
            if blanked is None:
                blanked = list(document)
            while position < len(document) and document[position] not in ("\n", "\r"):
                blanked[position] = " "
                position += 1
            continue

        position += 1

    return document if blanked is None else "".join(blanked)


def _follows(document: str, position: int, allowed) -> bool:
    """
    Report whether the character before ``position`` is one of ``allowed``, the
    start of the document counting as allowed.
    """
    return position == 0 or document[position - 1] in allowed
