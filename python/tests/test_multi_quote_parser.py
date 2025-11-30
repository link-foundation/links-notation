"""Tests for multi-quote string support in parser."""

import pytest
from links_notation.parser import Parser


def get_single_ref_id(result):
    """Extract the single reference ID from a parsed result."""
    if len(result) == 1 and result[0].id is None and result[0].values and len(result[0].values) == 1:
        return result[0].values[0].id
    return result[0].id if len(result) == 1 else None


class TestBacktickQuotes:
    """Tests for backtick quote support."""

    def test_backtick_quoted_reference(self):
        parser = Parser()
        result = parser.parse("`backtick quoted`")
        assert get_single_ref_id(result) == "backtick quoted"

    def test_backtick_quoted_with_spaces(self):
        parser = Parser()
        result = parser.parse("`text with spaces`")
        assert get_single_ref_id(result) == "text with spaces"

    def test_backtick_quoted_multiline(self):
        parser = Parser()
        result = parser.parse("(`line1\nline2`)")
        assert len(result) == 1
        assert result[0].values is not None
        assert len(result[0].values) == 1
        assert result[0].values[0].id == "line1\nline2"

    def test_backtick_quoted_with_escaped_backtick(self):
        parser = Parser()
        result = parser.parse("`text with `` escaped backtick`")
        assert get_single_ref_id(result) == "text with ` escaped backtick"


class TestSingleQuoteEscaping:
    """Tests for single quote escaping."""

    def test_single_quote_with_escaped_single_quote(self):
        parser = Parser()
        result = parser.parse("'text with '' escaped quote'")
        assert get_single_ref_id(result) == "text with ' escaped quote"


class TestDoubleQuoteEscaping:
    """Tests for double quote escaping."""

    def test_double_quote_with_escaped_double_quote(self):
        parser = Parser()
        result = parser.parse('"text with "" escaped quote"')
        assert get_single_ref_id(result) == 'text with " escaped quote'


class TestDoubleDoubleQuotes:
    """Tests for double-double quotes (2 quote chars)."""

    def test_double_double_quotes(self):
        parser = Parser()
        result = parser.parse('""double double quotes""')
        assert get_single_ref_id(result) == "double double quotes"

    def test_double_double_quotes_with_single_quote_inside(self):
        parser = Parser()
        result = parser.parse('""text with " inside""')
        assert get_single_ref_id(result) == 'text with " inside'

    def test_double_double_quotes_with_escape(self):
        parser = Parser()
        result = parser.parse('""text with """" escaped double""')
        assert get_single_ref_id(result) == 'text with "" escaped double'

    def test_double_single_quotes(self):
        parser = Parser()
        result = parser.parse("''double single quotes''")
        assert get_single_ref_id(result) == "double single quotes"

    def test_double_single_quotes_with_single_quote_inside(self):
        parser = Parser()
        result = parser.parse("''text with ' inside''")
        assert get_single_ref_id(result) == "text with ' inside"

    def test_double_single_quotes_with_escape(self):
        parser = Parser()
        result = parser.parse("''text with '''' escaped single''")
        assert get_single_ref_id(result) == "text with '' escaped single"

    def test_double_backtick_quotes(self):
        parser = Parser()
        result = parser.parse("``double backtick quotes``")
        assert get_single_ref_id(result) == "double backtick quotes"

    def test_double_backtick_quotes_with_backtick_inside(self):
        parser = Parser()
        result = parser.parse("``text with ` inside``")
        assert get_single_ref_id(result) == "text with ` inside"

    def test_double_backtick_quotes_with_escape(self):
        parser = Parser()
        result = parser.parse("``text with ```` escaped backtick``")
        assert get_single_ref_id(result) == "text with `` escaped backtick"


