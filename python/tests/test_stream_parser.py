import asyncio

import pytest

from links_notation import Parser, StreamParser, format_links, parse_async_chunks, parse_chunks

DOCUMENT = """first loves data
profile:
  name Ada
  note "line one
line two"
(nested:
  child value)
last sees first"""


def rendered(links):
    return format_links(links)


def test_stream_parser_matches_the_canonical_parser_symbol_by_symbol():
    stream = StreamParser()
    for character in DOCUMENT:
        stream.write(character)

    assert rendered(stream.finish()) == rendered(Parser().parse(DOCUMENT))


def test_stream_parser_emits_only_complete_records():
    seen = []
    stream = StreamParser(on_link=seen.append)

    assert stream.write('profile:\n  name Ada\n  note "first\nsecond"\n') == []
    emitted = stream.write("n")

    assert len(emitted) == 1
    assert seen == emitted


def test_stream_parser_supports_line_chunks_final_record_and_position():
    stream = StreamParser()
    for line in DOCUMENT.splitlines(keepends=True):
        stream.write(line)

    assert rendered(stream.finish()) == rendered(Parser().parse(DOCUMENT))
    assert stream.position.offset == len(DOCUMENT)
    assert stream.position.line == DOCUMENT.count("\n") + 1


def test_stream_parser_can_disable_collection_drain_reset_and_bound_the_record():
    stream = StreamParser(collect=False, max_buffer_size=8)
    seen = []
    stream.on_link = seen.append
    for _ in range(100):
        stream.write("a\n")
    assert stream.drain() == []
    assert len(stream.finish()) == 1
    assert len(seen) == 100

    stream.reset()
    with pytest.raises(ValueError, match="Buffered record"):
        stream.write("123456789")


def test_stream_parser_has_sync_and_async_iterators():
    assert [str(link) for link in parse_chunks(["one link\n", "two link"])] == ["(one link)", "(two link)"]

    async def chunks():
        yield "one link\n"
        yield "two link"

    async def collect():
        return [str(link) async for link in parse_async_chunks(chunks())]

    assert asyncio.run(collect()) == ["(one link)", "(two link)"]


def test_stream_parser_rejects_writes_after_finish():
    stream = StreamParser()
    stream.finish("one")
    with pytest.raises(RuntimeError, match="after finish"):
        stream.write("two")
