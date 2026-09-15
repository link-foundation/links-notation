import sys
sys.path.insert(0, "python")
from links_notation.parser import Parser
docs = ["# ok line\n# break: two\nci_gate x\n", "a: b: c", "a (b\n", "a b)\n", ":"]
for d in docs:
    try:
        r = Parser().parse(d)
        print(f"{d!r} -> PARSED {r}")
    except Exception as e:
        print(f"{d!r} -> {type(e).__name__}: {e}")
