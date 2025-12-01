"""
Platform.Protocols.Lino - Python implementation

Lino (Links Notation) is a simple, intuitive format for representing
structured data as links between references.
"""

from .format_config import FormatConfig
from .formatter import format_links
from .link import Link
from .parser import Parser

__version__ = "0.7.0"

__all__ = ["Link", "Parser", "format_links", "FormatConfig"]
