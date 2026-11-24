"""Issue #437: uv-locked Python projects must use Dependabot's uv ecosystem."""
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("cd", ROOT / "scripts/ci/check-dependabot.py")
cd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cd)


class UvEcosystem(unittest.TestCase):
    def test_uv_locked_pyproject_maps_to_uv(self):
        files = {"python/pyproject.toml", "python/uv.lock"}
        self.assertEqual(cd.ecosystems("python/pyproject.toml", files), ["uv"])

    def test_plain_pyproject_stays_pip(self):
        self.assertEqual(cd.ecosystems("tools/pyproject.toml", {"tools/pyproject.toml"}), ["pip"])


if __name__ == "__main__":
    unittest.main()
