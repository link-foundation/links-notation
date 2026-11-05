"""All bindings consume the same reviewed parser and formatter golden cases."""

import json
from pathlib import Path

import pytest

from links_notation import FormatConfig, Parser, StreamParser, format_links

FIXTURES = json.loads((Path(__file__).resolve().parents[2] / "parity/text-fixtures.json").read_text(encoding="utf-8"))


def tree(links):
    return [{"id": link.id, "values": tree(link.values)} for link in links]


@pytest.mark.parametrize("fixture", FIXTURES, ids=lambda fixture: fixture["id"])
def test_shared_text_parity(fixture):
    parsed = Parser().parse(fixture["input"])
    assert tree(parsed) == fixture["expected"]
    assert format_links(parsed) == fixture["format"]
    assert tree(Parser().parse(fixture["format"])) == fixture["expected"]
    stream = StreamParser()
    for character in fixture["input"]:
        stream.write(character)
    assert tree(stream.finish()) == fixture["expected"]


@pytest.mark.parametrize("fixture", FIXTURES, ids=lambda fixture: fixture["id"])
def test_shared_less_parentheses_round_trip(fixture):
    parsed = Parser().parse(fixture["input"])
    assert format_links(parsed, True) == fixture["lessParentheses"]
    assert format_links(parsed, FormatConfig(less_parentheses=True)) == fixture["lessParentheses"]
    assert tree(Parser().parse(fixture["lessParentheses"])) == fixture["expected"]


def test_shared_nested_format():
    from links_notation import format_nested

    cases = json.loads(
        (Path(__file__).resolve().parents[2] / "parity/nested-fixtures.json").read_text(encoding="utf-8")
    )
    assert cases
    for case in cases:
        links = Parser().parse(case["input"])
        assert format_nested(links) == case["nested"], case["id"]
    with pytest.raises(ValueError):
        format_nested([], "")


def test_anonymous_threshold_round_trip():
    for input_text in ["a b c", "((b c))", "(a (b c))"]:
        links = Parser().parse(input_text)
        for config in [
            FormatConfig(less_parentheses=True, max_inline_refs=0, prefer_inline=False),
            FormatConfig(less_parentheses=True, indent_long_lines=True, max_line_length=1, prefer_inline=False),
        ]:
            assert tree(Parser().parse(format_links(links, config))) == tree(links)
