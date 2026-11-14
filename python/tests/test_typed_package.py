"""The package declares itself typed (PEP 561, issue #411)."""

import tomllib
from importlib.resources import files
from pathlib import Path

PYTHON = Path(__file__).resolve().parent.parent


def test_the_package_has_a_py_typed_marker():
    assert files("links_notation").joinpath("py.typed").is_file()


def test_the_marker_is_package_data_for_the_wheel_and_sdist():
    project = tomllib.loads((PYTHON / "pyproject.toml").read_text())
    assert "py.typed" in project["tool"]["setuptools"]["package-data"]["links_notation"]
    assert "Typing :: Typed" in project["project"]["classifiers"]
    assert "include links_notation/py.typed" in (PYTHON / "MANIFEST.in").read_text().splitlines()
