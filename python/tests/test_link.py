"""Link class tests - ported from JS implementation."""

from links_notation import Link


def test_link_constructor_with_id_only():
    """Test Link constructor with id only."""
    link = Link('test')
    assert link.id == 'test'
    assert link.values == []


def test_link_constructor_with_id_and_values():
    """Test Link constructor with id and values."""
    link = Link('parent', [Link('child1'), Link('child2')])
    assert link.id == 'parent'
    assert len(link.values) == 2
    assert link.values[0].id == 'child1'
    assert link.values[1].id == 'child2'


def test_link_tostring_with_id_only():
    """Test Link toString with id only."""
    link = Link('test')
    assert str(link) == '(test)'


def test_link_tostring_with_values_only():
    """Test Link toString with values only."""
    link = Link(None, [Link('value1'), Link('value2')])
    assert str(link) == '(value1 value2)'


def test_link_tostring_with_id_and_values():
    """Test Link toString with id and values."""
    link = Link('parent', [Link('child1'), Link('child2')])
    assert str(link) == '(parent: child1 child2)'


def test_link_escape_reference_simple():
    """Test escapeReference for simple reference."""
    assert Link.escape_reference('simple') == 'simple'


def test_link_escape_reference_with_special_characters():
    """Test escapeReference with special characters."""
    assert Link.escape_reference('has:colon') == "'has:colon'"
    assert Link.escape_reference('has space') == "'has space'"
    assert Link.escape_reference('has(paren)') == "'has(paren)'"
    assert Link.escape_reference('has"quote') == "'has\"quote'"
    assert Link.escape_reference("has'quote") == '"has\'quote"'


def test_link_simplify():
    """Test Link simplify method."""
    link = Link(None, [Link('single')])
    simplified = link.simplify()
    assert simplified.id == 'single'
    assert simplified.values == []


def test_link_combine():
    """Test Link combine method."""
    link1 = Link('first')
    link2 = Link('second')
    combined = link1.combine(link2)
    assert combined.id is None
    assert len(combined.values) == 2
    assert combined.values[0].id == 'first'
    assert combined.values[1].id == 'second'


def test_link_equals():
    """Test Link equals method."""
    link1 = Link('test', [Link('child')])
    link2 = Link('test', [Link('child')])
    link3 = Link('different', [Link('child')])

    assert link1 == link2
    assert not (link1 == link3)
