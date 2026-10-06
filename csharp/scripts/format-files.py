#!/usr/bin/env python3
"""Wrap every C# file named on stdin into a minted section of the LaTeX document."""
import sys

# pdfLaTeX with inputenc only knows the characters its font encodings (T1 and
# T2A, see format-document.sh) and \DeclareUnicodeCharacter lines cover; any
# other one -- an emoji or CJK test string, say -- aborts the whole document
# with "Unicode character ... not set up for use with LaTeX" (issue #330).
EXTRA = set("–—‘’“”…∞")


def printable(character):
    code = ord(character)
    return (
        code < 0x80
        or 0xA0 <= code <= 0xFF
        or 0x400 <= code <= 0x45F
        or character in EXTRA
    )


def latex_safe(text):
    """Spell unsupported characters as C# escapes, so the listing stays valid C#."""
    return "".join(
        c
        if printable(c)
        else ("\\u%04X" % ord(c) if ord(c) <= 0xFFFF else "\\U%08X" % ord(c))
        for c in text
    )


def main():
    for line in sys.stdin.readlines():
        line = line.strip()
        if not line:
            continue
        escaped = line.replace('_', '\\_')
        print("\\index{%s}" % escaped)
        print("\\begin{section}{%s}" % escaped)
        print("\\begin{minted}[tabsize=2,breaklines,breakanywhere,linenos=true,xleftmargin=7mm,framesep=4mm]{csharp}")
        with open(line, "rt", encoding="utf-8") as f:
            source = "\n".join(x.rstrip("\n") for x in f.readlines()).replace("﻿", "")
        print(latex_safe(source))
        print("\\end{minted}")
        print("\\end{section}")
        print("\n")


if __name__ == "__main__":
    main()
