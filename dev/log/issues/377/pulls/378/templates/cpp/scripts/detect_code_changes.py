#!/usr/bin/env python3
"""Classify the changed files of a push or pull request for job gating.

Outputs (GITHUB_OUTPUT):
  any-code-changed  true when a file that can affect the build, tests,
                    packaging or the pipeline itself changed
  cpp-changed       true when a file under the C++ root changed (sources,
                    headers, CMake, packaging)
  docs-changed      true when markdown anywhere or anything under docs/ or
                    the Doxyfile changed (drives the documentation jobs)

Not code: markdown, changelog.d/, docs/, dev/log/, experiments/. Unlike the
Python and JavaScript templates, examples/ *is* code here: the C++ examples
and the consumer projects in examples/consumers are compiled and run by CI.

In a multi-language repository (C++ under cpp/) only files under cpp/ and the
shared scripts/ and .github/ directories count, so a Rust-only change does
not run the C++ matrix.

Environment: GITHUB_EVENT_NAME, GITHUB_BASE_SHA/GITHUB_HEAD_SHA (pull
requests), GITHUB_EVENT_BEFORE (pushes), CPP_ROOT.
"""

from __future__ import annotations

import os
import sys
from typing import Dict, List, Optional

import cpp_project as cp

EXCLUDED_FOLDERS = ("changelog.d/", "dev/log/", "docs/", "experiments/")
CODE_EXTENSIONS = (
    ".c", ".cc", ".cpp", ".cxx", ".c++", ".h", ".hh", ".hpp", ".hxx", ".h++", ".ipp", ".inl",
    ".cmake", ".in", ".py", ".sh", ".json", ".yml", ".yaml", ".toml", ".nuspec", ".targets", ".props",
)
CODE_FILENAMES = (
    "CMakeLists.txt", "Doxyfile", ".clang-format", ".clang-tidy", "conanfile.txt", "LICENSE",
)
SHARED_PREFIXES = ("scripts/", ".github/")
ZERO_SHA = "0" * 40


def _strip_root(path: str, cpp_prefix: str) -> Optional[str]:
    if not cpp_prefix:
        return path
    if path.startswith(cpp_prefix):
        return path[len(cpp_prefix):]
    return None


def is_code_file(path: str, cpp_prefix: str = "") -> bool:
    if path.endswith(".md"):
        return False
    if path.startswith(".github/workflows/") or path.startswith(".github/actions/"):
        return True
    relative = _strip_root(path, cpp_prefix)
    if relative is None:
        if not path.startswith(SHARED_PREFIXES):
            return False
        relative = path
    if relative.startswith(EXCLUDED_FOLDERS):
        return False
    name = relative.rsplit("/", 1)[-1]
    return name in CODE_FILENAMES or relative.endswith(CODE_EXTENSIONS)


def is_docs_change(path: str, cpp_prefix: str = "") -> bool:
    if path.endswith(".md"):
        return True
    relative = _strip_root(path, cpp_prefix)
    candidates = [path] if relative is None else [path, relative]
    return any(c.startswith("docs/") or c == "Doxyfile" or c.startswith("include/") for c in candidates)


def is_cpp_change(path: str, cpp_prefix: str = "") -> bool:
    relative = _strip_root(path, cpp_prefix)
    return relative is not None and is_code_file(path, cpp_prefix) and not relative.startswith(SHARED_PREFIXES)


def classify(changed_files: List[str], cpp_prefix: str = "") -> Dict[str, bool]:
    return {
        "any-code-changed": any(is_code_file(f, cpp_prefix) for f in changed_files),
        "cpp-changed": any(is_cpp_change(f, cpp_prefix) for f in changed_files),
        "docs-changed": any(is_docs_change(f, cpp_prefix) for f in changed_files),
    }


def _ensure_commit(sha: str) -> None:
    if cp.run(["git", "cat-file", "-e", f"{sha}^{{commit}}"], check=False).returncode != 0:
        cp.git("fetch", "--no-tags", "--depth=1", "origin", sha)


def get_changed_files() -> List[str]:
    event = os.environ.get("GITHUB_EVENT_NAME", "push")
    if event == "pull_request":
        base = os.environ.get("GITHUB_BASE_SHA", "")
        head = os.environ.get("GITHUB_HEAD_SHA", "") or "HEAD"
        if not base:
            raise RuntimeError("GITHUB_BASE_SHA is required for pull_request events")
        _ensure_commit(base)
        return cp.git("diff", "--name-only", base, head).splitlines()
    before = os.environ.get("GITHUB_EVENT_BEFORE", "")
    if before and before != ZERO_SHA:
        try:
            _ensure_commit(before)
            return cp.git("diff", "--name-only", before, "HEAD").splitlines()
        except RuntimeError as exc:
            cp.warning(f"Could not diff against the push's before SHA ({exc}); using HEAD^")
    if cp.run(["git", "rev-parse", "--verify", "HEAD^"], check=False).returncode == 0:
        return cp.git("diff", "--name-only", "HEAD^", "HEAD").splitlines()
    # First commit (or a shallow clone without a parent): everything changed.
    return cp.git("ls-tree", "-r", "--name-only", "HEAD").splitlines()


def main() -> int:
    layout = cp.detect_layout()
    prefix = layout.root_prefix
    try:
        changed = [f for f in get_changed_files() if f]
    except RuntimeError as exc:
        cp.error(f"Could not determine the changed files: {exc}", title="Change detection failed")
        return 1
    print("Changed files:")
    for path in changed or ["(none)"]:
        print(f"  {path}")
    outputs = classify(changed, prefix)
    for name, value in outputs.items():
        cp.set_output(name, value)
    cp.set_output("cpp-root", layout.relative(layout.root) or ".")
    cp.set_output("multi-language", layout.multi_language)
    return 0


if __name__ == "__main__":
    sys.exit(main())