class TestTripleQuotes:
    """Tests for triple quotes (3 quote chars)."""

    def test_triple_double_quotes(self):
        parser = Parser()
        result = parser.parse('"""triple double quotes"""')
        assert get_single_ref_id(result) == "triple double quotes"

    def test_triple_double_quotes_with_double_quote_inside(self):
        parser = Parser()
        result = parser.parse('"""text with "" inside"""')
        assert get_single_ref_id(result) == 'text with "" inside'

    def test_triple_double_quotes_with_escape(self):
        parser = Parser()
        result = parser.parse('"""text with """""" escaped triple"""')
        assert get_single_ref_id(result) == 'text with """ escaped triple'

    def test_triple_single_quotes(self):
        parser = Parser()
        result = parser.parse("'''triple single quotes'''")
        assert get_single_ref_id(result) == "triple single quotes"

    def test_triple_backtick_quotes(self):
        parser = Parser()
        result = parser.parse("```triple backtick quotes```")
        assert get_single_ref_id(result) == "triple backtick quotes"


class TestQuadrupleQuotes:
    """Tests for quadruple quotes (4 quote chars)."""

    def test_quadruple_double_quotes(self):
        parser = Parser()
        result = parser.parse('""""quadruple double quotes""""')
        assert get_single_ref_id(result) == "quadruple double quotes"

    def test_quadruple_single_quotes(self):
        parser = Parser()
        result = parser.parse("''''quadruple single quotes''''")
        assert get_single_ref_id(result) == "quadruple single quotes"

    def test_quadruple_backtick_quotes(self):
        parser = Parser()
        result = parser.parse("````quadruple backtick quotes````")
        assert get_single_ref_id(result) == "quadruple backtick quotes"


class TestQuintupleQuotes:
    """Tests for quintuple quotes (5 quote chars)."""

    def test_quintuple_double_quotes(self):
        parser = Parser()
        result = parser.parse('"""""quintuple double quotes"""""')
        assert get_single_ref_id(result) == "quintuple double quotes"

    def test_quintuple_single_quotes(self):
        parser = Parser()
        result = parser.parse("'''''quintuple single quotes'''''")
        assert get_single_ref_id(result) == "quintuple single quotes"

    def test_quintuple_backtick_quotes(self):
        parser = Parser()
        result = parser.parse("`````quintuple backtick quotes`````")
        assert get_single_ref_id(result) == "quintuple backtick quotes"


class TestComplexScenarios:
    """Tests for complex quote scenarios."""

    def test_mixed_quotes_in_link(self):
        parser = Parser()
        result = parser.parse('("double" \'single\' `backtick`)')
        assert len(result) == 1
        assert result[0].values is not None
        assert len(result[0].values) == 3
        assert result[0].values[0].id == "double"
        assert result[0].values[1].id == "single"
        assert result[0].values[2].id == "backtick"

    def test_backtick_as_id_in_link(self):
        parser = Parser()
        result = parser.parse("(`myId`: value1 value2)")
        assert len(result) == 1
        assert result[0].id == "myId"
        assert result[0].values is not None
        assert len(result[0].values) == 2

    def test_code_block_like_content(self):
        parser = Parser()
        result = parser.parse("```const x = 1;```")
        assert get_single_ref_id(result) == "const x = 1;"

    def test_nested_quotes_in_markdown(self):
        parser = Parser()
        result = parser.parse("``Use `code` in markdown``")
        assert get_single_ref_id(result) == "Use `code` in markdown"

    def test_json_string_with_quotes(self):
        parser = Parser()
        result = parser.parse('""{ "key": "value"}""')
        assert get_single_ref_id(result) == '{ "key": "value"}'


class TestEdgeCases:
    """Edge case tests."""

    def test_whitespace_preserved_in_quotes(self):
        parser = Parser()
        result = parser.parse('"  spaces  "')
        assert get_single_ref_id(result) == "  spaces  "

    def test_multiline_in_double_double_quotes(self):
        parser = Parser()
        result = parser.parse('(""line1\nline2"")')
        assert len(result) == 1
        assert result[0].values is not None
        assert len(result[0].values) == 1
        assert result[0].values[0].id == "line1\nline2"
