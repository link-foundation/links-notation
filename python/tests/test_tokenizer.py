"""
Tests for punctuation and math symbol tokenization (Issue #148)

These tests verify that:
1. Punctuation is tokenized when following alphanumeric characters
2. Math symbols are tokenized only when between digits
3. Hyphenated words are preserved
4. Quoted strings preserve their content
5. Compact formatting can restore human-readable output
"""

import pytest
from links_notation import Parser, Tokenizer, format_links, DEFAULT_PUNCTUATION_SYMBOLS, DEFAULT_MATH_SYMBOLS


@pytest.fixture
def parser():
    return Parser()


@pytest.fixture
def parser_no_tokenize():
    return Parser(tokenize_symbols=False)


# Test punctuation tokenization
def test_punctuation_comma_separates_numbers(parser):
    links = parser.parse("1, 2 and 3")
    assert len(links) == 1
    values = [v.id for v in links[0].values]
    assert values == ["1", ",", "2", "and", "3"]


def test_punctuation_comma_without_space(parser):
    links = parser.parse("1,2,3")
    assert len(links) == 1
    values = [v.id for v in links[0].values]
    assert values == ["1", ",", "2", ",", "3"]


def test_punctuation_period_between_numbers(parser):
    links = parser.parse("1.2.3")
    values = [v.id for v in links[0].values]
    assert values[0] == "1"
    assert values[1] == "."
    assert values[2] == "2"


def test_punctuation_hello_world_with_comma(parser):
    links = parser.parse("hello, world")
    values = [v.id for v in links[0].values]
    assert values == ["hello", ",", "world"]


# Test math symbol tokenization
def test_math_addition_between_digits(parser):
    links = parser.parse("1+1")
    values = [v.id for v in links[0].values]
    assert values == ["1", "+", "1"]


def test_math_multiple_operations(parser):
    links = parser.parse("1+1,1/1,1*1")
    values = [v.id for v in links[0].values]
    assert "+" in values
    assert "/" in values
    assert "*" in values


def test_math_subtraction_between_digits(parser):
    links = parser.parse("10-20")
    values = [v.id for v in links[0].values]
    assert values == ["10", "-", "20"]


# Test hyphenated words are preserved
def test_hyphenated_jean_luc_preserved(parser):
    links = parser.parse("Jean-Luc Picard")
    values = [v.id for v in links[0].values]
    assert values == ["Jean-Luc", "Picard"]


def test_hyphenated_conan_center_index_preserved(parser):
    links = parser.parse("conan-center-index")
    values = [v.id for v in links[0].values]
    assert values == ["conan-center-index"]


def test_hyphenated_a_b_preserved(parser):
    links = parser.parse("a-b")
    values = [v.id for v in links[0].values]
    assert values == ["a-b"]


def test_math_symbols_between_letters_preserved(parser):
    links = parser.parse("x+y=z")
    values = [v.id for v in links[0].values]
    assert values == ["x+y=z"]


# Test quoted strings preserve content
def test_quoted_double_quoted_comma_preserved(parser):
    links = parser.parse('"1,"')
    values = [v.id for v in links[0].values]
    assert values == ["1,"]


def test_quoted_double_quoted_period_preserved(parser):
    links = parser.parse('"1."')
    values = [v.id for v in links[0].values]
    assert values == ["1."]


def test_quoted_multiple_commas_preserved(parser):
    links = parser.parse('"1,2,3"')
    values = [v.id for v in links[0].values]
    assert values == ["1,2,3"]


def test_quoted_hello_world_preserved(parser):
    links = parser.parse('"hello, world"')
    values = [v.id for v in links[0].values]
    assert values == ["hello, world"]


def test_quoted_mixed_quoted_and_unquoted(parser):
    links = parser.parse('test "1,2,3" more')
    values = [v.id for v in links[0].values]
    assert values == ["test", "1,2,3", "more"]


# Test base64 strings are preserved
def test_base64_padding_equals_preserved(parser):
    links = parser.parse("bmFtZQ==")
    values = [v.id for v in links[0].values]
    assert values == ["bmFtZQ=="]


# Test tokenizer directly
def test_tokenizer_tokenize():
    tokenizer = Tokenizer()
    assert tokenizer.tokenize("1,2,3") == "1 , 2 , 3"
    assert tokenizer.tokenize("1+1") == "1 + 1"
    assert tokenizer.tokenize("Jean-Luc") == "Jean-Luc"


def test_tokenizer_compact():
    tokenizer = Tokenizer()
    assert tokenizer.compact("1 , 2 , 3") == "1,2,3"
    assert tokenizer.compact("1 + 1") == "1+1"


def test_tokenizer_disabled():
    tokenizer = Tokenizer(enabled=False)
    assert tokenizer.tokenize("1,2,3") == "1,2,3"
    assert tokenizer.tokenize("1+1") == "1+1"


# Test backward compatibility with tokenize_symbols=False
def test_backward_compat_tokenize_false_preserves_comma(parser_no_tokenize):
    links = parser_no_tokenize.parse("1,2,3")
    values = [v.id for v in links[0].values]
    assert values == ["1,2,3"]


def test_backward_compat_tokenize_false_preserves_plus(parser_no_tokenize):
    links = parser_no_tokenize.parse("1+1")
    values = [v.id for v in links[0].values]
    assert values == ["1+1"]


# Test default symbols are exported
def test_default_symbols_exported():
    assert "," in DEFAULT_PUNCTUATION_SYMBOLS
    assert "." in DEFAULT_PUNCTUATION_SYMBOLS
    assert "+" in DEFAULT_MATH_SYMBOLS
    assert "-" in DEFAULT_MATH_SYMBOLS
