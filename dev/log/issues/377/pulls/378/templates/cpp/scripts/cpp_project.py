"""Shared helpers for the C++ release scripts (Python standard library only).

The scripts in this directory are deliberately dependency free so they run on
every GitHub-hosted runner (Linux, macOS, Windows) with the stock ``python3``
and no ``pip install`` step.

Layout detection (single-language vs multi-language repositories):

* ``CPP_ROOT`` environment variable (or ``--cpp-root``) wins when set;
* ``./CMakeLists.txt`` means a single-language repository (tags ``v1.2.3``);
* ``./cpp/CMakeLists.txt`` means a multi-language repository where the C++
  project lives next to ``rust/``, ``js/``, ``python/`` ... (tags
  ``cpp_v1.2.3``, release titles ``[C++] 1.2.3``).

``project(<name> VERSION X.Y.Z)`` in the C++ root ``CMakeLists.txt`` is the
single source of truth for the version of every distribution channel.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Tuple, Union

LANGUAGE = "C++"
MULTI_LANGUAGE_TAG_PREFIX = "cpp_v"
SINGLE_LANGUAGE_TAG_PREFIX = "v"
CPP_SUBDIRECTORY = "cpp"
CMAKE_FILE = "CMakeLists.txt"
VCPKG_MANIFEST = "vcpkg.json"
CONAN_RECIPE = "conanfile.py"
CHANGELOG_FILE = "CHANGELOG.md"
CHANGELOG_DIR = "changelog.d"
BUMP_PRIORITY = {"patch": 1, "minor": 2, "major": 3}

PathLike = Union[str, Path]

_PROJECT_RE = re.compile(r"\bproject\s*\((?P<body>[^)]*)\)", re.IGNORECASE | re.DOTALL)
_VERSION_IN_PROJECT_RE = re.compile(r"(\bVERSION\s+)(\d+\.\d+\.\d+)")
_SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


@dataclass(frozen=True)
class CppLayout:
    """Detected location of the C++ project inside the repository."""

    repository_root: Path
    root: Path
    multi_language: bool

    @property
    def cmake_file(self) -> Path:
        return self.root / CMAKE_FILE

    @property
    def vcpkg_manifest(self) -> Path:
        return self.root / VCPKG_MANIFEST

    @property
    def conanfile(self) -> Path:
        return self.root / CONAN_RECIPE

    @property
    def changelog_file(self) -> Path:
        return self.root / CHANGELOG_FILE

    @property
    def changelog_dir(self) -> Path:
        return self.root / CHANGELOG_DIR

    def packaging_dir(self, channel: str) -> Path:
        """``packaging/<channel>`` of the C++ project, else of the repository.

        The templates normally move into ``cpp/`` with the rest of the C++
        project; a multi-language repository may also keep ``packaging/`` at
        the root next to the shared ``scripts/``.
        """
        own = self.root / "packaging" / channel
        return own if own.is_dir() else self.repository_root / "packaging" / channel

    def relative(self, path: PathLike) -> str:
        """Return ``path`` relative to the repository root, POSIX style."""
        try:
            return Path(path).resolve().relative_to(self.repository_root.resolve()).as_posix()
        except ValueError:
            return Path(path).as_posix()

    @property
    def root_prefix(self) -> str:
        """``""`` for single-language repositories, ``"cpp/"`` otherwise."""
        relative = self.relative(self.root)
        return "" if relative in ("", ".") else f"{relative}/"


def detect_layout(
    repository_root: Optional[PathLike] = None,
    cpp_root: Optional[str] = None,
) -> CppLayout:
    """Detect whether the C++ project lives at the repo root or under cpp/."""
    repo = Path.cwd() if repository_root is None else Path(repository_root)
    override = cpp_root if cpp_root is not None else os.environ.get("CPP_ROOT", "")
    if override and override != ".":
        root = repo / override
        if not (root / CMAKE_FILE).is_file():
            raise FileNotFoundError(f"CPP_ROOT={override!r} has no {CMAKE_FILE}")
        return CppLayout(repository_root=repo, root=root, multi_language=True)
    if (repo / CMAKE_FILE).is_file():
        return CppLayout(repository_root=repo, root=repo, multi_language=False)
    cpp = repo / CPP_SUBDIRECTORY
    if (cpp / CMAKE_FILE).is_file():
        return CppLayout(repository_root=repo, root=cpp, multi_language=True)
    raise FileNotFoundError(
        f"Could not find {repo / CMAKE_FILE} or {cpp / CMAKE_FILE}; "
        "set CPP_ROOT to the directory of the C++ project"
    )


# ---------------------------------------------------------------------------
# CMake project metadata
# ---------------------------------------------------------------------------


def _project_body(text: str) -> Tuple[re.Match, str]:
    match = _PROJECT_RE.search(_strip_cmake_comments(text))
    if not match:
        raise ValueError("CMakeLists.txt has no project() command")
    return match, match.group("body")


def _strip_cmake_comments(text: str) -> str:
    # Blank out line comments but keep offsets stable for later substitution.
    return re.sub(r"#[^\n]*", lambda m: " " * len(m.group(0)), text)


def read_project_name(cmake_file: PathLike) -> str:
    _, body = _project_body(Path(cmake_file).read_text(encoding="utf-8"))
    name = body.split()[0] if body.split() else ""
    if not name:
        raise ValueError(f"{cmake_file}: project() has no name")
    return name


def project_version_from_text(text: str) -> Optional[str]:
    """Return the project() VERSION of CMakeLists.txt ``text`` (None if absent)."""
    try:
        _, body = _project_body(text)
    except ValueError:
        return None
    match = _VERSION_IN_PROJECT_RE.search(body)
    return match.group(2) if match else None


def read_project_version(cmake_file: PathLike) -> str:
    version = project_version_from_text(Path(cmake_file).read_text(encoding="utf-8"))
    if version is None:
        raise ValueError(f"{cmake_file}: project() has no VERSION X.Y.Z")
    return version


def read_project_field(cmake_file: PathLike, field: str) -> str:
    """Read a quoted ``DESCRIPTION``/``HOMEPAGE_URL`` argument of project()."""
    _, body = _project_body(Path(cmake_file).read_text(encoding="utf-8"))
    match = re.search(rf"\b{field}\s+\"((?:[^\"\\]|\\.)*)\"", body)
    return match.group(1) if match else ""


def write_project_version(cmake_file: PathLike, version: str) -> bool:
    """Replace the project() VERSION in place. Returns True if it changed."""
    parse_semver(version)
    path = Path(cmake_file)
    text = path.read_text(encoding="utf-8")
    match, _ = _project_body(text)
    start, end = match.span("body")
    body = text[start:end]
    new_body, count = _VERSION_IN_PROJECT_RE.subn(rf"\g<1>{version}", body, count=1)
    if count == 0:
        raise ValueError(f"{cmake_file}: project() has no VERSION X.Y.Z")
    if new_body == body:
        return False
    path.write_text(text[:start] + new_body + text[end:], encoding="utf-8")
    return True


def read_vcpkg_name(manifest: PathLike) -> Optional[str]:
    path = Path(manifest)
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8")).get("name")


def read_conan_name(recipe: PathLike) -> Optional[str]:
    """``name`` of the ConanFile class in conanfile.py, which may differ from
    the CMake project (linksplatform: ``Platform.Numbers`` vs
    ``platform.numbers``)."""
    path = Path(recipe)
    if not path.is_file():
        return None
    # Class attributes are indented once; names inside methods are deeper.
    match = re.search(r"^    name\s*=\s*[\"']([^\"']+)[\"']", path.read_text(encoding="utf-8"), re.MULTILINE)
    return match.group(1) if match else None


def write_vcpkg_version(manifest: PathLike, version: str) -> bool:
    """Update ``"version"`` in vcpkg.json keeping the file's formatting."""
    path = Path(manifest)
    if not path.is_file():
        return False
    text = path.read_text(encoding="utf-8")
    json.loads(text)  # fail loudly on an invalid manifest
    new_text, count = re.subn(
        r'("version(?:-semver|-string)?"\s*:\s*")[^"]*(")',
        rf"\g<1>{version}\g<2>",
        text,
        count=1,
    )
    if count == 0:
        raise ValueError(f"{manifest}: no \"version\" field")
    if new_text == text:
        return False
    path.write_text(new_text, encoding="utf-8")
    return True


