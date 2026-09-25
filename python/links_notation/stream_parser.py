"""Incremental parsing for long-lived Links Notation streams."""

from dataclasses import dataclass
from typing import AsyncIterable, AsyncIterator, Callable, Iterable, Iterator, List, Optional

from .link import Link
from .parser import DEFAULT_MAX_DEPTH, ParseError, Parser
from .quotes import QUOTE_CHARS, _parse_quoted_string_at


@dataclass(frozen=True)
class StreamPosition:
    """Position after the last character written to a stream parser."""

    offset: int
    line: int
    column: int
    buffered: int


class StreamParseError(ParseError):
    """A canonical parse error located within the complete stream.

    ``error`` is the error the parser raised for the buffered record;
    ``offset``, ``line`` and ``column`` locate it within the complete stream.
    """

    def __init__(self, error: Exception, offset: int, line: int, column: int):
        super().__init__(
            f"Stream parse error at line {line}, column {column}: {error}",
            offset=offset,
            line=line,
            column=column,
            line_text=getattr(error, "line_text", None),
            max_depth=getattr(error, "max_depth", None),
        )
        self.error = error


class StreamParser:
    """Incrementally emit complete top-level Links Notation records.

    A record can acquire indented children, so it becomes safe to emit only
    when the next non-indented content line begins. The regular :class:`Parser`
    remains the source of truth for each completed record.
    """

    def __init__(
        self,
        parser: Optional[Parser] = None,
        *,
        on_link: Optional[Callable[[Link], None]] = None,
        collect: bool = True,
        max_buffer_size: Optional[int] = None,
        comments: bool = True,
        max_depth: int = DEFAULT_MAX_DEPTH,
    ):
        self.parser = parser or Parser(comments=comments, max_depth=max_depth)
        self.on_link = on_link
        self.collect = collect
        self.max_buffer_size = self.parser.max_input_size if max_buffer_size is None else max_buffer_size
        self.reset()

    def write(self, chunk: str) -> List[Link]:
        """Consume a string chunk and return links completed by it."""
        if not isinstance(chunk, str):
            raise TypeError("Input must be a string")
        if self._ended:
            raise RuntimeError("Cannot write after finish()")

        emitted: List[Link] = []
        for character in chunk:
            self._current_line += character
            self._offset += 1

            if character == "\n":
                self._buffer += self._current_line
                self._current_line = ""
                self._line_classified = False
                self._line += 1
                self._column = 1
            else:
                if not self._line_classified and character not in (" ", "\t", "\r"):
                    self._line_classified = True
                    if not (self.parser.comments and character == "#"):
                        self._start_content_line(_leading_spaces(self._current_line), emitted)
                self._column += 1

            if len(self._buffer) + len(self._current_line) > self.max_buffer_size:
                raise ValueError(f"Buffered record exceeds maximum size of {self.max_buffer_size} characters")

        return emitted

    def finish(self, chunk: str = "") -> List[Link]:
        """Finish the stream and return all undrained or newly emitted links."""
        if self._ended:
            if chunk:
                raise RuntimeError("Cannot write after finish()")
            return list(self._links) if self.collect else []

        emitted = self.write(chunk) if chunk else []
        document = self._buffer + self._current_line
        if document:
            try:
                links = self.parser.parse(document)
            except Exception as error:
                raise self._stream_error(error) from error
            self._publish(links, emitted)
            self._advance_segment(document)

        self._buffer = ""
        self._current_line = ""
        self._base_indentation = None
        self._ended = True
        return list(self._links) if self.collect else emitted

    def drain(self) -> List[Link]:
        """Return and forget retained links."""
        links = self._links
        self._links = []
        return links

    def reset(self) -> "StreamParser":
        """Reuse the parser while preserving its configuration and callback."""
        self._buffer = ""
        self._current_line = ""
        self._base_indentation: Optional[int] = None
        self._line_classified = False
        self._links: List[Link] = []
        self._offset = 0
        self._line = 1
        self._column = 1
        self._segment_offset = 0
        self._segment_line = 1
        self._ended = False
        return self

    @property
    def position(self) -> StreamPosition:
        """Absolute position and current unresolved buffer size."""
        return StreamPosition(
            offset=self._offset,
            line=self._line,
            column=self._column,
            buffered=len(self._buffer) + len(self._current_line),
        )

    def _start_content_line(self, indentation: int, emitted: List[Link]) -> None:
        if (
            self._buffer
            and self._base_indentation is not None
            and indentation <= self._base_indentation
            and _structurally_complete(self._buffer, self.parser.comments)
        ):
            try:
                links = self.parser.parse(self._buffer)
            except Exception:
                links = None
            if links is not None:
                self._publish(links, emitted)
                self._advance_segment(self._buffer)
                self._buffer = ""
                self._base_indentation = None

        if self._base_indentation is None:
            self._base_indentation = indentation

    def _publish(self, links: List[Link], emitted: List[Link]) -> None:
        for link in links:
            emitted.append(link)
            if self.collect:
                self._links.append(link)
            if self.on_link is not None:
                self.on_link(link)

    def _stream_error(self, error: Exception) -> StreamParseError:
        """Locate an error the parser raised for the buffered record within the stream."""
        line = getattr(error, "line", None)
        column = getattr(error, "column", None)
        offset = getattr(error, "offset", None)
        if line is None or column is None or offset is None:
            return StreamParseError(error, self._segment_offset, self._segment_line, 1)
        return StreamParseError(error, self._segment_offset + offset, self._segment_line + line - 1, column)

    def _advance_segment(self, document: str) -> None:
        self._segment_offset += len(document)
        self._segment_line += document.count("\n")


def parse_chunks(chunks: Iterable[str], parser: Optional[Parser] = None) -> Iterator[Link]:
    """Lazily parse a synchronous iterable of chunks."""
    stream = StreamParser(parser, collect=False)
    for chunk in chunks:
        yield from stream.write(chunk)
    yield from stream.finish()


async def parse_async_chunks(chunks: AsyncIterable[str], parser: Optional[Parser] = None) -> AsyncIterator[Link]:
    """Lazily parse an asynchronous iterable of chunks."""
    stream = StreamParser(parser, collect=False)
    async for chunk in chunks:
        for link in stream.write(chunk):
            yield link
    for link in stream.finish():
        yield link


def _leading_spaces(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def _structurally_complete(document: str, comments: bool) -> bool:
    depth = 0
    position = 0
    before_reference = " \t\n\r(:"
    before_comment = " \t\n\r"

    while position < len(document):
        character = document[position]
        previous = None if position == 0 else document[position - 1]
        if character in QUOTE_CHARS and (previous is None or previous in before_reference):
            parsed = _parse_quoted_string_at(document, position)
            if parsed is None:
                return False
            position = parsed[1]
            continue
        if comments and character == "#" and (previous is None or previous in before_comment):
            newline = document.find("\n", position)
            if newline < 0:
                break
            position = newline + 1
            continue
        if character == "(":
            depth += 1
        elif character == ")":
            depth -= 1
        position += 1

    return depth == 0
