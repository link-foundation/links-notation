"""Fail unless every wheel and sdist in a directory ships py.typed (issue #411).

Usage: python tests/check_distributions.py dist

PEP 561 type checkers look for ``links_notation/py.typed`` next to the
installed modules; a wheel without it is reported as ``import-untyped``, and an
sdist without it builds such a wheel.
"""

import sys
import tarfile
import zipfile
from pathlib import Path

MARKER = "links_notation/py.typed"


def names(path: Path) -> list[str]:
    if path.suffix == ".whl":
        with zipfile.ZipFile(path) as wheel:
            return wheel.namelist()
    with tarfile.open(path) as sdist:
        # Inside an sdist every name starts with "<name>-<version>/".
        return [name.split("/", 1)[-1] for name in sdist.getnames()]


def main(directory: str) -> int:
    distributions = sorted(Path(directory).glob("*.whl")) + sorted(Path(directory).glob("*.tar.gz"))
    kinds = {path.suffix for path in distributions}
    if kinds != {".whl", ".gz"}:
        print(f"expected a wheel and an sdist in {directory}, found {[p.name for p in distributions]}")
        return 1
    failures = 0
    for path in distributions:
        if MARKER in names(path):
            print(f"{path.name}: ships {MARKER}")
        else:
            print(f"{path.name}: {MARKER} is missing")
            failures += 1
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "dist"))
