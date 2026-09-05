import sys

sys.path.insert(0, "python")
from links_notation.parser import Parser

docs = ["# a b\n", "# a: b\n", "a: b # note\n", "a#b\n", '"#" a\n', "parent\n  # what the child is for\n  child\n"]
for doc in docs:
    try:
        links = Parser().parse(doc)
        print(f"{doc!r} -> PARSED [{' '.join(str(link) for link in links)}]")
    except Exception as error:  # noqa: BLE001 - the probe reports whatever comes out
        print(f"{doc!r} -> {type(error).__name__}: {error}")
