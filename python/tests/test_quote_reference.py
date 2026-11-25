"""Quoting a reference, and reading every quoted reference back (issues #443
and #444).

``quote_reference`` writes one reference so a parser reads it back as exactly
that text; ``needs_quoting`` says whether the text can be written bare. The
round trip below feeds tricky text, and seeded random text built from the
characters that matter to the grammar, through the formatter and reads it back
in the ID and the value position of parenthesized, single-line and indented
links.
"""

import json
import random

import pytest

from links_notation import Link, Parser, format_links, format_nested, needs_quoting, quote_reference


def test_quote_reference_writes_text_that_needs_no_delimiters_as_it_is():
    for text in ["plain", "issue#1047", "a-b_c.d", "π", "~1"]:
        assert quote_reference(text) == text
        assert needs_quoting(text) is False


def test_quote_reference_quotes_text_a_parser_would_read_differently():
    assert quote_reference("has space") == "'has space'"
    assert quote_reference("12:30") == "'12:30'"
    assert quote_reference("#release") == "'#release'"
    assert quote_reference("(a)") == "'(a)'"
    assert quote_reference('"') == "'\"'"
    assert quote_reference("'") == '"\'"'
    assert quote_reference("") == "~1{}"
    assert quote_reference("a\nb") == "~1{610a62}"
    for text in ["has space", "12:30", "#release", "", '"', "a\nb"]:
        assert needs_quoting(text) is True


def test_quote_reference_is_escape_reference():
    for text in ["a b", "a", "it's", "", "#x", "x:y"]:
        assert quote_reference(text) == Link.escape_reference(text)
    assert quote_reference(None) == ""


def test_needs_quoting_refuses_what_is_not_text():
    with pytest.raises(TypeError):
        needs_quoting(None)  # type: ignore[arg-type]
    with pytest.raises(TypeError):
        needs_quoting(1)  # type: ignore[arg-type]


ALPHABET = [
    "a",
    "b",
    "1",
    " ",
    " ",
    "\t",
    "\n",
    "\r",
    '"',
    '"',
    "'",
    "'",
    "`",
    "#",
    ":",
    "(",
    ")",
    "~",
    "{",
    "}",
    "é",
    "😀",
]


def texts(count, seed):
    """Seeded random text, so a failure names the text that broke and the same
    texts are tried on every run."""
    generator = random.Random(seed)
    return ["".join(generator.choice(ALPHABET) for _ in range(generator.randrange(9))) for _ in range(count)]


# Texts that broke a parser or a formatter before, or came close.
TRICKY = [
    "",
    " ",
    '"',
    "'",
    "`",
    '""',
    "''",
    '""""',
    "\"'",
    "'\"",
    "#",
    "#x",
    "a #b",
    ":",
    "a:",
    ":a",
    "12:30",
    "a: b",
    "(",
    ")",
    "~1{}",
    "~1{61}",
    "a\nb",
    '"" ',
    ' ""',
    '"\n',
    "it's",
    'say "hi"',
]


def tree(links):
    return [[link.id, *tree(link.values)] for link in links]


def read_back(document):
    return tree(Parser().parse(document))


@pytest.mark.parametrize("text", TRICKY + texts(300, 443444), ids=json.dumps)
def test_every_quoted_reference_reads_back_in_every_position(text):
    written = quote_reference(text)
    assert read_back(written) == [[None, [text]]]

    link = [[text, [text], ["x"]]]
    assert read_back(f"({written}: {written} x)") == link
    assert read_back(f"{written}: {written} x") == link
    assert read_back(f"{written}: {written} x\n") == link
    assert read_back(f"{written}:\n  {written}\n  x\n") == link
    # Two lines that each end with the reference: the shape of issue #443.
    assert read_back(f"root:\n  a {written}\n  b {written}\n") == [
        ["root", [None, ["a"], [text]], [None, ["b"], [text]]]
    ]
    assert read_back(f"(a ({written} {written}) b)") == [[None, ["a"], [None, [text], [text]], ["b"]]]


def test_every_formatted_link_reads_back_as_the_same_link():
    pool = TRICKY + texts(60, 445)
    for index in range(0, len(pool) - 2, 3):
        links = [
            Link(pool[index], [Link(pool[index + 1]), Link("x")]),
            Link(None, [Link(pool[index + 2]), Link(pool[index])]),
        ]
        for document in [format_links(links), format_links(links, True)]:
            assert Parser().parse(document) == links, (pool[index : index + 3], document)
        # The nested writer puts every value on a line of its own.
        assert read_back(format_nested(links)) == read_back(format_links(links)), pool[index : index + 3]
