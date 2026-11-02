"""All bindings record the same raw references and concrete syntax trees."""

import json
from pathlib import Path

import pytest

from links_notation import Parser, StreamParser

PARITY = Path(__file__).resolve().parents[2] / "parity"
SYNTAX_FIXTURES = json.loads((PARITY / "syntax-fixtures.json").read_text(encoding="utf-8"))
TEXT_FIXTURES = json.loads((PARITY / "text-fixtures.json").read_text(encoding="utf-8"))


def tree(links):
    return [{"id": link.id, "raw": link.raw_id, "quote": link.quote, "values": tree(link.values)} for link in links]


@pytest.mark.parametrize("fixture", SYNTAX_FIXTURES, ids=lambda fixture: fixture["id"])
def test_shared_syntax_parity(fixture):
    parser = Parser()
    assert tree(parser.parse(fixture["input"])) == fixture["links"]
    cst = parser.parse_cst(fixture["input"])
    assert cst.to_s_expression() == fixture["cst"]
    assert str(cst) == fixture["input"]
    stream = StreamParser()
    for character in fixture["input"]:
        stream.write(character)
    assert tree(stream.finish()) == fixture["links"]


@pytest.mark.parametrize(
    "fixture",
    TEXT_FIXTURES + SYNTAX_FIXTURES,
    ids=lambda fixture: fixture["id"],
)
def test_original_text_is_recovered_from_the_cst(fixture):
    cst = Parser().parse_cst(fixture["input"])
    assert str(cst) == fixture["input"]
    assert "".join(token.text for token in cst.tokens()) == fixture["input"]
