#!/usr/bin/env python3
"""Wrap every C# file named on stdin into a minted section of the LaTeX document."""
import sys

for line in sys.stdin.readlines():
    line = line.strip()
    if not line:
        continue
    escaped = line.replace('_', '\\_')
    print("\\index{%s}" % escaped)
    print("\\begin{section}{%s}" % escaped)
    print("\\begin{minted}[tabsize=2,breaklines,breakanywhere,linenos=true,xleftmargin=7mm,framesep=4mm]{csharp}")
    with open(line, "rt", encoding="utf-8") as f:
        print("\n".join(x.rstrip("\n") for x in f.readlines()).replace("﻿", ""))
    print("\\end{minted}")
    print("\\end{section}")
    print("\n")
