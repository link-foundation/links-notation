"""
Tests for indentation inside parentheses.

https://github.com/link-foundation/links-notation/issues/282

Indentation is structural at the root, so it must be structural inside
parentheses too: a parenthesized group opens a nested context that starts fresh
at indentation level zero and follows exactly the root's rules.
"""

from links_notation import Parser, format_links

parser = Parser()


def format_source(source: str) -> str:
    return format_links(parser.parse(source))


def test_parentheses_reproduce_root_indentation():
    """The same lines produce the same structure at the root and in a group."""
    root = format_source("""a
  b
c
  d""")

    assert root == """(a)
((a) (b))
(c)
((c) (d))"""

    nested = format_source("""array (
  a
    b
  c
    d
)""")

    assert nested == "(array ((a) ((a) (b)) (c) ((c) (d))))"


def test_parentheses_keep_record_boundaries():
    """Each line of a record inside parentheses stays a link of its own."""
    source = """value (
  id "1"
  label "one"
)"""
    assert format_source(source) == "(value ((id 1) (label one)))"

    links = parser.parse(source)
    assert len(links) == 1

    group = links[0].values[1]
    assert group.id is None
    assert len(group.values) == 2
    assert group.values[0].values[0].id == "id"
    assert group.values[0].values[1].id == "1"
    assert group.values[1].values[0].id == "label"
    assert group.values[1].values[1].id == "one"


def test_parentheses_keep_several_records_separate():
    """Records written as groups keep their boundaries."""
    source = """value (
  (id "1" label "one")
  (id "2" label "two")
)"""
    assert format_source(source) == "(value ((id 1 label one) (id 2 label two)))"


def test_parentheses_nest_deeply():
    """A group inside a group opens its own nested context."""
    source = """outer (
  inner (
    x 1
    y 2
  )
  z 3
)"""
    assert format_source(source) == "(outer ((inner ((x 1) (y 2))) (z 3)))"


def test_single_line_parentheses_are_unchanged():
    """Groups written on a single line keep their previous meaning."""
    assert format_source("(a b c)") == "(a b c)"
    assert format_source("(1: 2 3)") == "(1: 2 3)"
    assert format_source("(a: b c)") == "(a: b c)"
    assert format_source("((a b))") == "((a b))"
    assert format_source("(a)") == "(a)"
    assert format_source("()") == "()"


def test_parentheses_with_indented_id_syntax():
    """The indented id syntax works inside parentheses as well."""
    source = """(
  a:
    b
    c
)"""
    assert format_source(source) == "(a: b c)"


def test_employee_records_keep_their_fields():
    """Records of several fields stay separate links."""
    source = """empInfo
  employees:
    (
      name (James Kirk)
      age 40
    )
    (
      name (Jean-Luc Picard)
      age 45
    )"""
    assert format_source(source) == (
        "(empInfo)\n" "((empInfo) (employees: ((name (James Kirk)) (age 40)) " "((name (Jean-Luc Picard)) (age 45))))"
    )