# ---------------------------------------------------------------------------
# Versions, tags and titles
# ---------------------------------------------------------------------------


def parse_semver(version: str) -> Tuple[int, int, int]:
    match = _SEMVER_RE.match(str(version).strip())
    if not match:
        raise ValueError(f"not a MAJOR.MINOR.PATCH version: {version!r}")
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def bump_semver(version: str, bump_type: str) -> str:
    major, minor, patch = parse_semver(version)
    if bump_type == "major":
        return f"{major + 1}.0.0"
    if bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    if bump_type == "patch":
        return f"{major}.{minor}.{patch + 1}"
    raise ValueError(f"bump type must be patch, minor or major, got {bump_type!r}")


def normalize_version(version: str) -> str:
    """Strip tag prefixes such as ``v``, ``cpp_v``, ``cpp-v`` or ``cpp_``."""
    if not version:
        return ""
    normalized = re.sub(r"^[A-Za-z]+[-_]v?", "", str(version).strip(), count=1)
    return re.sub(r"^v", "", normalized, count=1)


def get_tag_prefix(multi_language: bool) -> str:
    override = os.environ.get("CPP_TAG_PREFIX", "")
    if override:
        return override
    return MULTI_LANGUAGE_TAG_PREFIX if multi_language else SINGLE_LANGUAGE_TAG_PREFIX


def known_tag_prefixes(multi_language: bool) -> List[str]:
    """Prefixes whose tags count as already-published C++ versions.

    linksplatform repositories historically tagged C++ releases as
    ``cpp_0.1.0``; recognising them keeps version bumps monotonic after a
    repository migrates to this template.
    """
    prefixes = [get_tag_prefix(multi_language)]
    if multi_language:
        prefixes += ["cpp_", "cpp-v"]
    return list(dict.fromkeys(prefixes))


