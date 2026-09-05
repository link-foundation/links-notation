#!/usr/bin/env python3
"""Python side of the Links Notation token efficiency benchmarks.

The Rust benchmark is the one that writes the documents and the report. Every
other language answers the two questions that make those numbers portable
rather than a property of one implementation:

1. does this language's own ``links-notation`` parser accept the generated
   Links Notation documents;
2. does this language's own tokenizer count them the same way.

It writes ``benchmarks/results/python.json`` and fails when a count differs
from ``benchmarks/results/rust.json``.

Usage: ``python3 benchmarks/python/benchmark.py [--check] [--verbose]``.
With ``--check`` the results file is compared instead of written, which is what
CI runs to catch a stale commit.
"""

import json
import os
import sys
from pathlib import Path

import tiktoken

LANGUAGE = "python"
BENCHMARKS = Path(__file__).resolve().parent.parent
REPOSITORY = BENCHMARKS.parent

# The benchmark measures the implementation in this repository, not whatever
# happens to be installed.
sys.path.insert(0, str(REPOSITORY / "python"))

from links_notation import Parser  # noqa: E402

O200K = tiktoken.get_encoding("o200k_base")
CL100K = tiktoken.get_encoding("cl100k_base")

METRIC_KEYS = ("tokens_o200k", "tokens_cl100k", "chars", "bytes")


def read_text(path):
    """The bytes of a file decoded as UTF-8, with no newline translation.

    ``Path.read_text`` would turn the CRLF line endings RFC 4180 asks of CSV
    into LF and quietly report a shorter document than every other language
    measures.
    """
    return (BENCHMARKS / path).read_bytes().decode("utf-8")


def read_json(path):
    return json.loads(read_text(path))


def measure(text):
    """The four measurements taken of every document.

    ``encode_ordinary`` is what counts data rather than a prompt: a document
    that happens to contain ``<|endoftext|>`` is text, not a control token.
    """
    return {
        "tokens_o200k": len(O200K.encode_ordinary(text)),
        "tokens_cl100k": len(CL100K.encode_ordinary(text)),
        "chars": len(text),
        "bytes": len(text.encode("utf-8")),
    }


def compare(results, reference):
    """Every measurement that differs from the reference results."""
    differences = []
    by_name = {dataset["name"]: dataset for dataset in reference["datasets"]}
    for dataset in results["datasets"]:
        expected = by_name.get(dataset["name"])
        if expected is None:
            differences.append(f"{dataset['name']}: missing from the Rust results")
            continue
        for fmt, metrics in dataset["formats"].items():
            for key, value in metrics.items():
                other = expected["formats"].get(fmt, {}).get(key)
                if other != value:
                    differences.append(
                        f"{dataset['name']}/{fmt}/{key}: {value} here, {other} in Rust"
                    )
    return differences


def main():
    verbose = "--verbose" in sys.argv or os.environ.get("CI_VERBOSE") == "true"
    check = "--check" in sys.argv

    index = read_json("generated/index.json")
    parser = Parser()
    datasets = []
    totals = {}

    for entry in index["representations"]:
        formats = {}
        for fmt, path in entry["files"].items():
            text = read_text(path)
            if fmt.startswith("lino"):
                # Parsing with this language's own implementation is the point:
                # a document only counts if the notation is portable.
                parser.parse(text)
            metrics = measure(text)
            formats[fmt] = metrics
            running = totals.setdefault(fmt, {key: 0 for key in METRIC_KEYS})
            for key in METRIC_KEYS:
                running[key] += metrics[key]
        if verbose:
            print(f"{entry['dataset']}: measured {len(formats)} formats", file=sys.stderr)
        datasets.append(
            {
                "name": entry["dataset"],
                "structure": entry["structure"],
                "profile": entry["profile"],
                "formats": dict(sorted(formats.items())),
            }
        )

    results = {
        "schema": index.get("schema", 1),
        "generator": LANGUAGE,
        "tokenizers": {"primary": "o200k_base", "secondary": "cl100k_base"},
        "datasets": datasets,
        "totals": dict(sorted(totals.items())),
    }

    differences = compare(results, read_json("results/rust.json"))
    if differences:
        print(
            f"{LANGUAGE}: {len(differences)} measurement(s) differ from the Rust results:",
            file=sys.stderr,
        )
        for difference in differences[:20]:
            print(f"  - {difference}", file=sys.stderr)
        return 1

    text = json.dumps(results, indent=2, ensure_ascii=False) + "\n"
    path = f"results/{LANGUAGE}.json"
    if check:
        if read_text(path) != text:
            print(
                f"{path} is out of date; run python3 benchmarks/python/benchmark.py",
                file=sys.stderr,
            )
            return 1
        print(f"{LANGUAGE}: {path} is up to date and agrees with the Rust results.")
        return 0

    (BENCHMARKS / path).write_bytes(text.encode("utf-8"))
    print(f"{LANGUAGE}: wrote {path}; every measurement agrees with the Rust results.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
