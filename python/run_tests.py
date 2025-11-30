#!/usr/bin/env python3
"""Simple test runner without pytest dependency."""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from links_notation import Link, Parser, format_links


def test_link_basic():
    """Test basic Link functionality."""
    link = Link("test")
    assert link.id == "test"
    assert link.values == []
    print("✓ test_link_basic passed")


def test_link_with_values():
    """Test Link with values."""
    link = Link("parent", [Link("child1"), Link("child2")])
    assert link.id == "parent"
    assert len(link.values) == 2
    assert link.values[0].id == "child1"
    print("✓ test_link_with_values passed")


def test_link_tostring():
    """Test Link toString."""
    link = Link("parent", [Link("child1"), Link("child2")])
    assert str(link) == "(parent: child1 child2)"
    print("✓ test_link_tostring passed")


def test_parser_simple():
    """Test simple parsing."""
    parser = Parser()
    result = parser.parse("(test: value1 value2)")
    assert len(result) == 1
    assert result[0].id == "test"
    assert len(result[0].values) == 2
    print("✓ test_parser_simple passed")


def test_parser_quoted():
    """Test quoted references."""
    parser = Parser()
    result = parser.parse('("has space": "value with: colon")')
    assert len(result) == 1
    assert result[0].id == "has space"
    print("✓ test_parser_quoted passed")


def test_format_links():
    """Test format_links function."""
    parser = Parser()
    links = parser.parse("(papa: loves mama)")
    output = format_links(links)
    assert output == "(papa: loves mama)"
    print("✓ test_format_links passed")


def test_triplet():
    """Test triplet parsing."""
    parser = Parser()
    source = "(papa has car)"
    links = parser.parse(source)
    target = format_links(links)
    assert target == source
    print("✓ test_triplet passed")


def test_escape_reference():
    """Test escape_reference."""
    assert Link.escape_reference("simple") == "simple"
    assert Link.escape_reference("has:colon") == "'has:colon'"
    assert Link.escape_reference("has space") == "'has space'"
    print("✓ test_escape_reference passed")


def main():
    """Run all tests."""
    tests = [
        test_link_basic,
        test_link_with_values,
        test_link_tostring,
        test_parser_simple,
        test_parser_quoted,
        test_format_links,
        test_triplet,
        test_escape_reference,
    ]

    failed = []
    for test in tests:
        try:
            test()
        except AssertionError as e:
            print(f"✗ {test.__name__} failed: {e}")
            failed.append(test.__name__)
        except Exception as e:
            print(f"✗ {test.__name__} error: {e}")
            failed.append(test.__name__)

    print()
    if failed:
        print(f"FAILED: {len(failed)} tests failed")
        for name in failed:
            print(f"  - {name}")
        sys.exit(1)
    else:
        print(f"SUCCESS: All {len(tests)} tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()
