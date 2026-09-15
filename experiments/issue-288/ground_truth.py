"""Print the canonical rendering of every case in issue #288."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "python"))
from links_notation import Parser  # noqa: E402

CASES = [
    '(a " " b)', '(a "" b)', "(a '' b)", '(a `` b)',
    '(a "" "" b)', "(a '' '' b)", '(a `` `` b)',
    '(a ""x"" b)', '(a """" b)', '(x "" " "")', '(x \' " \')',
    '("" ("" 1))', '("" (\'\' 1))', '("x" ("" 1))', '("" ("x" 1))',
    '("" x ("" 1))', '("" 1 ("" 1))', '(o: ("" (o: ("" 1))))',
    '(a " b)', '(a """ b)', '("")', '("": 1)', '(a ""  "" b)', '("" "")',
]


def render(node):
    if not node.values:
        return "<%s>" % ("" if node.id is None else node.id)
    head = "" if node.id is None else "<%s>: " % node.id
    return "(%s%s)" % (head, " ".join(render(v) for v in node.values))


def main():
    parser = Parser()
    for case in CASES:
        try:
            links = parser.parse(case)
            print("%-24s => %s" % (case, "\n".join(render(l) for l in links)))
        except Exception as e:  # noqa: BLE001
            print("%-24s => Err(%s)" % (case, e))


if __name__ == "__main__":
    main()
