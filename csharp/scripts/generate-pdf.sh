#!/bin/bash
# Renders csharp/_site/Link.Foundation.Links.Notation.pdf from the library sources.
# Run from the csharp/ directory; LaTeX and Pygments must already be installed.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$SCRIPT_DIR/format-document.sh" > document.tex

run_latex() {
  if ! latex -shell-escape -interaction=nonstopmode document.tex; then
    # nonstopmode buries the reason among thousands of log lines; repeat each
    # distinct error so it shows up as an annotation on the run.
    grep -a '^! ' document.log | sort | uniq -c | sed 's/^ *\([0-9]*\) ! /::error::LaTeX (x\1): /' || true
    return 1
  fi
}

run_latex
makeindex document
run_latex
dvipdf document.dvi document.pdf

mkdir -p _site
cp document.pdf "_site/Link.Foundation.Links.Notation.pdf"

rm -f document.tex document.dvi document.pdf
