"""The lossless concrete syntax tree of a document (issue #364)."""

import pytest

from links_notation import CstKind, CstNode, ParseError, Parser


def test_is_the_lossless_view_of_a_document():
    text = "(t 1 '1')"
    cst = Parser().parse_cst(text)
    assert isinstance(cst, CstNode)
    assert cst.kind == CstKind.DOCUMENT
    assert str(cst) == text
    assert cst.text == text
    assert cst.to_s_expression() == (
        '(document (line (group open_paren:"(" (line reference:"t" whitespace:" " reference:"1"'
        ' whitespace:" " reference:"\'1\'") close_paren:")")))'
    )


def test_empty_document():
    cst = Parser().parse_cst("")
    assert cst.to_s_expression() == "(document)"
    assert cst.tokens() == []


def test_reference_tokens_carry_their_value_and_delimiter():
    references = [
        token
        for token in Parser().parse_cst("(a \"b c\" ~1{64} ''e''''f'')").tokens()
        if token.kind == CstKind.REFERENCE
    ]
    assert [(token.text, token.value, token.quote) for token in references] == [
        ("a", "a", None),
        ('"b c"', "b c", '"'),
        ("~1{64}", "d", None),
        ("''e''''f''", "e''f", "'"),
    ]


def test_s_expression_escapes_text():
    cst = Parser().parse_cst('(a "b\\\\c"\t)\r\n')
    assert cst.to_s_expression() == (
        '(document (line (group open_paren:"(" (line reference:"a" whitespace:" "'
        ' reference:"\\"b\\\\\\\\c\\"" whitespace:"\\t") close_paren:")") newline:"\\r\\n"))'
    )


@pytest.mark.parametrize(
    "text",
    [
        "",
        " \t ",
        "\n\n",
        "a\r\nb\rc\r\n",
        "a\t b  \n",
        "# head\na: b # tail\n  # inner\n  c\n# end",
        '(note: "one\n  two\r\nthree")',
        "(a (b\n  (c d)\n) e)\n",
        "root:\n  child:\n    leaf\n  tail",
        "(~1{} ~1{e6a0b9})",
        "('#a' \"b # c\" `#`)",
        "(根: café 🙂)\n",
    ],
    ids=[
        "empty",
        "only whitespace",
        "blank lines",
        "CRLF and CR",
        "tabs and trailing spaces",
        "comments everywhere",
        "multiline quotes",
        "nested groups over lines",
        "indentation",
        "literals",
        "comment marks inside quotes",
        "unicode",
    ],
)
def test_recovers_the_document_exactly(text):
    cst = Parser().parse_cst(text)
    assert str(cst) == text
    assert "".join(token.text for token in cst.tokens()) == text


def test_without_comment_support_hash_is_part_of_references():
    text = "a #b"
    cst = Parser(comments=False).parse_cst(text)
    assert str(cst) == text
    assert [token.kind for token in cst.tokens()] == ["reference", "whitespace", "reference"]
    assert [token.kind for token in Parser().parse_cst(text).tokens()] == ["reference", "whitespace", "comment"]


def test_a_group_belongs_to_the_line_it_opens_on():
    cst = Parser().parse_cst("a (b\nc)\nd")
    assert [str(line) for line in cst.children] == ["a (b\nc)\n", "d"]
    group = cst.children[0].children[2]
    assert group.kind == CstKind.GROUP
    assert [child.kind for child in group.children] == ["open_paren", "line", "line", "close_paren"]


def test_tokens_have_no_children_and_nodes_have_no_value():
    cst = Parser().parse_cst("a: 'b'")
    assert all(token.is_token and token.children == [] for token in cst.tokens())
    assert not cst.is_token
    assert cst.value is None
    assert cst.quote is None


@pytest.mark.parametrize(
    "text, options",
    [("(a", {}), ("a)", {}), ("((a))", {"max_depth": 1})],
    ids=["unclosed group", "unopened group", "too deep"],
)
def test_rejects_unbalanced_or_too_deep_documents(text, options):
    with pytest.raises(ParseError):
        Parser(**options).parse_cst(text)


def test_rejects_what_parse_rejects():
    with pytest.raises(TypeError):
        Parser().parse_cst(None)
    with pytest.raises(ValueError):
        Parser(max_input_size=2).parse_cst("abc")
