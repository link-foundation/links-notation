"""
Links Notation - Python implementation

Lino (Links Notation) is a simple, intuitive format for representing
structured data as links between references.
"""

import re
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as _distribution_version
from pathlib import Path

from .format_config import FormatConfig
from .formatter import format_links
from .link import Link
from .parser import Parser


def _read_version() -> str:
    """Report the version of the installed distribution.

    It used to be a literal here, and had been left at 0.7.0 while the package
    released 0.16.1, so ``links_notation.__version__`` answered for a release
    nine minor versions old. pyproject.toml is the one place the version is
    written; when the package is imported from a source checkout that was never
    installed, that file is still next to us, so read it there. The read is a
    regex rather than tomllib because this package supports Python 3.9, and
    tomllib arrived in 3.11.
    """
    try:
        return _distribution_version("links-notation")
    except PackageNotFoundError:
        pass

    pyproject = Path(__file__).resolve().parent.parent / "pyproject.toml"
    try:
        text = pyproject.read_text(encoding="utf-8")
    except OSError:
        return "unknown"

    found = re.search(r'^version\s*=\s*"([^"]+)"', text, re.MULTILINE)
    return found.group(1) if found else "unknown"


__version__ = _read_version()

__all__ = ["Link", "Parser", "format_links", "FormatConfig", "__version__"]
