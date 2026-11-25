"""Issue #444: colons inside a bare reference.

A run of colons between two characters of a bare reference belongs to the
reference, so times, URLs and qualified names need no quotes. A colon that is
followed by whitespace, a parenthesis, a quote or a versioned literal still
separates an ID from its values, and a bare reference never starts or ends with
a colon.
"""

from links_notation import Parser, format_links


def tree(links):
    return [[link.id, *tree(link.values)] for link in links]


def same(document, expected):
    assert tree(Parser().parse(document)) == tree(Parser().parse(expected)), document


def test_a_time_is_one_reference():
    same("time 12:30\n", "time '12:30'\n")
    same("root:\n  time 12:30\n", "root:\n  time '12:30'\n")


def test_a_url_is_one_reference():
    same("url https://example.com/a#b\n", "url 'https://example.com/a#b'\n")


def test_a_qualified_name_is_one_reference():
    same("type std::string\n", "type 'std::string'\n")


def test_an_id_may_hold_a_colon():
    same("a:b: c\n", "'a:b': c\n")
    same("(a:b: c)", "('a:b': c)")
    same("a:b\n", "'a:b'\n")


def test_a_colon_before_a_value_that_cannot_continue_a_reference_separates():
    same("a: b\n", "(a: b)")
    same('a:"b c"\n', "(a: 'b c')")
    same("a:'b'\n", "(a: b)")
    same("a:(b c)\n", "(a: (b c))")
    same("a:~1{62}\n", "(a: b)")
    same("a :b\n", "(a: b)")


def test_a_value_of_the_link_may_hold_a_colon():
    same("a: b:c\n", "(a: 'b:c')")


def test_a_reference_after_a_delimited_reference_or_a_literal_does_not_take_the_colon():
    same('"a":b\n', "(a: b)")
    same("~1{61}:b\n", "(a: b)")


def test_the_concrete_syntax_tree_keeps_inner_colons_in_the_reference():
    tokens = Parser().parse_cst("a:b: c:d\n").tokens()
    assert [(token.kind, token.text) for token in tokens] == [
        ("reference", "a:b"),
        ("colon", ":"),
        ("whitespace", " "),
        ("reference", "c:d"),
        ("newline", "\n"),
    ]


def test_a_reference_with_colons_is_written_with_quotes():
    assert format_links(Parser().parse("time 12:30\n")) == "(time '12:30')"
