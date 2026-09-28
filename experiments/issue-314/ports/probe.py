"""Times the Python parser on the nesting shapes from #314.

Usage: python3 probe.py (run from the repository root or with PYTHONPATH=python)
"""
import sys
import time

sys.path.insert(0, "python")
from links_notation import Parser  # noqa: E402

SHAPES = {
    "closed": lambda d: "(" * d + "a" + ")" * d,
    "value after": lambda d: "(" * d + "a" + ") b" * d,
    "unclosed": lambda d: "(" * d + "a",
    "indented": lambda d: "\n".join(" " * i + "(a" for i in range(d)),
}
BUDGET = 3.0
parser = Parser()
for name, shape in SHAPES.items():
    results = []
    for depth in (2, 4, 8, 12, 16, 20, 24, 64, 256):
        start = time.perf_counter()
        try:
            parser.parse(shape(depth))
            outcome = "ok"
        except Exception as error:  # noqa: BLE001
            outcome = type(error).__name__
        elapsed = time.perf_counter() - start
        results.append(f"{depth}: {elapsed * 1000:.1f} ms ({outcome})")
        if elapsed > BUDGET:
            break
    print(f"{name:12} " + ", ".join(results))
