"""
Tests for Links Group functionality using Python Link structures.

Python doesn't have a separate LinksGroup class, but we can test
similar hierarchical link structures using the Link class.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from links_notation import Link


def flatten_link_structure(link):
    """
    Helper function to flatten a nested link structure into a list.
    Similar to LinksGroup.toList() in other languages.
    """
    result = []
    _append_to_list(link, result)
    return result


def _append_to_list(link, result):
    """Helper to recursively append link and its values to result list."""
    result.append(link)
    if link.values:
        for value in link.values:
            if value.values:  # If value has children, recursively flatten
                _append_to_list(value, result)
            else:
                result.append(value)


def test_links_group_constructor():
    """Test creating a hierarchical link structure (similar to LinksGroup constructor)."""
    element = Link('root')
    children = [Link('child1'), Link('child2')]

    # In Python, we simulate LinksGroup by creating a Link with values
    # This is semantically equivalent to LinksGroup(element, children)
    # We'll create a wrapper link to represent the group
    assert element.id == 'root'
    assert len(children) == 2
    assert children[0].id == 'child1'
    assert children[1].id == 'child2'


def test_links_group_constructor_equivalent_test():
    """Test creating a nested structure equivalent to LinksGroup."""
    root = Link('root')
    children = [Link('child1'), Link('child2')]

    # Create a link structure that includes root and children
    group = Link('group', [root] + children)

    assert group.id == 'group'
    assert len(group.values) == 3  # root + 2 children
    assert group.values[0] == root
    assert group.values[1].id == 'child1'
    assert group.values[2].id == 'child2'


def test_links_group_to_list_flattens_structure():
    """Test flattening a nested link structure."""
    root = Link('root')
    child1 = Link('child1')
    child2 = Link('child2')
    grandchild = Link('grandchild')

    # Create nested structure: root with child1 and (child2 with grandchild)
    child2_with_grandchild = Link(child2.id, [grandchild])
    group = Link(None, [root, child1, child2_with_grandchild])

    # Flatten the structure
    flat_list = flatten_link_structure(group)

    # Should contain: group itself, root, child1, child2_with_grandchild, grandchild
    assert len(flat_list) == 5
    assert flat_list[0] == group
    assert flat_list[1] == root
    assert flat_list[2] == child1
    assert flat_list[3] == child2_with_grandchild
    assert flat_list[4] == grandchild


def test_links_group_to_string():
    """Test string representation of nested structure."""
    root = Link('root')
    children = [Link('child1'), Link('child2')]
    group = Link(None, [root] + children)

    str_output = str(group)
    assert 'root' in str_output
    assert 'child1' in str_output
    assert 'child2' in str_output
    assert '(' in str_output and ')' in str_output  # Should be wrapped in parentheses


def test_links_group_append_to_links_list_test():
    """Test appending link group elements to an existing list."""
    element = Link('root')
    children = [Link('child1'), Link('child2')]

    # Create a group structure
    group = Link(None, [element] + children)

    # Append to an existing list
    links_list = []
    links_list.append(group)
    for value in group.values:
        links_list.append(value)

    assert len(links_list) == 4  # group + element + 2 children
    assert links_list[0] == group
    assert links_list[1] == element
    assert links_list[2].id == 'child1'
    assert links_list[3].id == 'child2'
