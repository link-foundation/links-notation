"""Conformance tests for line comments.

https://github.com/link-foundation/links-notation/issues/301

``#`` starts a comment that runs to the end of the line, unless it sits inside a
token or inside a delimited reference. Parsers accept comments by default and
can be told to treat ``#`` as an ordinary character again. The table below is
shared with the Rust, JavaScript, Go, C#, Java and PHP suites, so a document
written by one implementation reads the same in all of them.
"""

from links_notation import Link, Parser, format_links, strip_comments


def render(node):
    """Render a parsed node unambiguously, so a surviving ``#`` is visible."""
    if not node.values:
        return "<%s>" % ("" if node.id is None else node.id)
    head = "" if node.id is None else "<%s>: " % node.id
    return "(%s%s)" % (head, " ".join(render(value) for value in node.values))


def rendered(source, parser=None):
    return "\n".join(render(link) for link in (parser or Parser()).parse(source))


def assert_parses_as(source, expected):
    assert rendered(source) == expected, "Parsing %r" % source


class TestComments:
    """A comment runs from ``#`` to the end of its line."""

    def test_a_line_that_starts_with_a_hash_is_a_comment(self):
        assert_parses_as("# a b\n", "")

    def test_a_comment_may_hold_a_colon(self):
        # The document from #301: prose with a colon used to be read as a link.
        assert_parses_as("# a: b\n", "")

    def test_a_comment_may_hold_anything_at_all(self):
        assert_parses_as("# ) : ( \" ' ` #\n", "")

    def test_a_comment_ends_at_the_end_of_its_line(self):
        assert_parses_as("# note\na: b\n", "(<a>: <b>)")

    def test_a_comment_may_follow_a_link(self):
        assert_parses_as("a: b # why\n", "(<a>: <b>)")

    def test_a_comment_may_follow_a_group(self):
        assert_parses_as("(a b) # why\n", "(<a> <b>)")

    def test_a_comment_needs_no_closing_newline(self):
        assert_parses_as("a: b # why", "(<a>: <b>)")

    def test_a_comment_line_inside_an_indented_block_is_skipped(self):
        assert rendered("parent\n  # what the child is for\n  child\n") == rendered("parent\n  child\n")

    def test_a_comment_line_inside_a_group_is_skipped(self):
        assert rendered("(\n  a\n  # why\n  b\n)\n") == rendered("(\n  a\n  b\n)\n")

    def test_a_line_of_spaces_separates_links_the_way_an_empty_line_does(self):
        # Blanking a comment leaves a line of spaces behind, so such a line has
        # to read as a blank line.
        assert rendered("a\n   \nb\n") == rendered("a\n\nb\n")

    def test_a_document_of_comments_alone_holds_no_links(self):
        assert_parses_as("# one\n# two\n", "")


class TestHashesThatAreNotComments:
    """``#`` only starts a comment where a token could start."""

    def test_a_hash_inside_a_token_is_an_ordinary_character(self):
        assert_parses_as("issue#1047\n", "(<issue#1047>)")

    def test_a_hash_that_opens_a_token_is_an_ordinary_character(self):
        assert_parses_as("a: b#c\n", "(<a>: <b#c>)")

    def test_a_hash_inside_a_delimited_reference_is_content(self):
        assert_parses_as('"# not a comment" a\n', "(<# not a comment> <a>)")

    def test_a_comment_may_follow_a_delimited_reference(self):
        assert_parses_as('"a" # why\n', "(<a>)")

    def test_a_hash_inside_a_multiline_delimited_reference_is_content(self):
        assert_parses_as('"a # b\nc" d\n', "(<a # b\nc> <d>)")


class TestCommentsCanBeTurnedOff:
    """A parser can read ``#`` as an ordinary character again."""

    def test_comments_are_on_by_default(self):
        assert Parser().comments is True

    def test_a_parser_without_comments_keeps_the_hash(self):
        plain = Parser(comments=False)

        assert rendered("# a b\n", plain) == "(<#> <a> <b>)"


class TestBlankingKeepsPositions:
    """A comment is blanked rather than removed, so nothing else moves."""

    def test_blanking_a_comment_keeps_the_length_of_the_document(self):
        assert strip_comments("a: b # why\n") == "a: b      \n"
        assert strip_comments('"# kept"\n') == '"# kept"\n'
        assert strip_comments("issue#1047\n") == "issue#1047\n"


class TestFormattingAReferenceThatBeginsWithAHash:
    """A formatter has to write what the parser reads back."""

    def test_a_reference_that_begins_with_a_hash_is_written_quoted(self):
        # Without the quotes the document would read as ``a`` followed by a comment.
        document = format_links([Link(None, [Link("a"), Link("#tag")])])

        assert document == "(a '#tag')"
        assert rendered(document) == "(<a> <#tag>)"

    def test_a_hash_that_cannot_open_a_comment_is_left_unquoted(self):
        assert Link.escape_reference("issue#1047") == "issue#1047"
        assert Link.escape_reference("#") == "'#'"
        assert Link.escape_reference("#ff0000") == "'#ff0000'"
