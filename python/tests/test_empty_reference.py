"""Conformance tests for the empty reference.

https://github.com/link-foundation/links-notation/issues/288

A bare delimiter pair is the empty reference. The three delimiters ``"``, ``'``
and ``` ` ``` behave identically, and every longer n-quote run keeps the meaning
it already had. The table below is shared with the Rust, JavaScript, Go, C#,
Java and PHP suites, so a document written by one implementation reads the same
in all of them.
"""

from links_notation import Parser, format_links


def render(node):
    """Render a parsed node unambiguously, so an empty reference shows as <>."""
    if not node.values:
        return "<%s>" % ("" if node.id is None else node.id)
    head = "" if node.id is None else "<%s>: " % node.id
    return "(%s%s)" % (head, " ".join(render(value) for value in node.values))


def rendered(source):
    return "\n".join(render(link) for link in Parser().parse(source))


def assert_parses_as(source, expected):
    assert rendered(source) == expected, "Parsing %r" % source


class TestEmptyReference:
    """The bare delimiter pair reads as the empty reference."""

    def test_bare_delimiter_pair_is_the_empty_reference(self):
        assert_parses_as('(a "" b)', "(<a> <> <b>)")

    def test_every_delimiter_style_yields_the_same_empty_reference(self):
        assert_parses_as('(a "" b)', "(<a> <> <b>)")
        assert_parses_as("(a '' b)", "(<a> <> <b>)")
        assert_parses_as("(a `` b)", "(<a> <> <b>)")

    def test_adjacent_empty_references_stay_separate(self):
        assert_parses_as('(a "" "" b)', "(<a> <> <> <b>)")
        assert_parses_as("(a '' '' b)", "(<a> <> <> <b>)")
        assert_parses_as("(a `` `` b)", "(<a> <> <> <b>)")
        assert_parses_as('(a ""  "" b)', "(<a> <> <> <b>)")

    def test_nested_empty_references_parse(self):
        assert_parses_as('("" ("" 1))', "(<> (<> <1>))")
        assert_parses_as("(\"\" ('' 1))", "(<> (<> <1>))")
        assert_parses_as('("x" ("" 1))', "(<x> (<> <1>))")
        assert_parses_as('("" ("x" 1))', "(<> (<x> <1>))")
        assert_parses_as('("" x ("" 1))', "(<> <x> (<> <1>))")
        assert_parses_as('("" 1 ("" 1))', "(<> <1> (<> <1>))")

    def test_empty_reference_is_valid_as_an_id(self):
        assert_parses_as('("": 1)', "(<>: <1>)")
        assert_parses_as('(o: ("" (o: ("" 1))))', "(<o>: (<> (<o>: (<> <1>))))")


class TestNQuoteMeaningsSurvive:
    """Only the bare pair changes; every existing n-quote meaning is kept."""

    def test_n_quote_delimited_bodies_are_unchanged(self):
        assert_parses_as('(a ""x"" b)', "(<a> <x> <b>)")
        assert_parses_as('(x "" " "")', '(<x> < " >)')
        assert_parses_as("(x ' \" ')", '(<x> < " >)')

    def test_n_quote_delimited_empty_is_still_empty(self):
        assert_parses_as('(a """" b)', "(<a> <> <b>)")

    def test_a_single_space_still_reads_as_a_space(self):
        assert_parses_as('(a " " b)', "(<a> < > <b>)")


class TestEmptyReferenceFormatting:
    """The empty reference is written so that it reads back as itself."""

    def test_empty_reference_is_written_as_a_delimiter_pair(self):
        assert format_links(Parser().parse('(a "" b)')) == '(a "" b)'

    def test_empty_reference_survives_a_round_trip(self):
        for source in [
            '(a "" b)',
            '(a "" "" b)',
            '("" ("" 1))',
            '("": 1)',
            '(o: ("" (o: ("" 1))))',
        ]:
            formatted = format_links(Parser().parse(source))
            assert format_links(Parser().parse(formatted)) == formatted, source
