"""Generate finite, self-authored reference fidelity fixtures as UTF-8 hex."""

from pathlib import Path

references = [
    "~1{61}", "~2{61}", "~1{}", "~1{xyz}", "~123{", "~1{61}tail",
    "", "ordinary reference", 'He said "it\'s ready"', 'He said "it\'s `ready`"',
    " \tNha Trang\n\"both's\" \n", "a\\b%20:", "# comment\n# still content",
    "issue#332", " ", "\t\r\n", "\r\nline\rnext\n", "(unbalanced", "unbalanced)",
    "😀 привет 世界 e\u0301 \U0010ffff", "\ufeff", "\u00a0\u0085\u2028\u2029\u3000",
    "\x00inside\x00", "\\n\\u0000\\'\\\"", "'\"`", "`\"'",
]
references += [chr(code) for code in range(33)] + ["\x7f", "\x85"]
for quote in "'\"`":
    for width in range(1, 6):
        references += [quote * width, quote * width + " body " + "'\"`" + quote * width]
references += ["prefix " + "'" * 5 + '"' * 5 + "`" * 5 + " suffix"]
references = list(dict.fromkeys(references))
root = Path(__file__).resolve().parents[2]
(root / "docs/protocol/reference-literals.txt").write_text(
    "# UTF-8 hex, one exact reference per line; '-' is the empty reference.\n"
    + "\n".join(value.encode("utf-8").hex() or "-" for value in references) + "\n"
)
print(f"Generated {len(references)} reference fixtures")
