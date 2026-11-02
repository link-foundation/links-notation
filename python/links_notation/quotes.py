"""
Delimited references, and how far one reaches.

Any number N of delimiters opens and closes a reference and 2N of them are that
delimiter escaped, so how far a reference reaches can only be told by reading
it. The parser needs this to read a reference; the comment stripper needs it to
leave a ``#`` written inside one alone.
"""

from typing import Optional

QUOTE_CHARS = ('"', "'", "`")


def _is_substantive_body(content: str) -> bool:
    """
    Report whether a body written between an even run of delimiters is
    substantive: it holds at least one visible character and does not straddle
    a parenthesis. An even run can always be read as delimiter pairs enclosing
    nothing, so the n-quote reading is only taken when it carries something the
    pairs cannot.
    """
    depth = 0
    has_visible = False

    for char in content:
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth < 0:
                return False
        if not char.isspace():
            has_visible = True

    return has_visible and depth == 0


def _parse_quoted_string_at(text: str, start: int, stop: Optional[int] = None) -> Optional[tuple]:
    """
    Parse the delimited reference that starts at ``start``, reading no further
    than ``stop`` (the end of ``text`` by default).

    Any number N of quotes opens and closes the string, 2*N quotes are an
    escaped quote sequence. A run of an even number of delimiters that does not
    open a reference with a substantive body is the empty reference: the
    shortest reading, a bare delimiter pair enclosing nothing, wins over a
    longer n-quote delimiter.

    Returns ``(value, end_position)`` where ``end_position`` is the position
    right after the closing quotes, or ``None`` when ``text`` does not start a
    delimited reference.
    """
    limit = len(text) if stop is None else stop
    if start >= limit:
        return None

    quote_char = text[start]
    if quote_char not in QUOTE_CHARS:
        return None

    quote_count = 0
    pos = start
    while pos < limit and text[pos] == quote_char:
        quote_count += 1
        pos += 1

    is_even_run = quote_count % 2 == 0
    empty_reference = ("", start + quote_count) if is_even_run else None

    open_close = quote_char * quote_count
    escape_seq = quote_char * (quote_count * 2)
    content = []

    while pos < limit:
        if text.startswith(escape_seq, pos, limit):
            content.append(open_close)
            pos += len(escape_seq)
            continue
        if text.startswith(open_close, pos, limit):
            after_close = pos + quote_count
            if after_close >= limit or text[after_close] != quote_char:
                value = "".join(content)
                if is_even_run and not _is_substantive_body(value):
                    return empty_reference
                return (value, after_close)
        content.append(text[pos])
        pos += 1

    return empty_reference


def _closing_run_follows(text: str, start: int) -> bool:
    """
    Report whether a run of delimiters after the one opening at ``start``
    closes it. An even run nothing closes is the empty reference, until a
    closing run is written after it.
    """
    quote_char = text[start]
    count = 0
    while start + count < len(text) and text[start + count] == quote_char:
        count += 1
    pos = start + count
    while True:
        pos = text.find(quote_char, pos)
        if pos < 0:
            return False
        length = 0
        while pos + length < len(text) and text[pos + length] == quote_char:
            length += 1
        if (length // count) % 2 == 1:
            return True
        pos += length


def reference_quote(raw: Optional[str]) -> Optional[str]:
    """
    The delimiter a reference was written between, read from the reference as
    it was written: ``'``, ``"`` or a backtick for a quoted reference (however
    many of them open it), and None for a bare reference, a versioned literal,
    or no text.

    The first character counts only when reading a delimited reference at the
    start of ``raw`` takes all of ``raw``.

    >>> reference_quote("'1'")
    "'"
    >>> reference_quote('""a b""')
    '"'
    >>> reference_quote("1") is None
    True
    >>> reference_quote("'unclosed") is None
    True
    """
    if not isinstance(raw, str) or not raw or raw[0] not in QUOTE_CHARS:
        return None
    reading = _parse_quoted_string_at(raw, 0)
    return raw[0] if reading is not None and reading[1] == len(raw) else None
