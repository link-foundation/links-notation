"""Recursive nested formatting, read by folding parseGroups in group-aware hosts."""

from .link import Link


def _atom(link: Link) -> bool:
    return link.id is not None and not link.values


def _can_nest(link: Link) -> bool:
    return not _atom(link) and not (link.id is None and len(link.values) == 1 and not _atom(link.values[0]))


def _line_holds(link: Link, count: int) -> bool:
    return link.id is not None or count >= 2 or (count == 1 and _atom(link.values[0]))


def _lines(link: Link, pad: str, indent: str, under_name: bool = False) -> list[str]:
    if not _line_holds(link, len(link.values)) or (under_name and link.id is None and len(link.values) == 1):
        return [pad + link.format()]
    count = len(link.values)
    while count and _can_nest(link.values[count - 1]):
        count -= 1
    while count < len(link.values) and not _line_holds(link, count):
        count += 1
    values = [Link.escape_reference(v.id) if _atom(v) else v.format() for v in link.values[:count]]
    if link.id is not None:
        values.insert(0, Link.escape_reference(link.id) + ":")
    result = [pad + " ".join(values)]
    for value in link.values[count:]:
        result.extend(_lines(value, pad + indent, indent, under_name or (link.id is not None and count == 0)))
    return result


def format_nested(links: list[Link], indent: str = "  ") -> str:
    """Write nested lines in value order, without a final newline.

    Read by appending each group's children to its element's values. Python's
    canonical parser retains its path semantics and does not expose groups.
    """
    if not indent or any(c != " " for c in indent):
        raise ValueError("indent must contain only spaces and be nonempty")
    return "\n".join(line for link in links for line in _lines(link, "", indent))
