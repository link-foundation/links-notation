# Current PDF highlighting dependencies

Collected 2026-11-13 UTC. The previous workflow used the Ubuntu 26.04
TeX Live 2025 executable latexminted 0.6.0. Its argparse subclass rejects
Python >=3.14's `color` argument. The earlier Python 3.13 wrapper is removed;
the executable and its corresponding style protocol are updated together.

| Dependency | Before | Selected / latest stable | Registry evidence |
| --- | --- | --- | --- |
| latexminted (Python) | distro 0.6.0 | 0.7.1 | latexminted-registry.json; PyPI hash lock |
| latex2pydata (Python) | distro-managed, no repository pin | 0.5.0 | latex2pydata-pypi.json; PyPI hash lock |
| latexrestricted (Python) | distro-managed, no repository pin | 0.6.2 | latexrestricted-pypi.json; PyPI hash lock |
| Pygments | distro-managed, no repository pin | 2.21.0 | pygments-pypi.json; PyPI hash lock |
| minted.sty | distro-managed, no repository pin | 3.8.0 | minted-releases.json; official latex/v3.8.0 tag |
| fvextra.sty | distro-managed, no repository pin | 1.14.0 | fvextra-release.json; official v1.14.0 tag |
| latex2pydata.sty | distro-managed, no repository pin | 0.7.0 | latex2pydata-release.json; official latex/v0.7.0 tag |

The Python and TeX latex2pydata packages have different version sequences;
Python 0.5.0 and TeX 0.7.0 are their respective current releases. The native
universal hashed Python lock is `csharp/tools/requirements.lock`. All three
styles are downloaded from their official tagged sources with SHA-256
verification by `csharp/scripts/setup-minted.sh`. The system TeX engine remains
provided by the pinned hosted OS; its date-independent dependencies are used
normally. Dependabot covers the new Python manifest; tagged TeX styles require
manual release/hash review.

The local Python 3.15 install, executable version, style downloads/checksums,
ShellCheck and pip-audit pass. Full document generation is verified by the
preserved C# generatePdfWithCode CI job; local TeX is not installed.

The fixed upstream cause is [gpoore/minted#463](https://github.com/gpoore/minted/issues/463).
Official sources: [minted](https://github.com/gpoore/minted),
[fvextra](https://github.com/gpoore/fvextra), and
[latex2pydata](https://github.com/gpoore/latex2pydata).
