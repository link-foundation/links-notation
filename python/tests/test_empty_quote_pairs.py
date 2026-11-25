"""Issue #443: an empty quoted value at the end of a line must not swallow the
lines after it.

An even run of quotes (``""``, ``''``, four quotes, ...) followed by whitespace up
to the end of its line is the empty reference, however later lines continue. A
run followed directly by text (``""x``) still opens a reference that may reach
across lines, so multiline references keep working.
"""

from links_notation import Parser, StreamParser, format_links


def tree(links):
    return [[link.id, *tree(link.values)] for link in links]


def parses(document):
    return tree(Parser().parse(document))


def test_empty_values_on_consecutive_indented_lines_stay_on_their_lines():
    expected = [["root", [None, ["a"], [""]], [None, ["b"], [""]]]]
    assert parses('root:\n  a ""\n  b ""\n') == expected
    assert parses("root:\n  a ''\n  b ''\n") == expected
    assert parses('root:\n  a ""\n  b ""') == expected


def test_an_empty_value_before_a_quoted_value_keeps_both_values():
    [root] = Parser().parse('root:\n  a ""\n  b "x y"\n')
    assert [[value.id for value in link.values] for link in root.values] == [["a", ""], ["b", "x y"]]


def test_an_empty_value_at_the_end_of_a_top_level_line_stays_on_its_line():
    assert format_links(Parser().parse('a ""\nb ""\n')) == "(a ~1{})\n(b ~1{})"
    assert format_links(Parser().parse('a "" \nb ""\n')) == "(a ~1{})\n(b ~1{})"
    assert format_links(Parser().parse('a ""')) == "(a ~1{})"


def test_a_longer_even_run_at_the_end_of_a_line_is_empty_too():
    assert format_links(Parser().parse('a """"\nb """"\n')) == "(a ~1{})\n(b ~1{})"


def test_doubled_quotes_that_nothing_closes_are_the_empty_reference():
    assert parses('(a: """")') == [["a", [""]]]
    assert parses('(a: """""")') == [["a", [""]]]


def test_a_single_quote_character_is_written_between_the_other_quotes():
    assert parses("(a: '\"')") == [["a", ['"']]]
    assert parses('(a: "\'")') == [["a", ["'"]]]
    assert parses('(a: `"`)') == [["a", ['"']]]


def test_an_even_run_followed_by_text_still_opens_a_multiline_reference():
    assert parses('a ""x\ny""\n') == [[None, ["a"], ["x\ny"]]]


def test_an_even_run_still_holds_what_the_same_line_closes():
    assert parses('(x "" " "")') == [[None, ["x"], [' " ']]]
    assert parses('a "" b ""') == [[None, ["a"], [" b "]]]


def test_the_stream_emits_a_line_that_ends_with_an_empty_value_at_once():
    stream = StreamParser()
    emitted = []
    for character in 'a ""\nb ""\nc\n':
        emitted.extend(stream.write(character))
    assert format_links(emitted) == "(a ~1{})\n(b ~1{})"
    assert format_links(stream.finish()) == "(a ~1{})\n(b ~1{})\n(c)"
