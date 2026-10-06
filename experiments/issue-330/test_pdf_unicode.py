"""Offline regressions for the C# PDF listing (issue #330).

pdfLaTeX aborted the main-branch PDF build on the emoji and CJK test strings
in BinaryLinoCodecTests.cs ("Unicode character 😀 (U+1F600) not set up for use
with LaTeX"). format-files.py must hand LaTeX only characters it can typeset.
"""

import importlib.util
import io
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "format_files", ROOT / "csharp/scripts/format-files.py"
)
FORMAT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(FORMAT)


class PdfUnicodeTests(unittest.TestCase):
    def test_unsupported_characters_become_csharp_escapes(self):
        self.assertEqual(
            FORMAT.latex_safe('"😀 привет 世界"'),
            '"\\U0001F600 привет \\u4E16\\u754C"',
        )

    def test_supported_characters_are_kept(self):
        text = "ASCII é ü ЁЖ — … ∞ “quotes”"
        self.assertEqual(FORMAT.latex_safe(text), text)

    def test_every_csharp_source_is_latex_safe(self):
        sources = sorted((ROOT / "csharp").rglob("*.cs"))
        sources = [p for p in sources if not {"obj", "bin"} & set(p.parts)]
        self.assertTrue(sources)
        with tempfile.NamedTemporaryFile("w+", suffix=".txt") as listing:
            listing.write("\n".join(str(p) for p in sources) + "\n")
            listing.seek(0)
            output = io.StringIO()
            with patch.object(sys, "stdin", listing), redirect_stdout(output):
                FORMAT.main()
        bad = sorted({c for c in output.getvalue() if not FORMAT.printable(c)})
        self.assertEqual(bad, [], "characters LaTeX cannot typeset")
        self.assertIn("\\U0001F600", output.getvalue())


if __name__ == "__main__":
    unittest.main()