def build_release_tag(version: str, multi_language: bool) -> str:
    return f"{get_tag_prefix(multi_language)}{normalize_version(version)}"


def build_release_title(version: str, package_name: str, multi_language: bool) -> str:
    bare = normalize_version(version)
    if multi_language:
        return f"[{LANGUAGE}] {bare}"
    return f"{package_name} {bare}"


def published_versions(tags: Iterable[str], multi_language: bool) -> List[str]:
    """Return the MAJOR.MINOR.PATCH versions among ``tags`` for this layout."""
    versions = []
    for tag in tags:
        for prefix in known_tag_prefixes(multi_language):
            if tag.startswith(prefix):
                candidate = tag[len(prefix):]
                if _SEMVER_RE.match(candidate):
                    versions.append(candidate)
                break
    return sorted(set(versions), key=parse_semver)


def max_version(versions: Sequence[str]) -> Optional[str]:
    return max(versions, key=parse_semver) if versions else None


# ---------------------------------------------------------------------------
# Changelog fragments
# ---------------------------------------------------------------------------

_FRONTMATTER_RE = re.compile(r"\A---\s*\n(?P<meta>.*?)\n---\s*(?:\n|\Z)", re.DOTALL)


@dataclass(frozen=True)
class Fragment:
    path: Path
    bump: str
    body: str


def list_fragment_paths(changelog_dir: PathLike) -> List[Path]:
    directory = Path(changelog_dir)
    if not directory.is_dir():
        return []
    return sorted(
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix == ".md" and path.name.lower() != "readme.md"
    )


def parse_fragment(path: PathLike) -> Fragment:
    text = Path(path).read_text(encoding="utf-8")
    bump = "patch"
    body = text
    match = _FRONTMATTER_RE.match(text)
    if match:
        body = text[match.end():]
        for line in match.group("meta").splitlines():
            key, _, value = line.partition(":")
            if key.strip() == "bump":
                value = value.strip().strip("'\"").lower()
                if value not in BUMP_PRIORITY:
                    raise ValueError(f"{path}: bump must be patch, minor or major, got {value!r}")
                bump = value
    return Fragment(path=Path(path), bump=bump, body=body.strip())


def read_fragments(changelog_dir: PathLike) -> List[Fragment]:
    return [parse_fragment(path) for path in list_fragment_paths(changelog_dir)]


def highest_bump(fragments: Iterable[Fragment], default: str = "patch") -> str:
    best = default
    for fragment in fragments:
        if BUMP_PRIORITY[fragment.bump] > BUMP_PRIORITY[best]:
            best = fragment.bump
    return best


# ---------------------------------------------------------------------------
# GitHub Actions and process helpers
# ---------------------------------------------------------------------------


def set_output(key: str, value: object) -> None:
    """Append ``key=value`` to ``$GITHUB_OUTPUT`` (and echo it)."""
    text = str(value).lower() if isinstance(value, bool) else str(value)
    output_file = os.environ.get("GITHUB_OUTPUT")
    if output_file:
        with open(output_file, "a", encoding="utf-8") as handle:
            if "\n" in text:
                delimiter = f"EOF_{os.urandom(8).hex()}"
                handle.write(f"{key}<<{delimiter}\n{text}\n{delimiter}\n")
            else:
                handle.write(f"{key}={text}\n")
    print(f"Output: {key}={text}")


def run(
    args: Sequence[str],
    cwd: Optional[PathLike] = None,
    check: bool = True,
    capture: bool = True,
) -> subprocess.CompletedProcess:
    result = subprocess.run(
        list(args),
        cwd=None if cwd is None else str(cwd),
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
        check=False,
    )
    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip() if capture else ""
        raise RuntimeError(f"{' '.join(args)} exited with {result.returncode}: {detail}")
    return result


def git(*args: str, cwd: Optional[PathLike] = None, check: bool = True) -> str:
    return run(["git", *args], cwd=cwd, check=check).stdout.strip()


def list_tags(cwd: Optional[PathLike] = None, remote: Optional[str] = None) -> List[str]:
    if remote:
        output = git("ls-remote", "--tags", "--refs", remote, cwd=cwd)
        return [line.split("refs/tags/", 1)[1] for line in output.splitlines() if "refs/tags/" in line]
    output = git("tag", "--list", cwd=cwd)
    return [line for line in output.splitlines() if line]


def error(message: str, title: Optional[str] = None) -> None:
    prefix = f"::error title={title}::" if title else "::error::"
    print(f"{prefix}{message}", file=sys.stderr)


def notice(message: str) -> None:
    print(f"::notice::{message}")


def warning(message: str) -> None:
    print(f"::warning::{message}")


def add_cpp_root_argument(parser) -> None:
    parser.add_argument(
        "--cpp-root",
        default=None,
        help="Directory of the C++ project (default: CPP_ROOT, ., or cpp/)",
    )
