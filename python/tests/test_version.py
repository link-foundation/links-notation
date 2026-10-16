"""The reported version must match pyproject.toml, installed or not."""

import tomllib
from importlib.metadata import PackageNotFoundError
from pathlib import Path
from unittest.mock import patch

import links_notation

PYPROJECT = Path(__file__).resolve().parent.parent / "pyproject.toml"


def declared_version():
    with PYPROJECT.open("rb") as file:
        return tomllib.load(file)["project"]["version"]


def test_version_matches_pyproject():
    assert links_notation.__version__ == declared_version()


def test_uninstalled_checkout_reads_pyproject():
    def missing(name):
        raise PackageNotFoundError(name)

    with patch("links_notation._distribution_version", side_effect=missing):
        assert links_notation._read_version() == declared_version()
