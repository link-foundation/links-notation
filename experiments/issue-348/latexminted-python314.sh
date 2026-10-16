#!/usr/bin/env bash
# Reproduces the C# PDF failure on ubuntu-26.04 (CI run 38949537786) without
# TeX Live: Ubuntu's /usr/bin/latexminted is a symlink to minted 3.7.0's
# latexminted.py, which loads latexminted 0.6.0 and the other bundled wheels
# from its own directory. On Python 3.14 that raises
#   TypeError: ArgParser.__init__() got an unexpected keyword argument 'color'
# (Launchpad bug 2154292, gpoore/minted#463). The wrapper csharp.yml installs
# runs the same file on Python 3.13 and prints "latexminted 0.6.0".
#
# Needs uv (it installs Python 3.13 and 3.14) and network access to GitHub
# and PyPI. Usage: experiments/issue-348/latexminted-python314.sh
set -euo pipefail

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
scripts="$work/texmf/scripts/minted"
mkdir -p "$scripts" "$work/usrbin" "$work/wrapper"

# latexminted.py as of minted 3.7.0 (2025/05/14), the version TeX Live 2025 ships.
curl -fsSL -o "$scripts/latexminted.py" \
  https://raw.githubusercontent.com/gpoore/minted/97fed429c41072bdffc5109cc220dfd47f0330e2/latex/restricted/latexminted.py
for spec in latexminted/0.6.0 latexrestricted/0.6.2 latex2pydata/0.5.0 pygments/2.19.1; do
  url=$(curl -fsS "https://pypi.org/pypi/$spec/json" | python3 -I -c \
    "import json,sys; print([u['url'] for u in json.load(sys.stdin)['urls'] if u['filename'].endswith('.whl')][0])")
  (cd "$scripts" && curl -fsSLO "$url")
done
ln -s "$scripts/latexminted.py" "$work/usrbin/latexminted"

uv python install -q 3.13 3.14
py314=$(uv python find 3.14)
py313=$(uv python find 3.13)

echo "Python 3.14, as /usr/bin/latexminted runs on ubuntu-26.04:"
if "$py314" "$work/usrbin/latexminted" --version; then
  echo "unexpected: latexminted 0.6.0 ran on Python 3.14" >&2
  exit 1
fi

echo "Python 3.13, through the wrapper csharp.yml writes:"
cat > "$work/wrapper/latexminted" <<EOF
#!/bin/sh
exec "$py313" "$work/usrbin/latexminted" "\$@"
EOF
chmod +x "$work/wrapper/latexminted"
PATH="$work/wrapper:$PATH" latexminted --version | head -n 1
