"""A downstream module type-checked against the installed wheel (issue #411).

CI installs the built wheel into a separate virtual environment and runs
``mypy --strict`` on a copy of this file outside the source tree, so the
annotations must come from the installed package and its ``py.typed`` marker.
Without the marker mypy stops with ``import-untyped``; ``assert_type`` would
also fail if any of these types decayed to ``Any``.

It is not collected by pytest (no ``test_`` prefix); run it with ``python`` to
check that the same calls work at runtime.
"""

from typing import Iterator, List, Optional, assert_type

from links_notation import BinaryLinoCodec, CstNode, Link, Parser, build_cst, format_links, parse_chunks


def parse(text: str) -> List[Link]:
    links = Parser().parse(text)
    assert_type(links, List[Link])
    return links


def main() -> None:
    links = parse("papa (lovesMama: loves mama)")
    first = links[0]
    assert_type(first.id, Optional[str])
    assert_type(first.values, List[Link])
    assert_type(format_links(links), str)

    streamed = parse_chunks(["a: b c\n", "d: e\n"])
    assert_type(streamed, Iterator[Link])

    tree = build_cst("a: b")
    assert_type(tree, CstNode)
    assert_type(tree.to_s_expression(), str)

    codec = BinaryLinoCodec()
    data = codec.encode(links)
    assert_type(data, bytes)
    assert_type(codec.decode(data), List[Link])

    assert format_links(links) == "(papa (lovesMama: loves mama))", format_links(links)
    assert [link.id for link in streamed] == ["a", "d"]


if __name__ == "__main__":
    main()
