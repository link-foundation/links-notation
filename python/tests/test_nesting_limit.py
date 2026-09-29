"""Links nested too deeply are refused with an error rather than recursed into
until the stack overflows
(https://github.com/link-foundation/links-notation/issues/315).

Every parenthesized group and every indentation level is one level, and the
lines of a document start at level 0. The positions asserted here are the ones
the Rust port reports for the same input.
"""

import sys

import pytest

from links_notation import DEFAULT_MAX_DEPTH, ParseError, Parser, StreamParser
from links_notation.stream_parser import StreamParseError


def parens(depth):
    return "(" * depth + "a" + ")" * depth


def values(depth):
    return "(a " * depth + "b" + ")" * depth


def indentation(depth):
    return "".join(" " * level + "a\n" for level in range(depth + 1))


def too_deep(document, max_depth):
    with pytest.raises(ParseError) as caught:
        Parser(max_depth=max_depth).parse(document)
    assert caught.value.max_depth == max_depth
    return caught.value


def accepted(document, max_depth=DEFAULT_MAX_DEPTH):
    return len(Parser(max_depth=max_depth).parse(document)) > 0


def test_default_limit_is_shared_by_every_implementation():
    assert DEFAULT_MAX_DEPTH == 64
    assert Parser().max_depth == DEFAULT_MAX_DEPTH
    assert StreamParser().parser.max_depth == DEFAULT_MAX_DEPTH


def test_parentheses_up_to_the_limit_are_accepted():
    assert accepted(parens(3), 3)
    assert accepted(values(3), 3)
    assert accepted(parens(DEFAULT_MAX_DEPTH))


def test_parentheses_past_the_limit_are_refused_at_the_group_that_is_too_deep():
    error = too_deep(parens(4), 3)

    assert (error.line, error.column, error.offset) == (1, 4, 3)
    assert str(error) == (
        "Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3\n" "1 | ((((a))))\n" "  |    ^"
    )


def test_groups_in_value_position_count_like_any_other_group():
    error = too_deep(values(4), 3)

    assert (error.line, error.column) == (1, 10)


def test_indentation_up_to_the_limit_is_accepted():
    assert accepted(indentation(3), 3)
    assert accepted(indentation(DEFAULT_MAX_DEPTH))


def test_indentation_past_the_limit_is_refused_at_the_line_that_is_too_deep():
    error = too_deep(indentation(4), 3)

    assert (error.line, error.column) == (5, 5)
    assert error.line_text == "    a"


def test_groups_and_indentation_add_up():
    # `(b)` on the line indented once is at level 2.
    assert accepted("a\n  (b)\n", 2)
    error = too_deep("a\n  (b)\n", 1)

    assert (error.line, error.column) == (2, 3)


def test_limit_of_one_allows_one_group():
    assert accepted("(a b)", 1)
    assert accepted("a\n  b\n", 1)
    too_deep("((a))", 1)
    too_deep("a\n  b\n    c\n", 1)


def test_trailing_spaces_on_a_deep_line_are_not_a_deeper_line():
    assert accepted("a\n  b\n    c   \n", 2)


def test_limit_past_the_recursion_limit_is_an_error_rather_than_a_crash():
    # Nothing here is too deep for the limit, so the error has no max_depth.
    with pytest.raises(ParseError) as caught:
        Parser(max_depth=sys.maxsize).parse(parens(100_000))

    assert caught.value.max_depth is None
    assert not str(caught.value).startswith("Nesting too deep")


def test_parser_is_reusable_after_refusing_a_document():
    parser = Parser(max_depth=2)
    with pytest.raises(ParseError):
        parser.parse(parens(3))

    assert parser.parse(parens(2))
    assert parser.parse(indentation(2))


@pytest.mark.timeout(30)
def test_refuses_a_document_far_past_the_limit_without_overflowing_the_stack():
    # Before the limit existed each of these exhausted Python's recursion limit.
    # Each group around the one too deep is scanned to its end before it is
    # entered, so refusing values(n) reads the document once per level; it is
    # kept short enough to be refused quickly.
    for document in (parens(100_000), values(5_000), indentation(2_000)):
        error = too_deep(document, DEFAULT_MAX_DEPTH)
        assert str(error).startswith("Nesting too deep at ")


def test_stream_parser_reports_where_the_nesting_is_too_deep():
    stream = StreamParser(max_depth=1)
    stream.write("a\nb ((c))\n")

    with pytest.raises(StreamParseError) as caught:
        stream.finish()

    assert caught.value.error.max_depth == 1
    assert caught.value.max_depth == 1
    assert (caught.value.line, caught.value.column, caught.value.offset) == (2, 4, 5)
