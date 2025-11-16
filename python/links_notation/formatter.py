"""
Formatter for Lino notation.

Provides utilities for formatting Link objects back into Lino notation strings.
"""

from typing import List, Union, Optional
from .link import Link
from .format_config import FormatConfig


def format_links(links: List[Link], less_parentheses: Union[bool, FormatConfig] = False) -> str:
    """
    Format a list of links into Lino notation.

    Args:
        links: List of Link objects to format
        less_parentheses: If True, omit parentheses where safe; or a FormatConfig object

    Returns:
        Formatted string in Lino notation
    """
    if not links:
        return ''

    # Support FormatConfig as parameter
    if isinstance(less_parentheses, FormatConfig):
        config = less_parentheses
        # Apply consecutive link grouping if enabled
        if config.group_consecutive:
            links = _group_consecutive_links(links)
        return '\n'.join(link.format(config) for link in links)

    # Backward compatibility with boolean parameter
    return '\n'.join(link.format(less_parentheses) for link in links)


def _group_consecutive_links(links: List[Link]) -> List[Link]:
    """
    Group consecutive links with the same ID.

    For example:
        SetA a
        SetA b
        SetA c

    Becomes:
        SetA
          a
          b
          c

    Args:
        links: List of links to group

    Returns:
        New list with consecutive links grouped
    """
    if not links:
        return links

    grouped = []
    i = 0

    while i < len(links):
        current = links[i]

        # Look ahead for consecutive links with same ID
        if current.id is not None and len(current.values) > 0:
            # Collect all values with same ID
            same_id_values = list(current.values)
            j = i + 1

            while j < len(links):
                next_link = links[j]
                if next_link.id == current.id and len(next_link.values) > 0:
                    same_id_values.extend(next_link.values)
                    j += 1
                else:
                    break

            # If we found consecutive links, create grouped link
            if j > i + 1:
                grouped_link = Link(current.id, same_id_values)
                grouped.append(grouped_link)
                i = j
                continue

        grouped.append(current)
        i += 1

    return grouped
