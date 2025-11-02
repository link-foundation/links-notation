"""LinksGroup tests - ported from JS/Rust implementations."""

from links_notation import LinksGroup, Link


def test_links_group_constructor():
    """Test LinksGroup constructor."""
    element = Link('root')
    children = [Link('child1'), Link('child2')]
    group = LinksGroup(element, children)

    assert group.element == element
    assert group.children == children


def test_links_group_to_list_flattens_structure():
    """Test LinksGroup toList flattens structure."""
    root = Link('root')
    child1 = Link('child1')
    child2 = Link('child2')
    grandchild = Link('grandchild')

    child_group = LinksGroup(child2, [grandchild])
    group = LinksGroup(root, [child1, child_group])

    list_result = group.to_list()
    assert len(list_result) == 4
    assert list_result[0] == root
    assert list_result[1] == child1
    assert list_result[2] == child2
    assert list_result[3] == grandchild


def test_links_group_to_string():
    """Test LinksGroup toString."""
    element = Link('root')
    children = [Link('child1'), Link('child2')]
    group = LinksGroup(element, children)

    str_result = str(group)
    assert '(root)' in str_result
    assert '(child1)' in str_result
    assert '(child2)' in str_result
