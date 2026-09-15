#!/bin/bash
# Emits the LaTeX source of the "library + tests" PDF on stdout.
# Run from the csharp/ directory.
set -e

PROJECT="Link.Foundation.Links.Notation"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Auto-generated sources must not end up in the document.
set +e
find "./$PROJECT/obj" -type f -iname "*.cs" -delete
find "./$PROJECT.Tests/obj" -type f -iname "*.cs" -delete
set -e

# fvextra is pinned to a commit so the document renders the same way tomorrow.
if [ ! -f fvextra.sty ]; then
  wget -q https://raw.githubusercontent.com/gpoore/fvextra/cc1c0c5f7b92023cfec67084e2a87bdac520414c/fvextra/fvextra.sty
fi

cat <<'PREAMBLE'
\documentclass[11pt,a4paper,fleqn]{report}
\usepackage[left=5mm,top=5mm,right=5mm,bottom=5mm]{geometry}
\textwidth=200mm
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[T2A]{fontenc}
\usepackage{fvextra}
\usepackage{minted}
\usemintedstyle{vs}
\usepackage{makeidx}
\usepackage[columns=1]{idxlayout}
\makeindex
\renewcommand{\thesection}{\arabic{chapter}.\arabic{section}}
\setcounter{chapter}{1}
\setcounter{section}{0}
\usepackage[tiny]{titlesec}
\titlespacing\chapter{0mm}{0mm}{0mm}
\titlespacing\section{0mm}{0mm}{0mm}
\DeclareUnicodeCharacter{221E}{\ensuremath{\infty}}
\DeclareUnicodeCharacter{FFFD}{\ensuremath{ }}
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyfoot[C]{\thepage}
\renewcommand{\headrulewidth}{0mm}
\renewcommand{\footrulewidth}{0mm}
\renewcommand{\baselinestretch}{0.7}
\begin{document}
\sf
\noindent{\Large Link.Foundation.Links.Notation Class Library}
PREAMBLE

find "./$PROJECT" -type f -iname '*.cs' | sort -b | python3 "$SCRIPT_DIR/format-files.py"
find "./$PROJECT.Tests" -type f -iname '*.cs' | sort -b | python3 "$SCRIPT_DIR/format-files.py"

cat <<'EPILOGUE'
\printindex
\end{document}
EPILOGUE
