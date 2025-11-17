"""
Tests for nested self-referenced objects in pairs.

Test case from PARSER_BUG.md - ensures the parser correctly handles
self-referenced object definitions when they appear as values inside pairs.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from links_notation import Parser


parser = Parser()


def test_nested_self_referenced_object_in_pair_value():
    """
    Test case from PARSER_BUG.md.

    This should parse a dict with two pairs, where the second pair's value
    is itself a self-referenced dict definition (obj_1: dict ...).

    The critical test is that obj_1 should have its ID preserved and its
    nested dict structure should be properly parsed.
    """
    notation = '(obj_0: dict ((str bmFtZQ==) (str ZGljdDE=)) ((str b3RoZXI=) (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))))'

    links = parser.parse(notation)

    # Should parse exactly one top-level link
    assert len(links) == 1

    link = links[0]

    # Top-level link should have ID "obj_0"
    assert link.id == 'obj_0'

    # Should have: type marker + 2 pairs = 3 values
    assert len(link.values) == 3

    # First value is the type marker "dict"
    assert link.values[0].id == 'dict'

    # Second and third values are the two pairs
    pair1 = link.values[1]
    pair2 = link.values[2]

    # Pair 1: ((str bmFtZQ==) (str ZGljdDE=))
    # This is a parenthesized expression containing two sub-expressions
    assert pair1.id is None
    assert len(pair1.values) == 2

    # First element of pair1: (str bmFtZQ==)
    assert pair1.values[0].id is None
    assert len(pair1.values[0].values) == 2  # "str" and "bmFtZQ=="
    assert pair1.values[0].values[0].id == 'str'
    assert pair1.values[0].values[1].id == 'bmFtZQ=='

    # Second element of pair1: (str ZGljdDE=)
    assert pair1.values[1].id is None
    assert len(pair1.values[1].values) == 2  # "str" and "ZGljdDE="
    assert pair1.values[1].values[0].id == 'str'
    assert pair1.values[1].values[1].id == 'ZGljdDE='

    # Pair 2: ((str b3RoZXI=) (obj_1: dict ...))
    # This is the critical test - the second element should be a self-referenced dict
    assert pair2.id is None
    assert len(pair2.values) == 2

    # First element of pair2: (str b3RoZXI=)
    assert pair2.values[0].id is None
    assert len(pair2.values[0].values) == 2
    assert pair2.values[0].values[0].id == 'str'
    assert pair2.values[0].values[1].id == 'b3RoZXI='

    # Second element of pair2: (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))
    # THIS IS THE KEY TEST - obj_1 should have its ID preserved
    obj1 = pair2.values[1]
    assert obj1.id == 'obj_1', f"Expected obj_1.id to be 'obj_1', got {obj1.id}"
    assert obj1.values is not None, "obj_1 should have nested values (dict definition)"
    assert len(obj1.values) == 3, f"Expected 3 values (type marker + 2 pairs), got {len(obj1.values)}"

    # obj_1's type marker
    assert obj1.values[0].id == 'dict'

    # obj_1's first pair: ((str bmFtZQ==) (str ZGljdDI=))
    obj1_pair1 = obj1.values[1]
    assert len(obj1_pair1.values) == 2
    assert obj1_pair1.values[0].values[0].id == 'str'
    assert obj1_pair1.values[0].values[1].id == 'bmFtZQ=='
    assert obj1_pair1.values[1].values[0].id == 'str'
    assert obj1_pair1.values[1].values[1].id == 'ZGljdDI='

    # obj_1's second pair: ((str b3RoZXI=) obj_0) - reference back to obj_0
    obj1_pair2 = obj1.values[2]
    assert len(obj1_pair2.values) == 2
    assert obj1_pair2.values[0].values[0].id == 'str'
    assert obj1_pair2.values[0].values[1].id == 'b3RoZXI='
    assert obj1_pair2.values[1].id == 'obj_0', "Should reference back to obj_0"
    assert len(obj1_pair2.values[1].values) == 0, "Should be just a reference, no nested values"


def test_self_reference_as_direct_child_works_correctly():
    """
    Test that self-references as direct children work correctly.

    This pattern should work (and did work before the bug was discovered).
    """
    notation = '(obj_0: list (int 1) (int 2) (obj_1: list (int 3) (int 4) obj_0))'

    links = parser.parse(notation)

    assert len(links) == 1
    assert links[0].id == 'obj_0'
    assert len(links[0].values) == 4  # list + 1 + 2 + obj_1

    # The fourth value should be obj_1 with a self-reference
    obj1 = links[0].values[3]
    assert obj1.id == 'obj_1'
    assert len(obj1.values) == 4  # list + 3 + 4 + obj_0
    assert obj1.values[3].id == 'obj_0', "Should reference back to obj_0"
