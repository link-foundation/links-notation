"""Parsed links record how their IDs were written (issue #364)."""

import pytest

from links_notation import Link, Parser, StreamParser, format_links, reference_quote


def test_bare_and_quoted_references_are_equal_but_keep_how_they_were_written():
    [link] = Parser().parse("(t 1 '1')")
    _, bare, quoted = link.values
    assert bare.id == "1"
    assert quoted.id == "1"
    assert bare.raw_id == "1"
    assert quoted.raw_id == "'1'"
    assert bare.quote is None
    assert quoted.quote == "'"
    # Equality and formatting ignore the metadata.
    assert bare == quoted
    assert link.format() == "(t 1 1)"


def test_records_every_quote_kind_and_run_length():
    [link] = Parser().parse('("a": \'b\' `c` ""d"" ~1{65} f)')
    assert link.raw_id == '"a"'
    assert link.quote == '"'
    assert [(value.raw_id, value.quote) for value in link.values] == [
        ("'b'", "'"),
        ("`c`", "`"),
        ('""d""', '"'),
        ("~1{65}", None),
        ("f", None),
    ]


def test_keeps_raw_text_from_the_source_not_from_comment_stripping():
    [link] = Parser().parse("(a 'b # c') # d")
    assert link.values[1].raw_id == "'b # c'"


def test_leaves_links_without_written_ids_without_raw_text():
    [link] = Parser().parse("(a b)")
    assert link.raw_id is None
    assert link.quote is None
    assert Link("x").raw_id is None
    assert Link("x").quote is None


def test_path_combination_links_have_no_raw_text():
    links = Parser().parse("a\n  b")
    combined = links[1]
    assert combined.raw_id is None
    assert [value.raw_id for value in combined.values] == [None, None]
    assert [value.values[0].raw_id for value in combined.values] == ["a", "b"]


def test_does_not_change_equality_formatting_or_repr():
    quoted = Parser().parse("('a': 'b')")
    bare = Parser().parse("(a: b)")
    assert quoted == bare
    assert format_links(quoted) == format_links(bare)
    assert str(quoted[0]) == str(bare[0])
    assert repr(quoted) == repr(bare)
    assert repr(quoted[0]) == "Link(id='a', values=[Link(id='b', values=[])])"


def test_ast_mode_drops_the_metadata():
    [link] = Parser(syntax=False).parse("('a': 'b')")
    assert link.raw_id is None
    assert link.values[0].raw_id is None
    assert link.values[0].quote is None
    assert link == Parser().parse("('a': 'b')")[0]


def test_indented_documents_and_stream_parser_keep_the_metadata():
    links = Parser().parse("'root':\n  \"child\"")
    assert links[0].raw_id == "'root'"
    assert links[0].values[0].raw_id == '"child"'
    stream = StreamParser()
    stream.write("(a '")
    stream.write("b')")
    [link] = stream.finish()
    assert link.values[1].raw_id == "'b'"
    assert link.values[1].quote == "'"


def test_raw_id_can_be_set_on_links_built_in_code_and_must_be_text_or_none():
    link = Link("a")
    link.raw_id = '"a"'
    assert link.quote == '"'
    link.raw_id = None
    assert link.quote is None
    with pytest.raises(TypeError):
        link.raw_id = 1


def test_quote_is_read_only():
    with pytest.raises(AttributeError):
        Link("a").quote = "'"


@pytest.mark.parametrize(
    "raw, quote",
    [
        ("'1'", "'"),
        ('""a b""', '"'),
        ("`x`", "`"),
        ("1", None),
        ("~1{31}", None),
        ("'unclosed", None),
        ("'a' b", None),
        ("", None),
        (None, None),
    ],
)
def test_reference_quote_reads_the_delimiter_of_one_complete_reference(raw, quote):
    assert reference_quote(raw) == quote
