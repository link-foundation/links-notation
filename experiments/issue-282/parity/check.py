"""Print what the Python implementation makes of the document."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "python"))

from links_notation import Parser, format_links  # noqa: E402

document = (Path(__file__).parent / "document.lino").read_text(encoding="utf-8")
print(format_links(Parser().parse(document)))
