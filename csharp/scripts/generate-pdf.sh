#!/bin/bash
# Renders csharp/_site/Link.Foundation.Links.Notation.pdf from the library sources.
# Run from the csharp/ directory; LaTeX and Pygments must already be installed.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$SCRIPT_DIR/format-document.sh" > document.tex

latex -shell-escape -interaction=nonstopmode document.tex
makeindex document
latex -shell-escape -interaction=nonstopmode document.tex
dvipdf document.dvi document.pdf

mkdir -p _site
cp document.pdf "_site/Link.Foundation.Links.Notation.pdf"

rm -f document.tex document.dvi document.pdf
