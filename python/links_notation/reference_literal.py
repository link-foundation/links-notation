"""Version 1 lossless Unicode references, with readable legacy quoting."""

import re


def encode_reference_literal(text: str) -> str:
    """Encode exact text as a versioned UTF-8 hexadecimal literal."""
    return "~1{" + text.encode("utf-8").hex() + "}"


def decode_reference_literal(literal: str) -> str:
    """Decode a complete literal; reject unsupported versions and invalid UTF-8."""
    match = re.fullmatch(r"~([0-9]+)\{([0-9a-fA-F]*)\}", literal)
    if not match or match[1] != "1" or len(match[2]) % 2:
        raise ValueError("Invalid or unsupported reference literal (expected ~1{UTF-8 hex})")
    return bytes.fromhex(match[2]).decode("utf-8")


def format_reference(text: str) -> str:
    """Quote readable text, using a literal for empty strings and C0 controls."""
    text.encode("utf-8")  # Reject unpaired surrogates before formatting.
    if not text or any(ord(c) < 32 or ord(c) == 127 for c in text):
        return encode_reference_literal(text)
    if (
        not text.startswith("#")
        and not re.match(r"~[0-9]+\{", text)
        and not any(c.isspace() or c in "\ufeff():\"'`" for c in text)
    ):
        return text
    choices = []
    for quote in "'\"`":
        if text.startswith(quote):
            continue
        longest = max([len(m.group()) for m in re.finditer(re.escape(quote) + "+", text)] or [0])
        choices.append(((longest + 1) | 1, quote))
    count, quote = min(choices, key=lambda item: item[0])
    delimiter = quote * count
    return delimiter + text + delimiter
