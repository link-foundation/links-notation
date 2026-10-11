"""All bindings consume the same reviewed parser and formatter golden cases."""

import json
from pathlib import Path

import pytest

from links_notation import Parser, StreamParser, format_links

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
