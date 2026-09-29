"""Compare the Python parser before and after the nesting depth limit.

Random documents shallower than the limit must parse exactly as they did
before (or, where the old parser hung on an indentation it never read, parse
at all). Run from the repository root, with the parser before the change
unpacked under /tmp/oldpkg/python:

    git archive HEAD python/links_notation | tar -x -C /tmp/oldpkg
    python3 experiments/issue-315/python-differential.py
"""

import importlib
import random
import signal
import sys


def load(path):
    for name in [m for m in sys.modules if m.startswith("links_notation")]:
        del sys.modules[name]
    sys.path.insert(0, path)
    try:
        return importlib.import_module("links_notation")
    finally:
        sys.path.pop(0)


old = load("/tmp/oldpkg/python")
new = load("python")
assert old.__file__ != new.__file__


class Hung(Exception):
    pass


def alarm(*_):
    raise Hung()


signal.signal(signal.SIGALRM, alarm)


def outcome(module, document):
    signal.setitimer(signal.ITIMER_REAL, 0.5)
    try:
        return [str(link) for link in module.Parser().parse(document)]
    except Hung:
        return "hung"
    except Exception as error:  # noqa: BLE001
        return f"{type(error).__name__}"
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)


pieces = ["a", "b", "c", "(", ")", ":", " ", "  ", "\n", "\n  ", "\n    ", "\n ", '"', "'", "`", "#", "\r\n", "\t"]
random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 315)
compared = hung = 0
for _ in range(20000):
    document = "".join(random.choice(pieces) for _ in range(random.randint(1, 30)))
    before = outcome(old, document)
    after = outcome(new, document)
    if before == "hung":
        hung += 1
        assert after != "hung", document
        continue
    compared += 1
    assert before == after, (document, before, after)

print(f"{compared} documents parse as before; {hung} that hung before now parse")
